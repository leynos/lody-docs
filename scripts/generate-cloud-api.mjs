/**
 * Rebuild the cloud API documentation from Lody's public client contract.
 *
 * This is the command-line entry point and the only module that touches the
 * process, the file system or Git. It reads `LODY_SOURCE` (default
 * `../../Lody`) and `--check`, builds real I/O (`nodeIo`), and runs the
 * pipeline in `scripts/cloud-api/`:
 *
 * - `source-index.mjs` reads and parses the checkout's public DTO packages,
 *   keeping the exact bytes of each file read;
 * - `schema.mjs` converts TypeScript, Zod and Effect schemas to JSON Schema,
 *   marking what it cannot expand as `x-unresolved`; it is the facade over
 *   `schema-context.mjs` (shared state and helpers), `schema-scope.mjs`
 *   (module-scoped resolution of every type, value and library name),
 *   `schema-types.mjs`
 *   (TypeScript types, interfaces and named DTOs), `schema-utilities.mjs`
 *   (object flattening and the utility types), `schema-keys.mjs` (finite key
 *   sets through aliases, namespaces and imports), `schema-zod.mjs` and
 *   `schema-effect.mjs`;
 * - `operations.mjs` enumerates the `CloudApi` and supplemental operations and
 *   builds the OpenAPI document and the source manifest;
 * - `provenance.mjs` verifies, through an injected Git runner, that every
 *   input is byte for byte the pinned commit;
 * - `render.mjs` renders the four documents to strings;
 * - `outputs.mjs` compares them with the files (`--check`) or writes them;
 * - `pipeline.mjs` wires those steps together without performing any I/O.
 *
 * Inputs: the Lody checkout, and the authored `docs/cloud-api/http.json`
 * (non-Convex HTTP routes, hand-written schemas and the pinned
 * `x-source-revision`) and `docs/cloud-api/supplemental.json` (Convex calls
 * outside `CloudApi`), read relative to the working directory, which must be
 * the repository root. The checkout must be at the pinned revision; no source
 * file the generator reads may be modified, staged, untracked or ignored, and
 * no file it would index at that revision may be deleted or renamed. Beyond
 * git status, the exact bytes the generator reads from each file are compared
 * with that file's blob at the pinned revision, hashed without any Git filter
 * or line-ending conversion, so a file that a clean filter, `eol` or `ident`
 * setting makes look unchanged is still refused. Symbolic links, files absent
 * from that revision, and the assume-unchanged and skip-worktree flags are
 * refused too. Each generated link then cites what that commit contains.
 *
 * Outputs: `docs/cloud-api/openapi.yaml`, `routes.md`, `operations.md` and the
 * source manifest `sources.json` (revision, operation counts, unresolved types,
 * one digest over every indexed source file, and a hash of each file that
 * shaped the output or is cited). With `--check`, the outputs are only read
 * and compared, and the command fails with "Stale generated document" for each
 * that differs; without it, they are written. `npm run generate` writes the
 * outputs, and `npm run check` (the Makefile `cloud-api-check` gate) verifies
 * them. The generator never contacts a service.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findStaleOutputs, writeOutputs } from './cloud-api/outputs.mjs';
import { generateOutputs } from './cloud-api/pipeline.mjs';

/**
 * @typedef {object} Io
 * @property {(file: string) => Buffer} readFile
 * @property {(dir: string) => Array<{ name: string, directory: boolean }>} listDirectory
 * @property {(file: string) => boolean} isFile
 * @property {(file: string) => boolean} exists without following a link
 * @property {(file: string) => string} realpath
 * @property {(file: string) => string | undefined} readText undefined when absent
 * @property {(file: string, data: string) => void} writeText
 * @property {(root: string, args: string[]) => string} git
 */

/** I/O over the real file system and Git. @type {Io} */
export const nodeIo = {
  readFile: (file) => fs.readFileSync(file),
  listDirectory: (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .map((entry) => ({ name: entry.name, directory: entry.isDirectory() })),
  isFile: (file) => fs.existsSync(file),
  exists: (file) => fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined,
  realpath: (file) => fs.realpathSync(file),
  readText: (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined),
  writeText: (file, data) => fs.writeFileSync(file, data),
  git: (root, args) =>
    execFileSync('git', ['--literal-pathspecs', '-C', root, ...args], { encoding: 'utf8' }),
};

/**
 * Generate or check the documents.
 * @param {object} options
 * @param {string[]} options.args command-line arguments
 * @param {Record<string, string | undefined>} options.env
 * @param {string} options.cwd the repository root
 * @param {Io} options.io
 * @returns {{ status: number, messages: string[] }} exit status and lines to report
 */
export function main({ args, env, cwd, io }) {
  const check = args.includes('--check');
  const root = path.resolve(cwd, env.LODY_SOURCE ?? '../../Lody');
  /** @param {string} file */
  const local = (file) => path.join(cwd, file);
  /** @param {string} file */
  const json = (file) => JSON.parse(/** @type {string} */ (io.readText(local(file))));
  const { outputs, summary } = generateOutputs({
    root,
    http: json('docs/cloud-api/http.json'),
    supplemental: json('docs/cloud-api/supplemental.json'),
    reader: io,
    git: (gitArgs) => io.git(root, gitArgs),
    fileSystem: io,
  });
  const counts = `${summary.operations} Convex operations; ${summary.paths} HTTP paths; ${summary.unresolved} unresolved types or semantic refinements.`;
  if (check) {
    const stale = findStaleOutputs(outputs, (file) => io.readText(local(file)));
    if (stale.length)
      return {
        status: 1,
        messages: stale.map((file) => `Stale generated document: ${file}; run npm run generate`),
      };
    return { status: 0, messages: [`Verified ${counts}`] };
  }
  writeOutputs(outputs, (file, data) => io.writeText(local(file), data));
  return { status: 0, messages: [`Generated ${counts}`] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { status, messages } = main({
      args: process.argv.slice(2),
      env: process.env,
      cwd: process.cwd(),
      io: nodeIo,
    });
    for (const message of messages) (status ? console.error : console.log)(message);
    process.exitCode = status;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
