/**
 * Conversion of TypeScript type syntax to JSON Schema.
 *
 * `createTypeConverter` returns `convert`, for a type node, and `named`, for a
 * declared DTO, which it emits once as a `Dto_` component schema and refers to
 * thereafter. Interfaces include the members they inherit, each base
 * resolved in the extending module and cached per declaration. Keywords,
 * literals, arrays, tuples (with optional and rest elements), unions,
 * intersections, object literals, indexed access, `readonly` and the
 * supported utility types (`schema-utilities.mjs`) are expanded; record keys
 * and `keyof` key sets come from `schema-keys.mjs`; properties are built so
 * that `Object.prototype` names are ordinary properties; `typeof` a Zod or Effect schema goes to
 * `schema-zod.mjs` or `schema-effect.mjs`. Anything else becomes an
 * `x-unresolved` schema rather than a guess.
 */
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { comment, ownProperty, propertiesFrom, propertyName, ref } from './schema-context.mjs';
import { entityParts } from './schema-scope.mjs';
import { importedFrom } from './schema-zod.mjs';

/** Whether a declaration is a kind the converter expands. @param {ts.Node} decl */
export const expandable = (decl) =>
  ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl);
import {
  createUtilities,
  flatten,
  isPlainObject,
  isTransparentOperator,
} from './schema-utilities.mjs';

