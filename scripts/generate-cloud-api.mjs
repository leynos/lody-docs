/**
 * Rebuild the cloud API documentation from Lody's public client contract.
 *
 * Inputs: the Lody checkout named by `LODY_SOURCE` (default `../../Lody`),
 * whose `packages/cloud-api/src/index.ts` exports the `CloudApi` type, and
 * whose shared, e2ee-core and e2ee-machine-sharing packages define the DTOs it
 * uses; and the authored documents `docs/cloud-api/http.json` (non-Convex
 * HTTP routes and hand-written schemas, plus the pinned `x-source-revision`)
 * and `docs/cloud-api/supplemental.json` (Convex calls outside `CloudApi`).
 * Paths are relative to the working directory, which must be the repository
 * root. The checkout must be at the pinned revision; no source file the
 * generator reads may be modified, staged, untracked or ignored, and no file it
 * would index at that revision may be deleted or renamed. Beyond git status,
 * the exact bytes the generator reads from each file are compared with that
 * file's blob at the pinned revision, hashed here without any Git filter or
 * line-ending conversion, so a file that a clean filter, `eol` or `ident`
 * setting makes look unchanged is still refused. Symbolic links, files absent
 * from that revision, and the assume-unchanged and skip-worktree flags are
 * refused too. Each generated link then cites what that commit contains.
 *
 * Outputs: `docs/cloud-api/openapi.yaml`, `routes.md`, `operations.md` and the
 * source manifest `sources.json` (revision, operation counts, unresolved types,
 * one digest over every indexed source file, and a hash of each file that
 * shaped the output or is cited). With `--check`, nothing is written;
 * the script fails with "Stale generated document" if any output differs from
 * what it would generate. `npm run generate` writes the outputs, and `npm run
 * check` (the Makefile `cloud-api-check` gate) verifies them. The generator
 * never contacts a service.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import YAML from 'yaml';

const root = path.resolve(process.env.LODY_SOURCE ?? '../../Lody');
const check = process.argv.includes('--check');
const used = new Set();
const files = new Map();
const declarations = new Map();
/** Every type alias and interface declaration, by name, across loaded files. */
const declarationsByName = new Map();
const variables = new Map();
const unresolved = new Map();
const schemas = {};
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
/** @param {string} file */
const sha256 = (file) => crypto.createHash('sha256').update(readSource(file)).digest('hex');
/** The bytes of every source file read, kept so that the bytes verified against
 * the pinned revision are the bytes that were parsed and hashed. */
const contents = new Map();
/** @param {string} file @returns {Buffer} */
function readSource(file) {
  if (!contents.has(file)) contents.set(file, fs.readFileSync(file));
  return contents.get(file);
}
/** Git's object id for a blob with these exact bytes. @param {Buffer} bytes */
const blobId = (bytes) =>
  crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const location = (node) => {
  const sf = node.getSourceFile();
  const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  used.add(sf.fileName);
  return `${path.relative(root, sf.fileName)}:${line}`;
};
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
function load(file) {
  if (files.has(file)) return files.get(file);
  const text = readSource(file).toString('utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  files.set(file, sf);
  for (const node of sf.statements) {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      if (!declarations.has(name)) declarations.set(name, node);
      declarationsByName.set(name, [...(declarationsByName.get(name) ?? []), node]);
    }
    if (ts.isVariableStatement(node))
      for (const v of node.declarationList.declarations) {
        if (ts.isIdentifier(v.name) && !variables.has(v.name.text)) variables.set(v.name.text, v);
      }
  }
  return sf;
}
/** Whether `walk` parses a file with this name. @param {string} file */
const indexable = (file) => /\.ts$/.test(file) && !/\.(test|spec)\.ts$/.test(file);
function walk(dir) {
  for (const ent of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (indexable(file)) load(file);
  }
}
// Public DTOs take priority over similarly named internal types.
const indexRoots = [
  'packages/cloud-api/src',
  'packages/shared/src',
  'packages/e2ee-core/src',
  'packages/e2ee-machine-sharing/src',
];
load(path.join(root, 'packages/cloud-api/src/index.ts'));
for (const dir of indexRoots) walk(path.join(root, dir));
/**
 * Find the variable `name`, first in the file of `node`, then in any indexed
 * file. The file that supplies it shapes the output, so it counts as used.
 */
