/**
 * Conversion of Zod schema expressions to JSON Schema.
 *
 * `createZodConverter` returns `zod`, which follows a schema through the
 * variables that name it and converts the `z` constructors and chained
 * methods the public contract uses. An optional field is marked with
 * `x-optional` only while its object is being built; the marker never remains
 * in the output, and `.optional().nullable()` stays optional. Bounds take the
 * keyword their base type needs (`minLength`, `minItems` or `minimum`), and a
 * chain keeps the tighter bound; a check on a schema it does not apply to, or
 * a second format or pattern, is `x-unresolved`. `z` counts as Zod only where
 * it is imported from `zod`.
 * `.refine` and `.superRefine` keep the structural schema, flag it
 * `x-partial` and record the refinement as unresolved; any other method makes
 * the schema `x-unresolved`. Used by `schema-types.mjs` for `z.infer`.
 */
import ts from 'typescript';
import { propertiesFrom, propertyName, stringLiteral } from './schema-context.mjs';
import { importOf } from './schema-scope.mjs';

/**
 * Whether `name` at `node` is bound by an import from a module whose
 * specifier matches `from`, so that a local look-alike is never mistaken for
 * the library.
 * @param {ts.Node} node
 * @param {string} name
 * @param {RegExp} from
 */
export function importedFrom(node, name, from) {
  const binding = importOf(node.getSourceFile(), name);
  return Boolean(
    binding?.specifier &&
      from.test(binding.specifier) &&
      (binding.kind !== 'named' || binding.name === name),
  );
}

/** The base types each refinement method applies to. */
const APPLIES_TO = /** @type {Record<string, string[]>} */ ({
  int: ['number', 'integer'],
  positive: ['number', 'integer'],
  nonnegative: ['number', 'integer'],
  safe: ['number', 'integer'],
  uuid: ['string'],
  url: ['string'],
  datetime: ['string'],
  regex: ['string'],
  trim: ['string'],
  min: ['string', 'array', 'number', 'integer'],
  max: ['string', 'array', 'number', 'integer'],
  strict: ['object'],
});

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
    if (ts.isIdentifier(owner) && owner.text === 'z' && importedFrom(owner, 'z', /^zod(\/|$)/)) {
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
        /** @type {Map<string, any>} */
        const properties = new Map();
        /** @type {string[]} */
        const required = [];
        for (const p of args[0].properties) {
          if (!ts.isPropertyAssignment(p) && !ts.isShorthandPropertyAssignment(p))
            return opaque(node, 'Object schema spread needs manual expansion.');
          const s = zod(ts.isPropertyAssignment(p) ? p.initializer : p.name);
          const optional = s['x-optional'];
          delete s['x-optional'];
          properties.set(propertyName(p.name), s);
          if (!optional) required.push(propertyName(p.name));
        }
        return {
          type: 'object',
          properties: propertiesFrom(properties),
          ...(required.length ? { required } : {}),
        };
      }
      if (['union', 'discriminatedUnion'].includes(method)) {
        const array = args[method === 'union' ? 0 : 1];
        if (ts.isArrayLiteralExpression(array)) return { anyOf: array.elements.map(nested) };
      }
      if (method === 'record') return { type: 'object', additionalProperties: nested(args.at(-1)) };
    }
    const base = zod(owner);
    if (APPLIES_TO[method] && !APPLIES_TO[method].includes(base.type))
      return opaque(node, `Zod .${method}() on a schema it does not apply to.`);
    if (method === 'optional') return { ...base, 'x-optional': true };
    if (method === 'nullable') {
      // `.optional().nullable()` is still optional: lift the marker outward.
      const { 'x-optional': optional, ...inner } = base;
      return { anyOf: [inner, { type: 'null' }], ...(optional ? { 'x-optional': true } : {}) };
    }
    if (method === 'strict') return { ...base, additionalProperties: false };
    if (['passthrough', 'strip', 'readonly', 'brand'].includes(method)) return base;
    if (method === 'int') return { ...base, type: 'integer' };
    if (method === 'positive')
      return { ...base, exclusiveMinimum: Math.max(base.exclusiveMinimum ?? 0, 0) };
    if (method === 'nonnegative') return { ...base, minimum: Math.max(base.minimum ?? 0, 0) };
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
      // Zod applies every bound in a chain, so the tighter one holds.
      const value = numberValue(args[0]);
      const tighter = method === 'min' ? Math.max : Math.min;
      return { ...base, [key]: base[key] === undefined ? value : tighter(base[key], value) };
    }
    if (['uuid', 'url', 'datetime', 'regex'].includes(method) && (base.format || base.pattern))
      return opaque(node, `Zod .${method}() would replace an earlier format or pattern.`);
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
