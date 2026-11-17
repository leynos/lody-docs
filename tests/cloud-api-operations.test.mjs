/**
 * Unit tests for `scripts/cloud-api/operations.mjs`: operation enumeration, the
 * OpenAPI document and the source manifest, over in-memory sources.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildApi,
  buildManifest,
  compareCodeUnits,
  EXTRA_DTOS,
  finishDocument,
} from '../scripts/cloud-api/operations.mjs';
import { createConverter } from '../scripts/cloud-api/schema.mjs';
import { INDEX_ROOTS, loadSourceIndex } from '../scripts/cloud-api/source-index.mjs';
import { CONTRACT, memoryReader, REVISION, ROOT } from './cloud-api-helpers.mjs';

describe('operations', () => {
  const http = {
    openapi: '3.1.1',
    info: { title: 'Fixture', version: 'generated' },
    paths: { '/api/x': { post: { operationId: 'x', 'x-source': ['apps/x.ts:3'] } } },
    components: { schemas: {} },
    'x-source-revision': REVISION,
  };
  const supplemental = [
    {
      name: 'extra:call',
      kind: 'action',
      source: 'apps/extra.ts:9',
      description: 'An extra.',
      args: { type: 'object' },
      result: { type: 'null' },
    },
  ];

  function build() {
    const index = loadSourceIndex(
      ROOT,
      memoryReader({
        'packages/cloud-api/src/index.ts': CONTRACT,
        'packages/shared/src/thing.ts': 'export type Thing = { id: string };\n',
      }),
    );
    const converter = createConverter(index, http.components.schemas);
    return { api: buildApi({ index, converter, http, supplemental }), converter, index };
  }

  it('enumerates contract and supplemental operations and the Convex paths', () => {
    const { api } = build();
    assert.deepEqual(
      api.operations.map((op) => [op.name, op.kind, Boolean(op.supplemental)]),
      [
        ['demo:getThing', 'query', false],
        ['extra:call', 'action', true],
      ],
    );
    assert.deepEqual(Object.keys(api.document.paths), [
      '/api/x',
      '/api/query',
      '/api/mutation',
      '/api/action',
    ]);
    assert.deepEqual(api.groups, [{ name: 'demo', description: '' }]);
    assert.deepEqual([...api.cited].sort(), [
      'apps/extra.ts',
      'apps/x.ts',
      'packages/cloud-api/src/index.ts',
    ]);
    assert.deepEqual(http.paths, {
      '/api/x': { post: { operationId: 'x', 'x-source': ['apps/x.ts:3'] } },
    });
  });

  it('rejects an operation kind other than query, mutation or action', () => {
    const index = loadSourceIndex(
      ROOT,
      memoryReader({
        'packages/cloud-api/src/index.ts':
          'export type CloudApi = { demo: { bad: Stream<{}, string> } };\n',
      }),
    );
    assert.throws(
      () => buildApi({ index, converter: createConverter(index), http, supplemental: [] }),
      /Unknown operation bad/,
    );
  });

  it('fails by name when an extra DTO cannot be resolved', () => {
    const missing = EXTRA_DTOS[2];
    const contract = CONTRACT.replace(`export type ${missing} = { id: string };\n`, '');
    const index = loadSourceIndex(
      ROOT,
      memoryReader({
        'packages/cloud-api/src/index.ts': contract,
        'packages/shared/src/thing.ts': 'export type Thing = { id: string };\n',
      }),
    );
    assert.throws(
      () => buildApi({ index, converter: createConverter(index), http, supplemental: [] }),
      new RegExp(`EXTRA_DTOS entry ${missing} could not be resolved`),
    );
  });

  it('orders by code unit, whatever the locale', () => {
    assert.deepEqual(['b', 'a', 'B', 'é', 'e'].sort(compareCodeUnits), ['B', 'a', 'b', 'e', 'é']);
    assert.equal(compareCodeUnits('x', 'x'), 0);
  });

  it('stamps the revision without reordering the document', () => {
    const finished = finishDocument(http, 'b'.repeat(40));
    assert.deepEqual(Object.keys(finished), Object.keys(http));
    assert.equal(finished.info.version, 'source-bbbbbbbbbbbb');
    assert.equal(finished['x-source-revision'], 'b'.repeat(40));
    assert.equal(http.info.version, 'generated');
  });

  it('builds a manifest with counts and per-file hashes', () => {
    const { api, converter, index } = build();
    const manifest = buildManifest({
      root: ROOT,
      revision: REVISION,
      operations: api.operations,
      supplementalCount: api.supplementalCount,
      unresolved: converter.unresolved.values(),
      indexRoots: INDEX_ROOTS,
      parsed: [...index.files.keys()],
      used: [...converter.used],
      read: index.read,
    });
    assert.equal(manifest.typedOperations, 1);
    assert.equal(manifest.supplementalOperations, 1);
    assert.equal(manifest.index.files, 2);
    assert.deepEqual(
      manifest.files.map((/** @type {{ path: string }} */ f) => f.path),
      ['packages/cloud-api/src/index.ts', 'packages/shared/src/thing.ts'],
    );
  });
});
