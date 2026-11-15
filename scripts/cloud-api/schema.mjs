/**
 * Conversion of TypeScript, Zod and Effect schema syntax to JSON Schema.
 *
 * `createConverter` returns a converter bound to one source index
 * (`source-index.mjs`). It resolves type names, aliases and constant bounds
 * through that index and nothing else, so it performs no I/O of its own beyond
 * parsing a module that the index has not yet loaded. Its state lives in the
 * returned object: the component schemas built so far, the types it could not
 * expand (recorded as `x-unresolved` rather than guessed), and the source
 * files whose content shaped a schema. The operation builder
 * (`operations.mjs`) drives it.
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

/** @param {ts.PropertyName} node */
function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return node.text;
  throw Error(`Unsupported computed property name: ${node.getText()}`);
}
/** @param {ts.Expression} node */
function stringLiteral(node) {
  if (ts.isStringLiteral(node)) return node.text;
  throw Error(`Expected a string literal: ${node.getText()}`);
}
/** @param {ts.Node} node */
const isExported = (node) =>
  /** @type {any} */ (node).modifiers?.some(
    (/** @type {ts.Node} */ m) => m.kind === ts.SyntaxKind.ExportKeyword,
  ) ?? false;
/**
 * The type alias and interface declarations of a name in one module.
 * @param {ts.SourceFile} sf
 * @param {string} name
 * @returns {Array<ts.TypeAliasDeclaration | ts.InterfaceDeclaration>}
 */
const declaredIn = (sf, name) =>
  sf.statements.filter(
    /** @type {(s: ts.Statement) => s is ts.TypeAliasDeclaration | ts.InterfaceDeclaration} */ (
      (s) => (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === name
    ),
  );
/**
 * The import that binds a name in a module, if any.
 * @param {ts.SourceFile} sf
 * @param {string} name
 */
function importOf(sf, name) {
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const element = bindings.elements.find((e) => e.name.text === name);
    if (element)
      return {
        specifier: /** @type {ts.StringLiteral} */ (statement.moduleSpecifier).text,
        name: (element.propertyName ?? element.name).text,
      };
  }
  return undefined;
}

/**
 * @typedef {object} Unresolved
 * @property {string} source
 * @property {string} typescript
 * @property {string} reason
 */

/**
 * Create a converter over a source index.
 * @param {import('./source-index.mjs').SourceIndex} index
 * @param {Record<string, any>} [initialSchemas] authored component schemas
 */
