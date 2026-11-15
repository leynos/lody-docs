/**
 * Unit tests that every kind of local binding shadows outer names
 * (`scripts/cloud-api/schema-bindings.mjs`, `schema-scope.mjs`): a class,
 * enum, namespace, destructured name, type parameter or function parameter
 * of the name blocks the fallback to an unrelated indexed declaration, and a
 * kind the converter does not expand makes the reference `x-unresolved`.
 * Built-in names count as built-ins only where the module does not bind them.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';
import { enclosing } from '../scripts/cloud-api/schema-bindings.mjs';
import { CONTRACT, CONTRACT_PATH, convertThing, schemaOf, THING } from './cloud-api-helpers.mjs';

const ZOD = "import { z } from 'zod';\n";
/** An unrelated declaration of `Base` and `Key`, the only ones indexed elsewhere. */
const ELSEWHERE = {
  'packages/shared/src/other.ts':
    "interface Base { other: boolean }\ntype Key = 'other';\nconst MAX = 9;\n",
};
/** @param {any} schema */
const assertUnresolved = (schema) => {
  assert.equal(schema['x-unresolved'], true);
  assert.equal(schema.type, undefined);
  assert.equal(schema.properties, undefined);
};

describe('local bindings of unsupported kinds', () => {
  it('refuses a local class as a base, directly or through a local alias', () => {
    for (const source of [
      "class Base { id = '' }\nexport interface Thing extends Base { count: number }\n",
      "class Base { id = '' }\ntype Alias = Base;\nexport interface Thing extends Alias { count: number }\n",
      'declare class Base { id: string }\nexport interface Thing extends Base { count: number }\n',
    ])
      assertUnresolved(schemaOf(source, ELSEWHERE).schema);
    // A class in a namespace body is in no index; only the local rule stops it.
    const { converter } = convertThing({
      ...ELSEWHERE,
      [THING]:
        "namespace N { class Base { id = '' }\nexport interface Inner extends Base { count: number } }\nexport type Thing = N.Inner;\n",
    });
    assertUnresolved(converter.schemas[converter.schemas.Dto_Thing.$ref.split('/').at(-1)]);
  });

  it('refuses an unbound name that an indexed class shares with an indexed interface', () => {
    assertUnresolved(
      schemaOf('export interface Thing extends Base { count: number }\n', {
        ...ELSEWHERE,
        'packages/shared/src/klass.ts': "export class Base { id = '' }\n",
      }).schema,
    );
  });

  it('refuses a local enum as a record key or a property type', () => {
    assertUnresolved(
      schemaOf("enum Key { A = 'a' }\nexport type Thing = Record<Key, string>;\n", ELSEWHERE)
        .schema,
    );
    assertUnresolved(
      schemaOf("const enum Key { A = 'a' }\nexport type Thing = { k: Key };\n", ELSEWHERE).schema
        .properties.k,
    );
  });

  it('refuses an interface as a record key instead of widening to an open record', () => {
    assertUnresolved(
      schemaOf('interface Key { a: string }\nexport type Thing = Record<Key, string>;\n').schema,
    );
  });

  it('refuses a destructured constant instead of taking another one of the name', () => {
    assert.throws(
      () =>
        schemaOf(
          `${ZOD}const { MAX } = { MAX: 1 };\nconst S = z.object({ a: z.string().max(MAX) });\nexport type Thing = z.infer<typeof S>;\n`,
          ELSEWHERE,
        ),
      /Unsupported numeric schema bound: MAX/,
    );
  });
});

describe('enclosing scopes', () => {
  it('resolves a namespace member that refers to its sibling', () => {
    const { schema } = schemaOf(
      "namespace Local { type Key = 'id'; export type Keys = Key; }\nexport type Thing = Record<Local.Keys, string>;\n",
      { [CONTRACT_PATH]: `${CONTRACT}type Key = 'other';\n` },
    );
    assert.deepEqual(schema.required, ['id']);
  });

  /**
   * What an enclosing scope binds `name` to at its last reference in `source`.
   * @param {string} source
   * @param {string} name
   * @param {'type' | 'value'} space
   */
  function bindingAt(source, name, space) {
    const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
    /** @type {ts.Node | undefined} */
    let last;
    const visit = (/** @type {ts.Node} */ node) => {
      if (ts.isIdentifier(node) && node.text === name) last = node;
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return enclosing(/** @type {ts.Node} */ (last), name, space);
  }

  it('lets type and function parameters shadow outer names', () => {
    assert.equal(bindingAt('type Outer<Base> = { b: Base };', 'Base', 'type'), null);
    assert.equal(bindingAt('interface Box<Key> { k: Record<Key, string> }', 'Key', 'type'), null);
    assert.equal(bindingAt('type M = { [Key in "a"]: Key };', 'Key', 'type'), null);
    assert.equal(bindingAt('const f = (MAX: number) => MAX;', 'MAX', 'value'), null);
    assert.equal(
      bindingAt('function f({ MAX }: { MAX: number }) { return MAX; }', 'MAX', 'value'),
      null,
    );
  });

  it('finds declarations in enclosing blocks and namespace bodies', () => {
    const block = bindingAt('function f() { const MAX = 3; return MAX; }', 'MAX', 'value');
    assert.equal(block?.length, 1);
    const namespace = bindingAt("namespace N { type K = 'a'; type T = K; }", 'K', 'type');
    assert.equal(namespace?.length, 1);
    assert.equal(bindingAt('type T = K;', 'K', 'type'), undefined);
  });
});

describe('built-in names', () => {
  it('treats a locally bound utility or Record as the local declaration', () => {
    assertUnresolved(
      schemaOf('type Partial<T> = T;\nexport type Thing = Partial<{ a?: string }>;\n').schema,
    );
    assertUnresolved(
      schemaOf(
        "import type { Record } from './record';\nexport type Thing = Record<'a', string>;\n",
      ).schema,
    );
  });

  it('reads a locally declared Number, not the built-in', () => {
    const { schema } = schemaOf(
      `${ZOD}const Number = { MAX_SAFE_INTEGER: 5 };\nconst S = z.object({ a: z.string().max(Number.MAX_SAFE_INTEGER) });\nexport type Thing = z.infer<typeof S>;\n`,
    );
    assert.equal(schema.properties.a.maxLength, 5);
  });
});

describe('several bases', () => {
  it('keeps both constraints of a property two bases declare', () => {
    const { schema } = schemaOf(
      "interface A { kind: string }\ninterface B { kind: 'b' }\nexport interface Thing extends A, B {}\n",
    );
    assert.deepEqual(schema.properties.kind, {
      allOf: [{ type: 'string' }, { type: 'string', const: 'b' }],
    });
  });

  it('refuses bases whose index signatures differ', () => {
    assertUnresolved(
      schemaOf(
        'interface A { [k: string]: string }\ninterface B { [k: string]: number }\nexport interface Thing extends A, B {}\n',
      ).schema,
    );
  });
});
