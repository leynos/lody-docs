/**
 * Unit tests for `scripts/cloud-api/schema-keys.mjs`: how record keys resolve
 * through local declarations, local namespaces, every import form, relative
 * re-exports and the agreement-only global fallback, and when they are refused
 * as `x-unresolved`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONTRACT, convertThing } from './cloud-api-helpers.mjs';

describe('record-key resolution', () => {
  /** Sources in which a private `Key` in the contract module is loaded first. */
  const shadowed = {
    'packages/cloud-api/src/index.ts': `${CONTRACT}type Key = 'other';\n`,
  };

  it('resolves a record-key alias declared in the same module', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/thing.ts':
        "type Key = 'id';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  it('follows a renamed re-export through a barrel', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/keys/internal.ts': "export type InternalKey = 'id';\n",
      'packages/shared/src/keys/index.ts': "export { InternalKey as Key } from './internal';\n",
      'packages/shared/src/thing.ts':
        "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  it('follows a star re-export and a local renamed export', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/keys/internal.ts':
        "type InternalKey = 'id';\nexport { InternalKey as Key };\n",
      'packages/shared/src/keys/index.ts': "export * from './internal';\n",
      'packages/shared/src/thing.ts':
        "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  /** @type {Array<[string, string, Record<string, string>]>} */
  const unresolvable = [
    [
      'a package import',
      '@lody/keys',
      { 'packages/shared/src/keys.ts': "export type Key = 'id';\n" },
    ],
    ['a missing module', './missing', {}],
    [
      'a module that does not export it',
      './keys',
      { 'packages/shared/src/keys.ts': 'export {};\n' },
    ],
  ];
  for (const [name, specifier, extra] of unresolvable)
    it(`marks a record key imported from ${name} as unresolved`, () => {
      const { thing } = convertThing({
        ...shadowed,
        ...extra,
        'packages/shared/src/thing.ts': `import type { Key } from '${specifier}';\nexport type Thing = Record<Key, string>;\n`,
      });
      assert.equal(thing['x-unresolved'], true);
      assert.equal(thing.required, undefined);
    });

  const KEYS = 'packages/shared/src/keys.ts';
  const THING = 'packages/shared/src/thing.ts';
  /** @param {string} imports how thing.ts imports its key @param {string} [key] */
  const thingWith = (imports, key = 'Key') =>
    `${imports}\nexport type Thing = Record<${key}, string>;\n`;
  /** @type {Array<[string, Record<string, string>]>} */
  const followed = [
    [
      'a default import of `export type { X as default }`',
      {
        [KEYS]: "type ActualKey = 'id';\nexport type { ActualKey as default };\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    [
      'a default import of `export default X`',
      {
        [KEYS]: "type ActualKey = 'id';\nexport default ActualKey;\n",
        [THING]: thingWith("import Key from './keys';"),
      },
    ],
    [
      'a default import re-exported through a barrel',
      {
        'packages/shared/src/keys/actual.ts':
          "type ActualKey = 'id';\nexport { ActualKey as default };\n",
        'packages/shared/src/keys/index.ts': "export { default } from './actual';\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    [
      'a namespace import used as `ns.Key`',
      {
        [KEYS]: "export type Key = 'id';\n",
        [THING]: thingWith("import * as keys from './keys';", 'keys.Key'),
      },
    ],
  ];
  followed.push([
    'an `import = require` binding used as `m.Key`',
    {
      [KEYS]: "export type Key = 'id';\n",
      [THING]: thingWith("import keys = require('./keys');", 'keys.Key'),
    },
  ]);
  for (const [name, sources] of followed)
    it(`follows ${name}`, () => {
      const { thing } = convertThing({ ...shadowed, ...sources });
      assert.deepEqual(thing.required, ['id']);
    });

  /** @type {Array<[string, Record<string, string>]>} */
  const refused = [
    [
      'a default import from a module without a default export',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    ['a default import from a package', { [THING]: thingWith("import Key from '@lody/keys';") }],
    [
      'a namespace import from a package used as `ns.Key`',
      { [THING]: thingWith("import * as keys from '@lody/keys';", 'keys.Key') },
    ],
    [
      'a namespace binding used as a key',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import * as Key from './keys';"),
      },
    ],
    [
      'an `import = require` binding',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import Key = require('./keys');"),
      },
    ],
  ];
  refused.push(
    [
      'an `import = require` of a package used as `m.Key`',
      { [THING]: thingWith("import keys = require('@lody/keys');", 'keys.Key') },
    ],
    [
      'a default import used as a namespace',
      {
        [KEYS]: "export type Key = 'id';\nexport default {};\n",
        [THING]: thingWith("import keys from './keys';", 'keys.Key'),
      },
    ],
    [
      'a named import used as a namespace',
      {
        [KEYS]: "export namespace keys { export type Key = 'id'; }\n",
        [THING]: thingWith("import { keys } from './keys';", 'keys.Key'),
      },
    ],
    [
      'a deeper path through a namespace import',
      {
        [KEYS]: "export type Key = 'id';\n",
        [THING]: thingWith("import * as keys from './keys';", 'keys.inner.Key'),
      },
    ],
  );
  for (const [name, sources] of refused)
    it(`marks a record key from ${name} as unresolved`, () => {
      const { thing } = convertThing({ ...shadowed, ...sources });
      assert.equal(thing['x-unresolved'], true);
      assert.equal(thing.required, undefined);
    });

  it('resolves a key qualified by a local namespace', () => {
    const { thing } = convertThing({
      ...shadowed,
      [THING]: thingWith("namespace Local { export type Key = 'id'; }", 'Local.Key'),
    });
    assert.deepEqual(thing.required, ['id']);
    assert.deepEqual(thing.properties, { id: { type: 'string' } });
  });

  for (const [name, imports, key] of [
    ['a qualifier that is neither imported nor a local namespace', '', 'Global.Key'],
    [
      'a member a local namespace does not export',
      "namespace Local { type Key = 'id'; }",
      'Local.Key',
    ],
    [
      'a deeper path through a local namespace',
      "namespace Local { export type Key = 'id'; }",
      'Local.a.Key',
    ],
  ])
    it(`marks a record key from ${name} as unresolved`, () => {
      const { thing } = convertThing({ ...shadowed, [THING]: thingWith(imports, key) });
      assert.equal(thing['x-unresolved'], true);
      assert.equal(thing.additionalProperties, undefined);
    });

  it('falls back to loaded declarations of an unimported name only when they agree', () => {
    const agree = convertThing({
      'packages/shared/src/keys.ts': "type Key = 'id';\n",
      'packages/shared/src/other.ts': "type Key = 'id';\n",
      'packages/shared/src/thing.ts': 'export type Thing = Record<Key, string>;\n',
    });
    assert.deepEqual(agree.thing.required, ['id']);
    const disagree = convertThing({
      ...shadowed,
      'packages/shared/src/keys.ts': "type Key = 'id';\n",
      'packages/shared/src/thing.ts': 'export type Thing = Record<Key, string>;\n',
    });
    assert.equal(disagree.thing['x-unresolved'], true);
  });
});
