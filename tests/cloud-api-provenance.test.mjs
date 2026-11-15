/**
 * Unit tests for `scripts/cloud-api/provenance.mjs`, with a fake Git runner and
 * file-system view: no test runs git.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { blobId, verifyProvenance } from '../scripts/cloud-api/provenance.mjs';
import { INDEX_ROOTS, indexable } from '../scripts/cloud-api/source-index.mjs';
import { REVISION, ROOT } from './cloud-api-helpers.mjs';

describe('provenance', () => {
  const FILES = {
    'packages/shared/src/a.ts': 'export const A = 1;\n',
    'apps/cited.ts': 'export {};\n',
  };

  /**
   * Verify against a fake checkout.
   * @param {object} [options]
   * @param {string} [options.head] the checkout's HEAD
   * @param {string} [options.status] porcelain -z output
   * @param {string} [options.lsFiles] ls-files -v -z output
   * @param {Record<string, { mode?: string, type?: string, content?: string }>} [options.tree]
   *   overrides of pinned tree entries
   * @param {Record<string, string>} [options.working] working-tree bytes
   * @param {Record<string, string>} [options.links] realpath overrides
   */
  function verify({
    head = REVISION,
    status = '',
    lsFiles,
    tree = {},
    working = FILES,
    links = {},
  } = {}) {
    /** @type {string[][]} */
    const calls = [];
    /** @type {Record<string, { mode?: string, type?: string, content?: string }>} */
    const entries = {
      ...Object.fromEntries(Object.entries(FILES).map(([f, c]) => [f, { content: c }])),
      ...tree,
    };
    /** @param {string[]} args */
    const git = (args) => {
      calls.push(args);
      if (args[0] === 'rev-parse') return `${head}\n`;
      if (args[0] === 'status') return status;
      if (args[0] === 'ls-files')
        return (
          lsFiles ??
          Object.keys(FILES)
            .map((f) => `H ${f}\0`)
            .join('')
        );
      if (args[0] === 'ls-tree')
        return Object.entries(entries)
          .map(
            ([file, { mode = '100644', type = 'blob', content = '' }]) =>
              `${mode} ${type} ${blobId(Buffer.from(content))}\t${file}\0`,
          )
          .join('');
      throw Error(`unexpected git ${args.join(' ')}`);
    };
    const result = verifyProvenance({
      root: ROOT,
      pinned: REVISION,
      git,
      fileSystem: {
        exists: (file) => path.relative(ROOT, file) in working,
        realpath: (file) => links[file] ?? file,
      },
      read: (file) => Buffer.from(working[path.relative(ROOT, file)]),
      readFiles: Object.keys(FILES),
      indexRoots: INDEX_ROOTS,
      indexable,
    });
    return { ...result, calls };
  }

  it('accepts a checkout that is byte for byte the pinned commit', () => {
    const result = verify();
    assert.deepEqual(result.problems, []);
    assert.equal(result.message, undefined);
    assert.ok(result.calls.some((args) => args[0] === 'ls-tree' && args[1] === '-r'));
  });

  it('refuses a checkout at another revision before asking git anything else', () => {
    const result = verify({ head: 'c'.repeat(40) });
    assert.match(String(result.message), /is at c{40}, but docs\/cloud-api\/http\.json pins a{40}/);
    assert.deepEqual(result.calls, [['rev-parse', 'HEAD']]);
  });

  it('reports a status entry for an indexed or cited file and ignores others', () => {
    const result = verify({
      status: ' M packages/shared/src/a.ts\0?? README.md\0?? packages/shared/src/new.ts\0',
    });
    assert.deepEqual(result.problems, [
      ' M packages/shared/src/a.ts',
      '?? packages/shared/src/new.ts',
    ]);
  });

  it('reports a rename with its source path', () => {
    const result = verify({ status: 'R  packages/shared/src/b.txt\0packages/shared/src/a.ts\0' });
    assert.ok(result.problems.includes('R  packages/shared/src/b.txt <- packages/shared/src/a.ts'));
  });

  for (const tag of ['S', 'h'])
    it(`refuses the index flag ${tag}`, () => {
      const result = verify({ lsFiles: `${tag} packages/shared/src/a.ts\0H apps/cited.ts\0` });
      assert.deepEqual(result.problems, [
        `${tag} packages/shared/src/a.ts (assume-unchanged or skip-worktree)`,
      ]);
    });

  it('refuses bytes that differ from the pinned blob', () => {
    const result = verify({
      working: { ...FILES, 'packages/shared/src/a.ts': 'export const A = 2;\n' },
    });
    assert.deepEqual(result.problems, [
      `packages/shared/src/a.ts (bytes read differ from ${REVISION}; filters and line-ending conversion are not applied)`,
    ]);
  });

  it('refuses a pinned indexable file missing from the working tree', () => {
    const result = verify({ tree: { 'packages/shared/src/gone.ts': { content: 'x' } } });
    assert.deepEqual(result.problems, [
      'packages/shared/src/gone.ts (missing from the working tree)',
    ]);
  });

  it('refuses a symbolic link at the pinned revision or in the working tree', () => {
    assert.deepEqual(
      verify({ tree: { 'apps/cited.ts': { mode: '120000', content: 'export {};\n' } } }).problems,
      ['apps/cited.ts (symbolic link, refused)'],
    );
    assert.deepEqual(
      verify({ links: { [`${ROOT}/apps/cited.ts`]: `${ROOT}/elsewhere.ts` } }).problems,
      ['apps/cited.ts (symbolic link, refused)'],
    );
  });

  it('refuses a read file that is not a file at the pinned revision', () => {
    const result = verify({ tree: { 'apps/cited.ts': { type: 'commit' } } });
    assert.deepEqual(result.problems, [`apps/cited.ts (not a file at ${REVISION})`]);
  });
});
