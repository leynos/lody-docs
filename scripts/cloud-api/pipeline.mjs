/**
 * The generation pipeline, with every effect injected.
 *
 * `generateOutputs` indexes the checkout (`source-index.mjs`), converts the
 * contract (`schema.mjs`, `operations.mjs`), verifies provenance
 * (`provenance.mjs`) and renders the documents (`render.mjs`). It reads only
 * through the reader, Git runner and file-system view it is given, writes
 * nothing, and returns the rendered outputs with a summary. It throws when
 * the sources cannot be converted or the checkout is not the pinned commit,
 * before any output exists.
 */
import path from 'node:path';
import { buildApi, buildManifest, finishDocument } from './operations.mjs';
import { verifyProvenance } from './provenance.mjs';
import { renderOutputs } from './render.mjs';
import { createConverter } from './schema.mjs';
import { INDEX_ROOTS, indexable, loadSourceIndex } from './source-index.mjs';

/**
 * @param {object} input
 * @param {string} input.root the Lody checkout, absolute
 * @param {any} input.http the authored `http.json`
 * @param {any[]} input.supplemental the authored `supplemental.json`
 * @param {import('./source-index.mjs').SourceReader} input.reader
 * @param {(args: string[]) => string} input.git runs git in the checkout
 * @param {import('./provenance.mjs').FileSystemView} input.fileSystem
 */
export function generateOutputs({ root, http, supplemental, reader, git, fileSystem }) {
  const index = loadSourceIndex(root, reader);
  const converter = createConverter(index, http.components.schemas);
  const api = buildApi({ index, converter, http, supplemental });
  const used = new Set([...converter.used, ...[...api.cited].map((f) => path.join(root, f))]);
  const parsed = [...index.files.keys()];
  const provenance = verifyProvenance({
    root,
    pinned: http['x-source-revision'],
    git,
    fileSystem,
    read: index.read,
    readFiles: [...parsed, ...used].map((file) => path.relative(root, file)),
    indexRoots: INDEX_ROOTS,
    indexable,
  });
  if (provenance.message) throw Error(provenance.message);
  const { revision } = provenance;
  const document = finishDocument(api.document, revision);
  const manifest = buildManifest({
    root,
    revision,
    operations: api.operations,
    supplementalCount: api.supplementalCount,
    unresolved: converter.unresolved.values(),
    indexRoots: INDEX_ROOTS,
    parsed,
    used,
    read: index.read,
  });
  return {
    outputs: renderOutputs({
      document,
      manifest,
      groups: api.groups,
      operations: api.operations,
      revision,
    }),
    summary: {
      operations: api.operations.length,
      paths: Object.keys(document.paths).length,
      unresolved: converter.unresolved.size,
    },
  };
}
