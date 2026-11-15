/**
 * End-to-end tests of the generator's provenance refusal, against a temporary
 * Git repository (`cloud-api-fixture.mjs`): every way a checkout can differ
 * from the pinned commit makes generation fail before any output is written.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  BYTES_DIFFER,
  LIMITS,
  SOURCES,
  THING,
  assertNothingWritten,
  fixture,
  generate,
  git,
  openapi,
} from './cloud-api-fixture.mjs';

describe('generate-cloud-api source verification', () => {
  it('generates from a clean checkout and records the cross-file bound', () => {
    const f = fixture('clean');
    const result = generate(f);
    assert.equal(result.status, 0, result.stderr);
    const schema = openapi(f).components.schemas.Dto_Thing;
    assert.equal(schema.properties.name.maxLength, 64);
    const manifest = JSON.parse(fs.readFileSync(path.join(f.docs, 'sources.json'), 'utf8'));
    assert.ok(manifest.files.some((file) => file.path === LIMITS));
    assert.equal(manifest.index.files, 5);
    assert.equal(generate(f, '--check').status, 0);
  });

  it('rejects an unstaged edit to a cross-file variable', () => {
    const f = fixture('unstaged');
    fs.writeFileSync(path.join(f.lody, LIMITS), 'export const MAX_NAME = 65;\n');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Source files differ from [0-9a-f]{40}[^\n]*\n M packages\/shared\/src\/limits\.ts/,
    );
    assertNothingWritten(f);
  });

  it('rejects a staged edit to a cross-file variable', () => {
    const f = fixture('staged');
    fs.writeFileSync(path.join(f.lody, LIMITS), 'export const MAX_NAME = 65;\n');
    git(f.lody, 'add', LIMITS);
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\nM {2}packages\/shared\/src\/limits\.ts/);
    assertNothingWritten(f);
  });

  it('rejects an untracked source file in an indexed package', () => {
    const f = fixture('untracked');
    fs.writeFileSync(path.join(f.lody, 'packages/shared/src/extra.ts'), 'export {};\n');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\?\? packages\/shared\/src\/extra\.ts/);
    assertNothingWritten(f);
  });

  it('rejects an ignored source file in an indexed package', () => {
    const f = fixture('ignored');
    fs.writeFileSync(path.join(f.lody, 'packages/shared/src/ignored.ts'), 'export {};\n');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /!! packages\/shared\/src\/ignored\.ts/);
    assertNothingWritten(f);
  });

  it('rejects an unstaged deletion of an indexed declaration file', () => {
    const f = fixture('deleted');
    fs.rmSync(path.join(f.lody, THING));
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\n D packages\/shared\/src\/thing\.ts/);
    assertNothingWritten(f);
  });

  it('rejects a staged deletion of an indexed declaration file', () => {
    const f = fixture('deleted-staged');
    git(f.lody, 'rm', '--quiet', THING);
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\nD {2}packages\/shared\/src\/thing\.ts/);
    assertNothingWritten(f);
  });

  it('rejects a staged rename of an indexed declaration file', () => {
    const f = fixture('renamed-staged');
    git(f.lody, 'mv', THING, 'packages/shared/src/thing.txt');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /\nR {2}packages\/shared\/src\/thing\.txt <- packages\/shared\/src\/thing\.ts/,
    );
    assertNothingWritten(f);
  });

  it('rejects an unstaged rename of an indexed declaration file', () => {
    const f = fixture('renamed');
    fs.renameSync(path.join(f.lody, THING), path.join(f.lody, 'packages/shared/src/thing.txt'));
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\n D packages\/shared\/src\/thing\.ts/);
    assertNothingWritten(f);
  });

  it('rejects an edit to a cross-file variable that a clean filter hides', () => {
    const f = fixture('clean-filter');
    git(f.lody, 'config', 'filter.pin.clean', 'sed s/65/64/');
    fs.writeFileSync(path.join(f.lody, '.git/info/attributes'), `${LIMITS} filter=pin\n`);
    fs.writeFileSync(path.join(f.lody, LIMITS), 'export const MAX_NAME = 65;\n');
    assert.equal(git(f.lody, 'status', '--porcelain'), '');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, BYTES_DIFFER);
    assertNothingWritten(f);
  });

  it('rejects a source file whose line endings differ from the pinned blob', () => {
    const f = fixture('crlf');
    fs.writeFileSync(path.join(f.lody, '.git/info/attributes'), `${LIMITS} text eol=crlf\n`);
    fs.writeFileSync(path.join(f.lody, LIMITS), 'export const MAX_NAME = 64;\r\n');
    // Staging refreshes the index; the blob stays the pinned one, as after a
    // checkout that converts line endings.
    git(f.lody, 'add', LIMITS);
    assert.equal(git(f.lody, 'status', '--porcelain'), '');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, BYTES_DIFFER);
    assertNothingWritten(f);
  });

  it('refuses an indexed source file that is a symbolic link', () => {
    const f = fixture('symlink', { 'packages/shared/src/limits.txt': SOURCES[LIMITS] });
    fs.rmSync(path.join(f.lody, LIMITS));
    fs.symlinkSync('limits.txt', path.join(f.lody, LIMITS));
    git(f.lody, 'add', LIMITS);
    git(f.lody, 'commit', '--quiet', '--no-verify', '-m', 'link');
    const http = path.join(f.docs, 'http.json');
    const document = JSON.parse(fs.readFileSync(http, 'utf8'));
    document['x-source-revision'] = git(f.lody, 'rev-parse', 'HEAD');
    fs.writeFileSync(http, JSON.stringify(document));
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /packages\/shared\/src\/limits\.ts \(symbolic link, refused\)/);
    assertNothingWritten(f);
  });

  for (const flag of ['--assume-unchanged', '--skip-worktree'])
    it(`rejects an edit to a cross-file variable hidden by ${flag}`, () => {
      const f = fixture(`flag${flag}`);
      git(f.lody, 'update-index', flag, LIMITS);
      fs.writeFileSync(path.join(f.lody, LIMITS), 'export const MAX_NAME = 65;\n');
      assert.equal(git(f.lody, 'status', '--porcelain'), '');
      const result = generate(f);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /packages\/shared\/src\/limits\.ts \(assume-unchanged or skip-worktree\)/,
      );
      assert.match(result.stderr, BYTES_DIFFER);
      assertNothingWritten(f);
    });

  it('rejects a checkout at a revision other than the pinned one', () => {
    const f = fixture('revision');
    fs.writeFileSync(path.join(f.lody, 'packages/e2ee-core/src/index.ts'), 'export {}; \n');
    git(f.lody, 'commit', '--quiet', '--no-verify', '-am', 'move on');
    const result = generate(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /but docs\/cloud-api\/http\.json pins [0-9a-f]{40}/);
    assertNothingWritten(f);
  });
});
