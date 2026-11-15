/**
 * Object flattening and the TypeScript utility types built on it.
 *
 * `flatten` turns an object schema, a reference to one or an intersection of
 * object schemas into one object schema; where two parts constrain the same
 * property, the property must satisfy both (`allOf`). An intersection that
 * includes anything other than a plain object schema is not flattened, so
 * callers cannot mistake it for one. `createUtilities` converts `Pick`,
 * `Omit`, `Partial`, `Required`, `Extract`, `Exclude` and `keyof`, and returns
 * an `x-unresolved` schema whenever a key set or filter cannot be established
 * exactly. Used by `schema-types.mjs`.
 */
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';

/**
 * Follow component references to the schema they name.
 * @param {Record<string, any>} schemas
 * @param {any} schema
 * @returns {any}
 */
export function deref(schemas, schema) {
  return schema.$ref ? deref(schemas, schemas[schema.$ref.split('/').at(-1)]) : schema;
}

/**
 * One object schema for an object, a reference or an intersection of objects.
 * An intersection with a part that is not a plain object schema is returned as
 * `{ allOf }`, without a `type`.
 * @param {Record<string, any>} schemas
 * @param {any} schema
 * @returns {any}
 */
export function flatten(schemas, schema) {
  const s = deref(schemas, schema);
  if (!s.allOf) return s;
  const parts = s.allOf.map((/** @type {any} */ part) => flatten(schemas, part));
  if (!parts.every((/** @type {any} */ p) => p.type === 'object' && !p.additionalProperties))
    return { allOf: parts };
  /** @type {Record<string, any>} */
  const properties = {};
  for (const part of parts)
    for (const [key, value] of Object.entries(part.properties ?? {}))
      properties[key] =
        key in properties && !isDeepStrictEqual(properties[key], value)
          ? { allOf: [properties[key], value] }
          : value;
  return {
    type: 'object',
    properties,
    required: [...new Set(parts.flatMap((/** @type {any} */ p) => p.required ?? []))],
  };
}

/**
 * Create the utility-type converters of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createUtilities(ctx) {
  const { schemas, opaque } = ctx;
  /** @param {any} schema */
  const flat = (schema) => flatten(schemas, schema);

  /**
   * `Pick`, `Omit`, `Partial` or `Required` of an object type.
   * @param {string} name
   * @param {ts.TypeReferenceNode} node
   * @param {readonly ts.TypeNode[]} args
   */
  function objectUtility(name, node, args) {
    const object = flat(ctx.convert(args[0]));
    if (object.type !== 'object') return opaque(node, 'Utility target is not an object.');
    /** @type {string[] | undefined | null} */
    let keys = [];
    if (name === 'Pick' || name === 'Omit') {
      keys = ctx.literalKeys(args[1]);
      if (!keys) return opaque(node, 'Utility key set could not be resolved to string literals.');
    }
    const selected = /** @type {string[]} */ (keys);
    const props = Object.fromEntries(
      Object.entries(object.properties ?? {}).filter(([k]) =>
        name === 'Omit' ? !selected.includes(k) : name === 'Pick' ? selected.includes(k) : true,
      ),
    );
    return {
      type: 'object',
      properties: props,
      required:
        name === 'Partial'
          ? []
          : name === 'Required'
            ? Object.keys(props)
            : (object.required ?? []).filter((/** @type {string} */ k) => k in props),
      // An index signature survives every utility except Pick.
      ...(name !== 'Pick' && object.additionalProperties !== undefined
        ? { additionalProperties: object.additionalProperties }
        : {}),
    };
  }

  /**
   * `Extract` or `Exclude` of a union, for literal and discriminant filters.
   * @param {string} name
   * @param {ts.TypeReferenceNode} node
   * @param {readonly ts.TypeNode[]} args
   */
  function unionUtility(name, node, args) {
    const source = deref(schemas, ctx.convert(args[0]));
    const filter = flat(ctx.convert(args[1]));
    const variants = source.anyOf ?? [source];
    const literals =
      filter.const !== undefined
        ? [filter.const]
        : filter.anyOf?.every((/** @type {any} */ v) => deref(schemas, v).const !== undefined)
          ? filter.anyOf.map((/** @type {any} */ v) => deref(schemas, v).const)
          : undefined;
    const discriminants =
      filter.type === 'object' &&
      Object.keys(filter.properties ?? {}).length > 0 &&
      Object.values(filter.properties).every((/** @type {any} */ s) => s.const !== undefined)
        ? filter.properties
        : undefined;
    if (!literals && !discriminants)
      return opaque(node, 'Utility filter is not a literal or discriminant object type.');
    /** @param {any} v */
    const matches = (v) => {
      const value = flat(v);
      if (literals) return value.const !== undefined && literals.includes(value.const);
      return Object.entries(discriminants).every(
        ([k, s]) => value.properties?.[k]?.const === /** @type {any} */ (s).const,
      );
    };
    const chosen = variants.filter((/** @type {any} */ v) =>
      name === 'Extract' ? matches(v) : !matches(v),
    );
    if (!chosen.length) return opaque(node, 'Utility union could not be narrowed.');
    return chosen.length === 1 ? chosen[0] : { anyOf: chosen };
  }

  /**
   * `keyof` of an object type with known properties.
   * @param {ts.TypeOperatorNode} node
   */
  function keyOf(node) {
    const object = flat(ctx.convert(node.type));
    if (object.type !== 'object' || object.additionalProperties !== undefined)
      return opaque(node, 'Key type of an open or non-object type.');
    const keys = Object.keys(object.properties ?? {});
    return keys.length ? { type: 'string', enum: keys } : { not: {} };
  }

  return { objectUtility, unionUtility, keyOf };
}

/** Whether a type operator leaves the represented JSON values unchanged. */
export const isTransparentOperator = (/** @type {ts.TypeOperatorNode} */ node) =>
  node.operator === ts.SyntaxKind.ReadonlyKeyword;
