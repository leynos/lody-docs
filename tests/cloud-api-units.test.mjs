/**
 * Unit tests for the modules of the cloud API generator in `scripts/cloud-api/`
 * and for its entry point's read-only check path.
 *
 * Every test runs in memory: sources come from an in-memory reader, Git is a
 * fake runner that answers from a table, and the entry point is driven with
 * injected I/O. No test reads the real Lody checkout, runs git or writes a
 * file. `generate-cloud-api-fixture.test.mjs` covers the same behaviour end to
 * end against a real Git repository.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { findStaleOutputs, writeOutputs } from '../scripts/cloud-api/outputs.mjs';
import { buildApi, buildManifest, finishDocument } from '../scripts/cloud-api/operations.mjs';
import { blobId, verifyProvenance } from '../scripts/cloud-api/provenance.mjs';
import { renderManifest, renderRoutes, wrap } from '../scripts/cloud-api/render.mjs';
import { createConverter } from '../scripts/cloud-api/schema.mjs';
import { indexable, INDEX_ROOTS, loadSourceIndex } from '../scripts/cloud-api/source-index.mjs';
import { main } from '../scripts/generate-cloud-api.mjs';

const ROOT = '/lody';
const REVISION = 'a'.repeat(40);
const CONTRACT = [
  'export type CloudApi = {',
  '  demo: {',
  '    /** Fetch one thing. */',
  '    getThing: Query<{ id: string }, Thing>;',
  '  };',
  '};',
  '',
].join('\n');

/**
 * A source reader over in-memory files, keyed by checkout-relative path.
 * @param {Record<string, string>} sources
 */
function memoryReader(sources) {
  const files = new Map(
    Object.entries(sources).map(([file, text]) => [path.join(ROOT, file), Buffer.from(text)]),
  );
  return {
    files,
    /** @param {string} file */
    readFile: (file) => {
      const bytes = files.get(file);
      if (!bytes) throw Error(`ENOENT: ${file}`);
      return bytes;
    },
    /** @param {string} dir */
    listDirectory: (dir) => {
      const names = new Map();
      for (const file of files.keys()) {
        if (!file.startsWith(`${dir}/`)) continue;
        const [name, ...rest] = file.slice(dir.length + 1).split('/');
        names.set(name, rest.length > 0);
      }
      return [...names].map(([name, directory]) => ({ name, directory }));
    },
    /** @param {string} file */
    isFile: (file) => files.has(file),
  };
}

/**
 * A converter over in-memory sources; `Thing` is converted as a DTO.
 * @param {Record<string, string>} sources extra or replacement sources
 */
function convertThing(sources) {
  const reader = memoryReader({
    'packages/cloud-api/src/index.ts': CONTRACT,
    'packages/shared/src/index.ts': 'export {};\n',
    ...sources,
  });
  const index = loadSourceIndex(ROOT, reader);
  const converter = createConverter(index);
  converter.named('Thing', /** @type {any} */ (index.files.values().next().value));
  return { thing: converter.schemas.Dto_Thing, converter, index };
}

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

