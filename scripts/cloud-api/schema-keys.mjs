/**
 * Module-scoped name resolution and finite key sets.
 *
 * `createKeyResolver` returns `declarationsOf`, which finds the declarations
 * a type name used in a module means (also used for interface bases);
 * `propertyKeys`, the property names `keyof` sees, with numeric names kept as
 * numbers; and `literalKeys`, which turns a key type made only
 * of string literals into its distinct keys. It follows type aliases from the
 * module that uses them: the module's own declaration; a local namespace
 * member (`Local.Key`); or whatever an import of any form (named, renamed,
 * default, namespace or `import = require`) reaches through relative modules
 * and their re-exports. A name that is neither declared nor imported falls
 * back to every loaded declaration of that name, and only when they agree.
 * Anything that cannot be followed safely yields null, which the type
 * converter (`schema-types.mjs`, `schema-utilities.mjs`) reports as
 * `x-unresolved`.
 */
import path from 'node:path';
import ts from 'typescript';

/** @typedef {ts.TypeAliasDeclaration | ts.InterfaceDeclaration} TypeDeclaration */

/** @param {ts.Node} node */
const isExported = (node) =>
  /** @type {any} */ (node).modifiers?.some(
    (/** @type {ts.Node} */ m) => m.kind === ts.SyntaxKind.ExportKeyword,
  ) ?? false;

/**
 * The type alias and interface declarations of a name among statements.
 * @param {readonly ts.Statement[]} statements
 * @param {string} name
 * @returns {TypeDeclaration[]}
 */
