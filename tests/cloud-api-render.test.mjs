/**
 * Unit tests for `scripts/cloud-api/render.mjs` and `scripts/cloud-api/outputs.mjs`:
 * the rendered documents' content, and the read-only staleness check and the
 * writer.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import YAML from 'yaml';
import { findStaleOutputs, writeOutputs } from '../scripts/cloud-api/outputs.mjs';
import {
  renderManifest,
  renderOpenApi,
  renderOperations,
  renderRoutes,
  wrap,
} from '../scripts/cloud-api/render.mjs';
import { REVISION } from './cloud-api-helpers.mjs';

describe('render', () => {
  it('wraps prose at 80 columns and leaves lists alone', () => {
    const prose = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    const wrapped = wrap(`${prose}\n\n- a list item that stays exactly as written`);
    const [paragraph, list] = wrapped.split('\n\n');
    assert.ok(paragraph.split('\n').every((line) => line.length <= 80));
    assert.ok(paragraph.split('\n').length > 1);
    assert.equal(list, '- a list item that stays exactly as written');
  });

  it('keeps an overlong word on a line of its own', () => {
    const long = `https://example.invalid/${'x'.repeat(90)}`;
    assert.equal(wrap(`before ${long} after`), `before\n${long}\nafter`);
  });

  it('renders each route with its origin label', () => {
    const routes = renderRoutes({
      paths: {
        '/a': { get: { summary: 'Default' } },
        '/b': { post: { summary: 'Worker', servers: [{ url: 'https://api.lody.ai' }] } },
        '/c': { put: { summary: 'Other', servers: [{ url: 'https://other.invalid' }] } },
      },
    });
    assert.match(routes, /\n\| GET \| `\/a` \| backend \| Default \|\n/);
    assert.match(routes, /\n\| POST \| `\/b` \| worker \| Worker \|\n/);
    assert.match(routes, /\n\| PUT \| `\/c` \| command-pinned ingress \| Other \|\n/);
    assert.ok(
      routes.endsWith('_Table 1: Every documented HTTP route, with its origin and operation._\n'),
    );
  });

  it('renders the manifest as JSON with a final newline', () => {
    assert.equal(renderManifest({ a: 1 }), '{\n  "a": 1\n}\n');
  });
});

describe('outputs', () => {
  it('reports absent and differing outputs as stale', () => {
    const disk = new Map([
      ['same', 'x'],
      ['different', 'old'],
    ]);
    const stale = findStaleOutputs(
      [
        ['same', 'x'],
        ['different', 'new'],
        ['absent', 'y'],
      ],
      (file) => disk.get(file),
    );
    assert.deepEqual(stale, ['different', 'absent']);
  });

  it('writes every output', () => {
    /** @type {Array<[string, string]>} */
    const written = [];
    writeOutputs(
      [
        ['a', '1'],
        ['b', '2'],
      ],
      (file, data) => written.push([file, data]),
    );
    assert.deepEqual(written, [
      ['a', '1'],
      ['b', '2'],
    ]);
  });
});

describe('documents', () => {
  const operations = [
    {
      name: 'demo:getThing',
      kind: 'query',
      source: 'packages/cloud-api/src/index.ts:4',
      description: 'Fetch one thing.',
      args: { $ref: '#/components/schemas/demo_getThing_Args' },
      result: { $ref: '#/components/schemas/demo_getThing_Result' },
      typescript: { args: '{ id: string }', result: 'Thing' },
    },
    {
      name: 'extra:call',
      kind: 'action',
      source: 'apps/extra.ts:9',
      description: 'An extra.',
      args: { $ref: '#/components/schemas/extra_call_Args' },
      result: { $ref: '#/components/schemas/extra_call_Result' },
      supplemental: true,
    },
  ];

  it('renders each operation with its kind, schemas, source link and types', () => {
    const markdown = renderOperations({
      groups: [{ name: 'demo', description: '' }],
      operations,
      schemas: { extra_call_Args: { type: 'object' } },
      revision: REVISION,
    });
    assert.ok(markdown.startsWith('# Convex operation reference\n'));
    assert.ok(
      markdown.includes(
        [
          '## demo',
          '',
          'Public client-facing cloud operations.',
          '',
          '### demo:getThing',
          '',
          '**QUERY** · schemas: `demo_getThing_Args`, `demo_getThing_Result` ·',
          `[source](https://github.com/LodyAI/Lody/blob/${REVISION}/packages/cloud-api/src/index.ts#L4)`,
          '',
          'Fetch one thing.',
          '',
          'Arguments:',
          '',
          '```ts',
          '{ id: string }',
          '```',
          '',
          'Result:',
          '',
          '```ts',
          'Thing',
          '```',
        ].join('\n'),
      ),
    );
    assert.ok(
      markdown.includes(
        [
          '### extra:call',
          '',
          '**ACTION** ·',
          `[source](https://github.com/LodyAI/Lody/blob/${REVISION}/apps/extra.ts#L9)`,
          '',
          'An extra.',
          '',
          'Arguments:',
          '',
          '```json',
          '{\n  "type": "object"\n}',
          '```',
          '',
          'Result schema: `extra_call_Result`.',
        ].join('\n'),
      ),
    );
  });

  it('renders the OpenAPI document as YAML that parses back to it', () => {
    const document = {
      openapi: '3.1.1',
      paths: { '/api/query': { post: { 'x-convex-operations': [operations[0]] } } },
      components: { schemas: { Thing: { $ref: '#/components/schemas/Other' } } },
    };
    const yaml = renderOpenApi(document);
    assert.deepEqual(YAML.parse(yaml), document);
    assert.match(yaml, /\$ref: "#\/components\/schemas\/demo_getThing_Args"/);
    assert.match(yaml, /^openapi: 3\.1\.1\n/);
  });
});