describe('schema conversion', () => {
  it('expands a record with literal keys, without duplicates', () => {
    const { thing } = convertThing({
      'packages/shared/src/thing.ts':
        "type Base = 'left' | 'right';\nexport type Thing = Record<Base | 'left', string>;\n",
    });
    assert.deepEqual(thing.required, ['left', 'right']);
    assert.deepEqual(thing.properties, { left: { type: 'string' }, right: { type: 'string' } });
  });

  it('keeps an index signature through Partial', () => {
    const { thing } = convertThing({
      'packages/shared/src/thing.ts': 'export type Thing = Partial<Record<string, number>>;\n',
    });
    assert.deepEqual(thing.additionalProperties, { type: 'number' });
    assert.deepEqual(thing.required, []);
  });

  it('marks unsupported syntax as unresolved', () => {
    const { thing, converter } = convertThing({
      'packages/shared/src/thing.ts': `export type Thing = { code: \`ERR_\${string}\` };\n`,
    });
    assert.equal(thing.properties.code['x-unresolved'], true);
    assert.deepEqual(
      [...converter.unresolved.values()].map((entry) => entry.source),
      ['packages/shared/src/thing.ts:1'],
    );
  });

  it('refuses an unsupported DTO member', () => {
    assert.throws(
      () =>
        convertThing({
          'packages/shared/src/thing.ts': 'export interface Thing { run(): void }\n',
        }),
      /Unsupported DTO member: run\(\): void/,
    );
  });

  it('records the file that supplies a cross-file bound as used', () => {
    const { thing, converter } = convertThing({
      'packages/shared/src/limits.ts': 'export const MAX = 7;\n',
      'packages/shared/src/thing.ts':
        'const S = z.object({ name: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n',
    });
    assert.equal(thing.properties.name.maxLength, 7);
    assert.ok(converter.used.has(path.join(ROOT, 'packages/shared/src/limits.ts')));
  });

  /** Sources in which a private `Key` in the contract module is loaded first. */
  const shadowed = {
    'packages/cloud-api/src/index.ts': `${CONTRACT}type Key = 'other';\n`,
  };

  it('resolves a record-key alias declared in the same module', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/thing.ts':
        "type Key = 'id';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  it('follows a renamed re-export through a barrel', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/keys/internal.ts': "export type InternalKey = 'id';\n",
      'packages/shared/src/keys/index.ts': "export { InternalKey as Key } from './internal';\n",
      'packages/shared/src/thing.ts':
        "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  it('follows a star re-export and a local renamed export', () => {
    const { thing } = convertThing({
      ...shadowed,
      'packages/shared/src/keys/internal.ts':
        "type InternalKey = 'id';\nexport { InternalKey as Key };\n",
      'packages/shared/src/keys/index.ts': "export * from './internal';\n",
      'packages/shared/src/thing.ts':
        "import type { Key } from './keys';\nexport type Thing = Record<Key, string>;\n",
    });
    assert.deepEqual(thing.required, ['id']);
  });

  /** @type {Array<[string, string, Record<string, string>]>} */
  const unresolvable = [
    [
      'a package import',
      '@lody/keys',
      { 'packages/shared/src/keys.ts': "export type Key = 'id';\n" },
    ],
    ['a missing module', './missing', {}],
    [
      'a module that does not export it',
      './keys',
      { 'packages/shared/src/keys.ts': 'export {};\n' },
    ],
  ];
  for (const [name, specifier, extra] of unresolvable)
    it(`marks a record key imported from ${name} as unresolved`, () => {
      const { thing } = convertThing({
        ...shadowed,
        ...extra,
        'packages/shared/src/thing.ts': `import type { Key } from '${specifier}';\nexport type Thing = Record<Key, string>;\n`,
      });
      assert.equal(thing['x-unresolved'], true);
      assert.equal(thing.required, undefined);
    });

  const KEYS = 'packages/shared/src/keys.ts';
  const THING = 'packages/shared/src/thing.ts';
  /** @param {string} imports how thing.ts imports its key @param {string} [key] */
  const thingWith = (imports, key = 'Key') =>
    `${imports}\nexport type Thing = Record<${key}, string>;\n`;
  /** @type {Array<[string, Record<string, string>]>} */
  const followed = [
    [
      'a default import of `export type { X as default }`',
      {
        [KEYS]: "type ActualKey = 'id';\nexport type { ActualKey as default };\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    [
      'a default import of `export default X`',
      {
        [KEYS]: "type ActualKey = 'id';\nexport default ActualKey;\n",
        [THING]: thingWith("import Key from './keys';"),
      },
    ],
    [
      'a default import re-exported through a barrel',
      {
        'packages/shared/src/keys/actual.ts':
          "type ActualKey = 'id';\nexport { ActualKey as default };\n",
        'packages/shared/src/keys/index.ts': "export { default } from './actual';\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    [
      'a namespace import used as `ns.Key`',
      {
        [KEYS]: "export type Key = 'id';\n",
        [THING]: thingWith("import * as keys from './keys';", 'keys.Key'),
      },
    ],
  ];
  for (const [name, sources] of followed)
    it(`follows ${name}`, () => {
      const { thing } = convertThing({ ...shadowed, ...sources });
      assert.deepEqual(thing.required, ['id']);
    });

  /** @type {Array<[string, Record<string, string>]>} */
  const refused = [
    [
      'a default import from a module without a default export',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import type Key from './keys';"),
      },
    ],
    ['a default import from a package', { [THING]: thingWith("import Key from '@lody/keys';") }],
    [
      'a namespace import from a package used as `ns.Key`',
      { [THING]: thingWith("import * as keys from '@lody/keys';", 'keys.Key') },
    ],
    [
      'a namespace binding used as a key',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import * as Key from './keys';"),
      },
    ],
    [
      'an `import = require` binding',
      {
        [KEYS]: "export type ActualKey = 'id';\n",
        [THING]: thingWith("import Key = require('./keys');"),
      },
    ],
  ];
  for (const [name, sources] of refused)
    it(`marks a record key from ${name} as unresolved`, () => {
      const { thing } = convertThing({ ...shadowed, ...sources });
      assert.equal(thing['x-unresolved'], true);
      assert.equal(thing.required, undefined);
    });

  it('falls back to loaded declarations of an unimported name only when they agree', () => {
    const agree = convertThing({
      'packages/shared/src/keys.ts': "type Key = 'id';\n",
      'packages/shared/src/other.ts': "type Key = 'id';\n",
      'packages/shared/src/thing.ts': 'export type Thing = Record<Key, string>;\n',
    });
    assert.deepEqual(agree.thing.required, ['id']);
    const disagree = convertThing({
      ...shadowed,
      'packages/shared/src/keys.ts': "type Key = 'id';\n",
      'packages/shared/src/thing.ts': 'export type Thing = Record<Key, string>;\n',
    });
    assert.equal(disagree.thing['x-unresolved'], true);
  });
});

