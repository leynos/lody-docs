/**
 * Conversion of Zod schema expressions to JSON Schema.
 *
 * `createZodConverter` returns the converter, which follows a schema through the
 * variables that name it and converts the `z` constructors and chained
 * methods the public contract uses. An optional field is marked with
 * `x-optional` only while its object is being built; the marker never remains
 * in the output, `.optional().nullable()` stays optional, and a union with an
 * optional member is optional. Bounds take the
 * keyword their base type needs (`minLength`, `minItems` or `minimum`), and a
 * chain keeps the tighter bound; a check on a schema it does not apply to, or
 * a second format or pattern, is `x-unresolved`, as is a regular expression
 * with flags, which a JSON Schema `pattern` cannot carry. `.int()` and
 * `.safe()` are Zod 4's integer check, bounded to the safe-integer range; any
 * other `z` constructor is one unresolved entry. A record keeps only an unconstrained string key
 * schema; `.strict()`, `.passthrough()` and `.strip()` set the object's
 * unknown-key mode, the last one winning. `z` counts as Zod only where the
 * import from `zod` is the binding visible at the reference.
 * `.refine` and `.superRefine` keep the structural schema, flag it
 * `x-partial` and record the refinement as unresolved; any other method makes
 * the schema `x-unresolved`. Used by `schema-types.mjs` for `z.infer`.
 */
import ts from 'typescript';
import { propertiesFrom, propertyName, stringLiteral } from './schema-context.mjs';
import { declaredIn, enclosing, importOf } from './schema-bindings.mjs';

/**
 * Whether the binding of `name` visible at `node` is an import from a module
 * whose specifier matches `from`, so that a local look-alike is never mistaken
 * for the library. Any enclosing binding of the name, in either space, or a
 * module-level declaration of it, shadows the import.
 * @param {ts.Node} node
 * @param {string} name
 * @param {RegExp} from
 */
export function importedFrom(node, name, from) {
  if (enclosing(node, name, 'value') !== undefined || enclosing(node, name, 'type') !== undefined)
    return false;
  const sf = node.getSourceFile();
  if (
    declaredIn(sf.statements, name, 'value').length ||
    declaredIn(sf.statements, name, 'type').length
  )
    return false;
  const binding = importOf(sf, name);
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
  passthrough: ['object'],
  strip: ['object'],
});

/**
 * The body of a regular expression literal, or undefined when it has flags,
 * whose matching a JSON Schema `pattern` cannot reproduce.
 * @param {ts.RegularExpressionLiteral} literal
 */
export function patternOf(literal) {
  const end = literal.text.lastIndexOf('/');
  return literal.text.slice(end + 1) === '' ? literal.text.slice(1, end) : undefined;
}

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
        if (ts.isArrayLiteralExpression(array)) {
          // A union admits an absent value when any member does.
          const members = array.elements.map(zod);
          const optional = members.some((m) => m['x-optional']);
          return {
            anyOf: members.map(({ 'x-optional': _optional, ...m }) => m),
            ...(optional ? { 'x-optional': true } : {}),
          };
        }
      }
      if (method === 'record') {
        // A constrained key schema (an enum, a pattern) restricts and may
        // require keys, which `additionalProperties` alone cannot express.
        if (args.length > 1 && !isPlainZodString(args[0]))
          return opaque(node, 'Zod record with a constrained key schema needs manual expansion.');
        return { type: 'object', additionalProperties: nested(args.at(-1)) };
      }
      // Any other constructor, or a supported one with arguments of another
      // shape, is one unresolved entry for the whole call.
      return opaque(node, `Zod constructor z.${method}() needs manual expansion.`);
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
    if (['strict', 'passthrough', 'strip'].includes(method)) {
      // The last unknown-key mode wins; a record's value schema is not a mode.
      const { additionalProperties, ...rest } = base;
      if (additionalProperties !== undefined && additionalProperties !== false)
        return opaque(node, `Zod .${method}() on a record.`);
      return method === 'strict' ? { ...rest, additionalProperties: false } : rest;
    }
    if (['readonly', 'brand'].includes(method)) return base;
    // Zod 4's integer check, `.int()` and `.safe()` alike, also bounds the
    // value to the safe-integer range.
    if (method === 'int' || method === 'safe')
      return {
        ...base,
        type: 'integer',
        minimum: Math.max(base.minimum ?? -Infinity, -Number.MAX_SAFE_INTEGER),
        maximum: Math.min(base.maximum ?? Infinity, Number.MAX_SAFE_INTEGER),
      };
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
    if (method === 'regex' && ts.isRegularExpressionLiteral(args[0])) {
      const pattern = patternOf(args[0]);
      return pattern === undefined
        ? opaque(node, 'Zod .regex() with flags needs manual expansion.')
        : { ...base, pattern };
    }
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
  /**
   * Whether a node is exactly `z.string()`, the key schema a record may have
   * without restricting its keys.
   * @param {ts.Node} node
   */
  function isPlainZodString(node) {
    return (
      ts.isCallExpression(node) &&
      node.arguments.length === 0 &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'string' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'z' &&
      importedFrom(node.expression.expression, 'z', /^zod(\/|$)/)
    );
  }
  // At the top level, as in any nested position, the optional marker is dropped.
  return nested;
}
