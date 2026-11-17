/**
 * Conversion of Effect `Schema` expressions to JSON Schema.
 *
 * `createEffectConverter` returns `effectSchema`, which follows a schema
 * through the variables that name it and converts `Schema.String`,
 * `Schema.Int`, `Hex(n)`, `Schema.Struct` (including spreads of another
 * struct's fields), `Schema.Array`, `Schema.NullOr`, `Schema.Literals` and the
 * `isPattern` and `isMaxLength` checks (`maxLength` for strings, `maxItems`
 * for arrays, the tighter of two; a pattern with flags is refused). `Schema`
 * counts only where the import from `effect` is the binding visible there, `Hex(n)` only for the one known helper definition, and a
 * spread only for `X.fields` of a plain struct. Anything else becomes
 * `x-unresolved`.
 * Used by `schema-types.mjs` for `typeof Schema.Type` references.
 */
import ts from 'typescript';
import { propertiesFrom, propertyName, stringLiteral } from './schema-context.mjs';
import { isPlainObject } from './schema-utilities.mjs';
import { importedFrom, patternOf } from './schema-zod.mjs';

/** Whether a node is the `Schema` namespace imported from `effect`. @param {ts.Node} node */
const isSchema = (node) =>
  ts.isIdentifier(node) && node.text === 'Schema' && importedFrom(node, 'Schema', /^effect(\/|$)/);

/**
 * The parameter name of `const Hex = (n) => Schema.String.check(Schema.isPattern(
 * new RegExp(`^(?:[0-9a-f]{2}){1,${n}}$`)))`, the one helper whose calls are
 * expanded, or undefined for any other definition.
 * @param {ts.VariableDeclaration | undefined} variable
 */
function hexParameter(variable) {
  const fn = variable?.initializer;
  if (!fn || !ts.isArrowFunction(fn) || fn.parameters.length !== 1) return undefined;
  const parameter = fn.parameters[0].name;
  if (!ts.isIdentifier(parameter) || ts.isBlock(fn.body)) return undefined;
  // Compared without whitespace; `$\{` is a literal `${` in the compared text.
  const expected = `Schema.String.check(Schema.isPattern(newRegExp(\`^(?:[0-9a-f]{2}){1,$\{${parameter.text}}}$\`)))`;
  return fn.body.getText().replace(/\s+/g, '') === expected &&
    importedFrom(fn, 'Schema', /^effect(\/|$)/)
    ? parameter.text
    : undefined;
}

/**
 * Create the Effect converter of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createEffectConverter(ctx) {
  const { opaque, location, variableAt, numberValue } = ctx;
  /** @param {any} node @returns {any} */
  function effectSchema(node) {
    if (ts.isIdentifier(node)) {
      const variable = variableAt(node, node.text);
      if (variable?.initializer) {
        location(variable);
        return effectSchema(variable.initializer);
      }
    }
    if (ts.isPropertyAccessExpression(node) && isSchema(node.expression)) {
      if (node.name.text === 'String') return { type: 'string' };
      if (node.name.text === 'Int') return { type: 'integer' };
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Hex'
    ) {
      const helper = variableAt(node.expression, 'Hex');
      if (!hexParameter(helper)) return opaque(node, 'Hex helper has an unexpected definition.');
      location(/** @type {ts.Node} */ (helper));
      return {
        type: 'string',
        pattern: `^(?:[0-9a-f]{2}){1,${numberValue(node.arguments[0])}}$`,
      };
    }
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression))
      return opaque(node, 'Effect schema needs manual expansion.');
    const owner = node.expression.expression,
      method = node.expression.name.text,
      /** @type {any} */
      args = node.arguments;
    if (isSchema(owner)) {
      if (method === 'Struct' && ts.isObjectLiteralExpression(args[0])) {
        /** @type {Map<string, any>} */
        const properties = new Map();
        /** @type {string[]} */
        const required = [];
        for (const prop of args[0].properties) {
          if (
            ts.isSpreadAssignment(prop) &&
            ts.isPropertyAccessExpression(prop.expression) &&
            prop.expression.name.text === 'fields'
          ) {
            const variable = variableAt(prop, prop.expression.expression.getText());
            if (!variable?.initializer) return opaque(node, 'Effect spread not found.');
            const spread = effectSchema(variable.initializer);
            if (!isPlainObject(spread)) return opaque(node, 'Effect spread is not a plain struct.');
            for (const [key, value] of Object.entries(spread.properties ?? {}))
              properties.set(key, value);
            required.push(...(spread.required ?? []));
          } else if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
            const name = propertyName(prop.name);
            properties.set(
              name,
              effectSchema(ts.isPropertyAssignment(prop) ? prop.initializer : prop.name),
            );
            required.push(name);
          } else return opaque(node, 'Effect member needs manual expansion.');
        }
        return {
          type: 'object',
          properties: propertiesFrom(properties),
          required: [...new Set(required)],
        };
      }
      if (method === 'Array') return { type: 'array', items: effectSchema(args[0]) };
      if (method === 'NullOr') return { anyOf: [effectSchema(args[0]), { type: 'null' }] };
      if (method === 'Literals' && ts.isArrayLiteralExpression(args[0]))
        return { type: 'string', enum: args[0].elements.map(stringLiteral) };
    }
    if (method === 'check') {
      let base = effectSchema(owner);
      for (const arg of args) {
        if (
          !ts.isCallExpression(arg) ||
          !ts.isPropertyAccessExpression(arg.expression) ||
          !isSchema(arg.expression.expression)
        )
          return opaque(node, 'Effect check needs manual expansion.');
        const name = arg.expression.name.text;
        /** @type {any} */
        const first = arg.arguments[0];
        if (
          name === 'isPattern' &&
          ts.isRegularExpressionLiteral(first) &&
          base.type === 'string' &&
          base.pattern === undefined &&
          patternOf(first) !== undefined
        )
          base = { ...base, pattern: patternOf(first) };
        else if (name === 'isMaxLength' && ['array', 'string'].includes(base.type)) {
          const key = base.type === 'array' ? 'maxItems' : 'maxLength';
          const value = numberValue(first);
          base = { ...base, [key]: Math.min(base[key] ?? value, value) };
        } else return opaque(node, 'Effect refinement needs manual expansion.');
      }
      return base;
    }
    return opaque(node, 'Effect schema method needs manual expansion.');
  }
  return effectSchema;
}
