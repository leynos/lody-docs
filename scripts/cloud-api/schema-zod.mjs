/**
 * Conversion of Zod schema expressions to JSON Schema.
 *
 * `createZodConverter` returns `zod`, which follows a schema through the
 * variables that name it and converts the `z` constructors and chained
 * methods the public contract uses. An optional field is marked with
 * `x-optional` only while its object is being built; the marker never remains
 * in the output, and `.optional().nullable()` stays optional. Bounds take the
 * keyword their base type needs (`minLength`, `minItems` or `minimum`).
 * `.refine` and `.superRefine` keep the structural schema, flag it
 * `x-partial` and record the refinement as unresolved; any other method makes
 * the schema `x-unresolved`. Used by `schema-types.mjs` for `z.infer`.
 */
import ts from 'typescript';
import { propertyName, stringLiteral } from './schema-context.mjs';

/**
 * Create the Zod converter of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createZodConverter(ctx) {
  const { opaque, location, variableAt, numberValue, unresolved } = ctx;
  /**
   * A schema in a position where omission has no meaning: array items, union
   * members and record values.
   * @param {any} node
   */
  const nested = (node) => {
    const { 'x-optional': _optional, ...schema } = zod(node);
    return schema;
  };
  /** @param {any} node @returns {any} */
  function zod(node) {
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return zod(node.expression);
    if (ts.isIdentifier(node)) {
      const variable = variableAt(node, node.text);
      if (variable?.initializer) {
        location(variable);
        return zod(variable.initializer);
      }
    }
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression))
      return opaque(node, 'Runtime schema expression needs manual expansion.');
    const method = node.expression.name.text,
      owner = node.expression.expression,
      /** @type {any} */
      args = node.arguments;
    if (owner.getText() === 'z') {
      if (['string', 'number', 'boolean'].includes(method)) return { type: method };
      if (['unknown', 'any'].includes(method)) return {};
      if (method === 'literal') {
        let value = args[0];
        if (ts.isIdentifier(value)) value = variableAt(value, value.text)?.initializer ?? value;
        if (ts.isStringLiteral(value)) return { type: 'string', const: value.text };
        if (ts.isNumericLiteral(value)) return { type: 'number', const: Number(value.text) };
        if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(value.kind))
          return { type: 'boolean', const: value.kind === ts.SyntaxKind.TrueKeyword };
        return opaque(value, 'Literal value needs manual expansion.');
      }
      if (method === 'enum' && ts.isArrayLiteralExpression(args[0]))
        return { type: 'string', enum: args[0].elements.map(stringLiteral) };
      if (method === 'array') return { type: 'array', items: nested(args[0]) };
      if (method === 'object' && ts.isObjectLiteralExpression(args[0])) {
        /** @type {Record<string, any>} */
        const properties = {};
        /** @type {string[]} */
        const required = [];
        for (const p of args[0].properties) {
          if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p))
            return opaque(node, 'Object schema spread needs manual expansion.');
          const s = zod(ts.isPropertyAssignment(p) ? p.initializer : p.name);
          const optional = s['x-optional'];
          delete s['x-optional'];
          properties[propertyName(p.name)] = s;
          if (!optional) required.push(propertyName(p.name));
        }
        return { type: 'object', properties, ...(required.length ? { required } : {}) };
      }
      if (['union', 'discriminatedUnion'].includes(method)) {
        const array = args[method === 'union' ? 0 : 1];
        if (ts.isArrayLiteralExpression(array)) return { anyOf: array.elements.map(nested) };
      }
      if (method === 'record') return { type: 'object', additionalProperties: nested(args.at(-1)) };
    }
    const base = zod(owner);
    if (method === 'optional') return { ...base, 'x-optional': true };
    if (method === 'nullable') {
      // `.optional().nullable()` is still optional: lift the marker outward.
      const { 'x-optional': optional, ...inner } = base;
      return { anyOf: [inner, { type: 'null' }], ...(optional ? { 'x-optional': true } : {}) };
    }
    if (method === 'strict') return { ...base, additionalProperties: false };
    if (['passthrough', 'strip', 'readonly', 'brand'].includes(method)) return base;
    if (method === 'int') return { ...base, type: 'integer' };
    if (method === 'positive') return { ...base, exclusiveMinimum: 0 };
    if (method === 'nonnegative') return { ...base, minimum: 0 };
    if (['min', 'max'].includes(method)) {
      const key =
        base.type === 'string'
          ? method === 'min'
            ? 'minLength'
            : 'maxLength'
          : base.type === 'array'
            ? method === 'min'
              ? 'minItems'
              : 'maxItems'
            : method === 'min'
              ? 'minimum'
              : 'maximum';
      return { ...base, [key]: numberValue(args[0]) };
    }
    if (['uuid', 'url', 'datetime'].includes(method))
      return {
        ...base,
        format: /** @type {Record<string, string>} */ ({
          uuid: 'uuid',
          url: 'uri',
          datetime: 'date-time',
        })[method],
      };
    if (method === 'regex' && ts.isRegularExpressionLiteral(args[0]))
      return { ...base, pattern: args[0].text.slice(1, args[0].text.lastIndexOf('/')) };
    if (method === 'safe')
      return {
        ...base,
        minimum: Math.max(base.minimum ?? -Infinity, -Number.MAX_SAFE_INTEGER),
        maximum: Math.min(base.maximum ?? Infinity, Number.MAX_SAFE_INTEGER),
      };
    if (method === 'trim') return { ...base, 'x-transform': 'trim input before validation' };
    if (['refine', 'superRefine'].includes(method)) {
      const source = location(node);
      const expression = `Zod .${method}(...) semantic callback`;
      unresolved.set(`${source}:${expression}`, {
        source,
        typescript: expression,
        reason: 'Structural schema retained; semantic refinement requires the source validator.',
      });
      return { ...base, 'x-refinement': expression, 'x-source': source, 'x-partial': true };
    }
    // Unsupported refinements must not silently look like a fully expanded schema.
    return opaque(node, `Zod method ${method} requires manual review.`);
  }
  return zod;
}