function variableAt(node, name) {
  const sf = node.getSourceFile();
  let found;
  for (const statement of sf.statements)
    if (ts.isVariableStatement(statement)) {
      for (const v of statement.declarationList.declarations)
        if (!found && v.name.getText() === name) found = v;
    }
  found ??= variables.get(name);
  if (found) used.add(found.getSourceFile().fileName);
  return found;
}
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
    let value = v?.initializer;
    if (value && ts.isAsExpression(value)) value = value.expression;
    const prop = value?.properties?.find((p) => p.name?.getText() === node.name.text);
    if (prop?.initializer) return numberValue(prop.initializer);
  }
  throw Error(`Unsupported numeric schema bound: ${node.getText()}`);
}
const comment = (node) =>
  (node.jsDoc ?? [])
    .map((d) => (typeof d.comment === 'string' ? d.comment : ''))
    .filter(Boolean)
    .join('\n');
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
function named(name, node) {
  const key = `Dto_${name}`;
  if (schemas[key]) return ref(key);
  const decl = declarations.get(name);
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
function deref(schema) {
  return schema.$ref ? deref(schemas[schema.$ref.split('/').at(-1)]) : schema;
}
function flatten(schema) {
  const s = deref(schema);
  if (!s.allOf) return s;
  const parts = s.allOf.map(flatten);
  return {
    type: 'object',
    properties: Object.assign({}, ...parts.map((p) => p.properties ?? {})),
    required: [...new Set(parts.flatMap((p) => p.required ?? []))],
  };
}
function members(nodes) {
  const properties = {},
    required = [];
  let additionalProperties;
  for (const p of nodes) {
    if (ts.isIndexSignatureDeclaration(p)) {
      additionalProperties = convert(p.type);
      continue;
    }
    if (!ts.isPropertySignature(p) || !p.type)
      throw Error(`Unsupported DTO member: ${p.getText()}`);
    const name = propertyName(p.name);
    properties[name] = { ...convert(p.type), ...(comment(p) ? { description: comment(p) } : {}) };
    if (!p.questionToken) required.push(name);
  }
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    ...(additionalProperties !== undefined ? { additionalProperties } : {}),
  };
}
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
    return object.properties?.[key] ?? opaque(node, 'Indexed type could not be expanded.');
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
        ? (ts.isUnionTypeNode(args[1]) ? args[1].types : [args[1]]).map((k) => k.literal?.text)
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
              : (object.required ?? []).filter((k) => k in props),
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
      const matches = (v) => {
        const value = flatten(v);
        if (filter.const !== undefined) return value.const === filter.const;
        return Object.entries(filter.properties ?? {}).every(
          ([k, s]) => value.properties?.[k]?.const === s.const,
        );
      };
      const chosen = variants.filter((v) => (name === 'Extract' ? matches(v) : !matches(v)));
      if (!chosen.length) return opaque(node, 'Utility union could not be narrowed.');
      return chosen.length === 1 ? chosen[0] : { anyOf: chosen };
    }
    if (name === 'z.infer' || name === 'z.output' || name === 'z.input') {
      const target = args[0]?.exprName?.getText();
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
 * Return the distinct keys of a record key type made only of string literals,
 * following non-generic type aliases from the module that uses them; return
 * undefined for any other key type, and null when an alias cannot be resolved
 * to one declaration and the candidates disagree.
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
 * Find the declarations a type name can mean in a module: its own declaration,
 * else the one exported by a relatively imported module, else every loaded
 * declaration of that name, which literalKeys accepts only when they agree.
 * @param {ts.SourceFile} sf
 * @param {string} name
 * @returns {Array<ts.TypeAliasDeclaration | ts.InterfaceDeclaration>}
 */
function aliasDeclarations(sf, name) {
  /** @param {ts.SourceFile} file @param {string} wanted */
  const own = (file, wanted) =>
    file.statements.filter(
      /** @type {(s: ts.Statement) => s is ts.TypeAliasDeclaration | ts.InterfaceDeclaration} */ (
        (s) =>
          (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === wanted
      ),
    );
  const local = own(sf, name);
  if (local.length) return local;
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const element = bindings.elements.find((e) => e.name.text === name);
    if (!element) continue;
    const original = (element.propertyName ?? element.name).text;
    const specifier = /** @type {ts.StringLiteral} */ (statement.moduleSpecifier).text;
    if (!specifier.startsWith('.')) return declarationsByName.get(original) ?? [];
    const base = path.resolve(path.dirname(sf.fileName), specifier.replace(/\.js$/, ''));
    const target = [`${base}.ts`, path.join(base, 'index.ts')].find(
      (file) => !path.relative(root, file).startsWith('..') && fs.existsSync(file),
    );
    const found = target ? own(load(target), original) : [];
    // A re-export is not followed: fall back to every declaration of the name,
    // which literalKeys accepts only when they all agree.
    return found.length ? found : (declarationsByName.get(original) ?? []);
  }
  return declarationsByName.get(name) ?? [];
}
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
      const properties = {},
        required = [];
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
    return { ...base, format: { uuid: 'uuid', url: 'uri', datetime: 'date-time' }[method] };
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
    return { type: 'string', pattern: `^(?:[0-9a-f]{2}){1,${numberValue(node.arguments[0])}}$` };
  }
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression))
    return opaque(node, 'Effect schema needs manual expansion.');
  const owner = node.expression.expression,
    method = node.expression.name.text,
    args = node.arguments;
  if (owner.getText() === 'Schema') {
    if (method === 'Struct' && ts.isObjectLiteralExpression(args[0])) {
      const properties = {},
        required = [];
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
      if (name === 'isPattern' && ts.isRegularExpressionLiteral(arg.arguments[0]))
        base = { ...base, pattern: arg.arguments[0].text.slice(1, -1) };
      else if (name === 'isMaxLength') base = { ...base, maxItems: numberValue(arg.arguments[0]) };
      else return opaque(node, 'Effect refinement needs manual expansion.');
    }
    return base;
  }
  return opaque(node, 'Effect schema method needs manual expansion.');
}

