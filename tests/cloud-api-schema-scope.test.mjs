/**
 * Unit tests for `scripts/cloud-api/schema-scope.mjs` and its use throughout
 * conversion: every type, value and library name resolves in the module that
 * contains the reference, a same-named declaration elsewhere is never picked,
 * and two same-named declarations never share a component schema.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONTRACT, CONTRACT_PATH, convertThing, schemaOf, THING } from './cloud-api-helpers.mjs';

/** A contract module that declares an unrelated `Base`, indexed first. */
const COLLIDING = { [CONTRACT_PATH]: `${CONTRACT}interface Base { other: boolean }\n` };
const OWN_BASE = { id: { type: 'string' }, count: { type: 'number' } };

describe('type references', () => {
  it('resolves an alias of a local base, not an earlier same-named one', () => {
    const { schema } = schemaOf(
      'interface Base { id: string }\ntype Alias = Base;\nexport interface Thing extends Alias { count: number }\n',
      COLLIDING,
    );
    assert.deepEqual(schema.properties, OWN_BASE);
  });

  it('resolves an imported alias despite a colliding declaration', () => {
    const { schema } = schemaOf(
      "import type { Alias } from './alias';\nexport interface Thing extends Alias { count: number }\n",
      {
        ...COLLIDING,
        'packages/shared/src/alias.ts':
          'interface Base { id: string }\nexport type Alias = Base;\n',
      },
    );
    assert.deepEqual(schema.properties, OWN_BASE);
  });

  it('resolves property types, utility arguments, keyof and indexed access locally', () => {
    const base = 'interface Base { id: string }\n';
    const cases = [
      [
        '{ b: Base }',
        (/** @type {any} */ s, /** @type {any} */ c) =>
          c.schemas[s.properties.b.$ref.split('/').at(-1)].properties,
      ],
      ['Partial<Base>', (/** @type {any} */ s) => s.properties],
      ['Pick<Base, "id">', (/** @type {any} */ s) => s.properties],
    ];
    for (const [type, select] of cases) {
      const { thing, converter } = convertThing({
        ...COLLIDING,
        [THING]: `${base}export type Thing = ${type};\n`,
      });
      assert.deepEqual(/** @type {Function} */ (select)(thing, converter), {
        id: { type: 'string' },
      });
    }
    assert.deepEqual(schemaOf(`${base}export type Thing = keyof Base;\n`, COLLIDING).schema, {
      type: 'string',
      enum: ['id'],
    });
    assert.deepEqual(schemaOf(`${base}export type Thing = Base['id'];\n`, COLLIDING).schema, {
      type: 'string',
    });
  });

  it('gives same-named declarations from different modules separate components', () => {
    const { converter } = convertThing({
      'packages/shared/src/other.ts': 'export interface Base { other: boolean }\n',
      [THING]:
        "import type { Base as OtherBase } from './other';\ninterface Base { id: string }\nexport type Thing = { mine: Base; theirs: OtherBase };\n",
    });
    const { mine, theirs } = converter.schemas.Dto_Thing.properties;
    assert.notEqual(mine.$ref, theirs.$ref);
    assert.deepEqual(Object.keys(converter.schemas[mine.$ref.split('/').at(-1)].properties), [
      'id',
    ]);
    assert.deepEqual(Object.keys(converter.schemas[theirs.$ref.split('/').at(-1)].properties), [
      'other',
    ]);
  });

  it('resolves import types and workspace package imports', () => {
    const shared = {
      'packages/shared/src/index.ts': "export * from './base';\n",
      'packages/shared/src/base.ts': 'export interface Base { id: string }\n',
    };
    for (const source of [
      "export type Thing = { b: import('./base').Base };\n",
      "import type { Base } from '@lody/shared';\nexport type Thing = { b: Base };\n",
    ]) {
      const { thing, converter } = convertThing({ ...COLLIDING, ...shared, [THING]: source });
      const target = converter.schemas[thing.properties.b.$ref.split('/').at(-1)];
      assert.deepEqual(target.properties, { id: { type: 'string' } });
    }
  });

  it('marks a reference with several declarations in scope or none unresolved', () => {
    const { schema } = schemaOf('export type Thing = { b: Base };\n', {
      ...COLLIDING,
      'packages/shared/src/other.ts': 'interface Base { id: string }\n',
    });
    assert.equal(schema.properties.b['x-unresolved'], true);
    const missing = schemaOf(
      "import type { Base } from '@lody/unindexed';\nexport type Thing = { b: Base };\n",
      COLLIDING,
    );
    assert.equal(missing.schema.properties.b['x-unresolved'], true);
  });
});

describe('value and library names', () => {
  const zod = "import { z } from 'zod';\n";

  it('resolves a bound constant through its import, not a same-named one elsewhere', () => {
    const { schema } = schemaOf(
      `${zod}import { MAX } from './limits';\nconst S = z.object({ a: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n`,
      {
        [CONTRACT_PATH]: `${CONTRACT}const MAX = 1;\n`,
        'packages/shared/src/limits.ts': 'export const MAX = 9;\n',
      },
    );
    assert.equal(schema.properties.a.maxLength, 9);
  });

  it('refuses a bound constant with several unimported candidates', () => {
    assert.throws(
      () =>
        schemaOf(
          `${zod}const S = z.object({ a: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n`,
          {
            [CONTRACT_PATH]: `${CONTRACT}const MAX = 1;\n`,
            'packages/shared/src/limits.ts': 'export const MAX = 9;\n',
          },
        ),
      /Unsupported numeric schema bound: MAX/,
    );
  });

  it('treats z and Schema as the libraries only when imported from them', () => {
    const local = schemaOf(
      'const z = { string: () => 0 };\nconst S = z.string();\nexport type Thing = z.infer<typeof S>;\n',
    ).schema;
    assert.equal(local['x-unresolved'], true);
    const effect = schemaOf(
      "import { Schema } from './my-schema';\nconst S = Schema.String;\nexport type Thing = typeof S.Type;\n",
    ).schema;
    assert.equal(effect['x-unresolved'], true);
  });

  it('expands Hex(n) only for the known helper definition', () => {
    const effect = "import { Schema } from 'effect';\n";
    const helper = (/** @type {string} */ body) =>
      schemaOf(
        `${effect}const Hex = (n: number) => ${body};\nconst S = Schema.Struct({ h: Hex(4) });\nexport type Thing = typeof S.Type;\n`,
      ).schema.properties.h;
    assert.deepEqual(
      helper('Schema.String.check(Schema.isPattern(new RegExp(`^(?:[0-9a-f]{2}){1,$' + '{n}}$`)))'),
      { type: 'string', pattern: '^(?:[0-9a-f]{2}){1,4}$' },
    );
    assert.equal(helper('Schema.String')['x-unresolved'], true);
  });
});