const declaredIn = (statements, name) =>
  statements.filter(
    /** @type {(s: ts.Statement) => s is TypeDeclaration} */ (
      (s) => (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === name
    ),
  );

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
 * The exported type declarations of a member of a local namespace.
 * @param {ts.SourceFile} sf
 * @param {string} namespace
 * @param {string} name
 */
function namespaceMember(sf, namespace, name) {
  const blocks = sf.statements.filter(
    (s) =>
      ts.isModuleDeclaration(s) &&
      ts.isIdentifier(s.name) &&
      s.name.text === namespace &&
      s.body !== undefined &&
      ts.isModuleBlock(s.body),
  );
  return blocks.flatMap((block) =>
    declaredIn(/** @type {any} */ (block).body.statements, name).filter(isExported),
  );
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
 * Create the key resolver of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createKeyResolver(ctx) {
  const { index, root, location } = ctx;
  /**
   * The distinct keys of a key type made only of string literals; undefined
   * for any other key type; null when an alias cannot be resolved safely.
   * @param {ts.TypeNode | undefined} node
   * @returns {string[] | undefined | null}
   */
  function literalKeys(node) {
    if (!node) return undefined;
    if (ts.isParenthesizedTypeNode(node)) return literalKeys(node.type);
    if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text];
    if (ts.isUnionTypeNode(node)) {
      const parts = node.types.map(literalKeys);
      if (parts.includes(null)) return null;
      return parts.every(Boolean) ? [...new Set(parts.flat())] : undefined;
    }
    if (ts.isTypeReferenceNode(node) && !node.typeArguments) {
      const candidates = keyDeclarations(node);
      if (candidates === null) return null;
      const results = candidates.map((decl) =>
        ts.isTypeAliasDeclaration(decl) && !decl.typeParameters?.length
          ? literalKeys(decl.type)
          : undefined,
      );
      if (results.includes(null)) return null;
      const distinct = new Set(results.map((keys) => JSON.stringify(keys ?? null)));
      if (distinct.size > 1) return null;
      if (results[0]) location(candidates[0]);
      return results[0];
    }
    return undefined;
  }
  /**
   * Resolve a relative module specifier to an indexed file inside the checkout.
   * @param {string} from the importing file
   * @param {string} specifier
   */
  function resolveModule(from, specifier) {
    if (!specifier.startsWith('.')) return undefined;
    const base = path.resolve(path.dirname(from), specifier.replace(/\.js$/, ''));
    return [`${base}.ts`, path.join(base, 'index.ts')].find(
      (file) => !path.relative(root, file).startsWith('..') && index.isFile(file),
    );
  }
  /**
   * The declarations a key type reference can mean, or null when it cannot be
   * resolved safely.
   * @param {ts.TypeReferenceNode} node
   * @returns {TypeDeclaration[] | null}
   */
  function keyDeclarations(node) {
    const parts = entityParts(node.typeName);
    return parts ? declarationsOf(node.getSourceFile(), parts) : null;
  }
  /**
   * The declarations a type name used in a module can mean: `Name`, or
   * `Q.Name` where `Q` is a local namespace or a namespace or `require`
   * import. Null when the name cannot be resolved safely; a deeper path and
   * any other import used as a qualifier are refused.
   * @param {ts.SourceFile} sf
   * @param {string[]} parts
   * @returns {TypeDeclaration[] | null}
   */
  function declarationsOf(sf, parts) {
    if (parts.length === 1) return aliasDeclarations(sf, parts[0]);
    if (parts.length !== 2) return null;
    const [qualifier, name] = parts;
    const imported = importOf(sf, qualifier);
    if (!imported) {
      const members = namespaceMember(sf, qualifier, name);
      return members.length ? members : null;
    }
    if (imported.kind !== 'namespace' && imported.kind !== 'require') return null;
    const target = imported.specifier && resolveModule(sf.fileName, imported.specifier);
    return (target && exportedFrom(target, name, new Set())) || null;
  }
  /**
   * The declarations a name in a module can mean: its own, else what its
   * import reaches (null if that cannot be followed), else every loaded
   * declaration of the name.
   * @param {ts.SourceFile} sf
   * @param {string} name
   * @returns {TypeDeclaration[] | null}
   */
  function aliasDeclarations(sf, name) {
    const bound = bindingIn(sf, name, new Set());
    return bound === undefined ? (index.declarationsByName.get(name) ?? []) : bound;
  }
  /**
   * What a name bound in a module refers to: its declarations, null when it is
   * imported but cannot be followed, or undefined when it is not bound there.
   * @param {ts.SourceFile} sf
   * @param {string} name
   * @param {Set<string>} seen
   * @returns {TypeDeclaration[] | null | undefined}
   */
  function bindingIn(sf, name, seen) {
    const declared = declaredIn(sf.statements, name);
    if (declared.length) return declared;
    const imported = importOf(sf, name);
    if (!imported) return undefined;
    // A namespace or `require` binding is not a key type; refuse rather than guess.
    if (imported.kind === 'namespace' || imported.kind === 'require') return null;
    const target = imported.specifier && resolveModule(sf.fileName, imported.specifier);
    return (target && exportedFrom(target, imported.name, seen)) || null;
  }
  /**
   * The declarations a module exports under a name (`default` included): an
   * array when found, undefined when not exported, null when it cannot tell.
   * @param {string} file
   * @param {string} name
   * @param {Set<string>} seen
   * @returns {TypeDeclaration[] | undefined | null}
   */
  function exportedFrom(file, name, seen) {
    const key = `${file}\0${name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const sf = index.load(file);
    const own = declaredIn(sf.statements, name).filter(isExported);
    if (own.length) return own;
    /** @type {Array<TypeDeclaration[] | undefined | null>} */
    const stars = [];
    for (const statement of sf.statements) {
      // `export default Name;`
      if (
        name === 'default' &&
        ts.isExportAssignment(statement) &&
        !statement.isExportEquals &&
        ts.isIdentifier(statement.expression)
      )
        return bindingIn(sf, statement.expression.text, seen) ?? null;
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
        stars.push(target ? exportedFrom(target, name, seen) : null);
        continue;
      }
      if (ts.isNamespaceExport(clause)) {
        if (clause.name.text === name) return null;
        continue;
      }
      const element = clause.elements.find((e) => e.name.text === name);
      if (!element) continue;
      const original = (element.propertyName ?? element.name).text;
      if (statement.moduleSpecifier) {
        const target = specifier && resolveModule(file, specifier);
        return target ? (exportedFrom(target, original, seen) ?? null) : null;
      }
      // `export { original as name }` of this module's own binding.
      return bindingIn(sf, original, seen) ?? null;
    }
    const found = stars.filter((result) => Array.isArray(result));
    if (found.length) return found.flat();
    return stars.includes(null) ? null : undefined;
  }
  /**
   * The property names of an object type, as `keyof` sees them: a numeric
   * name such as `1` stays a number, distinct from the string `'1'`. Follows
   * type aliases, interfaces and the interfaces they extend through the
   * module-scoped resolution above. Null when the key set is not exactly
   * known: an index signature, a computed name, an unresolved reference or
   * any other type form.
   * @param {ts.TypeNode} node
   * @param {Set<ts.Node>} [seen]
   * @returns {Array<string | number> | null}
   */
  function propertyKeys(node, seen = new Set()) {
    if (ts.isParenthesizedTypeNode(node)) return propertyKeys(node.type, seen);
    if (ts.isTypeLiteralNode(node)) return memberKeys(node.members);
    if (ts.isIntersectionTypeNode(node)) {
      const parts = node.types.map((part) => propertyKeys(part, seen));
      return parts.includes(null) ? null : unique(parts.flat());
    }
    if (!ts.isTypeReferenceNode(node) || node.typeArguments) return null;
    const parts = entityParts(node.typeName);
    return parts ? declarationKeys(node.getSourceFile(), parts, seen) : null;
  }
  /**
   * @param {ts.SourceFile} sf
   * @param {string[]} parts
   * @param {Set<ts.Node>} seen
   * @returns {Array<string | number> | null}
   */
  function declarationKeys(sf, parts, seen) {
    const decls = declarationsOf(sf, parts);
    if (decls?.length !== 1 || seen.has(decls[0]) || decls[0].typeParameters?.length) return null;
    const [decl] = decls;
    seen.add(decl);
    location(decl);
    if (ts.isTypeAliasDeclaration(decl)) return propertyKeys(decl.type, seen);
    const keys = [memberKeys(decl.members)];
    for (const base of (decl.heritageClauses ?? []).flatMap((clause) => clause.types)) {
      const baseParts = !base.typeArguments && entityParts(base.expression);
      keys.push(baseParts ? declarationKeys(decl.getSourceFile(), baseParts, seen) : null);
    }
    return keys.includes(null) ? null : unique(keys.flat());
  }
  return { literalKeys, declarationsOf, propertyKeys };
}

/**
 * The property names of type members, or null if any is not a fixed name or
 * the type has an index signature.
 * @param {ts.NodeArray<ts.TypeElement>} members
 * @returns {Array<string | number> | null}
 */
function memberKeys(members) {
  const keys = [];
  for (const member of members) {
    if (ts.isCallSignatureDeclaration(member) || ts.isConstructSignatureDeclaration(member))
      continue;
    const name = member.name;
    if (!name) return null;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.push(name.text);
    else if (ts.isNumericLiteral(name)) keys.push(Number(name.text));
    else return null;
  }
  return keys;
}

/** @param {Array<string | number>} keys */
const unique = (keys) => keys.filter((key, i) => keys.indexOf(key) === i);