const document = JSON.parse(fs.readFileSync('docs/cloud-api/http.json', 'utf8'));
Object.assign(schemas, document.components.schemas);
const contract = declarations.get('CloudApi');
const operations = [];
for (const group of contract.type.members) {
  for (const op of group.type.members) {
    const kind = op.type.typeName.text.toLowerCase();
    if (!['query', 'mutation', 'action'].includes(kind))
      throw Error(`Unknown operation ${op.getText()}`);
    const name = `${group.name.text}:${op.name.text}`;
    const id = name.replace(':', '_');
    schemas[`${id}_Args`] = convert(op.type.typeArguments[0]);
    schemas[`${id}_Result`] = convert(op.type.typeArguments[1]);
    const source = location(op);
    operations.push({
      name,
      kind,
      source,
      description: comment(op),
      args: ref(`${id}_Args`),
      result: ref(`${id}_Result`),
      typescript: {
        args: op.type.typeArguments[0].getText(),
        result: op.type.typeArguments[1].getText(),
      },
    });
  }
}
const supplemental = JSON.parse(fs.readFileSync('docs/cloud-api/supplemental.json', 'utf8'));
for (const op of supplemental) {
  used.add(path.join(root, op.source.replace(/:\d+$/, '')));
  const id = op.name.replace(':', '_');
  schemas[`${id}_Args`] = op.args;
  schemas[`${id}_Result`] = op.result;
  operations.push({
    ...op,
    args: ref(`${id}_Args`),
    result: ref(`${id}_Result`),
    supplemental: true,
  });
}
for (const kind of ['query', 'mutation', 'action']) {
  const selected = operations.filter((op) => op.kind === kind);
  const request = (name) => ({
    type: 'object',
    properties: {
      path: { type: 'string', const: name.name },
      args: name.args,
      format: { type: 'string', const: 'json' },
    },
    required: ['path', 'args'],
  });
  document.paths[`/api/${kind}`] = {
    post: {
      operationId: `call${kind[0].toUpperCase() + kind.slice(1)}`,
      summary: `Call a public Convex ${kind}`,
      description:
        'HTTP RPC, using the documented Convex JSON envelope. Each request branch fixes path and its corresponding args. Result DTOs are listed in x-convex-operations and operations.md. Some clients use the SDK-specific convex_encoded_json array envelope; see README.md. Authentication is operation-specific: account JWT or explicit CLI/device credentials in args. No server-side admission rules are inferred.',
      tags: ['Convex'],
      servers: [
        { url: 'https://convex.lody.ai' },
        {
          url: 'https://backend.lody.ai',
          description:
            'Observed CLI ingress for deviceAuth:validateCliToken and github:associatePullRequestForCli only; not verified for other operations.',
        },
      ],
      security: [{ ConvexJwt: [] }, {}],
      'x-source': 'packages/cloud-api/src/index.ts:438',
      'x-convex-operations': selected,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { oneOf: selected.map(request) },
            example: {
              path: {
                query: 'billing:getWorkspaceBillingEntitlement',
                mutation: 'activity:recordMyWorkspaceDailyActiveUser',
                action: 'billing:createBillingPortalSession',
              }[kind],
              args: { workspaceId: 'workspace_example' },
              format: 'json',
            },
          },
        },
      },
      responses: {
        200: {
          description:
            'Success envelope; select the result schema using the requested function path. Inspect status as well as HTTP status.',
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      status: { const: 'success' },
                      value: { anyOf: selected.map((op) => op.result) },
                      logLines: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['status', 'value'],
                  },
                  ref('ConvexError'),
                ],
              },
            },
          },
        },
        default: {
          description:
            'Transport, authentication or validation failure. Deployment-specific body/status is not established by the public client contract.',
        },
      },
    },
  };
}
for (const name of [
  'MachinePairingView',
  'SharePackageManifest',
  'DaemonRelease',
  'RpcSecretPublicKey',
  'LocalE2eePrepareResponse',
  'RemoteMachineStatus',
])
  named(name, contract);
