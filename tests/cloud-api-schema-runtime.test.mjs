/**
 * Unit tests for `scripts/cloud-api/schema-zod.mjs` and
 * `scripts/cloud-api/schema-effect.mjs`: each converts a small Zod or Effect
 * schema, named by `Thing`, and asserts the exact JSON Schema.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { schemaOf, THING } from './cloud-api-helpers.mjs';

/** The library imports, on the same line as the schema so locations stay at line 1. */
const ZOD = "import { z } from 'zod'; ";
const EFFECT = "import { Schema } from 'effect'; ";
/** The one `Hex` helper the Effect converter expands. */
const HEX =
  'const Hex = (maxBytes: number) => Schema.String.check(Schema.isPattern(new RegExp(`^(?:[0-9a-f]{2}){1,$' +
  '{maxBytes}}$`)));\n';
/** The schema of a Zod expression `S`. @param {string} expression */
const zodOf = (expression) =>
  schemaOf(`${ZOD}const S = ${expression};\nexport type Thing = z.infer<typeof S>;\n`);
/** The schema of a Zod field inside an object. @param {string} field */
const fieldOf = (field) => zodOf(`z.object({ f: ${field} })`).schema.properties.f;
/** The schema of an Effect expression `S`. @param {string} expression @param {string} [before] */
const effectOf = (expression, before = '') =>
  schemaOf(`${EFFECT}${before}const S = ${expression};\nexport type Thing = typeof S.Type;\n`)
    .schema;

describe('Zod', () => {
  it('omits optional fields from required and admits null for nullable ones', () => {
    assert.deepEqual(
      zodOf(
        'z.object({ a: z.string(), b: z.number().optional(), c: z.string().nullable(), d: z.string().optional().nullable() })',
      ).schema,
      {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { type: 'number' },
          c: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          d: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['a', 'c'],
      },
    );
  });

  it('never leaves the optional marker in the output', () => {
    const { schema } = zodOf(
      'z.object({ a: z.array(z.string().optional()), b: z.record(z.string(), z.number().optional()), c: z.union([z.string().optional(), z.number()]) })',
    );
    assert.doesNotMatch(JSON.stringify(schema), /x-optional/);
    assert.deepEqual(schema.properties.a, { type: 'array', items: { type: 'string' } });
    // A union with an optional member admits an absent value, as Zod's does.
    assert.deepEqual(schema.required, ['a', 'b']);
    assert.deepEqual(schema.properties.c, { anyOf: [{ type: 'string' }, { type: 'number' }] });
  });

  it('uses the bound keyword of the base type', () => {
    assert.deepEqual(fieldOf('z.string().min(1).max(5)'), {
      type: 'string',
      minLength: 1,
      maxLength: 5,
    });
    assert.deepEqual(fieldOf('z.array(z.string()).min(1).max(3)'), {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
    });
    assert.deepEqual(fieldOf('z.number().min(2).max(9)'), {
      type: 'number',
      minimum: 2,
      maximum: 9,
    });
    // Zod 4's integer check also bounds the value to the safe-integer range.
    assert.deepEqual(fieldOf('z.number().int().positive()'), {
      type: 'integer',
      minimum: -Number.MAX_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
      exclusiveMinimum: 0,
    });
    assert.deepEqual(fieldOf('z.number().max(5).int()'), {
      type: 'integer',
      minimum: -Number.MAX_SAFE_INTEGER,
      maximum: 5,
    });
    assert.deepEqual(fieldOf('z.number().nonnegative()'), { type: 'number', minimum: 0 });
    assert.deepEqual(fieldOf('z.number().int().safe()'), {
      type: 'integer',
      minimum: -Number.MAX_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    });
    // `.safe()` is itself an integer check, so fractional values are refused.
    assert.deepEqual(fieldOf('z.number().safe()'), {
      type: 'integer',
      minimum: -Number.MAX_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    });
  });

  it('converts string formats, patterns and transforms', () => {
    assert.deepEqual(fieldOf('z.string().uuid()'), { type: 'string', format: 'uuid' });
    assert.deepEqual(fieldOf('z.string().url()'), { type: 'string', format: 'uri' });
    assert.deepEqual(fieldOf('z.string().datetime()'), { type: 'string', format: 'date-time' });
    assert.deepEqual(fieldOf('z.string().regex(/^a+$/)'), { type: 'string', pattern: '^a+$' });
    assert.deepEqual(fieldOf('z.string().trim()'), {
      type: 'string',
      'x-transform': 'trim input before validation',
    });
  });

  it('converts literals, enums, unions, records, arrays and strict objects', () => {
    assert.deepEqual(fieldOf("z.literal('x')"), { type: 'string', const: 'x' });
    assert.deepEqual(fieldOf('z.literal(4)'), { type: 'number', const: 4 });
    assert.deepEqual(fieldOf("z.enum(['a', 'b'])"), { type: 'string', enum: ['a', 'b'] });
    assert.deepEqual(fieldOf('z.union([z.string(), z.boolean()])'), {
      anyOf: [{ type: 'string' }, { type: 'boolean' }],
    });
    assert.deepEqual(
      fieldOf(
        "z.discriminatedUnion('k', [z.object({ k: z.literal('a') }), z.object({ k: z.literal('b') })])",
      ).anyOf.map((/** @type {any} */ v) => v.properties.k.const),
      ['a', 'b'],
    );
    assert.deepEqual(fieldOf('z.record(z.string(), z.number())'), {
      type: 'object',
      additionalProperties: { type: 'number' },
    });
    assert.deepEqual(fieldOf('z.object({ a: z.string() }).strict()'), {
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
      additionalProperties: false,
    });
    assert.deepEqual(fieldOf('z.string().brand()'), { type: 'string' });
    assert.deepEqual(fieldOf('z.unknown()'), {});
  });

  it('converts z.any() to an unconstrained schema', () => {
    const { schema, converter } = zodOf('z.object({ a: z.any() })');
    assert.deepEqual(schema.properties.a, {});
    assert.equal(converter.unresolved.size, 0);
  });

  it('applies the last unknown-key mode of an object', () => {
    const object = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
    assert.deepEqual(fieldOf('z.object({ a: z.string() }).strict().passthrough()'), object);
    assert.deepEqual(fieldOf('z.object({ a: z.string() }).strict().strip()'), object);
    assert.deepEqual(fieldOf('z.object({ a: z.string() }).passthrough().strict()'), {
      ...object,
      additionalProperties: false,
    });
  });

  for (const method of ['passthrough', 'strip', 'readonly'])
    it(`keeps a constrained schema through .${method}()`, () => {
      const { schema, converter } = zodOf(
        `z.object({ a: z.string().min(1), b: z.number().optional() }).${method}()`,
      );
      assert.deepEqual(schema, {
        type: 'object',
        properties: { a: { type: 'string', minLength: 1 }, b: { type: 'number' } },
        required: ['a'],
      });
      assert.equal(converter.unresolved.size, 0);
    });

  it('keeps the structure of a refinement but flags it partial and unresolved', () => {
    for (const method of ['refine', 'superRefine']) {
      const { schema, converter } = zodOf(`z.string().${method}((v) => v.length > 0)`);
      const expression = `Zod .${method}(...) semantic callback`;
      assert.deepEqual(schema, {
        type: 'string',
        'x-refinement': expression,
        'x-partial': true,
      });
      assert.deepEqual(
        [...converter.unresolved.values()],
        [
          {
            source: `${THING}:1`,
            typescript: expression,
            reason:
              'Structural schema retained; semantic refinement requires the source validator.',
          },
        ],
      );
    }
  });

  it('marks an unsupported method unresolved', () => {
    const schema = fieldOf('z.string().email()');
    assert.equal(schema['x-unresolved'], true);
    assert.equal(schema.type, undefined);
  });
});

