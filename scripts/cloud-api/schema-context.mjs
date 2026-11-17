/**
 * The shared state and helpers of one schema conversion.
 *
 * `createContext` holds what every converter module (`schema-types.mjs`,
 * `schema-utilities.mjs`, `schema-keys.mjs`, `schema-zod.mjs`,
 * `schema-effect.mjs`) reads or records: the component schemas built so far,
 * the types that could not be expanded, the source files whose content shaped
 * a schema, and helpers to cite a node's location, mark a node unresolved,
 * find a variable and evaluate a constant bound. `schema.mjs` creates one
 * context per converter and wires the modules to it; the context performs no
 * I/O beyond what its source index does.
 */
import path from 'node:path';
import ts from 'typescript';

/** A JSON Schema reference to a component schema. @param {string} name */
export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

/** The JSDoc text attached to a node. @param {any} node */
export const comment = (node) =>
  (node.jsDoc ?? [])
    .map((/** @type {any} */ d) => (typeof d.comment === 'string' ? d.comment : ''))
    .filter(Boolean)
    .join('\n');

/**
 * A property schema an object schema declares itself, never one inherited from
 * `Object.prototype` (`constructor`, `toString`, `__proto__`).
 * @param {any} schema an object schema
 * @param {string} name
 */
export const ownProperty = (schema, name) =>
  schema?.properties && Object.hasOwn(schema.properties, name)
    ? schema.properties[name]
    : undefined;

/**
 * Properties built in a `Map`, as a plain object whose keys are all own data
 * properties, `__proto__` included.
 * @param {Map<string, any>} properties
 */
export const propertiesFrom = (properties) => Object.fromEntries(properties);

/** @param {ts.PropertyName} node */
export function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return node.text;
  throw Error(`Unsupported computed property name: ${node.getText()}`);
}

/** @param {ts.Expression} node */
export function stringLiteral(node) {
  if (ts.isStringLiteral(node)) return node.text;
  throw Error(`Expected a string literal: ${node.getText()}`);
}

/**
 * @typedef {object} Unresolved
 * @property {string} source
 * @property {string} typescript
 * @property {string} reason
 */

/**
 * @typedef {object} Context
 * @property {import('./source-index.mjs').SourceIndex} index
 * @property {string} root
 * @property {Record<string, any>} schemas component schemas built so far
 * @property {Map<string, Unresolved>} unresolved
 * @property {Set<string>} used absolute paths of files that shaped the output
 * @property {(node: ts.Node) => string} location `path:line`, recording the file as used
 * @property {(node: ts.Node, reason: string) => any} opaque an `x-unresolved` schema
 * @property {(node: ts.Node, name: string) => ts.VariableDeclaration | undefined} variableAt
 * @property {(node: any) => number} numberValue
 * @property {(node: any) => any} convert TypeScript type to schema
 * @property {(name: string, node: ts.Node) => any} named a named DTO, as a reference
 * @property {(node: any) => any} zod Zod expression to schema
 * @property {(node: any) => any} effectSchema Effect schema expression to schema
 * @property {(node: ts.TypeNode | undefined) => string[] | undefined | null} literalKeys
 * @property {(at: ts.Node, parts: string[], space?: 'type' | 'value') => any[] | null} declarationsOf
 *   the declarations a name used at a node can mean (`schema-scope.mjs`)
 * @property {(at: ts.Node, name: string, space?: 'type' | 'value') => boolean} isBound
 *   whether the module binds a name itself
 * @property {(node: ts.ImportTypeNode) => any[] | null} importTypeDeclarations
 * @property {(node: ts.TypeNode) => Array<string | number> | null} propertyKeys
 *   the property names `keyof` sees, numbers kept as numbers (`schema-keys.mjs`)
 */

/**
 * Create the state and helpers of a conversion. The converter functions are
 * attached by `schema.mjs`.
 * @param {import('./source-index.mjs').SourceIndex} index
 * @param {Record<string, any>} initialSchemas
 * @returns {Context}
 */
export function createContext(index, initialSchemas) {
  /** @type {Record<string, any>} */
  const schemas = { ...initialSchemas };
  /** @type {Map<string, Unresolved>} */
  const unresolved = new Map();
  /** @type {Set<string>} */
  const used = new Set();
  const { root } = index;

  /** @param {ts.Node} node */
  const location = (node) => {
    const sf = node.getSourceFile();
    const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    used.add(sf.fileName);
    return `${path.relative(root, sf.fileName)}:${line}`;
  };
  /**
   * The one variable a name (`x` or `ns.x`) used at `node` means, resolved in
   * that node's module (`schema-scope.mjs`), or undefined. The file that
   * supplies it shapes the output, so it counts as used.
   * @param {ts.Node} node
   * @param {string} name
   * @returns {ts.VariableDeclaration | undefined}
   */
  const variableAt = (node, name) => {
    const found = context.declarationsOf(node, name.split('.'), 'value');
    // Only a variable can supply a schema or a bound; a function, class or
    // enum of the name shadows outer ones but is not expanded.
    if (found?.length !== 1 || !ts.isVariableDeclaration(found[0])) return undefined;
    used.add(found[0].getSourceFile().fileName);
    return found[0];
  };
  /** @param {any} node @returns {number} */
  const numberValue = (node) => {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
      return numberValue(node.expression);
    if (node.getText() === 'Number.MAX_SAFE_INTEGER' && !context.isBound(node, 'Number', 'value'))
      return Number.MAX_SAFE_INTEGER;
    if (ts.isBinaryExpression(node)) {
      const a = numberValue(node.left),
        b = numberValue(node.right);
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return a + b;
      if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return a * b;
    }
    if (ts.isIdentifier(node)) {
      const v = variableAt(node, node.text);
      if (v?.initializer) return numberValue(v.initializer);
    }
    if (ts.isPropertyAccessExpression(node)) {
      const v = variableAt(node, node.expression.getText());
      /** @type {any} */
      let value = v?.initializer;
      if (value && ts.isAsExpression(value)) value = value.expression;
      const prop = value?.properties?.find(
        (/** @type {any} */ p) => p.name?.getText() === node.name.text,
      );
      if (prop?.initializer) return numberValue(prop.initializer);
    }
    throw Error(`Unsupported numeric schema bound: ${node.getText()}`);
  };
  /** @param {ts.Node} node @param {string} reason */
  const opaque = (node, reason) => {
    const text = node.getText();
    const source = location(node);
    unresolved.set(`${source}:${text}`, { source, typescript: text, reason });
    return {
      description: `Unexpanded public type: ${text}. ${reason}`,
      'x-typescript': text,
      'x-source': source,
      'x-unresolved': true,
    };
  };
  const unset = () => {
    throw Error('Converter function used before it was attached');
  };
  /** @type {Context} */
  const context = {
    index,
    root,
    schemas,
    unresolved,
    used,
    location,
    opaque,
    variableAt,
    numberValue,
    convert: unset,
    named: unset,
    zod: unset,
    effectSchema: unset,
    literalKeys: unset,
    declarationsOf: unset,
    propertyKeys: unset,
    importTypeDeclarations: unset,
    isBound: unset,
  };
  return context;
}
