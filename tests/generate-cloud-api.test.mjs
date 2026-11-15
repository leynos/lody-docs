/**
 * Behavioural tests for `scripts/generate-cloud-api.mjs --check`.
 *
 * Each test copies `docs/cloud-api/` into a temporary directory, optionally
 * spoils one file, and runs the generator in check mode with that directory as
 * its working directory, so the repository's own files are never written. The
 * generator reads the Lody checkout named by `LODY_SOURCE` (or the sibling
 * `Lody` checkout that the Makefile finds); the tests skip when it is absent.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(repository, 'scripts/generate-cloud-api.mjs');
// An explicit LODY_SOURCE wins, as in the Makefile; otherwise look beside the
// repository, or two levels up when it is a linked worktree.
const lody = (process.env.LODY_SOURCE ? [process.env.LODY_SOURCE] : ['../Lody', '../../Lody'])
  .map((candidate) => path.resolve(repository, candidate))
  .find((candidate) => fs.existsSync(path.join(candidate, 'packages/cloud-api/src/index.ts')));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-api-check-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));

/**
 * Copy the documents into a fresh working directory and apply `spoil` to it.
 * @param {string} name
 * @param {(dir: string) => void} [spoil]
 */
function workingCopy(name, spoil) {
  const dir = path.join(scratch, name);
  fs.cpSync(path.join(repository, 'docs/cloud-api'), path.join(dir, 'docs/cloud-api'), {
    recursive: true,
  });
  spoil?.(path.join(dir, 'docs/cloud-api'));
  return dir;
}

/** @param {string} cwd */
function runCheck(cwd) {
  return spawnSync(process.execPath, [generator, '--check'], {
    cwd,
    env: { ...process.env, LODY_SOURCE: lody },
    encoding: 'utf8',
  });
}

describe('generate-cloud-api --check', { skip: lody ? false : 'no Lody checkout found' }, () => {
  it('accepts up-to-date documents', () => {
    const result = runCheck(workingCopy('clean'));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Verified \d+ Convex operations/);
  });

  it('rejects a stale generated document', () => {
    const result = runCheck(
      workingCopy('stale', (dir) => fs.appendFileSync(path.join(dir, 'routes.md'), '\nstale\n')),
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Stale generated document: docs\/cloud-api\/routes\.md/);
  });

  it('rejects an absent generated document', () => {
    const result = runCheck(
      workingCopy('absent', (dir) => fs.rmSync(path.join(dir, 'sources.json'))),
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Stale generated document: docs\/cloud-api\/sources\.json/);
  });

  it('rejects a checkout at a revision other than the pinned one', () => {
    const result = runCheck(
      workingCopy('revision', (dir) => {
        const file = path.join(dir, 'http.json');
        const document = JSON.parse(fs.readFileSync(file, 'utf8'));
        document['x-source-revision'] = '0'.repeat(40);
        fs.writeFileSync(file, JSON.stringify(document));
      }),
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /but docs\/cloud-api\/http\.json pins 0{40}/);
  });
});
