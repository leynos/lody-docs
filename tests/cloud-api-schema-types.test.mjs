/**
 * Unit tests for `scripts/cloud-api/schema-types.mjs` and
 * `scripts/cloud-api/schema-utilities.mjs`: each converts a small TypeScript
 * declaration of `Thing` from memory and asserts the exact JSON Schema, or the
 * `x-unresolved` marker where the type cannot be expanded exactly.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  CONTRACT,
  CONTRACT_PATH,
  convertThing,
  ROOT,
  schemaOf,
  THING,
} from './cloud-api-helpers.mjs';

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

  it('keeps numeric property names numeric in keyof', () => {
    assert.deepEqual(typeOf('keyof { 1: string }'), { type: 'number', enum: [1] });
    assert.deepEqual(typeOf("keyof { '1': string }"), { type: 'string', enum: ['1'] });
    const mixed = {
      anyOf: [
        { type: 'string', enum: ['a'] },
        { type: 'number', enum: [2] },
      ],
    };
    assert.deepEqual(typeOf('keyof { a: string; 2: number }'), mixed);
    assert.deepEqual(
      schemaOf(
        'interface Base { 2: number }\ninterface K extends Base { a: string }\nexport type Thing = keyof K;\n',
      ).schema,
      mixed,
    );
  });

  it('marks keyof of a type with an inexact key set unresolved and records it', () => {
    for (const type of ['{ [k: string]: number }', "{ ['a' + 'b']: string }", 'Missing']) {
      const { schema, converter } = schemaOf(`export type Thing = keyof ${type};\n`);
      assertUnresolved(schema);
      assert.deepEqual(
        [...converter.unresolved.values()].map((entry) => entry.reason),
        ['Key set of the type is not exactly known.'],
      );
    }
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
        "import { z } from 'zod';\nconst S = z.object({ name: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n",
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

  it('resolves a base in the extending module, not an earlier same-named one', () => {
    const { schema } = schemaOf(
      'interface Base { id: string }\nexport interface Thing extends Base { count: number }\n',
      { [CONTRACT_PATH]: `${CONTRACT}interface Base { other: boolean }\n` },
    );
    assert.deepEqual(schema, {
      type: 'object',
      properties: { id: { type: 'string' }, count: { type: 'number' } },
      required: ['id', 'count'],
    });
  });

  it('resolves an imported, renamed or namespace base despite a colliding name', () => {
    const extra = {
      [CONTRACT_PATH]: `${CONTRACT}interface Base { other: boolean }\n`,
      'packages/shared/src/real.ts': 'export interface Real { id: string }\n',
    };
    for (const source of [
      "import type { Real as Base } from './real';\nexport interface Thing extends Base { n: number }\n",
      "import * as m from './real';\nexport interface Thing extends m.Real { n: number }\n",
    ])
      assert.deepEqual(schemaOf(source, extra).schema.properties, {
        id: { type: 'string' },
        n: { type: 'number' },
      });
  });

  it('marks an interface whose imported base cannot be followed unresolved', () => {
    const { schema } = schemaOf(
      "import type { Base } from '@lody/elsewhere';\nexport interface Thing extends Base { n: number }\n",
      { [CONTRACT_PATH]: `${CONTRACT}interface Base { other: boolean }\n` },
    );
    assertUnresolved(schema);
  });

  it('never shares a base schema between same-named bases in different modules', () => {
    const { converter } = convertThing({
      'packages/shared/src/other.ts':
        'interface Base { other: boolean }\nexport interface Other extends Base { x: string }\n',
      [THING]:
        "import type { Other } from './other';\ninterface Base { id: string }\nexport interface Thing extends Base { o: Other }\n",
    });
    assert.deepEqual(Object.keys(converter.schemas.Dto_Thing.properties), ['id', 'o']);
    assert.deepEqual(Object.keys(converter.schemas.Dto_Other.properties), ['other', 'x']);
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
    const properties = {
      id: { type: 'string' },
      name: { type: 'string' },
      count: { type: 'number' },
    };
    assert.deepEqual(typeOf(`Required<${OBJECT}>`), {
      type: 'object',
      properties,
      required: ['id', 'name', 'count'],
    });
    assert.deepEqual(typeOf(`Partial<${OBJECT}>`), { type: 'object', properties, required: [] });
    assert.deepEqual(typeOf(`Readonly<${OBJECT}>`), {
      type: 'object',
      properties,
      required: ['id', 'count'],
    });
  });

  for (const order of [
    "{ constructor: 'a' } & { constructor: string }",
    "{ constructor: string } & { constructor: 'a' }",
  ])
    it(`intersects a property named after an Object.prototype member (${order})`, () => {
      const schema = typeOf(`Partial<${order}>`);
      const [first, second] = order.split(' & ').map((part) => typeOf(part).properties.constructor);
      assert.deepEqual(schema, {
        type: 'object',
        properties: { constructor: { allOf: [first, second] } },
        required: [],
      });
      assert.doesNotMatch(JSON.stringify(schema), /null/);
    });

  it('keeps __proto__ as an ordinary property', () => {
    const schema = typeOf('Partial<{ __proto__: string } & { a: number }>');
    assert.ok(Object.hasOwn(schema.properties, '__proto__'));
    assert.equal(Object.getPrototypeOf(schema.properties), Object.prototype);
    assert.deepEqual(Object.keys(schema.properties), ['__proto__', 'a']);
    assert.match(JSON.stringify(schema), /"__proto__":\{"type":"string"\}/);
    assert.deepEqual(typeOf('{ __proto__: string }').required, ['__proto__']);
  });

  it('never reads an inherited member as a property', () => {
    assertUnresolved(typeOf("{ a: string }['constructor']"));
    assert.deepEqual(typeOf("Omit<{ toString: string; a: number }, 'a'>"), {
      type: 'object',
      properties: { toString: { type: 'string' } },
      required: ['toString'],
    });
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

  it('classifies an enum by its literals, Extract and Exclude alike', () => {
    /** @param {string} utility */
    const ofEnum = (utility) =>
      schemaOf(
        `import { z } from 'zod';\nconst Status = z.enum(['a', 'b', 'c']);\nexport type Thing = ${utility}<z.infer<typeof Status>, 'a'>;\n`,
      ).schema;
    assert.deepEqual(ofEnum('Exclude'), {
      anyOf: [
        { type: 'string', const: 'b' },
        { type: 'string', const: 'c' },
      ],
    });
    assert.deepEqual(ofEnum('Extract'), { type: 'string', const: 'a' });
  });

  it('classifies an intersection by the discriminants its parts fix', () => {
    const schema = typeOf(
      "Extract<({ kind: 'x' } & ({ a: string } | { b: string })) | { kind: 'y' }, { kind: 'y' }>",
    );
    assert.deepEqual(schema.properties.kind, { type: 'string', const: 'y' });
    assertUnresolved(
      typeOf(
        "Extract<({ a: string } | { b: string }) & { c: string } | { kind: 'y' }, { kind: 'y' }>",
      ),
    );
  });

  it('refuses a variant the filter cannot classify instead of keeping it', () => {
    assertUnresolved(typeOf("Exclude<string | 'a', 'a'>"));
    assertUnresolved(typeOf("Extract<({ k: 'x' } | { k: 'y' })[] | 'a', 'a'>"));
  });

  it('marks z.infer of anything but a typeof query unresolved', () => {
    for (const argument of ['(typeof schemas)[number]', 'Alias'])
      assertUnresolved(
        schemaOf(
          `import { z } from 'zod';\nconst schemas = [z.string()];\ntype Alias = typeof schemas;\nexport type Thing = z.infer<${argument}>;\n`,
        ).schema,
      );
  });
});
