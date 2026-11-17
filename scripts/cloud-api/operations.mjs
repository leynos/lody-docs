/**
 * Enumeration of the documented operations, and the OpenAPI document and
 * source manifest built from them.
 *
 * `buildApi` walks the members of Lody's `CloudApi` type through a converter
 * (`schema.mjs`), adds the authored supplemental operations, and returns a new
 * OpenAPI document with the three Convex RPC paths, together with the
 * operations, their groups and the source files that the authored inputs
 * cite. `finishDocument` stamps that document with the verified revision, and
 * `buildManifest` returns the provenance record written as `sources.json`.
 * None of these reads or writes a file; rendering is in `render.mjs`.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { comment, ref } from './schema.mjs';
import { CONTRACT_MODULE } from './source-index.mjs';

/** Schemas expanded even though no operation names them directly. */
export const EXTRA_DTOS = [
  'MachinePairingView',
  'SharePackageManifest',
  'DaemonRelease',
  'RpcSecretPublicKey',
  'LocalE2eePrepareResponse',
  'RemoteMachineStatus',
];

/**
 * @typedef {object} Operation
 * @property {string} name `group:function`
 * @property {string} kind query, mutation or action
 * @property {string} source `path:line` in the checkout
 * @property {string} description
 * @property {any} args
 * @property {any} result
 * @property {{ args: string, result: string }} [typescript]
 * @property {boolean} [supplemental]
 */

/**
 * The Convex RPC path item for one operation kind.
 * @param {string} kind
 * @param {Operation[]} selected
 */
function convexPath(kind, selected) {
  /** @param {Operation} op */
  const request = (op) => ({
    type: 'object',
    properties: {
      path: { type: 'string', const: op.name },
      args: op.args,
      format: { type: 'string', const: 'json' },
    },
    required: ['path', 'args'],
  });
  return {
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
              path: /** @type {Record<string, string>} */ ({
                query: 'billing:getWorkspaceBillingEntitlement',
                mutation: 'activity:recordMyWorkspaceDailyActiveUser',
                action: 'billing:createBillingPortalSession',
              })[kind],
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

/**
 * Enumerate the operations and build the OpenAPI document.
 * @param {object} input
 * @param {import('./source-index.mjs').SourceIndex} input.index
 * @param {ReturnType<typeof import('./schema.mjs').createConverter>} input.converter
 * @param {any} input.http the authored `http.json`
 * @param {any[]} input.supplemental the authored `supplemental.json`
 */
export function buildApi({ index, converter, http, supplemental }) {
  const { convert, named, location, schemas } = converter;
  /** @type {any} */
  const contract = index
    .load(path.join(index.root, CONTRACT_MODULE))
    .statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'CloudApi');
  if (!contract) throw Error('CloudApi type not found in the indexed sources');
  /** @type {Operation[]} */
  const operations = [];
  /** @type {Array<{ name: string, description: string }>} */
  const groups = [];
  for (const group of contract.type.members) {
    groups.push({ name: group.name.text, description: comment(group) });
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
  /** Checkout-relative files the authored inputs cite. @type {Set<string>} */
  const cited = new Set();
  for (const op of supplemental) {
    cited.add(op.source.replace(/:\d+$/, ''));
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
  const document = structuredClone(http);
  for (const kind of ['query', 'mutation', 'action'])
    document.paths[`/api/${kind}`] = convexPath(
      kind,
      operations.filter((op) => op.kind === kind),
    );
  // A missing extra DTO fails generation by name rather than collapsing into
  // one unresolved entry keyed by the whole contract.
  for (const name of EXTRA_DTOS)
    if (named(name, contract)['x-unresolved'])
      throw Error(`EXTRA_DTOS entry ${name} could not be resolved in the indexed sources`);
  document.components.schemas = schemas;
  for (const item of Object.values(document.paths))
    for (const op of Object.values(/** @type {Record<string, any>} */ (item))) {
      if (typeof op !== 'object' || !op?.operationId) continue;
      const sources = Array.isArray(op['x-source']) ? op['x-source'] : [op['x-source']];
      for (const source of sources.filter(Boolean)) cited.add(source.replace(/:\d+$/, ''));
    }
  return { document, operations, groups, cited, supplementalCount: supplemental.length };
}

/**
 * Stamp the document with the verified source revision.
 * @param {any} document
 * @param {string} revision
 */
export const finishDocument = (document, revision) => ({
  ...document,
  info: { ...document.info, version: `source-${revision.slice(0, 12)}` },
  'x-source-revision': revision,
});

/**
 * Compare two strings by UTF-16 code unit, independent of locale.
 * @param {string} a
 * @param {string} b
 */
export const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** @param {Buffer} bytes */
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * The provenance record of a generation.
 * @param {object} input
 * @param {string} input.root the checkout
 * @param {string} input.revision the verified revision
 * @param {Operation[]} input.operations
 * @param {number} input.supplementalCount
 * @param {Iterable<import('./schema.mjs').Unresolved>} input.unresolved
 * @param {string[]} input.indexRoots
 * @param {string[]} input.parsed absolute paths of every parsed file, in parse order
 * @param {Iterable<string>} input.used absolute paths that shaped the output or are cited
 * @param {(file: string) => Buffer} input.read the bytes read from each file
 */
export function buildManifest({
  root,
  revision,
  operations,
  supplementalCount,
  unresolved,
  indexRoots,
  parsed,
  used,
  read,
}) {
  return {
    repository: 'https://github.com/LodyAI/Lody',
    revision,
    scope:
      'Public optional-cloud HTTP clients and CloudApi DTOs. Excludes Flock, Loro usage and Streams RPC.',
    typedOperations: operations.filter((o) => !o.supplemental).length,
    supplementalOperations: supplementalCount,
    operations: operations.length,
    // Code-unit order, as for the digests below, so no locale changes the bytes.
    unresolved: [...unresolved].sort((a, b) => compareCodeUnits(a.source, b.source)),
    // Every file read: the parsed index as one digest, and each file that shaped
    // the output or is cited by an operation with its own hash.
    index: {
      roots: indexRoots,
      files: parsed.length,
      sha256: crypto
        .createHash('sha256')
        .update(
          parsed
            .map((file) => `${path.relative(root, file)}\0${sha256(read(file))}\n`)
            .sort()
            .join(''),
        )
        .digest('hex'),
    },
    files: [...used]
      .sort()
      .map((file) => ({ path: path.relative(root, file), sha256: sha256(read(file)) })),
  };
}
