/** Rebuild documentation from the public client contract; never contact a service. */
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
const variables = new Map();
const unresolved = new Map();
const schemas = {};
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
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
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  files.set(file, sf);
  for (const node of sf.statements) {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      if (!declarations.has(name)) declarations.set(name, node);
    }
    if (ts.isVariableStatement(node))
      for (const v of node.declarationList.declarations) {
        if (ts.isIdentifier(v.name) && !variables.has(v.name.text)) variables.set(v.name.text, v);
      }
  }
  return sf;
}
function walk(dir) {
  for (const ent of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (/\.ts$/.test(file) && !/\.(test|spec)\.ts$/.test(file)) load(file);
  }
}
// Public DTOs take priority over similarly named internal types.
load(path.join(root, 'packages/cloud-api/src/index.ts'));
walk(path.join(root, 'packages/cloud-api/src'));
for (const dir of [
  'packages/shared/src',
  'packages/e2ee-core/src',
  'packages/e2ee-machine-sharing/src',
])
  walk(path.join(root, dir));
function variableAt(node, name) {
  const sf = node.getSourceFile();
  for (const statement of sf.statements)
    if (ts.isVariableStatement(statement)) {
      for (const v of statement.declarationList.declarations)
        if (v.name.getText() === name) return v;
    }
  return variables.get(name);
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
    if (name === 'Record') return { type: 'object', additionalProperties: convert(args[1]) };
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

const document = JSON.parse(fs.readFileSync('cloud-api/http.json', 'utf8'));
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
const supplemental = JSON.parse(fs.readFileSync('cloud-api/supplemental.json', 'utf8'));
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
const manifest = {
  repository: 'https://github.com/LodyAI/Lody',
  revision,
  scope:
    'Public optional-cloud HTTP clients and CloudApi DTOs. Excludes Flock, Loro usage and Streams RPC.',
  typedOperations: operations.filter((o) => !o.supplemental).length,
  supplementalOperations: supplemental.length,
  operations: operations.length,
  unresolved: [...unresolved.values()].sort((a, b) => a.source.localeCompare(b.source)),
  files: [...used].sort().map((file) => ({
    path: path.relative(root, file),
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  })),
};
document.info.version = `source-${revision.slice(0, 12)}`;
document['x-source-revision'] = revision;
const intro =
  '# Convex operation reference\n\nGenerated from the public `CloudApi` type. See [the guide](README.md) for transport and authentication, and [OpenAPI](openapi.yaml) for JSON Schemas. A query reads data, a mutation changes database state, and an action may perform external I/O. These labels do not imply that every action is safe to retry.\n\nRequest fields marked `?` are optional; `null` is an explicit value. Type names link to the pinned source; complete expanded schemas are in OpenAPI. Types marked `x-unresolved` in OpenAPI remain unconstrained and require the source definition.\n';
let markdown = intro;
for (const group of contract.type.members) {
  const groupName = group.name.text;
  markdown += `\n## ${groupName}\n\n${comment(group) || 'Public client-facing cloud operations.'}\n`;
  for (const op of operations.filter(
    (o) => !o.supplemental && o.name.startsWith(`${groupName}:`),
  )) {
    const [file, line] = op.source.split(':');
    markdown += `\n### ${op.name}\n\n**${op.kind.toUpperCase()}** · [source](https://github.com/LodyAI/Lody/blob/${revision}/${file}#L${line}) · schemas: \`${op.name.replace(':', '_')}_Args\`, \`${op.name.replace(':', '_')}_Result\`\n\n${op.description ? `${op.description}\n\n` : ''}Arguments:\n\n\x60\x60\x60ts\n${op.typescript.args}\n\x60\x60\x60\n\nResult:\n\n\x60\x60\x60ts\n${op.typescript.result}\n\x60\x60\x60\n`;
  }
}
markdown +=
  '\n## Additional observed operations\n\nThese calls occur outside the exported CloudApi type. The schemas retain only what the callers establish.\n';
for (const op of operations.filter((o) => o.supplemental)) {
  const [file, line] = op.source.split(':');
  markdown += `\n### ${op.name}\n\n**${op.kind.toUpperCase()}** · [source](https://github.com/LodyAI/Lody/blob/${revision}/${file}${line ? `#L${line}` : ''})\n\n${op.description}\n\nArguments:\n\n\x60\x60\x60json\n${JSON.stringify(schemas[`${op.name.replace(':', '_')}_Args`], null, 2)}\n\x60\x60\x60\n\nResult schema: \x60${op.name.replace(':', '_')}_Result\x60.\n`;
}
let routes =
  '# HTTP route index\n\nGenerated from the OpenAPI document. Consult each operation for its credential, payload and evidence limits. `backend` means <https://backend.lody.ai>; `worker` means <https://api.lody.ai>; `convex` means <https://convex.lody.ai>.\n\n| Method | Path | Origin | Operation |\n| --- | --- | --- | --- |\n';
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
for (const [file, data] of [
  ['cloud-api/routes.md', routes],
  [
    'cloud-api/openapi.yaml',
    YAML.stringify(document, { lineWidth: 100, aliasDuplicateObjects: false }),
  ],
  ['cloud-api/operations.md', markdown],
  ['cloud-api/sources.json', `${JSON.stringify(manifest, null, 2)}\n`],
]) {
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== data)
      throw Error(`Stale generated document: ${file}; run npm run generate`);
  } else fs.writeFileSync(file, data);
}
console.log(
  `${check ? 'Verified' : 'Generated'} ${operations.length} Convex operations; ${Object.keys(document.paths).length} HTTP paths; ${unresolved.size} unresolved types or semantic refinements.`,
);
