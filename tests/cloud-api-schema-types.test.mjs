/**
 * Unit tests for `scripts/cloud-api/schema-types.mjs` and
 * `scripts/cloud-api/schema-utilities.mjs`: each converts a small TypeScript
 * declaration of `Thing` from memory and asserts the exact JSON Schema, or the
 * `x-unresolved` marker where the type cannot be expanded exactly.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { convertThing, ROOT, schemaOf, THING } from './cloud-api-helpers.mjs';

/** The schema of `Thing = <type>`, without its location. @param {string} type */
const typeOf = (type) => schemaOf(`export type Thing = ${type};\n`).schema;
/** Assert that a schema is an unresolved placeholder. @param {any} schema */
const assertUnresolved = (schema) => {
  assert.equal(schema['x-unresolved'], true);
  assert.equal(schema.type, undefined);
};

describe('TypeScript types', () => {
  it('converts keywords, literals and optional members', () => {
    assert.deepEqual(
      typeOf(
        "{ s: string; n: number; b: boolean; z: null; l: 'x'; d: 3; t: true; v: never; u?: unknown }",
      ),
      {
        type: 'object',
        properties: {
          s: { type: 'string' },
          n: { type: 'number' },
          b: { type: 'boolean' },
          z: { type: 'null' },
          l: { type: 'string', const: 'x' },
          d: { type: 'number', const: 3 },
          t: { type: 'boolean', const: true },
          v: { not: {} },
          u: { description: 'Unconstrained value in the public TypeScript contract.' },
        },
        required: ['s', 'n', 'b', 'z', 'l', 'd', 't', 'v'],
      },
    );
  });

  it('converts arrays, unions, intersections and indexed access', () => {
    assert.deepEqual(typeOf('string[]'), { type: 'array', items: { type: 'string' } });
    assert.deepEqual(typeOf('ReadonlyArray<number>'), { type: 'array', items: { type: 'number' } });
    assert.deepEqual(typeOf("'a' | null"), {
      anyOf: [{ type: 'string', const: 'a' }, { type: 'null' }],
    });
    assert.deepEqual(typeOf('{ a: string } & { b: number }'), {
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
      ],
    });
    assert.deepEqual(typeOf("{ a: { b: string } }['a']"), {
      type: 'object',
      properties: { b: { type: 'string' } },
      required: ['b'],
    });
  });

  it('bounds a fixed tuple exactly', () => {
    assert.deepEqual(typeOf('[string, number]'), {
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      minItems: 2,
      maxItems: 2,
    });
  });

  it('lets optional tuple elements be omitted', () => {
    const expected = {
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number' }],
      minItems: 1,
      maxItems: 2,
    };
    assert.deepEqual(typeOf('[string, number?]'), expected);
    assert.deepEqual(typeOf('[id: string, count?: number]'), expected);
  });

  it('leaves a tuple with a final rest element unbounded above', () => {
    const expected = {
      type: 'array',
      prefixItems: [{ type: 'string' }],
      items: { type: 'number' },
      minItems: 1,
    };
    assert.deepEqual(typeOf('[string, ...number[]]'), expected);
    assert.deepEqual(typeOf('[id: string, ...rest: number[]]'), expected);
  });

  it('marks a tuple with a leading rest element unresolved', () => {
    assertUnresolved(typeOf('[...string[], number]'));
  });

  it('unwraps readonly but expands keyof', () => {
    assert.deepEqual(typeOf('readonly string[]'), { type: 'array', items: { type: 'string' } });
    assert.deepEqual(typeOf('keyof { id: string; n: number }'), {
      type: 'string',
      enum: ['id', 'n'],
    });
    assertUnresolved(typeOf('keyof Record<string, number>'));
    assertUnresolved(typeOf('unique symbol'));
  });

  it('marks unsupported syntax as unresolved and records it', () => {
    const { schema, converter } = schemaOf(`export type Thing = { code: \`ERR_\${string}\` };\n`);
    assertUnresolved(schema.properties.code);
    assert.deepEqual(
      [...converter.unresolved.values()].map((entry) => entry.source),
      [`${THING}:1`],
    );
  });

  it('refuses an unsupported DTO member', () => {
    assert.throws(
      () => schemaOf('export interface Thing { run(): void }\n'),
      /Unsupported DTO member: run\(\): void/,
    );
  });

  it('records the file that supplies a cross-file bound as used', () => {
    const { thing, converter } = convertThing({
      'packages/shared/src/limits.ts': 'export const MAX = 7;\n',
      [THING]:
        'const S = z.object({ name: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n',
    });
    assert.equal(thing.properties.name.maxLength, 7);
    assert.ok(converter.used.has(path.join(ROOT, 'packages/shared/src/limits.ts')));
  });
});

