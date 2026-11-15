/**
 * Module-scoped name resolution for the schema converters.
 *
 * Every name a converter meets is resolved in the module that contains the
 * reference, never by a global first-indexed lookup. `createScope` returns
 * `declarationsOf(sf, parts, space)`, which finds what a type name
 * (`space: 'type'`, aliases and interfaces) or a value name (`'value'`,
 * variable declarations) used in a module means:
 *
 * 1. a declaration in that module;
 * 2. else what an import of any form (named, renamed, default, namespace or
 *    `import = require`) reaches through relative modules, the workspace
 *    packages that are indexed (`@lody/<name>`, laid out as
 *    `packages/<name>/src`, as every `exports` map at the pinned commit is),
 *    and their named, renamed, default and star re-exports; null when it
 *    cannot be followed;
 * 3. else, for a name neither declared nor imported, every indexed
 *    declaration of it. Callers accept that only when there is one, or, for
 *    a key set, when all agree.
 *
 * `Q.Name` resolves through a local namespace or a namespace or `require`
 * import; any other qualifier, and any deeper path, is refused.
 * `importTypeDeclarations` resolves `import('m').Name`.
 */
import path from 'node:path';
import ts from 'typescript';
import { INDEX_ROOTS } from './source-index.mjs';

/** @typedef {ts.TypeAliasDeclaration | ts.InterfaceDeclaration} TypeDeclaration */
/** @typedef {'type' | 'value'} Space */