document.components.schemas = schemas;
for (const item of Object.values(document.paths))
  for (const op of Object.values(item)) {
    if (typeof op !== 'object' || !op?.operationId) continue;
    const sources = Array.isArray(op['x-source']) ? op['x-source'] : [op['x-source']];
    for (const source of sources.filter(Boolean))
      used.add(path.join(root, source.replace(/:\d+$/, '')));
  }
const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
// The authored inputs cite one commit; never combine them with another.
if (revision !== document['x-source-revision'])
  throw Error(
    `Lody checkout ${root} is at ${revision}, but docs/cloud-api/http.json pins ${document['x-source-revision']}`,
  );
// HEAD names the commit only if no file that is or would be read differs from
// it: nothing parsed or cited may be modified, staged, untracked or ignored,
// and no file the index would parse at HEAD may be deleted or renamed. The
// index folders are queried as a whole, so that files missing from the working
// tree are reported too.
const read = new Set([...files.keys(), ...used].map((f) => path.relative(root, f)));
const indexed = (file) =>
  read.has(file) || (indexable(file) && indexRoots.some((dir) => file.startsWith(`${dir}/`)));
const status = execFileSync(
  'git',
  [
    ...['--literal-pathspecs', '-C', root, 'status', '--porcelain=v1', '-z'],
    ...['--ignored', '--untracked-files=all', '--', ...indexRoots, ...read],
  ],
  { encoding: 'utf8' },
).split('\0');
const modified = [];
for (let i = 0; i < status.length; i++) {
  const entry = status[i];
  if (!entry) continue;
  const paths = [entry.slice(3)];
  // A rename or copy is followed by its source path.
  if (/[RC]/.test(entry.slice(0, 2))) paths.push(status[++i]);
  if (paths.some(indexed)) modified.push(paths.length > 1 ? `${entry} <- ${paths[1]}` : entry);
}
// Git status trusts the index, and the assume-unchanged and skip-worktree flags
// hide a tracked file's edits from it; filters and line-ending conversion can
// also make changed bytes look clean to Git. So reject those flags, and compare
// the exact bytes read with the pinned blobs, computing blob ids here rather
// than through Git, so that no filter or conversion is applied.
const scope = ['--', ...indexRoots, ...read];
const git = (/** @type {string[]} */ args, input = '') =>
  execFileSync('git', ['--literal-pathspecs', '-C', root, ...args], { encoding: 'utf8', input });
