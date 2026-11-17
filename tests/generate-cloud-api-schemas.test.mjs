/**
 * End-to-end tests of the generator's schema conversion, against a temporary
 * Git repository (`cloud-api-fixture.mjs`): the generated OpenAPI document
 * carries the expected schema or the `x-unresolved` marker.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  INDEX,
  SOURCES,
  TEMPLATE_TYPE,
  THING,
  assertNothingWritten,
  fixture,
  generate,
  openapi,
} from './cloud-api-fixture.mjs';

describe('generate-cloud-api schema conversion', () => {
  it('fails on an unsupported DTO member', () => {
    const f = fixture('member', {
      'packages/shared/src/thing.ts': 'export interface Thing {\n  run(): void;\n}\n',
    });
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported DTO member: run\(\): void;/);
    assertNothingWritten(f);
  });

  /** The fixture's CloudApi module with a private `Key` alias loaded first. */
  const shadowingIndex = { [INDEX]: `${SOURCES[INDEX]}type Key = 'other';\n` };
  /** @param {string} name @param {Record<string, string>} overrides */
  function thingSchema(name, overrides) {
    const f = fixture(name, overrides);
    const result = generate(f);
    assert.equal(result.status, 0, result.stderr);
    return openapi(f).components.schemas.Dto_Thing;
  }

  it('deduplicates record keys from overlapping aliases', () => {
    const thing = thingSchema('record-duplicates', {
      [THING]:
        "type Base = 'left' | 'right';\nexport type Thing = Record<Base | 'left', string>;\n",
    });
    assert.deepEqual(thing.required, ['left', 'right']);
    assert.deepEqual(Object.keys(thing.properties), ['left', 'right']);
  });

  it('resolves a record-key alias in the module that declares it', () => {
    const thing = thingSchema('record-local', {
      ...shadowingIndex,
      [THING]: "type Key = 'id';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
    assert.deepEqual(thing.properties, { id: { type: 'string' } });
  });

  it('resolves a record-key alias through a relative import', () => {
    const thing = thingSchema('record-import', {
      ...shadowingIndex,
      'packages/shared/src/keys.ts': "export type Key = 'id';\n",
      [THING]: "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  it('resolves a record-key alias renamed through a barrel re-export', () => {
    const thing = thingSchema('record-barrel', {
      ...shadowingIndex,
      'packages/shared/src/keys/internal.ts': "export type InternalKey = 'id';\n",
      'packages/shared/src/keys/index.ts': "export { InternalKey as Key } from './internal';\n",
      [THING]: "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
    assert.deepEqual(Object.keys(thing.properties), ['id']);
  });

  it('marks a record key imported from an unresolvable module as unresolved', () => {
    const thing = thingSchema('record-unresolvable', {
      ...shadowingIndex,
      [THING]: "import type { Key } from './missing';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.equal(thing['x-unresolved'], true);
    assert.equal(thing['x-typescript'], 'Record<Key, string>');
    assert.equal(thing.required, undefined);
  });

  it('resolves a record-key alias reached through a default import', () => {
    const thing = thingSchema('record-default', {
      ...shadowingIndex,
      'packages/shared/src/keys.ts':
        "type ActualKey = 'id';\nexport type { ActualKey as default };\n",
      [THING]: "import type Key from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
    assert.deepEqual(Object.keys(thing.properties), ['id']);
  });

  it('marks a record key from a default import that cannot be followed as unresolved', () => {
    const thing = thingSchema('record-default-unfollowed', {
      ...shadowingIndex,
      'packages/shared/src/keys.ts': "export type ActualKey = 'id';\n",
      [THING]: "import type Key from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.equal(thing['x-unresolved'], true);
    assert.equal(thing.required, undefined);
  });

  it('resolves a record key qualified by an `import = require` binding', () => {
    const thing = thingSchema('record-require', {
      ...shadowingIndex,
      'packages/shared/src/keys.ts': "export type Key = 'id';\n",
      [THING]: "import keys = require('./keys');\nexport type Thing = Record<keys.Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
    assert.deepEqual(Object.keys(thing.properties), ['id']);
  });

  it('marks a record key qualified by a package `import = require` as unresolved', () => {
    const thing = thingSchema('record-require-package', {
      ...shadowingIndex,
      [THING]:
        "import keys = require('@lody/keys');\nexport type Thing = Record<keys.Key, string>;\n",
    });
    assert.equal(thing['x-unresolved'], true);
    assert.equal(thing.additionalProperties, undefined);
    assert.equal(thing.required, undefined);
  });

  it('marks an ambiguous record-key alias as unresolved', () => {
    const thing = thingSchema('record-ambiguous', {
      ...shadowingIndex,
      'packages/shared/src/keys.ts': "export type Key = 'id';\n",
      [THING]: "import type { Key } from '@lody/keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.equal(thing['x-unresolved'], true);
    assert.equal(thing['x-typescript'], 'Record<Key, string>');
    assert.equal(thing.properties, undefined);
  });

  it('marks unsupported syntax as unresolved rather than as a full schema', () => {
    const f = fixture('opaque', {
      'packages/shared/src/thing.ts': `export type Thing = { code: ${TEMPLATE_TYPE} };\n`,
    });
    const result = generate(f);
    assert.equal(result.status, 0, result.stderr);
    const code = openapi(f).components.schemas.Dto_Thing.properties.code;
    assert.equal(code['x-unresolved'], true);
    assert.equal(code['x-typescript'], TEMPLATE_TYPE);
    assert.equal(code['x-source'], 'packages/shared/src/thing.ts:1');
    assert.equal(code.type, undefined);
    const manifest = JSON.parse(fs.readFileSync(path.join(f.docs, 'sources.json'), 'utf8'));
    assert.deepEqual(
      manifest.unresolved.filter((entry) => entry.source.startsWith('packages/shared/')),
      [
        {
          source: 'packages/shared/src/thing.ts:1',
          typescript: TEMPLATE_TYPE,
          reason: 'Unsupported TypeScript syntax; retained as an explicitly unconstrained schema.',
        },
      ],
    );
  });
});