describe('operations', () => {
  const http = {
    openapi: '3.1.1',
    info: { title: 'Fixture', version: 'generated' },
    paths: { '/api/x': { post: { operationId: 'x', 'x-source': ['apps/x.ts:3'] } } },
    components: { schemas: {} },
    'x-source-revision': REVISION,
  };
  const supplemental = [
    {
      name: 'extra:call',
      kind: 'action',
      source: 'apps/extra.ts:9',
      description: 'An extra.',
      args: { type: 'object' },
      result: { type: 'null' },
    },
  ];

  function build() {
    const index = loadSourceIndex(
      ROOT,
      memoryReader({
        'packages/cloud-api/src/index.ts': CONTRACT,
        'packages/shared/src/thing.ts': 'export type Thing = { id: string };\n',
      }),
    );
    const converter = createConverter(index, http.components.schemas);
    return { api: buildApi({ index, converter, http, supplemental }), converter, index };
  }

  it('enumerates contract and supplemental operations and the Convex paths', () => {
    const { api } = build();
    assert.deepEqual(
      api.operations.map((op) => [op.name, op.kind, Boolean(op.supplemental)]),
      [
        ['demo:getThing', 'query', false],
        ['extra:call', 'action', true],
      ],
    );
    assert.deepEqual(Object.keys(api.document.paths), [
      '/api/x',
      '/api/query',
      '/api/mutation',
      '/api/action',
    ]);
    assert.deepEqual(api.groups, [{ name: 'demo', description: '' }]);
    assert.deepEqual([...api.cited].sort(), [
      'apps/extra.ts',
      'apps/x.ts',
      'packages/cloud-api/src/index.ts',
    ]);
    assert.deepEqual(http.paths, {
      '/api/x': { post: { operationId: 'x', 'x-source': ['apps/x.ts:3'] } },
    });
  });

  it('rejects an operation kind other than query, mutation or action', () => {
    const index = loadSourceIndex(
      ROOT,
      memoryReader({
        'packages/cloud-api/src/index.ts':
          'export type CloudApi = { demo: { bad: Stream<{}, string> } };\n',
      }),
    );
    assert.throws(
      () => buildApi({ index, converter: createConverter(index), http, supplemental: [] }),
      /Unknown operation bad/,
    );
  });

  it('stamps the revision without reordering the document', () => {
    const finished = finishDocument(http, 'b'.repeat(40));
    assert.deepEqual(Object.keys(finished), Object.keys(http));
    assert.equal(finished.info.version, 'source-bbbbbbbbbbbb');
    assert.equal(finished['x-source-revision'], 'b'.repeat(40));
    assert.equal(http.info.version, 'generated');
  });

  it('builds a manifest with counts and per-file hashes', () => {
    const { api, converter, index } = build();
    const manifest = buildManifest({
      root: ROOT,
      revision: REVISION,
      operations: api.operations,
      supplementalCount: api.supplementalCount,
      unresolved: converter.unresolved.values(),
      indexRoots: INDEX_ROOTS,
      parsed: [...index.files.keys()],
      used: [...converter.used],
      read: index.read,
    });
    assert.equal(manifest.typedOperations, 1);
    assert.equal(manifest.supplementalOperations, 1);
    assert.equal(manifest.index.files, 2);
    assert.deepEqual(
      manifest.files.map((/** @type {{ path: string }} */ f) => f.path),
      ['packages/cloud-api/src/index.ts', 'packages/shared/src/thing.ts'],
    );
  });
});

