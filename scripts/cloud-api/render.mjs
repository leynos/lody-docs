/**
 * Rendering of the generated cloud API documents to strings.
 *
 * Every function here is pure: it takes the document, operations and manifest
 * built by `operations.mjs` and returns text. `renderOutputs` returns each
 * generated file's repository-relative path with its content; the entry point
 * then writes or compares them (`outputs.mjs`).
 */
import YAML from 'yaml';

/** The generated documents, relative to the repository root. */
export const OUTPUT_FILES = {
  routes: 'docs/cloud-api/routes.md',
  openapi: 'docs/cloud-api/openapi.yaml',
  operations: 'docs/cloud-api/operations.md',
  manifest: 'docs/cloud-api/sources.json',
};

/**
 * Wrap prose at 80 columns, paragraph by paragraph. A word longer than the
 * width, such as a link, stays on a line of its own. Lists, tables, headings,
 * quotes and code fences are left as they are.
 * @param {string} text
 */
export function wrap(text) {
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

const INTRO =
  '# Convex operation reference\n\nGenerated from the public `CloudApi` type. See [the guide](README.md) for transport and authentication, and [OpenAPI](openapi.yaml) for JSON Schemas. A query reads data, a mutation changes database state, and an action may perform external I/O. These labels do not imply that every action is safe to retry.\n\nRequest fields marked `?` are optional; `null` is an explicit value. Type names link to the pinned source; complete expanded schemas are in OpenAPI. Types marked `x-unresolved` in OpenAPI remain unconstrained and require the source definition.\n';

/**
 * The Convex operation reference, `operations.md`.
 * @param {object} input
 * @param {Array<{ name: string, description: string }>} input.groups
 * @param {import('./operations.mjs').Operation[]} input.operations
 * @param {Record<string, any>} input.schemas
 * @param {string} input.revision
 */
export function renderOperations({ groups, operations, schemas, revision }) {
  let markdown = `${wrap(INTRO)}\n`;
  for (const group of groups) {
    markdown += `\n## ${group.name}\n\n${wrap(group.description || 'Public client-facing cloud operations.')}\n`;
    for (const op of operations.filter(
      (o) => !o.supplemental && o.name.startsWith(`${group.name}:`),
    )) {
      const [file, line] = op.source.split(':');
      const id = op.name.replace(':', '_');
      const typescript = /** @type {{ args: string, result: string }} */ (op.typescript);
      markdown += `\n### ${op.name}\n\n${wrap(`**${op.kind.toUpperCase()}** · schemas: \`${id}_Args\`, \`${id}_Result\` ·`)}\n[source](https://github.com/LodyAI/Lody/blob/${revision}/${file}#L${line})\n\n${op.description ? `${wrap(op.description)}\n\n` : ''}Arguments:\n\n\x60\x60\x60ts\n${typescript.args}\n\x60\x60\x60\n\nResult:\n\n\x60\x60\x60ts\n${typescript.result}\n\x60\x60\x60\n`;
    }
  }
  markdown += `\n## Additional observed operations\n\n${wrap('These calls occur outside the exported `CloudApi` type. The schemas retain only what the callers establish.')}\n`;
  for (const op of operations.filter((o) => o.supplemental)) {
    const [file, line] = op.source.split(':');
    const id = op.name.replace(':', '_');
    markdown += `\n### ${op.name}\n\n**${op.kind.toUpperCase()}** ·\n[source](https://github.com/LodyAI/Lody/blob/${revision}/${file}${line ? `#L${line}` : ''})\n\n${wrap(op.description)}\n\nArguments:\n\n\x60\x60\x60json\n${JSON.stringify(schemas[`${id}_Args`], null, 2)}\n\x60\x60\x60\n\nResult schema: \x60${id}_Result\x60.\n`;
  }
  return markdown;
}

/** @type {Record<string, string>} */
const ORIGINS = {
  'https://backend.lody.ai': 'backend',
  'https://api.lody.ai': 'worker',
  'https://convex.lody.ai': 'convex',
};

/**
 * The HTTP route index, `routes.md`.
 * @param {any} document the OpenAPI document
 */
export function renderRoutes(document) {
  let routes = `${wrap('# HTTP route index\n\nGenerated from the OpenAPI document. Consult each operation for its credential, payload, and evidence limits. `backend` means <https://backend.lody.ai>; `worker` means <https://api.lody.ai>; `convex` means <https://convex.lody.ai>.')}\n\n| Method | Path | Origin | Operation |\n| --- | --- | --- | --- |\n`;
  for (const [route, item] of Object.entries(document.paths))
    for (const [method, op] of Object.entries(/** @type {Record<string, any>} */ (item))) {
      const origin = op.servers?.[0]?.url ?? 'https://backend.lody.ai';
      const label = ORIGINS[origin] ?? 'command-pinned ingress';
      routes += `| ${method.toUpperCase()} | \x60${route}\x60 | ${label} | ${op.summary} |\n`;
    }
  return `${routes}\n_Table 1: Every documented HTTP route, with its origin and operation._\n`;
}

/** The OpenAPI document as YAML. @param {any} document */
export const renderOpenApi = (document) =>
  YAML.stringify(document, { lineWidth: 100, aliasDuplicateObjects: false });

/** The source manifest as JSON. @param {any} manifest */
export const renderManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

/**
 * Every generated file with its content, in the order they are checked.
 * @param {object} input
 * @param {any} input.document
 * @param {any} input.manifest
 * @param {Array<{ name: string, description: string }>} input.groups
 * @param {import('./operations.mjs').Operation[]} input.operations
 * @param {string} input.revision
 * @returns {Array<[string, string]>}
 */
export function renderOutputs({ document, manifest, groups, operations, revision }) {
  return [
    [OUTPUT_FILES.routes, renderRoutes(document)],
    [OUTPUT_FILES.openapi, renderOpenApi(document)],
    [
      OUTPUT_FILES.operations,
      renderOperations({ groups, operations, schemas: document.components.schemas, revision }),
    ],
    [OUTPUT_FILES.manifest, renderManifest(manifest)],
  ];
}