describe('interfaces', () => {
  it('includes inherited members', () => {
    const { schema } = schemaOf(
      'interface Base { id: string; note?: string }\nexport interface Thing extends Base { count: number }\n',
    );
    assert.deepEqual(schema, {
      type: 'object',
      properties: { id: { type: 'string' }, note: { type: 'string' }, count: { type: 'number' } },
      required: ['id', 'count'],
    });
  });

  it('lets a redeclared member narrow the inherited one', () => {
    const { schema } = schemaOf(
      "interface Base { kind: string }\nexport interface Thing extends Base { kind: 'thing' }\n",
    );
    assert.deepEqual(schema.properties.kind, { type: 'string', const: 'thing' });
  });

  it('marks an interface with an unknown or generic base unresolved', () => {
    assertUnresolved(schemaOf('export interface Thing extends Missing { a: string }\n').schema);
    assertUnresolved(
      schemaOf('interface Box<T> { v: T }\nexport interface Thing extends Box<string> {}\n').schema,
    );
  });
});

describe('utility types', () => {
  const OBJECT = '{ id: string; name?: string; count: number }';

  it('keeps or drops keys with Pick and Omit, inline or through an alias', () => {
    const picked = {
      type: 'object',
      properties: { id: { type: 'string' }, count: { type: 'number' } },
      required: ['id', 'count'],
    };
    assert.deepEqual(typeOf(`Pick<${OBJECT}, 'id' | 'count'>`), picked);
    assert.deepEqual(
      schemaOf(`type Keys = 'id' | 'count';\nexport type Thing = Pick<${OBJECT}, Keys>;\n`).schema,
      picked,
    );
    assert.deepEqual(
      schemaOf(`type Keys = 'id';\nexport type Thing = Omit<${OBJECT}, Keys>;\n`).schema,
      {
        type: 'object',
        properties: { name: { type: 'string' }, count: { type: 'number' } },
        required: ['count'],
      },
    );
  });

  it('marks Pick and Omit with an unresolvable key set unresolved', () => {
    assertUnresolved(typeOf(`Pick<${OBJECT}, keyof { id: string }>`));
    assertUnresolved(typeOf(`Omit<${OBJECT}, string>`));
  });

  it('makes every key required or optional with Required and Partial', () => {
    assert.deepEqual(typeOf(`Required<${OBJECT}>`).required, ['id', 'name', 'count']);
    assert.deepEqual(typeOf(`Partial<${OBJECT}>`).required, []);
    assert.deepEqual(typeOf(`Readonly<${OBJECT}>`).required, ['id', 'count']);
  });

  it('keeps both constraints of a property an intersection declares twice', () => {
    assert.deepEqual(typeOf("Partial<{ value: 'fixed' } & { value: string; other: number }>"), {
      type: 'object',
      properties: {
        value: { allOf: [{ type: 'string', const: 'fixed' }, { type: 'string' }] },
        other: { type: 'number' },
      },
      required: [],
    });
    assert.deepEqual(typeOf('Required<{ a?: string } & { a?: string }>').properties, {
      a: { type: 'string' },
    });
  });

  it('marks a utility over an intersection with a non-object part unresolved', () => {
    assertUnresolved(typeOf("Partial<string & { brand: 'x' }>"));
    assertUnresolved(typeOf('Partial<{ a: string } & Record<string, number>>'));
  });

  it('narrows unions with literal and discriminant filters', () => {
    assert.deepEqual(typeOf("Extract<'a' | 'b' | 'c', 'a' | 'b'>"), {
      anyOf: [
        { type: 'string', const: 'a' },
        { type: 'string', const: 'b' },
      ],
    });
    assert.deepEqual(typeOf("Exclude<'a' | 'b', 'a'>"), { type: 'string', const: 'b' });
    assert.deepEqual(
      typeOf("Extract<{ kind: 'x'; a: string } | { kind: 'y' }, { kind: 'x' }>").properties.kind,
      { type: 'string', const: 'x' },
    );
  });

  it('marks Extract and Exclude with an unsupported filter unresolved', () => {
    assertUnresolved(typeOf('Extract<string | number, string>'));
    assertUnresolved(typeOf('Exclude<{ a: string } | { b: string }, { a: string }>'));
  });
});