export function createConverter(index, initialSchemas = {}) {
  /** @type {Record<string, any>} */
  const schemas = { ...initialSchemas };
  /** @type {Map<string, Unresolved>} */
  const unresolved = new Map();
  /** Absolute paths of the files whose content shaped the output. @type {Set<string>} */
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
   * Find the variable `name`, first in the file of `node`, then in any indexed
   * file. The file that supplies it shapes the output, so it counts as used.
   * @param {ts.Node} node
   * @param {string} name
   */
  function variableAt(node, name) {
    const sf = node.getSourceFile();
    let found;
    for (const statement of sf.statements)
      if (ts.isVariableStatement(statement)) {
        for (const v of statement.declarationList.declarations)
          if (!found && v.name.getText() === name) found = v;
      }
    found ??= index.variables.get(name);
    if (found) used.add(found.getSourceFile().fileName);
    return found;
  }
  /** @param {any} node @returns {number} */
  function numberValue(node) {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
      return numberValue(node.expression);
    if (node.getText() === 'Number.MAX_SAFE_INTEGER') return Number.MAX_SAFE_INTEGER;
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
  }
  /** @param {ts.Node} node @param {string} reason */
  function opaque(node, reason) {
    const text = node.getText();
    const source = location(node);
    unresolved.set(`${source}:${text}`, { source, typescript: text, reason });
    return {
      description: `Unexpanded public type: ${text}. ${reason}`,
      'x-typescript': text,
      'x-source': source,
      'x-unresolved': true,
    };
  }
  /** @param {string} name @param {ts.Node} node */
  function named(name, node) {
    const key = `Dto_${name}`;
    if (schemas[key]) return ref(key);
    /** @type {any} */
    const decl = index.declarations.get(name);
    if (!decl) return opaque(node, 'Definition is outside the indexed public DTO sources.');
    if (decl.typeParameters?.length) return opaque(node, 'Generic type requires explicit review.');
    schemas[key] = {}; // Break recursion.
    const value = ts.isInterfaceDeclaration(decl) ? members(decl.members) : convert(decl.type);
    schemas[key] = {
      ...value,
      ...(comment(decl) ? { description: comment(decl) } : {}),
      'x-source': location(decl),
    };
    return ref(key);
  }
  /** @param {any} schema @returns {any} */
  function deref(schema) {
    return schema.$ref ? deref(schemas[schema.$ref.split('/').at(-1)]) : schema;
  }
  /** @param {any} schema @returns {any} */
  function flatten(schema) {
    const s = deref(schema);
    if (!s.allOf) return s;
    const parts = s.allOf.map(flatten);
    return {
      type: 'object',
      properties: Object.assign({}, ...parts.map((/** @type {any} */ p) => p.properties ?? {})),
      required: [...new Set(parts.flatMap((/** @type {any} */ p) => p.required ?? []))],
    };
  }
  /** @param {ts.NodeArray<ts.TypeElement>} nodes */
  function members(nodes) {
    /** @type {Record<string, any>} */
    const properties = {};
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
      properties[name] = {
        ...convert(p.type),
        ...(comment(p) ? { description: comment(p) } : {}),
      };
      if (!p.questionToken) required.push(name);
    }
    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
      ...(additionalProperties !== undefined ? { additionalProperties } : {}),
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
    if (ts.isParenthesizedTypeNode(node) || ts.isTypeOperatorNode(node)) return convert(node.type);
    if (ts.isLiteralTypeNode(node)) {
      const lit = node.literal;
      if (lit.kind === ts.SyntaxKind.NullKeyword) return { type: 'null' };
      if (ts.isStringLiteral(lit)) return { type: 'string', const: lit.text };
      if (ts.isNumericLiteral(lit)) return { type: 'number', const: Number(lit.text) };
      if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(lit.kind))
        return { type: 'boolean', const: lit.kind === ts.SyntaxKind.TrueKeyword };
    }
    if (ts.isArrayTypeNode(node)) return { type: 'array', items: convert(node.elementType) };
    if (ts.isTupleTypeNode(node))
      return {
        type: 'array',
        prefixItems: node.elements.map(convert),
        minItems: node.elements.length,
        maxItems: node.elements.length,
      };
    if (ts.isUnionTypeNode(node)) return { anyOf: node.types.map(convert) };
    if (ts.isIntersectionTypeNode(node)) return { allOf: node.types.map(convert) };
    if (ts.isTypeLiteralNode(node)) return members(node.members);
    if (ts.isIndexedAccessTypeNode(node)) {
      const object = flatten(convert(node.objectType));
      const key =
        ts.isLiteralTypeNode(node.indexType) && ts.isStringLiteral(node.indexType.literal)
          ? node.indexType.literal.text
          : undefined;
      return (
        (key !== undefined ? object.properties?.[key] : undefined) ??
        opaque(node, 'Indexed type could not be expanded.')
      );
    }
    if (ts.isTypeQueryNode(node)) {
      const target = node.exprName.getText().replace(/\.Type$/, '');
      const variable = variableAt(node, target);
      return variable?.initializer
        ? effectSchema(variable.initializer)
        : opaque(node, 'Effect schema definition not found.');
    }
    if (ts.isImportTypeNode(node) && node.qualifier) return named(node.qualifier.getText(), node);
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText(),
        args = node.typeArguments ?? [];
      if (['Array', 'ReadonlyArray'].includes(name))
        return { type: 'array', items: convert(args[0]) };
      if (name === 'Record') {
        const values = convert(args[1]);
        const keys = literalKeys(args[0]);
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
      if (['Omit', 'Pick', 'Partial', 'Required'].includes(name)) {
        const object = flatten(convert(args[0]));
        if (object.type !== 'object') return opaque(node, 'Utility target is not an object.');
        const keys = args[1]
          ? (ts.isUnionTypeNode(args[1]) ? args[1].types : [args[1]]).map(
              (/** @type {any} */ k) => k.literal?.text,
            )
          : [];
        const props = Object.fromEntries(
          Object.entries(object.properties ?? {}).filter(([k]) =>
            name === 'Omit' ? !keys.includes(k) : name === 'Pick' ? keys.includes(k) : true,
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
      if (['Extract', 'Exclude'].includes(name)) {
        const source = deref(convert(args[0]));
        const filter = flatten(convert(args[1]));
        const variants = source.anyOf ?? [source];
        /** @param {any} v */
        const matches = (v) => {
          const value = flatten(v);
          if (filter.const !== undefined) return value.const === filter.const;
          return Object.entries(filter.properties ?? {}).every(
            ([k, s]) => value.properties?.[k]?.const === /** @type {any} */ (s).const,
          );
        };
        const chosen = variants.filter((/** @type {any} */ v) =>
          name === 'Extract' ? matches(v) : !matches(v),
        );
        if (!chosen.length) return opaque(node, 'Utility union could not be narrowed.');
        return chosen.length === 1 ? chosen[0] : { anyOf: chosen };
      }
      if (name === 'z.infer' || name === 'z.output' || name === 'z.input') {
        const target = /** @type {any} */ (args[0])?.exprName?.getText();
        const variable = variableAt(node, target);
        return variable?.initializer
          ? zod(variable.initializer)
          : opaque(node, 'Runtime schema definition not found.');
      }
      return named(name, node);
    }
    return opaque(
      node,
      'Unsupported TypeScript syntax; retained as an explicitly unconstrained schema.',
    );
  }
  /**
   * Return the distinct keys of a record key type made only of string
   * literals, following non-generic type aliases from the module that uses
   * them; return undefined for any other key type, and null when an alias
   * cannot be resolved safely.
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
    if (ts.isTypeReferenceNode(node) && !node.typeArguments && ts.isIdentifier(node.typeName)) {
      const candidates = aliasDeclarations(node.getSourceFile(), node.typeName.text);
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
   * The declarations a name in a module can mean: its own declaration; else,
   * if it is imported, the declaration that import reaches through relative
   * modules and their named, renamed or star re-exports, or null when it
   * cannot be followed safely; else every loaded declaration of the name,
   * which literalKeys accepts only when they agree.
   * @param {ts.SourceFile} sf
   * @param {string} name
   * @returns {Array<ts.TypeAliasDeclaration | ts.InterfaceDeclaration> | null}
   */
  function aliasDeclarations(sf, name) {
    const local = declaredIn(sf, name);
    if (local.length) return local;
    const imported = importOf(sf, name);
    if (imported) {
      const target = resolveModule(sf.fileName, imported.specifier);
      return (target && exportedFrom(target, imported.name, new Set())) || null;
    }
    return index.declarationsByName.get(name) ?? [];
  }
  /**
   * The declarations a module exports under a name: an array when found,
   * undefined when the module does not export it, null when it cannot tell.
   * @param {string} file
   * @param {string} name
   * @param {Set<string>} seen
   * @returns {Array<ts.TypeAliasDeclaration | ts.InterfaceDeclaration> | undefined | null}
   */
  function exportedFrom(file, name, seen) {
    const key = `${file}\0${name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const sf = index.load(file);
    const own = declaredIn(sf, name).filter(isExported);
    if (own.length) return own;
    /** @type {Array<Array<any> | undefined | null>} */
    const stars = [];
    for (const statement of sf.statements) {
      if (!ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier
        ? /** @type {ts.StringLiteral} */ (statement.moduleSpecifier).text
        : undefined;
      const clause = statement.exportClause;
      if (!clause) {
        const target = specifier && resolveModule(file, specifier);
        stars.push(target ? exportedFrom(target, name, seen) : null);
        continue;
      }
      if (!ts.isNamedExports(clause)) continue;
      const element = clause.elements.find((e) => e.name.text === name);
      if (!element) continue;
      const original = (element.propertyName ?? element.name).text;
      if (specifier !== undefined) {
        const target = resolveModule(file, specifier);
        return target ? (exportedFrom(target, original, seen) ?? null) : null;
      }
      // `export { original as name }` of this module's own binding.
      const declared = declaredIn(sf, original);
      if (declared.length) return declared;
      const imported = importOf(sf, original);
      const target = imported && resolveModule(file, imported.specifier);
      return target && imported ? (exportedFrom(target, imported.name, seen) ?? null) : null;
    }
    const found = stars.filter((result) => Array.isArray(result));
    if (found.length) return found.flat();
    return stars.includes(null) ? null : undefined;
  }
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
      if (method === 'array') return { type: 'array', items: zod(args[0]) };
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
        if (ts.isArrayLiteralExpression(array)) return { anyOf: array.elements.map(zod) };
      }
      if (method === 'record') return { type: 'object', additionalProperties: zod(args.at(-1)) };
    }
    const base = zod(owner);
    if (method === 'optional') return { ...base, 'x-optional': true };
    if (method === 'nullable') return { anyOf: [base, { type: 'null' }] };
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

  return { schemas, unresolved, used, convert, named, location };
}