/** @param {ts.Node} node */
const isExported = (node) => {
  const holder = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  return (
    /** @type {any} */ (holder).modifiers?.some(
      (/** @type {ts.Node} */ m) => m.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
};

/**
 * The declarations of a name among statements, in one space.
 * @param {readonly ts.Statement[]} statements
 * @param {string} name
 * @param {Space} space
 * @returns {any[]}
 */
function declaredIn(statements, name, space) {
  if (space === 'type')
    return statements.filter(
      (s) => (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === name,
    );
  return statements.flatMap((s) =>
    ts.isVariableStatement(s)
      ? s.declarationList.declarations.filter(
          (v) => ts.isIdentifier(v.name) && v.name.text === name,
        )
      : [],
  );
}

/**
 * @typedef {object} ImportBinding
 * @property {'named' | 'default' | 'namespace' | 'require'} kind
 * @property {string | undefined} specifier the module specifier, if a string literal
 * @property {string} name the exported name the binding refers to
 */

/**
 * The import that binds a name in a module, if any, whatever its form.
 * @param {ts.SourceFile} sf
 * @param {string} name
 * @returns {ImportBinding | undefined}
 */
export function importOf(sf, name) {
  for (const statement of sf.statements) {
    if (ts.isImportEqualsDeclaration(statement) && statement.name.text === name) {
      const reference = statement.moduleReference;
      // `import x = require('m')` names a module; `import x = A.B` does not.
      const specifier =
        ts.isExternalModuleReference(reference) && ts.isStringLiteral(reference.expression)
          ? reference.expression.text
          : undefined;
      return { kind: 'require', specifier, name };
    }
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : undefined;
    const clause = statement.importClause;
    if (clause?.name?.text === name) return { kind: 'default', specifier, name: 'default' };
    const bindings = clause?.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      if (bindings.name.text === name) return { kind: 'namespace', specifier, name };
      continue;
    }
    const element = bindings.elements.find((e) => e.name.text === name);
    if (element)
      return { kind: 'named', specifier, name: (element.propertyName ?? element.name).text };
  }
  return undefined;
}

/**
 * The identifiers of an entity name or a property-access expression of
 * identifiers (`Base`, `ns.Base`), or undefined for anything else.
 * @param {ts.Node} node
 * @returns {string[] | undefined}
 */
export function entityParts(node) {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isQualifiedName(node)) {
    const left = entityParts(node.left);
    return left && [...left, node.right.text];
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
    const left = entityParts(node.expression);
    return left && [...left, node.name.text];
  }
  return undefined;
}

/**
 * Create the scope resolver of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createScope(ctx) {
  const { index, root } = ctx;
  /**
   * Resolve a module specifier to an indexed file inside the checkout: a
   * relative path, or an indexed workspace package `@lody/<name>[/<sub>]`.
   * @param {string} from the importing file
   * @param {string} specifier
   */
  function resolveModule(from, specifier) {
    let base;
    if (specifier.startsWith('.'))
      base = path.resolve(path.dirname(from), specifier.replace(/\.js$/, ''));
    else {
      const match = specifier.match(/^@lody\/([^/]+)(?:\/(.+))?$/);
      const src = match && `packages/${match[1]}/src`;
      if (!src || !INDEX_ROOTS.includes(src)) return undefined;
      base = path.join(root, src, match[2] ?? 'index');
    }
    return [`${base}.ts`, path.join(base, 'index.ts')].find(
      (file) => !path.relative(root, file).startsWith('..') && index.isFile(file),
    );
  }
  /**
   * The declarations a name used in a module can mean, or null when it cannot
   * be resolved safely.
   * @param {ts.SourceFile} sf
   * @param {string[]} parts
   * @param {Space} [space]
   * @returns {any[] | null}
   */
  function declarationsOf(sf, parts, space = 'type') {
    if (parts.length === 1) {
      const bound = bindingIn(sf, parts[0], new Set(), space);
      if (bound !== undefined) return bound;
      const all =
        space === 'type'
          ? index.declarationsByName.get(parts[0])
          : index.variablesByName.get(parts[0]);
      return all ?? [];
    }
    if (parts.length !== 2) return null;
    const [qualifier, name] = parts;
    const imported = importOf(sf, qualifier);
    if (!imported) {
      if (space !== 'type') return null;
      const members = namespaceMember(sf, qualifier, name);
      return members.length ? members : null;
    }
    if (imported.kind !== 'namespace' && imported.kind !== 'require') return null;
    return followModule(sf.fileName, imported.specifier, name, new Set(), space);
  }
  /**
   * The declarations `import('m').Name` means, or null.
   * @param {ts.ImportTypeNode} node
   */
  function importTypeDeclarations(node) {
    const argument = node.argument;
    const parts = node.qualifier && entityParts(node.qualifier);
    if (parts?.length !== 1 || !ts.isLiteralTypeNode(argument)) return null;
    const literal = argument.literal;
    if (!ts.isStringLiteral(literal)) return null;
    return followModule(node.getSourceFile().fileName, literal.text, parts[0], new Set(), 'type');
  }
  /**
   * @param {string} from
   * @param {string | undefined} specifier
   * @param {string} name
   * @param {Set<string>} seen
   * @param {Space} space
   */
  function followModule(from, specifier, name, seen, space) {
    const target = specifier && resolveModule(from, specifier);
    return (target && exportedFrom(target, name, seen, space)) || null;
  }
  /**
   * The exported type declarations of a member of a local namespace.
   * @param {ts.SourceFile} sf
   * @param {string} namespace
   * @param {string} name
   */
  function namespaceMember(sf, namespace, name) {
    return sf.statements.flatMap((s) =>
      ts.isModuleDeclaration(s) &&
      ts.isIdentifier(s.name) &&
      s.name.text === namespace &&
      s.body !== undefined &&
      ts.isModuleBlock(s.body)
        ? declaredIn(s.body.statements, name, 'type').filter(isExported)
        : [],
    );
  }
  /**
   * What a name bound in a module refers to: its declarations, null when it is
   * imported but cannot be followed, or undefined when it is not bound there.
   * @param {ts.SourceFile} sf
   * @param {string} name
   * @param {Set<string>} seen
   * @param {Space} space
   * @returns {any[] | null | undefined}
   */
  function bindingIn(sf, name, seen, space) {
    const declared = declaredIn(sf.statements, name, space);
    if (declared.length) return declared;
    const imported = importOf(sf, name);
    if (!imported) return undefined;
    // A namespace or `require` binding names a module, not a declaration.
    if (imported.kind === 'namespace' || imported.kind === 'require') return null;
    return followModule(sf.fileName, imported.specifier, imported.name, seen, space);
  }
  /**
   * The declarations a module exports under a name (`default` included): an
   * array when found, undefined when not exported, null when it cannot tell.
   * @param {string} file
   * @param {string} name
   * @param {Set<string>} seen
   * @param {Space} space
   * @returns {any[] | undefined | null}
   */
  function exportedFrom(file, name, seen, space) {
    const key = `${file}\0${name}\0${space}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const sf = index.load(file);
    const own = declaredIn(sf.statements, name, space).filter(isExported);
    if (own.length) return own;
    /** @type {Array<any[] | undefined | null>} */
    const stars = [];
    for (const statement of sf.statements) {
      // `export default Name;`
      if (name === 'default' && ts.isExportAssignment(statement) && !statement.isExportEquals)
        return ts.isIdentifier(statement.expression)
          ? (bindingIn(sf, statement.expression.text, seen, space) ?? null)
          : null;
      if (!ts.isExportDeclaration(statement)) continue;
      const specifier =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;
      if (!clause) {
        // `export *` never re-exports a default.
        if (name === 'default') continue;
        const target = specifier && resolveModule(file, specifier);
        stars.push(target ? exportedFrom(target, name, seen, space) : null);
        continue;
      }
      if (ts.isNamespaceExport(clause)) {
        if (clause.name.text === name) return null;
        continue;
      }
      const element = clause.elements.find((e) => e.name.text === name);
      if (!element) continue;
      const original = (element.propertyName ?? element.name).text;
      if (statement.moduleSpecifier) return followModule(file, specifier, original, seen, space);
      // `export { original as name }` of this module's own binding.
      return bindingIn(sf, original, seen, space) ?? null;
    }
    const found = stars.filter((result) => Array.isArray(result));
    if (found.length) return found.flat();
    return stars.includes(null) ? null : undefined;
  }
  return { declarationsOf, importTypeDeclarations };
}