describe('provenance', () => {
  const FILES = {
    'packages/shared/src/a.ts': 'export const A = 1;\n',
    'apps/cited.ts': 'export {};\n',
  };

  /**
   * Verify against a fake checkout.
   * @param {object} [options]
   * @param {string} [options.head] the checkout's HEAD
   * @param {string} [options.status] porcelain -z output
   * @param {string} [options.lsFiles] ls-files -v -z output
   * @param {Record<string, { mode?: string, type?: string, content?: string }>} [options.tree]
   *   overrides of pinned tree entries
   * @param {Record<string, string>} [options.working] working-tree bytes
   * @param {Record<string, string>} [options.links] realpath overrides
   */
  function verify({
    head = REVISION,
    status = '',
    lsFiles,
    tree = {},
    working = FILES,
    links = {},
  } = {}) {
    /** @type {string[][]} */
    const calls = [];
    /** @type {Record<string, { mode?: string, type?: string, content?: string }>} */
    const entries = {
      ...Object.fromEntries(Object.entries(FILES).map(([f, c]) => [f, { content: c }])),
      ...tree,
    };
    /** @param {string[]} args */
    const git = (args) => {
      calls.push(args);
      if (args[0] === 'rev-parse') return `${head}\n`;
      if (args[0] === 'status') return status;
      if (args[0] === 'ls-files')
        return (
          lsFiles ??
          Object.keys(FILES)
            .map((f) => `H ${f}\0`)
            .join('')
        );
      if (args[0] === 'ls-tree')
        return Object.entries(entries)
          .map(
            ([file, { mode = '100644', type = 'blob', content = '' }]) =>
              `${mode} ${type} ${blobId(Buffer.from(content))}\t${file}\0`,
          )
          .join('');
      throw Error(`unexpected git ${args.join(' ')}`);
    };
    const result = verifyProvenance({
      root: ROOT,
      pinned: REVISION,
      git,
      fileSystem: {
        exists: (file) => path.relative(ROOT, file) in working,
        realpath: (file) => links[file] ?? file,
      },
      read: (file) => Buffer.from(working[path.relative(ROOT, file)]),
      readFiles: Object.keys(FILES),
      indexRoots: INDEX_ROOTS,
      indexable,
    });
    return { ...result, calls };
  }

  it('accepts a checkout that is byte for byte the pinned commit', () => {
    const result = verify();
    assert.deepEqual(result.problems, []);
    assert.equal(result.message, undefined);
    assert.ok(result.calls.some((args) => args[0] === 'ls-tree' && args[1] === '-r'));
  });

  it('refuses a checkout at another revision before asking git anything else', () => {
    const result = verify({ head: 'c'.repeat(40) });
    assert.match(String(result.message), /is at c{40}, but docs\/cloud-api\/http\.json pins a{40}/);
    assert.deepEqual(result.calls, [['rev-parse', 'HEAD']]);
  });

  it('reports a status entry for an indexed or cited file and ignores others', () => {
    const result = verify({
      status: ' M packages/shared/src/a.ts\0?? README.md\0?? packages/shared/src/new.ts\0',
    });
    assert.deepEqual(result.problems, [
      ' M packages/shared/src/a.ts',
      '?? packages/shared/src/new.ts',
    ]);
  });

  it('reports a rename with its source path', () => {
    const result = verify({ status: 'R  packages/shared/src/b.txt\0packages/shared/src/a.ts\0' });
    assert.ok(result.problems.includes('R  packages/shared/src/b.txt <- packages/shared/src/a.ts'));
  });

  for (const tag of ['S', 'h'])
    it(`refuses the index flag ${tag}`, () => {
      const result = verify({ lsFiles: `${tag} packages/shared/src/a.ts\0H apps/cited.ts\0` });
      assert.deepEqual(result.problems, [
        `${tag} packages/shared/src/a.ts (assume-unchanged or skip-worktree)`,
      ]);
    });

  it('refuses bytes that differ from the pinned blob', () => {
    const result = verify({
      working: { ...FILES, 'packages/shared/src/a.ts': 'export const A = 2;\n' },
    });
    assert.deepEqual(result.problems, [
      `packages/shared/src/a.ts (bytes read differ from ${REVISION}; filters and line-ending conversion are not applied)`,
    ]);
  });

  it('refuses a pinned indexable file missing from the working tree', () => {
    const result = verify({ tree: { 'packages/shared/src/gone.ts': { content: 'x' } } });
    assert.deepEqual(result.problems, [
      'packages/shared/src/gone.ts (missing from the working tree)',
    ]);
  });

  it('refuses a symbolic link at the pinned revision or in the working tree', () => {
    assert.deepEqual(
      verify({ tree: { 'apps/cited.ts': { mode: '120000', content: 'export {};\n' } } }).problems,
      ['apps/cited.ts (symbolic link, refused)'],
    );
    assert.deepEqual(
      verify({ links: { [`${ROOT}/apps/cited.ts`]: `${ROOT}/elsewhere.ts` } }).problems,
      ['apps/cited.ts (symbolic link, refused)'],
    );
  });

  it('refuses a read file that is not a file at the pinned revision', () => {
    const result = verify({ tree: { 'apps/cited.ts': { type: 'commit' } } });
    assert.deepEqual(result.problems, [`apps/cited.ts (not a file at ${REVISION})`]);
  });
});

