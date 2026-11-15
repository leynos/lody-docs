/**
 * Unit tests that conversion never drops a constraint and never states an
 * exact result TypeScript might reduce to `never` or that Zod or Effect would
 * tighten: merging, flattening and utility types refuse parts whose
 * constraints they cannot keep; `keyof` refuses intersections that may be
 * `never`; chained Zod and Effect checks keep the tighter bound; and a check
 * on a schema it does not apply to is unresolved, each with its recorded
 * reason.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { schemaOf } from './cloud-api-helpers.mjs';

const ZOD = "import { z } from 'zod'; ";
const EFFECT = "import { Schema } from 'effect'; ";

/** @param {string} source */
const unresolvedReasons = (source) => {
  const { schema, converter } = schemaOf(source);
  return { schema, reasons: [...converter.unresolved.values()].map((entry) => entry.reason) };
};
/** @param {string} expression */
const zodField = (expression) =>
  unresolvedReasons(
    `${ZOD}const S = z.object({ f: ${expression} });\nexport type Thing = z.infer<typeof S>;\n`,
  );

describe('merging and flattening', () => {
  for (const order of ['Strict & { b: number }', '{ b: number } & Strict'])
    it(`refuses Partial over an intersection with a strict object (${order})`, () => {
      const { schema, reasons } = unresolvedReasons(
        `${ZOD}const S = z.object({ a: z.string() }).strict();\ntype Strict = z.infer<typeof S>;\nexport type Thing = Partial<${order}>;\n`,
      );
      assert.equal(schema['x-unresolved'], true);
      assert.deepEqual(reasons, ['Utility target is not an object.']);
    });

  it('refuses a utility that would drop a refinement or an index signature', () => {
    const refined = unresolvedReasons(
      `${ZOD}const S = z.object({ a: z.string() }).refine((v) => v.a !== '');\nexport type Thing = Partial<z.infer<typeof S>>;\n`,
    );
    assert.equal(refined.schema['x-unresolved'], true);
    assert.ok(refined.reasons.includes('Utility target has constraints the utility would drop.'));
    const indexed = unresolvedReasons(
      "export type Thing = Pick<{ a: string; [k: string]: string }, 'a'>;\n",
    );
    assert.equal(indexed.schema['x-unresolved'], true);
  });

  it('refuses an interface whose base carries constraints it would drop', () => {
    const { schema } = unresolvedReasons(
      `${ZOD}const S = z.object({ a: z.string() }).refine((v) => v.a !== '');\ntype Base = z.infer<typeof S>;\nexport interface Thing extends Base { b: number }\n`,
    );
    assert.equal(schema['x-unresolved'], true);
  });
});

describe('keyof over intersections', () => {
  it('refuses an intersection that may reduce to never', () => {
    for (const source of [
      "export type Thing = keyof ({ kind: 'a' } & { kind: 'b' });\n",
      "type A = { kind: 'a' };\ntype B = { kind: 'b' };\nexport type Thing = keyof (A & B);\n",
      "export type Thing = keyof ({ kind: Kind } & { kind: 'b' });\n",
    ]) {
      const { schema, reasons } = unresolvedReasons(source);
      assert.equal(schema['x-unresolved'], true, source);
      assert.deepEqual(reasons, ['Key set of the type is not exactly known.']);
    }
  });

  it('refuses a three-part intersection whose parts conflict in any pair', () => {
    for (const type of [
      "{ kind: string } & { kind: 'a' } & { kind: 'b' }",
      "{ kind: 'a' } & { kind: string } & { kind: 'b' }",
      "{ kind: 'a' } & { kind: 'b' } & { kind: string }",
      'A & B & C',
      'C & A & B',
    ]) {
      const { schema, reasons } = unresolvedReasons(
        `type A = { kind: string };\ntype B = { kind: 'a' };\ntype C = { kind: 'b' };\nexport type Thing = keyof (${type});\n`,
      );
      assert.equal(schema['x-unresolved'], true, type);
      assert.deepEqual(reasons, ['Key set of the type is not exactly known.'], type);
    }
  });

  it('refuses nested conflicting intersections through aliases and parentheses', () => {
    const named = "type Inner = { kind: string } & { kind: 'a' };\ntype Leaf = { kind: 'b' };\n";
    for (const type of [
      "Inner & { kind: 'b' }",
      "{ kind: 'b' } & Inner",
      '(Leaf & Inner)',
      "({ kind: string } & ({ kind: 'a' } & Leaf))",
      "(({ kind: 'b' } & { kind: string }) & { kind: 'a' })",
    ]) {
      const { schema, reasons } = unresolvedReasons(
        `${named}export type Thing = keyof (${type});\n`,
      );
      assert.equal(schema['x-unresolved'], true, type);
      assert.deepEqual(reasons, ['Key set of the type is not exactly known.'], type);
    }
  });

  it('refuses any property declared twice with different types, even compatible ones', () => {
    for (const type of [
      "{ kind: 'a' } & { kind: string; a: number }",
      "{ kind: string; a: 1 } & { kind: 'a' } & { kind: 'a' }",
      "Base & { kind: 'a' }",
    ])
      assert.equal(
        schemaOf(`interface Base { kind: string }\nexport type Thing = keyof (${type});\n`).schema[
          'x-unresolved'
        ],
        true,
        type,
      );
    assert.equal(
      schemaOf(
        "interface Base { kind: string }\ninterface K extends Base { kind: 'a' }\nexport type Thing = keyof K;\n",
      ).schema['x-unresolved'],
      true,
    );
  });

  it('refuses the same type text meaning different types in different modules', () => {
    const { schema } = schemaOf(
      "import type { A } from './a';\ntype Kind = 'a';\nexport type Thing = keyof ({ kind: Kind } & A);\n",
      { 'packages/shared/src/a.ts': "type Kind = 'b';\nexport type A = { kind: Kind };\n" },
    );
    assert.equal(schema['x-unresolved'], true);
  });

  it('treats numeric and quoted numeric names as one property', () => {
    const named = "type Num = { 1: 'a' };\ntype Str = { '1': 'b' };\ntype Same = { '1': 'a' };\n";
    for (const type of [
      "{ 1: 'a' } & { '1': 'b' }",
      "{ '1': 'b' } & { 1: 'a' }",
      'Num & Str',
      '(Str & (Num))',
      "{ 1: 'a' } & { '1': 'a' }",
      'Num & Same',
      "{ 0x1: 'a' } & { '1': 'a' }",
      "{ 1.0: 'a' } & { '1': 'b' }",
    ]) {
      const { schema, reasons } = unresolvedReasons(
        `${named}export type Thing = keyof (${type});\n`,
      );
      assert.equal(schema['x-unresolved'], true, type);
      assert.deepEqual(reasons, ['Key set of the type is not exactly known.'], type);
    }
  });

  it('groups numeric spellings of one number, keeping the key numeric', () => {
    for (const [type, keys] of [
      ["{ 0x1: 'a' } & { 1: 'a' }", [1]],
      ["{ 1.0: 'a'; 2: 'c' } & { 1e0: 'a' }", [1, 2]],
    ])
      assert.deepEqual(schemaOf(`export type Thing = keyof (${type});\n`).schema, {
        type: 'number',
        enum: keys,
      });
    assert.equal(
      schemaOf("export type Thing = keyof ({ 0x1: 'a' } & { 1: 'b' });\n").schema['x-unresolved'],
      true,
    );
    assert.deepEqual(schemaOf("export type Thing = keyof ({ '01': 'a' } & { 1: 'b' });\n").schema, {
      anyOf: [
        { type: 'string', enum: ['01'] },
        { type: 'number', enum: [1] },
      ],
    });
  });

  it('keeps an exact key set when repeats are one identical declaration', () => {
    for (const type of [
      "{ kind: 'a'; a: number } & { kind: 'a' }",
      '{ kind: string } & { kind: string; a: 1 }',
      "({ kind: 'a' } & { a: 1 }) & { kind: 'a' }",
    ])
      assert.deepEqual(schemaOf(`export type Thing = keyof (${type});\n`).schema, {
        type: 'string',
        enum: ['kind', 'a'],
      });
  });
});

