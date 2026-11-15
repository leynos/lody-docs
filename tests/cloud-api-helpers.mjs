/**
 * Shared in-memory setup for the cloud API generator's unit tests.
 *
 * Provides a source reader over in-memory files and a converter that turns a
 * `Thing` declared in those files into its JSON Schema, so that each test can
 * state a TypeScript, Zod or Effect input and assert the exact schema. No
 * helper reads the real Lody checkout, runs git or writes a file.
 */
import path from 'node:path';
import { createConverter } from '../scripts/cloud-api/schema.mjs';
import { loadSourceIndex } from '../scripts/cloud-api/source-index.mjs';

/** The checkout root of every in-memory source. */
export const ROOT = '/lody';
/** The pinned revision of the in-memory checkout. */
export const REVISION = 'a'.repeat(40);
/** The module that exports the `CloudApi` type. */
export const CONTRACT_PATH = 'packages/cloud-api/src/index.ts';
/** The module that declares `Thing` in most tests. */
export const THING = 'packages/shared/src/thing.ts';
/** A contract with one query whose result is `Thing`. */
export const CONTRACT = [
  'export type CloudApi = {',
  '  demo: {',
  '    /** Fetch one thing. */',
  '    getThing: Query<{ id: string }, Thing>;',
  '  };',
  '};',
  '',
].join('\n');

/**
 * A source reader over in-memory files, keyed by checkout-relative path.
 * @param {Record<string, string>} sources
 */
export function memoryReader(sources) {
  const files = new Map(
    Object.entries(sources).map(([file, text]) => [path.join(ROOT, file), Buffer.from(text)]),
  );
  return {
    files,
    /** @param {string} file */
    readFile: (file) => {
      const bytes = files.get(file);
      if (!bytes) throw Error(`ENOENT: ${file}`);
      return bytes;
    },
    /** @param {string} dir */
    listDirectory: (dir) => {
      const names = new Map();
      for (const file of files.keys()) {
        if (!file.startsWith(`${dir}/`)) continue;
        const [name, ...rest] = file.slice(dir.length + 1).split('/');
        names.set(name, rest.length > 0);
      }
      return [...names].map(([name, directory]) => ({ name, directory }));
    },
    /** @param {string} file */
    isFile: (file) => files.has(file),
  };
}

/**
 * Convert `Thing` from in-memory sources.
 * @param {Record<string, string>} sources extra or replacement sources
 */
export function convertThing(sources) {
  const reader = memoryReader({
    [CONTRACT_PATH]: CONTRACT,
    'packages/shared/src/index.ts': 'export {};\n',
    ...sources,
  });
  const index = loadSourceIndex(ROOT, reader);
  const converter = createConverter(index);
  converter.named('Thing', /** @type {any} */ (index.files.values().next().value));
  return { thing: converter.schemas.Dto_Thing, converter, index };
}

/**
 * The schema of `Thing` declared by one module's source, without its
 * `x-source` location.
 * @param {string} source the text of `thing.ts`
 * @param {Record<string, string>} [extra] other sources
 */
export function schemaOf(source, extra = {}) {
  const { thing, converter } = convertThing({ ...extra, [THING]: source });
  const { 'x-source': _source, ...schema } = thing;
  return { schema, converter };
}
