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
const SOURCES = {
  'packages/cloud-api/src/index.ts': [
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
  'packages/shared/src/thing.ts': [
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
