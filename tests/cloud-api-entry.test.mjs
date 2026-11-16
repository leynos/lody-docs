/**
 * Unit test for the entry point `scripts/generate-cloud-api.mjs`, driven with
 * injected in-memory I/O: check mode reads and compares but never writes.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { blobId } from '../scripts/cloud-api/provenance.mjs';
import { main } from '../scripts/generate-cloud-api.mjs';
import { CONTRACT, memoryReader, REVISION, ROOT } from './cloud-api-helpers.mjs';

describe('entry point', () => {
  const sources = {
    'packages/cloud-api/src/index.ts': CONTRACT,
    'packages/shared/src/thing.ts': 'export type Thing = { id: string };\n',
  };
  const http = {
    openapi: '3.1.1',
    info: { title: 'Fixture', version: 'generated' },
    paths: {},
    components: { schemas: {} },
    'x-source-revision': REVISION,
  };

  /**
   * In-memory I/O for the entry point: a clean checkout at the pinned revision.
   * @param {Map<string, string>} disk repository files
   * @param {(file: string, data: string) => void} writeText
   */
  function io(disk, writeText) {
    const reader = memoryReader(sources);
    return {
      ...reader,
      exists: (/** @type {string} */ file) => reader.files.has(file),
      realpath: (/** @type {string} */ file) => file,
      readText: (/** @type {string} */ file) => disk.get(file),
      writeText,
      git: (/** @type {string} */ _root, /** @type {string[]} */ args) => {
        if (args[0] === 'rev-parse') return `${REVISION}\n`;
        if (args[0] === 'ls-tree')
          return [...reader.files]
            .map(([file, bytes]) => `100644 blob ${blobId(bytes)}\t${path.relative(ROOT, file)}\0`)
            .join('');
        return '';
      },
    };
  }

  it('checks without writing, and reports stale outputs without writing', () => {
    const disk = new Map([
      ['/repo/docs/cloud-api/http.json', JSON.stringify(http)],
      ['/repo/docs/cloud-api/supplemental.json', '[]'],
    ]);
    const options = { env: { LODY_SOURCE: ROOT }, cwd: '/repo' };
    const generated = main({
      ...options,
      args: [],
      io: io(disk, (file, data) => disk.set(file, data)),
    });
    assert.equal(generated.status, 0);
    assert.match(generated.messages[0], /^Generated 1 Convex operations/);
    assert.equal(disk.size, 6);
    const refuseWrites = () => assert.fail('check mode wrote a file');
    const verified = main({ ...options, args: ['--check'], io: io(disk, refuseWrites) });
    assert.deepEqual(verified, {
      status: 0,
      messages: [
        'Verified 1 Convex operations; 3 HTTP paths; 0 unresolved types or semantic refinements.',
      ],
    });
    disk.set('/repo/docs/cloud-api/routes.md', 'stale');
    disk.delete('/repo/docs/cloud-api/sources.json');
    const stale = main({ ...options, args: ['--check'], io: io(disk, refuseWrites) });
    assert.deepEqual(stale, {
      status: 1,
      messages: [
        'Stale generated document: docs/cloud-api/routes.md; run npm run generate',
        'Stale generated document: docs/cloud-api/sources.json; run npm run generate',
      ],
    });
  });
});
