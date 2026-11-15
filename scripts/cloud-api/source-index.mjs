/**
 * Source loading and TypeScript parsing for the cloud API generator.
 *
 * A source index reads Lody's public DTO packages through an injected reader,
 * parses each file once, and records the type, interface and variable
 * declarations that schema conversion resolves names against. It keeps the
 * exact bytes of every file it reads, so that provenance verification
 * (`provenance.mjs`) checks the bytes that were parsed and hashed. The index
 * performs no I/O of its own; `generate-cloud-api.mjs` supplies a reader over
 * the real file system, and tests supply one over memory.
 */
import path from 'node:path';
import ts from 'typescript';

/** The module that exports the `CloudApi` type; it is parsed first. */
export const CONTRACT_MODULE = 'packages/cloud-api/src/index.ts';
/** The folders whose TypeScript sources are indexed, in priority order. */
export const INDEX_ROOTS = [
  'packages/cloud-api/src',
  'packages/shared/src',
  'packages/e2ee-core/src',
  'packages/e2ee-machine-sharing/src',
];
/** Whether the index parses a file with this name. @param {string} file */
export const indexable = (file) => /\.ts$/.test(file) && !/\.(test|spec)\.ts$/.test(file);

/**
 * @typedef {object} SourceReader
 * @property {(file: string) => Buffer} readFile the bytes of a file
 * @property {(dir: string) => Array<{ name: string, directory: boolean }>} listDirectory
 *   the entries of a directory; symbolic links are not directories
 * @property {(file: string) => boolean} isFile whether a regular file exists
 */

/**
 * @typedef {object} SourceIndex
 * @property {string} root the Lody checkout
 * @property {Map<string, ts.SourceFile>} files every parsed file, by absolute path
 * @property {Map<string, any[]>} declarationsByName every top-level declaration that
 *   occupies the type space (alias, interface, class, enum, namespace), by name
 * @property {Map<string, any[]>} variablesByName every top-level declaration that
 *   occupies the value space (variable, function, class, enum, namespace), by name
 * @property {(file: string) => Buffer} read the bytes of a file, read at most once
 * @property {(file: string) => ts.SourceFile} load parse a file, at most once
 * @property {(file: string) => boolean} isFile whether a regular file exists
 */

/**
 * Create an empty index over a checkout.
 * @param {string} root
 * @param {SourceReader} reader
 * @returns {SourceIndex}
 */
export function createSourceIndex(root, reader) {
  const files = new Map();
  const contents = new Map();
  const declarationsByName = new Map();
  const variablesByName = new Map();
  /** @param {string} file */
  const read = (file) => {
    if (!contents.has(file)) contents.set(file, reader.readFile(file));
    return contents.get(file);
  };
  /** @param {string} file */
  const load = (file) => {
    if (files.has(file)) return files.get(file);
    const text = read(file).toString('utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    files.set(file, sf);
    /** @param {Map<string, any[]>} map @param {string} name @param {any} node */
    const add = (map, name, node) => map.set(name, [...(map.get(name) ?? []), node]);
    for (const node of sf.statements) {
      const name = /** @type {any} */ (node).name;
      const named = name !== undefined && ts.isIdentifier(name) ? name.text : undefined;
      // Every kind that occupies a space is recorded, so that a supported
      // declaration is never taken as the only one when another kind shares it.
      if (
        named &&
        (ts.isTypeAliasDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isEnumDeclaration(node) ||
          ts.isModuleDeclaration(node))
      )
        add(declarationsByName, named, node);
      if (
        named &&
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isEnumDeclaration(node) ||
          ts.isModuleDeclaration(node))
      )
        add(variablesByName, named, node);
      if (ts.isVariableStatement(node))
        for (const v of node.declarationList.declarations)
          if (ts.isIdentifier(v.name)) add(variablesByName, v.name.text, v);
    }
    return sf;
  };
  return {
    root,
    files,
    declarationsByName,
    variablesByName,
    read,
    load,
    isFile: reader.isFile,
  };
}

/**
 * Parse every indexable file under a directory, in name order.
 * @param {SourceIndex} index
 * @param {SourceReader} reader
 * @param {string} dir
 */
function walk(index, reader, dir) {
  const entries = reader.listDirectory(dir).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.directory) walk(index, reader, file);
    else if (indexable(file)) index.load(file);
  }
}

/**
 * Build the index of a checkout: the contract module first, so that public
 * DTOs take priority over similarly named internal types, then every root.
 * @param {string} root
 * @param {SourceReader} reader
 */
export function loadSourceIndex(root, reader) {
  const index = createSourceIndex(root, reader);
  index.load(path.join(root, CONTRACT_MODULE));
  for (const dir of INDEX_ROOTS) walk(index, reader, path.join(root, dir));
  return index;
}