describe('chained Zod checks', () => {
  it('keeps the tighter bound of a chain', () => {
    assert.deepEqual(zodField('z.string().min(5).min(1).max(3).max(9)').schema.properties.f, {
      type: 'string',
      minLength: 5,
      maxLength: 3,
    });
    assert.deepEqual(zodField('z.number().min(5).nonnegative()').schema.properties.f, {
      type: 'number',
      minimum: 5,
    });
  });

  it('refuses a check on a schema it does not apply to', () => {
    for (const expression of [
      'z.string().nullable().min(1)',
      'z.string().int()',
      'z.number().uuid()',
      'z.string().strict()',
    ]) {
      const { schema, reasons } = zodField(expression);
      assert.equal(schema.properties.f['x-unresolved'], true, expression);
      assert.equal(reasons.length, 1, expression);
    }
  });

  it('refuses a second format or pattern instead of replacing the first', () => {
    for (const expression of ['z.string().uuid().url()', 'z.string().regex(/a/).regex(/b/)'])
      assert.equal(zodField(expression).schema.properties.f['x-unresolved'], true, expression);
  });
});

describe('chained Effect checks', () => {
  /** @param {string} expression @param {string} [before] */
  const effect = (expression, before = '') =>
    unresolvedReasons(
      `${EFFECT}${before}const S = ${expression};\nexport type Thing = typeof S.Type;\n`,
    );

  it('bounds strings by length and arrays by items, keeping the tighter one', () => {
    assert.deepEqual(effect('Schema.String.check(Schema.isMaxLength(4))').schema, {
      type: 'string',
      maxLength: 4,
    });
    assert.deepEqual(
      effect('Schema.Array(Schema.String).check(Schema.isMaxLength(4), Schema.isMaxLength(9))')
        .schema,
      { type: 'array', items: { type: 'string' }, maxItems: 4 },
    );
  });

  it('refuses a second pattern and a check on another type', () => {
    for (const expression of [
      'Schema.String.check(Schema.isPattern(/a/), Schema.isPattern(/b/))',
      'Schema.Int.check(Schema.isMaxLength(4))',
    ])
      assert.equal(effect(expression).schema['x-unresolved'], true, expression);
  });

  it('spreads only the fields of a plain struct, without duplicate requirements', () => {
    assert.deepEqual(
      effect(
        'Schema.Struct({ ...Base.fields, id: Schema.String })',
        'const Base = Schema.Struct({ id: Schema.Int, n: Schema.Int });\n',
      ).schema,
      {
        type: 'object',
        properties: { id: { type: 'string' }, n: { type: 'integer' } },
        required: ['id', 'n'],
      },
    );
    for (const before of [
      'const Base = Schema.NullOr(Schema.Struct({ id: Schema.Int }));\n',
      'const Base = Schema.String;\n',
    ])
      assert.equal(
        effect('Schema.Struct({ ...Base.fields, x: Schema.String })', before).schema[
          'x-unresolved'
        ],
        true,
        before,
      );
    assert.equal(
      effect(
        'Schema.Struct({ ...Base.other, x: Schema.String })',
        'const Base = Schema.Struct({ id: Schema.Int });\n',
      ).schema['x-unresolved'],
      true,
    );
  });
});
