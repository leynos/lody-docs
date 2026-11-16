/**
 * The declarations and bindings a module's syntax establishes, for
 * `schema-scope.mjs`: which statements declare a name in the type or value
 * space (every kind, `declare` forms and destructured names included), what
 * an enclosing scope (type parameters, function parameters, catch clauses,
 * loop variables, namespace bodies and blocks) binds a name to, and which import binds it. Pure syntax; no
 * module is loaded here.
 */
import ts from 'typescript';

/** @typedef {ts.TypeAliasDeclaration | ts.InterfaceDeclaration} TypeDeclaration */
/** @typedef {'type' | 'value'} Space */

/** @param {ts.Node} node */
export const isExported = (node) => {
  const holder = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  return (
    /** @type {any} */ (holder).modifiers?.some(
      (/** @type {ts.Node} */ m) => m.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false
  );
};

/**
 * Whether a statement declares `name` in a space. Every declaration kind that
 * occupies the space counts, `declare` forms included, so that an unsupported
 * kind (a class, an enum, a namespace) still shadows outer names; converters
 * expand only type aliases, interfaces and variables, and refuse the rest.
 * @param {ts.Statement} s
 * @param {string} name
 * @param {Space} space
 * @returns {any[]}
 */
export function declarationsIn(s, name, space) {
  const named = /** @type {any} */ (s).name;
  const matches = named !== undefined && ts.isIdentifier(named) && named.text === name;
  if (space === 'type')
    return matches &&
      (ts.isTypeAliasDeclaration(s) ||
        ts.isInterfaceDeclaration(s) ||
        ts.isClassDeclaration(s) ||
        ts.isEnumDeclaration(s) ||
        ts.isModuleDeclaration(s))
      ? [s]
      : [];
  if (ts.isVariableStatement(s)) {
    /** @type {any[]} */
    const found = [];
    for (const v of s.declarationList.declarations) {
      if (ts.isIdentifier(v.name)) {
        if (v.name.text === name) found.push(v);
      }
      // A destructured name is bound here too; its binding element is
      // returned, which no converter expands.
      else found.push(...bindingElements(v.name).filter((e) => e.name.text === name));
    }
    return found;
  }
  return matches &&
    (ts.isFunctionDeclaration(s) ||
      ts.isClassDeclaration(s) ||
      ts.isEnumDeclaration(s) ||
      ts.isModuleDeclaration(s))
    ? [s]
    : [];
}

/**
 * The identifier binding elements of a destructuring pattern, nested ones too.
 * @param {ts.BindingName} pattern
 * @returns {Array<ts.BindingElement & { name: ts.Identifier }>}
 */
export function bindingElements(pattern) {
  if (ts.isIdentifier(pattern)) return [];
  return pattern.elements.flatMap((element) => {
    if (ts.isOmittedExpression(element)) return [];
    return ts.isIdentifier(element.name)
      ? [/** @type {any} */ (element)]
      : bindingElements(element.name);
  });
}

/**
 * The declarations of a name among statements, in one space.
 * @param {readonly ts.Statement[]} statements
 * @param {string} name
 * @param {Space} space
 * @returns {any[]}
 */
export const declaredIn = (statements, name, space) =>
  statements.flatMap((s) => declarationsIn(s, name, space));

/**
 * What an enclosing scope inside a module binds a name to: null for a type
 * parameter of an enclosing declaration, type or mapped type, or a parameter
 * of an enclosing function (never resolved further); the declarations of an
 * enclosing namespace body or block; or undefined when no enclosing scope
 * binds it.
 * @param {ts.Node} at the reference
 * @param {string} name
 * @param {Space} space
 * @returns {any[] | null | undefined}
 */
export function enclosing(at, name, space) {
  for (let n = at.parent; n && !ts.isSourceFile(n); n = n.parent) {
    const node = /** @type {any} */ (n);
    if (
      space === 'type' &&
      (node.typeParameters?.some((/** @type {any} */ p) => p.name.text === name) ||
        node.typeParameter?.name.text === name)
    )
      return null;
    // A function's parameters bind values in its body.
    if (
      space === 'value' &&
      node.parameters?.some(
        (/** @type {ts.ParameterDeclaration} */ p) =>
          (ts.isIdentifier(p.name) && p.name.text === name) ||
          (!ts.isIdentifier(p.name) && bindingElements(p.name).some((e) => e.name.text === name)),
      )
    )
      return null;
    // A catch clause and a loop's variable declarations bind values in the body.
    if (space === 'value' && bindsIn(n, name)) return null;
    if (ts.isModuleBlock(n) || ts.isBlock(n)) {
      const declared = declaredIn(n.statements, name, space);
      if (declared.length) return declared;
      if (n.statements.some((st) => ts.isImportEqualsDeclaration(st) && st.name.text === name))
        return null;
    }
  }
  return undefined;
}

/**
 * Whether a catch clause or a `for` loop's variable declarations bind a name.
 * @param {ts.Node} n
 * @param {string} name
 */
function bindsIn(n, name) {
  /** @param {ts.BindingName} b */
  const binds = (b) =>
    ts.isIdentifier(b) ? b.text === name : bindingElements(b).some((e) => e.name.text === name);
  if (ts.isCatchClause(n))
    return Boolean(n.variableDeclaration && binds(n.variableDeclaration.name));
  if (ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n)) {
    const init = n.initializer;
    return Boolean(
      init && ts.isVariableDeclarationList(init) && init.declarations.some((d) => binds(d.name)),
    );
  }
  return false;
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