for (const entry of git(['ls-files', '-v', '-z', ...scope]).split('\0')) {
  const [tag, file] = [entry[0], entry.slice(2)];
  if (entry && indexed(file) && (tag === 'S' || tag !== tag.toUpperCase()))
    modified.push(`${tag} ${file} (assume-unchanged or skip-worktree)`);
}
const pinned = new Map(
  git(['ls-tree', '-r', '-z', revision, ...scope])
    .split('\0')
    .map((entry) => entry.match(/^(\d+) (\w+) ([0-9a-f]+)\t(.*)$/s))
    .filter((match) => match !== null && indexed(match[4]))
    .map(([, mode, type, blob, file]) => [file, { mode, type, blob }]),
);
const realRoot = fs.realpathSync(root);
const checked = new Set(read);
for (const file of pinned.keys())
  if (fs.lstatSync(path.join(root, file), { throwIfNoEntry: false })) checked.add(file);
  else modified.push(`${file} (missing from the working tree)`);
for (const file of [...checked].sort()) {
  const entry = pinned.get(file);
  const absolute = path.join(root, file);
  if (entry?.type !== 'blob') modified.push(`${file} (not a file at ${revision})`);
  else if (entry.mode === '120000' || path.relative(realRoot, fs.realpathSync(absolute)) !== file)
    // The generator would read the bytes behind the link, not the link itself.
    modified.push(`${file} (symbolic link, refused)`);
  else if (blobId(readSource(absolute)) !== entry.blob)
    modified.push(
      `${file} (bytes read differ from ${revision}; filters and line-ending conversion are not applied)`,
    );
}
if (modified.length)
  throw Error(
    `Source files differ from ${revision} in ${root}:\n${[...new Set(modified)].join('\n')}`,
  );
const manifest = {
  repository: 'https://github.com/LodyAI/Lody',
  revision,
  scope:
    'Public optional-cloud HTTP clients and CloudApi DTOs. Excludes Flock, Loro usage and Streams RPC.',
  typedOperations: operations.filter((o) => !o.supplemental).length,
  supplementalOperations: supplemental.length,
  operations: operations.length,
  unresolved: [...unresolved.values()].sort((a, b) => a.source.localeCompare(b.source)),
  // Every file read: the parsed index as one digest, and each file that shaped
  // the output or is cited by an operation with its own hash.
  index: {
    roots: indexRoots,
    files: files.size,
    sha256: crypto
      .createHash('sha256')
      .update(
        [...files.keys()]
          .map((file) => `${path.relative(root, file)}\0${sha256(file)}\n`)
          .sort()
          .join(''),
      )
      .digest('hex'),
  },
  files: [...used]
    .sort()
    .map((file) => ({ path: path.relative(root, file), sha256: sha256(file) })),
};
document.info.version = `source-${revision.slice(0, 12)}`;
document['x-source-revision'] = revision;
/**
 * Wrap prose at 80 columns, paragraph by paragraph. A word longer than the
 * width, such as a link, stays on a line of its own.
 * @param {string} text
 */