/**
 * Create the type converter of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createTypeConverter(ctx) {
  const { schemas, opaque, location, variableAt } = ctx;
  const utilities = createUtilities(ctx);

  /**
   * Component names by declaration, so that two same-named declarations in
   * different modules never share a schema; the first to be emitted is
   * `Dto_<Name>`, a later one `Dto_<Name>_2`, and so on.
   * @type {Map<ts.Node, string>}
   */
  const components = new Map();
  /** @type {Map<string, ts.Node>} */
  const claimed = new Map();
  /** @param {any} decl */
  function componentName(decl) {
    let key = components.get(decl);
    if (key) return key;
    const base = `Dto_${decl.name.text}`;
    key = base;
    for (let n = 2; claimed.has(key) || schemas[key]; n++) key = `${base}_${n}`;
    components.set(decl, key);
    claimed.set(key, decl);
    return key;
  }

  /**
   * A named DTO, resolved in the module of the referencing node, emitted once
   * as a component schema and referred to thereafter.
   * @param {string} name `Name` or `Q.Name`
   * @param {ts.Node} node the reference
   */
  function named(name, node) {
    return namedFrom(ctx.declarationsOf(node, name.split('.')), node);
  }

  /**
   * @param {any[] | null} decls the declarations the reference can mean
   * @param {ts.Node} node the reference
   */
  function namedFrom(decls, node) {
    if (!decls?.length)
      return opaque(node, 'Definition is outside the indexed public DTO sources.');
    if (decls.length > 1) return opaque(node, 'Type name has more than one declaration in scope.');
    const [decl] = decls;
    if (!expandable(decl))
      return opaque(
        node,
        'Only type aliases and interfaces are expanded; this name is another kind.',
      );
    if (decl.typeParameters?.length) return opaque(node, 'Generic type requires explicit review.');
    const key = componentName(decl);
    if (schemas[key]) return ref(key);
    schemas[key] = {}; // Break recursion.
    const value = ts.isInterfaceDeclaration(decl) ? interfaceSchema(decl) : convert(decl.type);
    schemas[key] = {
      ...value,
      ...(comment(decl) ? { description: comment(decl) } : {}),
      'x-source': location(decl),
    };
    return ref(key);
  }

  /**
   * Schemas of base declarations, keyed by the declaration itself, so that
   * two same-named bases in different modules never share one.
   * @type {Map<ts.Node, any>}
   */
  const bases = new Map();
  /**
   * The schema of the one declaration a base name means in the extending
   * interface's module, or undefined.
   * @param {ts.ExpressionWithTypeArguments} base
   */
  function baseSchema(base) {
    const parts = !base.typeArguments && entityParts(base.expression);
    const decls = parts ? ctx.declarationsOf(base, parts) : null;
    if (decls?.length !== 1 || !expandable(decls[0]) || decls[0].typeParameters?.length)
      return undefined;
    const [decl] = decls;
    if (!bases.has(decl)) {
      bases.set(decl, {}); // Break recursion: an inheritance cycle stays unresolved.
      location(decl);
      bases.set(
        decl,
        flatten(
          schemas,
          ts.isInterfaceDeclaration(decl) ? interfaceSchema(decl) : convert(decl.type),
        ),
      );
    }
    return bases.get(decl);
  }

  /**
   * An interface's own members together with those it inherits. Each base is
   * resolved in the interface's own module (its declarations and imports); a
   * base that cannot be resolved to one object schema makes the interface
   * unresolved.
   * @param {ts.InterfaceDeclaration} decl
   */
  function interfaceSchema(decl) {
    const own = members(decl.members);
    const heritage = (decl.heritageClauses ?? []).flatMap((clause) => clause.types);
    if (!heritage.length) return own;
    /** @type {Map<string, any>} */
    const properties = new Map();
    /** @type {string[]} */
    const required = [];
    /** @type {any[]} */
    const signatures = [];
    for (const base of heritage) {
      const schema = baseSchema(base);
      if (!isPlainObject(schema, true))
        return opaque(base, 'Inherited interface could not be expanded.');
      // A property two bases both declare must satisfy both.
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        const earlier = properties.get(key);
        properties.set(
          key,
          properties.has(key) && !isDeepStrictEqual(earlier, value)
            ? { allOf: [earlier, value] }
            : value,
        );
      }
      required.push(...(schema.required ?? []));
      if (schema.additionalProperties !== undefined) signatures.push(schema.additionalProperties);
    }
    // Index signatures of several bases are kept only when they all agree.
    if (signatures.some((other) => !isDeepStrictEqual(other, signatures[0])))
      return opaque(decl.name, 'Inherited index signatures differ.');
    let additionalProperties = signatures[0];
    // A member the interface redeclares narrows the inherited one.
    for (const [key, value] of Object.entries(own.properties)) properties.set(key, value);
    required.push(...(own.required ?? []));
    additionalProperties = own.additionalProperties ?? additionalProperties;
    const all = [...new Set(required)];
    return {
      type: 'object',
      properties: propertiesFrom(properties),
      ...(all.length ? { required: all } : {}),
      ...(additionalProperties !== undefined ? { additionalProperties } : {}),
    };
  }

  /** @param {ts.NodeArray<ts.TypeElement>} nodes */
  function members(nodes) {
    /** @type {Map<string, any>} */
    const properties = new Map();
    /** @type {string[]} */
    const required = [];
    let additionalProperties;
    for (const p of nodes) {
      if (ts.isIndexSignatureDeclaration(p)) {
        additionalProperties = convert(p.type);
        continue;
      }
      if (!ts.isPropertySignature(p) || !p.type)
        throw Error(`Unsupported DTO member: ${p.getText()}`);
      const name = propertyName(p.name);
      properties.set(name, {
        ...convert(p.type),
        ...(comment(p) ? { description: comment(p) } : {}),
      });
      if (!p.questionToken) required.push(name);
    }
    return {
      type: 'object',
      properties: propertiesFrom(properties),
      ...(required.length ? { required } : {}),
      ...(additionalProperties !== undefined ? { additionalProperties } : {}),
    };
  }

  /**
   * A tuple, with bounds that allow optional elements and a final rest element.
   * @param {ts.TupleTypeNode} node
   */
  function tuple(node) {
    const prefixItems = [];
    let minItems = 0;
    let rest;
    for (const [i, element] of node.elements.entries()) {
      /** @type {ts.TypeNode} */
      let type = element;
      let optional = false;
      let spread = false;
      if (ts.isNamedTupleMember(element)) {
        type = element.type;
        optional = Boolean(element.questionToken);
        spread = Boolean(element.dotDotDotToken);
      }
      if (ts.isOptionalTypeNode(type)) {
        optional = true;
        type = type.type;
      }
      if (ts.isRestTypeNode(type)) {
        spread = true;
        type = type.type;
      }
      if (spread) {
        if (i !== node.elements.length - 1 || !ts.isArrayTypeNode(type))
          return opaque(node, 'Tuple rest element is not a final array.');
        rest = convert(type.elementType);
        continue;
      }
      if (!optional && prefixItems.length === minItems) minItems++;
      prefixItems.push(convert(type));
    }
    return rest === undefined
      ? { type: 'array', prefixItems, minItems, maxItems: prefixItems.length }
      : { type: 'array', prefixItems, items: rest, minItems };
  }

  /**
   * `keyof` of an object type whose property names are exactly known; a
   * numeric name stays a number.
   * @param {ts.TypeOperatorNode} node
   */
  function keyOf(node) {
    const keys = ctx.propertyKeys(node.type);
    if (!keys) return opaque(node, 'Key set of the type is not exactly known.');
    const strings = keys.filter((key) => typeof key === 'string');
    const numbers = keys.filter((key) => typeof key === 'number');
    if (!numbers.length) return strings.length ? { type: 'string', enum: strings } : { not: {} };
    if (!strings.length) return { type: 'number', enum: numbers };
    return {
      anyOf: [
        { type: 'string', enum: strings },
        { type: 'number', enum: numbers },
      ],
    };
  }

  /** @param {any} node @returns {any} */
  function convert(node) {
    if (!node) throw Error('Missing type node');
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { type: 'string' };
      case ts.SyntaxKind.NumberKeyword:
        return { type: 'number' };
      case ts.SyntaxKind.BooleanKeyword:
        return { type: 'boolean' };
      case ts.SyntaxKind.NeverKeyword:
        return { not: {} };
      case ts.SyntaxKind.VoidKeyword:
        return {
          type: 'null',
          description: 'No application result; Convex transports a null result.',
        };
      case ts.SyntaxKind.UnknownKeyword:
        return { description: 'Unconstrained value in the public TypeScript contract.' };
    }
    if (ts.isParenthesizedTypeNode(node)) return convert(node.type);
    if (ts.isTypeOperatorNode(node)) {
      if (isTransparentOperator(node)) return convert(node.type);
      if (node.operator === ts.SyntaxKind.KeyOfKeyword) return keyOf(node);
      return opaque(node, 'Type operator changes the represented values.');
    }
    if (ts.isLiteralTypeNode(node)) {
      const lit = node.literal;
      if (lit.kind === ts.SyntaxKind.NullKeyword) return { type: 'null' };
      if (ts.isStringLiteral(lit)) return { type: 'string', const: lit.text };
      if (ts.isNumericLiteral(lit)) return { type: 'number', const: Number(lit.text) };
      if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(lit.kind))
        return { type: 'boolean', const: lit.kind === ts.SyntaxKind.TrueKeyword };
    }
    if (ts.isArrayTypeNode(node)) return { type: 'array', items: convert(node.elementType) };
    if (ts.isTupleTypeNode(node)) return tuple(node);
    if (ts.isUnionTypeNode(node)) return { anyOf: node.types.map(convert) };
    if (ts.isIntersectionTypeNode(node)) return { allOf: node.types.map(convert) };
    if (ts.isTypeLiteralNode(node)) return members(node.members);
    if (ts.isIndexedAccessTypeNode(node)) {
      const object = flatten(schemas, convert(node.objectType));
      const key =
        ts.isLiteralTypeNode(node.indexType) && ts.isStringLiteral(node.indexType.literal)
          ? node.indexType.literal.text
          : undefined;
      return (
        (key !== undefined ? ownProperty(object, key) : undefined) ??
        opaque(node, 'Indexed type could not be expanded.')
      );
    }
    if (ts.isTypeQueryNode(node)) {
      const target = node.exprName.getText().replace(/\.Type$/, '');
      const variable = variableAt(node, target);
      return variable?.initializer
        ? ctx.effectSchema(variable.initializer)
        : opaque(node, 'Effect schema definition not found.');
    }
    if (ts.isImportTypeNode(node) && node.qualifier)
      return namedFrom(ctx.importTypeDeclarations(node), node);
    if (ts.isTypeReferenceNode(node)) return reference(node);
    return opaque(
      node,
      'Unsupported TypeScript syntax; retained as an explicitly unconstrained schema.',
    );
  }

  /** @param {ts.TypeReferenceNode} node */
  function reference(node) {
    const name = node.typeName.getText(),
      args = node.typeArguments ?? [];
    const head = name.split('.')[0];
    // A built-in or library name means the built-in only where the module
    // does not bind it itself; `z` must be Zod's.
    if (head === 'z' ? !importedFrom(node, 'z', /^zod(\/|$)/) : ctx.isBound(node, head))
      return named(name, node);
    if (['Array', 'ReadonlyArray'].includes(name))
      return { type: 'array', items: convert(args[0]) };
    if (name === 'Record') {
      const values = convert(args[1]);
      const keys = ctx.literalKeys(args[0]);
      if (keys === null)
        return opaque(node, 'Record key type has an ambiguous alias; its keys are unknown.');
      return keys
        ? {
            type: 'object',
            properties: Object.fromEntries(keys.map((key) => [key, values])),
            required: keys,
          }
        : { type: 'object', additionalProperties: values };
    }
    if (name === 'Readonly') return convert(args[0]);
    if (['Omit', 'Pick', 'Partial', 'Required'].includes(name))
      return utilities.objectUtility(name, node, args);
    if (['Extract', 'Exclude'].includes(name)) return utilities.unionUtility(name, node, args);
    if (name === 'z.infer' || name === 'z.output' || name === 'z.input') {
      const target = /** @type {any} */ (args[0])?.exprName?.getText();
      const variable = variableAt(node, target);
      return variable?.initializer
        ? ctx.zod(variable.initializer)
        : opaque(node, 'Runtime schema definition not found.');
    }
    return named(name, node);
  }

  return { convert, named };
}