describe('entry point', () => {
  const sources = {
    'packages/cloud-api/src/index.ts': CONTRACT,
    'packages/shared/src/thing.ts': 'export type Thing = { id: string };\n',
  };
  const http = {
    openapi: '3.1.1',
    info: { title: 'Fixture', version: 'generated' },
    paths: {},
    components: { schemas: {} },
    'x-source-revision': REVISION,
  };

  /**
   * In-memory I/O for the entry point: a clean checkout at the pinned revision.
   * @param {Map<string, string>} disk repository files
   * @param {(file: string, data: string) => void} writeText
   */
  function io(disk, writeText) {
    const reader = memoryReader(sources);
    return {
      ...reader,
      exists: (/** @type {string} */ file) => reader.files.has(file),
      realpath: (/** @type {string} */ file) => file,
      readText: (/** @type {string} */ file) => disk.get(file),
      writeText,
      git: (/** @type {string} */ _root, /** @type {string[]} */ args) => {
        if (args[0] === 'rev-parse') return `${REVISION}\n`;
        if (args[0] === 'ls-tree')
          return [...reader.files]
            .map(([file, bytes]) => `100644 blob ${blobId(bytes)}\t${path.relative(ROOT, file)}\0`)
            .join('');
        return '';
      },
    };
  }

  it('checks without writing, and reports stale outputs without writing', () => {
    const disk = new Map([
      ['/repo/docs/cloud-api/http.json', JSON.stringify(http)],
      ['/repo/docs/cloud-api/supplemental.json', '[]'],
    ]);
    const options = { env: { LODY_SOURCE: ROOT }, cwd: '/repo' };
    const generated = main({
      ...options,
      args: [],
      io: io(disk, (file, data) => disk.set(file, data)),
    });
    assert.equal(generated.status, 0);
    assert.match(generated.messages[0], /^Generated 1 Convex operations/);
    assert.equal(disk.size, 6);
    const refuseWrites = () => assert.fail('check mode wrote a file');
    const verified = main({ ...options, args: ['--check'], io: io(disk, refuseWrites) });
    assert.deepEqual(verified, {
      status: 0,
      messages: [
        'Verified 1 Convex operations; 3 HTTP paths; 1 unresolved types or semantic refinements.',
      ],
    });
    disk.set('/repo/docs/cloud-api/routes.md', 'stale');
    disk.delete('/repo/docs/cloud-api/sources.json');
    const stale = main({ ...options, args: ['--check'], io: io(disk, refuseWrites) });
    assert.deepEqual(stale, {
      status: 1,
      messages: [
        'Stale generated document: docs/cloud-api/routes.md; run npm run generate',
        'Stale generated document: docs/cloud-api/sources.json; run npm run generate',
      ],
    });
  });
});