function wrap(text) {
  return text
    .split('\n\n')
    .map((paragraph) => {
      if (/^\s*([-*] |[|#>]|\d+\. |\x60\x60\x60)/m.test(paragraph)) return paragraph;
      const lines = [];
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line && line.length + 1 + word.length > 80) {
          lines.push(line);
          line = word;
        } else line = line ? `${line} ${word}` : word;
      }
      if (line) lines.push(line);
      return lines.join('\n');
    })
    .join('\n\n');
}
const intro =
  '# Convex operation reference\n\nGenerated from the public `CloudApi` type. See [the guide](README.md) for transport and authentication, and [OpenAPI](openapi.yaml) for JSON Schemas. A query reads data, a mutation changes database state, and an action may perform external I/O. These labels do not imply that every action is safe to retry.\n\nRequest fields marked `?` are optional; `null` is an explicit value. Type names link to the pinned source; complete expanded schemas are in OpenAPI. Types marked `x-unresolved` in OpenAPI remain unconstrained and require the source definition.\n';
let markdown = `${wrap(intro)}\n`;
for (const group of contract.type.members) {
  const groupName = group.name.text;
  markdown += `\n## ${groupName}\n\n${wrap(comment(group) || 'Public client-facing cloud operations.')}\n`;
  for (const op of operations.filter(
    (o) => !o.supplemental && o.name.startsWith(`${groupName}:`),
  )) {
    const [file, line] = op.source.split(':');
    markdown += `\n### ${op.name}\n\n${wrap(`**${op.kind.toUpperCase()}** · schemas: \`${op.name.replace(':', '_')}_Args\`, \`${op.name.replace(':', '_')}_Result\` ·`)}\n[source](https://github.com/LodyAI/Lody/blob/${revision}/${file}#L${line})\n\n${op.description ? `${wrap(op.description)}\n\n` : ''}Arguments:\n\n\x60\x60\x60ts\n${op.typescript.args}\n\x60\x60\x60\n\nResult:\n\n\x60\x60\x60ts\n${op.typescript.result}\n\x60\x60\x60\n`;
  }
}
markdown += `\n## Additional observed operations\n\n${wrap('These calls occur outside the exported `CloudApi` type. The schemas retain only what the callers establish.')}\n`;
for (const op of operations.filter((o) => o.supplemental)) {
  const [file, line] = op.source.split(':');
  markdown += `\n### ${op.name}\n\n**${op.kind.toUpperCase()}** ·\n[source](https://github.com/LodyAI/Lody/blob/${revision}/${file}${line ? `#L${line}` : ''})\n\n${wrap(op.description)}\n\nArguments:\n\n\x60\x60\x60json\n${JSON.stringify(schemas[`${op.name.replace(':', '_')}_Args`], null, 2)}\n\x60\x60\x60\n\nResult schema: \x60${op.name.replace(':', '_')}_Result\x60.\n`;
}
let routes = `${wrap('# HTTP route index\n\nGenerated from the OpenAPI document. Consult each operation for its credential, payload, and evidence limits. `backend` means <https://backend.lody.ai>; `worker` means <https://api.lody.ai>; `convex` means <https://convex.lody.ai>.')}\n\n| Method | Path | Origin | Operation |\n| --- | --- | --- | --- |\n`;
for (const [route, item] of Object.entries(document.paths))
  for (const [method, op] of Object.entries(item)) {
    const origin = op.servers?.[0]?.url ?? 'https://backend.lody.ai';
    const label =
      origin === 'https://backend.lody.ai'
        ? 'backend'
        : origin === 'https://api.lody.ai'
          ? 'worker'
          : origin === 'https://convex.lody.ai'
            ? 'convex'
            : 'command-pinned ingress';
    routes += `| ${method.toUpperCase()} | \x60${route}\x60 | ${label} | ${op.summary} |\n`;
  }
routes += '\n_Table 1: Every documented HTTP route, with its origin and operation._\n';
for (const [file, data] of [
  ['docs/cloud-api/routes.md', routes],
  [
    'docs/cloud-api/openapi.yaml',
    YAML.stringify(document, { lineWidth: 100, aliasDuplicateObjects: false }),
  ],
  ['docs/cloud-api/operations.md', markdown],
  ['docs/cloud-api/sources.json', `${JSON.stringify(manifest, null, 2)}\n`],
]) {
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== data)
      throw Error(`Stale generated document: ${file}; run npm run generate`);
  } else fs.writeFileSync(file, data);
}
console.log(
  `${check ? 'Verified' : 'Generated'} ${operations.length} Convex operations; ${Object.keys(document.paths).length} HTTP paths; ${unresolved.size} unresolved types or semantic refinements.`,
);
