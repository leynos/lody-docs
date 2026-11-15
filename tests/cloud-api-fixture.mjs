/**
 * Shared fixture for the generator's end-to-end tests.
 *
 * `fixture` builds a tiny Lody-shaped Git repository in a temporary directory,
 * commits it, and writes authored inputs (`http.json` pinned to that commit,
 * and an empty `supplemental.json`) into a separate working directory;
 * `generate` runs `scripts/generate-cloud-api.mjs` there with `LODY_SOURCE`
 * pointing at the fixture, so neither this repository nor the real Lody
 * checkout is read or written. The tests need only `git` and the installed
 * Node.js dependencies.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(repository, 'scripts/generate-cloud-api.mjs');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-api-fixture-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
export const outputs = ['openapi.yaml', 'routes.md', 'operations.md', 'sources.json'];
/** A template literal type, which the generator does not expand. */
export const TEMPLATE_TYPE = `\`ERR_\${string}\``;

/** A schema bound read by `numberValue()` from a file other than the schema's. */
export const LIMITS = 'packages/shared/src/limits.ts';
/** The failure for bytes that differ from the pinned blob, whatever Git thinks. */
export const BYTES_DIFFER =
  /packages\/shared\/src\/limits\.ts \(bytes read differ from [0-9a-f]{40}; filters and line-ending conversion are not applied\)/;
/** The file that declares the `Thing` result type. */
export const THING = 'packages/shared/src/thing.ts';
/** The module that exports the `CloudApi` type; it is loaded first. */
export const INDEX = 'packages/cloud-api/src/index.ts';
export const SOURCES = {
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
export const git = (cwd, ...args) =>
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
export function fixture(name, overrides = {}) {
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
export function generate(f, ...args) {
  return spawnSync(process.execPath, [generator, ...args], {
    cwd: f.cwd,
    env: { ...process.env, LODY_SOURCE: f.lody },
    encoding: 'utf8',
  });
}

/** @param {{ docs: string }} f */
export function assertNothingWritten(f) {
  for (const file of outputs) assert.equal(fs.existsSync(path.join(f.docs, file)), false, file);
}

/** @param {{ docs: string }} f */
export const openapi = (f) =>
  YAML.parse(fs.readFileSync(path.join(f.docs, 'openapi.yaml'), 'utf8'));
