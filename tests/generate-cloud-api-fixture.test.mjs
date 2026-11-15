/**
 * Tests of `scripts/generate-cloud-api.mjs` against an isolated fixture checkout.
 *
 * Each test builds a tiny Lody-shaped Git repository in a temporary directory,
 * commits it, and writes authored inputs (`http.json` pinned to that commit,
 * and an empty `supplemental.json`) into a separate working directory. The
 * generator then runs there with `LODY_SOURCE` pointing at the fixture, so
 * neither this repository nor the real Lody checkout is read or written. The
 * tests need only `git` and the installed Node.js dependencies.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(repository, 'scripts/generate-cloud-api.mjs');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-api-fixture-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const outputs = ['openapi.yaml', 'routes.md', 'operations.md', 'sources.json'];
/** A template literal type, which the generator does not expand. */
const TEMPLATE_TYPE = `\`ERR_\${string}\``;

/** A schema bound read by `numberValue()` from a file other than the schema's. */
const LIMITS = 'packages/shared/src/limits.ts';
/** The failure for bytes that differ from the pinned blob, whatever Git thinks. */
const BYTES_DIFFER =
  /packages\/shared\/src\/limits\.ts \(bytes read differ from [0-9a-f]{40}; filters and line-ending conversion are not applied\)/;
/** The file that declares the `Thing` result type. */
const THING = 'packages/shared/src/thing.ts';
/** The module that exports the `CloudApi` type; it is loaded first. */
const INDEX = 'packages/cloud-api/src/index.ts';
const SOURCES = {
  [INDEX]: [
    "import type { Thing } from '@lody/shared';",
    '',
    'export type CloudApi = {',
    '  demo: {',
    '    /** Fetch one thing. */',
    '    getThing: Query<{ id: string }, Thing>;',
    '  };',
    '};',
    '',
  ].join('\n'),
  [THING]: [
    "import { z } from 'zod';",
    '',
    'const ThingSchema = z.object({ name: z.string().max(MAX_NAME) });',
    'export type Thing = z.infer<typeof ThingSchema>;',
    '',
  ].join('\n'),
  [LIMITS]: 'export const MAX_NAME = 64;\n',
  'packages/e2ee-core/src/index.ts': 'export {};\n',
  'packages/e2ee-machine-sharing/src/index.ts': 'export {};\n',
  '.gitignore': 'ignored.ts\n',
};

/** @param {string} cwd @param {string[]} args */
const git = (cwd, ...args) =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  ).trim();

/**
 * Build a committed fixture checkout and a working directory pinned to it.
 * @param {string} name
 * @param {Record<string, string>} [overrides] source files to replace before committing
 */
function fixture(name, overrides = {}) {
  const lody = path.join(scratch, name, 'lody');
  const cwd = path.join(scratch, name, 'work');
  for (const [file, text] of Object.entries({ ...SOURCES, ...overrides })) {
    fs.mkdirSync(path.dirname(path.join(lody, file)), { recursive: true });
    fs.writeFileSync(path.join(lody, file), text);
  }
  git(lody, 'init', '--quiet');
  git(lody, 'add', '.');
  git(lody, 'commit', '--quiet', '--no-verify', '-m', 'fixture');
  const revision = git(lody, 'rev-parse', 'HEAD');
  const docs = path.join(cwd, 'docs/cloud-api');
  fs.mkdirSync(docs, { recursive: true });
  const http = {
    openapi: '3.1.1',
    info: { title: 'Fixture', version: 'generated' },
    paths: {},
    components: { schemas: {} },
    'x-source-revision': revision,
  };
  fs.writeFileSync(path.join(docs, 'http.json'), JSON.stringify(http));
  fs.writeFileSync(path.join(docs, 'supplemental.json'), '[]');
  return { lody, cwd, docs };
}

/** @param {{ lody: string, cwd: string }} f @param {string[]} args */
function generate(f, ...args) {
  return spawnSync(process.execPath, [generator, ...args], {
    cwd: f.cwd,
    env: { ...process.env, LODY_SOURCE: f.lody },
    encoding: 'utf8',
  });
}

/** @param {{ docs: string }} f */
function assertNothingWritten(f) {
  for (const file of outputs) assert.equal(fs.existsSync(path.join(f.docs, file)), false, file);
}

/** @param {{ docs: string }} f */
const openapi = (f) => YAML.parse(fs.readFileSync(path.join(f.docs, 'openapi.yaml'), 'utf8'));

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
