/**
 * Conversion of Effect `Schema` expressions to JSON Schema.
 *
 * `createEffectConverter` returns `effectSchema`, which follows a schema
 * through the variables that name it and converts `Schema.String`,
 * `Schema.Int`, `Hex(n)`, `Schema.Struct` (including spreads of another
 * struct's fields), `Schema.Array`, `Schema.NullOr`, `Schema.Literals` and the
 * `isPattern` and `isMaxLength` checks. Anything else becomes `x-unresolved`.
 * Used by `schema-types.mjs` for `typeof Schema.Type` references.
 */
import ts from 'typescript';
import { propertyName, stringLiteral } from './schema-context.mjs';

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
    if (ts.isPropertyAccessExpression(node) && node.expression.getText() === 'Schema') {
      if (node.name.text === 'String') return { type: 'string' };
      if (node.name.text === 'Int') return { type: 'integer' };
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Hex'
    ) {
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
    if (owner.getText() === 'Schema') {
      if (method === 'Struct' && ts.isObjectLiteralExpression(args[0])) {
        /** @type {Record<string, any>} */
        const properties = {};
        /** @type {string[]} */
        const required = [];
        for (const prop of args[0].properties) {
          if (ts.isSpreadAssignment(prop) && ts.isPropertyAccessExpression(prop.expression)) {
            const variable = variableAt(prop, prop.expression.expression.getText());
            if (!variable?.initializer) return opaque(node, 'Effect spread not found.');
            const spread = effectSchema(variable.initializer);
            Object.assign(properties, spread.properties);
            required.push(...(spread.required ?? []));
          } else if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
            const name = propertyName(prop.name);
            properties[name] = effectSchema(
              ts.isPropertyAssignment(prop) ? prop.initializer : prop.name,
            );
            required.push(name);
          } else return opaque(node, 'Effect member needs manual expansion.');
        }
        return { type: 'object', properties, required };
      }
      if (method === 'Array') return { type: 'array', items: effectSchema(args[0]) };
      if (method === 'NullOr') return { anyOf: [effectSchema(args[0]), { type: 'null' }] };
      if (method === 'Literals' && ts.isArrayLiteralExpression(args[0]))
        return { type: 'string', enum: args[0].elements.map(stringLiteral) };
    }
    if (method === 'check') {
      let base = effectSchema(owner);
      for (const arg of args) {
        if (!ts.isCallExpression(arg) || !ts.isPropertyAccessExpression(arg.expression))
          return opaque(node, 'Effect check needs manual expansion.');
        const name = arg.expression.name.text;
        /** @type {any} */
        const first = arg.arguments[0];
        if (name === 'isPattern' && ts.isRegularExpressionLiteral(first))
          base = { ...base, pattern: first.text.slice(1, -1) };
        else if (name === 'isMaxLength') base = { ...base, maxItems: numberValue(first) };
        else return opaque(node, 'Effect refinement needs manual expansion.');
      }
      return base;
    }
    return opaque(node, 'Effect schema method needs manual expansion.');
  }
  return effectSchema;
}