describe('Effect', () => {
  it('expands structs, primitives, literals, arrays, nullables and checks', () => {
    assert.deepEqual(
      effectOf(
        "Schema.Struct({ a: Schema.String, n: Schema.Int, l: Schema.Literals(['x', 'y']), arr: Schema.Array(Schema.String), o: Schema.NullOr(Schema.String), h: Hex(4), p: Schema.String.check(Schema.isPattern(/^a$/)), m: Schema.Array(Schema.String).check(Schema.isMaxLength(3)) })",
        HEX,
      ),
      {
        type: 'object',
        properties: {
          a: { type: 'string' },
          n: { type: 'integer' },
          l: { type: 'string', enum: ['x', 'y'] },
          arr: { type: 'array', items: { type: 'string' } },
          o: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          h: { type: 'string', pattern: '^(?:[0-9a-f]{2}){1,4}$' },
          p: { type: 'string', pattern: '^a$' },
          m: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        },
        required: ['a', 'n', 'l', 'arr', 'o', 'h', 'p', 'm'],
      },
    );
  });

  it('includes the fields of a spread struct', () => {
    assert.deepEqual(
      effectOf(
        'Schema.Struct({ ...Base.fields, extra: Schema.String })',
        'const Base = Schema.Struct({ id: Schema.String });\n',
      ),
      {
        type: 'object',
        properties: { id: { type: 'string' }, extra: { type: 'string' } },
        required: ['id', 'extra'],
      },
    );
  });

  it('marks an unsupported Effect schema unresolved', () => {
    const schema = effectOf('Schema.Struct({ a: Schema.Number })');
    assert.equal(schema.properties.a['x-unresolved'], true);
    assert.equal(schema.properties.a.type, undefined);
    assert.equal(effectOf('Schema.Number.pipe(Schema.positive())')['x-unresolved'], true);
  });
});
