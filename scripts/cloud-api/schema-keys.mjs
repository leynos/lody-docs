/**
 * Finite key sets: record keys, `Pick`/`Omit` keys and `keyof`.
 *
 * `createKeyResolver` returns `literalKeys`, which turns a key type made only
 * of string literals into its distinct keys, and `propertyKeys`, the property
 * names `keyof` sees, with numeric names kept as numbers. Both resolve every
 * name in the module that uses it (`schema-scope.mjs`). For a name neither
 * declared nor imported, `literalKeys` accepts the indexed declarations only
 * when they all give the same keys, which is then exact whichever one is
 * meant. `propertyKeys` gives an exact set only when TypeScript cannot reduce
 * the type to `never`: intersected parts that share a property must declare
 * provably compatible types for it. Anything else yields null, which the type
 * converter (`schema-types.mjs`, `schema-utilities.mjs`) reports as
 * `x-unresolved`.
 */
import ts from 'typescript';
import { entityParts } from './schema-scope.mjs';

/**
 * @typedef {object} PropertyEntry
 * @property {string | number} key
 * @property {ts.TypeNode | undefined} type the declared type; undefined for a method
 */

/**
 * Whether two declared types of one property can both hold at once without
 * the intersection becoming `never`: the same type text in one module (or a
 * self-contained keyword or literal type), or a literal and its keyword.
 * @param {ts.TypeNode | undefined} a
 * @param {ts.TypeNode | undefined} b
 */
function compatible(a, b) {
  if (!a || !b) return false;
  const selfContained = (/** @type {ts.TypeNode} */ t) =>
    ts.isLiteralTypeNode(t) ||
    [
      ts.SyntaxKind.StringKeyword,
      ts.SyntaxKind.NumberKeyword,
      ts.SyntaxKind.BooleanKeyword,
    ].includes(t.kind);
  if (a.getText() === b.getText())
    return a.getSourceFile() === b.getSourceFile() || (selfContained(a) && selfContained(b));
  /** @param {ts.TypeNode} keyword @param {ts.TypeNode} literal */
  const widens = (keyword, literal) =>
    ts.isLiteralTypeNode(literal) &&
    ((keyword.kind === ts.SyntaxKind.StringKeyword && ts.isStringLiteral(literal.literal)) ||
      (keyword.kind === ts.SyntaxKind.NumberKeyword && ts.isNumericLiteral(literal.literal)));
  return widens(a, b) || widens(b, a);
}

/**
 * The property entries of type members, or null if any name is not fixed or
 * the type has an index signature.
 * @param {ts.NodeArray<ts.TypeElement>} members
 * @returns {PropertyEntry[] | null}
 */
function memberEntries(members) {
  /** @type {PropertyEntry[]} */
  const entries = [];
  for (const member of members) {
    if (ts.isCallSignatureDeclaration(member) || ts.isConstructSignatureDeclaration(member))
      continue;
    const name = member.name;
    if (!name) return null;
    const type = ts.isPropertySignature(member) ? member.type : undefined;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) entries.push({ key: name.text, type });
    else if (ts.isNumericLiteral(name)) entries.push({ key: Number(name.text), type });
    else return null;
  }
  return entries;
}

/**
 * Entries with later declarations of a key replacing earlier ones, as an
 * interface's own member replaces an inherited one.
 * @param {PropertyEntry[]} entries
 */
function override(entries) {
  /** @type {Map<string | number, PropertyEntry>} */
  const byKey = new Map();
  for (const entry of entries) byKey.set(entry.key, entry);
  return [...byKey.values()];
}

/**
 * Create the key resolver of a conversion.
 * @param {import('./schema-context.mjs').Context} ctx
 */
export function createKeyResolver(ctx) {
  const { location } = ctx;
  /**
   * The distinct keys of a key type made only of string literals; undefined
   * for any other key type; null when an alias cannot be resolved safely.
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
    if (ts.isTypeReferenceNode(node) && !node.typeArguments) {
      const parts = entityParts(node.typeName);
      const candidates = parts ? ctx.declarationsOf(node.getSourceFile(), parts) : null;
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
   * The property names of an object type, as `keyof` sees them, or null when
   * the key set is not exactly known.
   * @param {ts.TypeNode} node
   * @returns {Array<string | number> | null}
   */
  function propertyKeys(node) {
    return entriesOf(node, new Set())?.map((entry) => entry.key) ?? null;
  }
  /**
   * @param {ts.TypeNode} node
   * @param {Set<ts.Node>} path declarations being expanded, to stop cycles
   * @returns {PropertyEntry[] | null}
   */
  function entriesOf(node, path) {
    if (ts.isParenthesizedTypeNode(node)) return entriesOf(node.type, path);
    if (ts.isTypeLiteralNode(node)) return memberEntries(node.members);
    if (ts.isIntersectionTypeNode(node)) {
      const parts = node.types.map((part) => entriesOf(part, path));
      if (parts.includes(null)) return null;
      /** @type {Map<string | number, PropertyEntry>} */
      const merged = new Map();
      for (const entry of /** @type {PropertyEntry[][]} */ (parts).flat()) {
        const earlier = merged.get(entry.key);
        // A shared property whose types may conflict could make the whole
        // intersection `never`, whose key set is every key, not these.
        if (earlier && !compatible(earlier.type, entry.type)) return null;
        if (!earlier) merged.set(entry.key, entry);
      }
      return [...merged.values()];
    }
    if (!ts.isTypeReferenceNode(node) || node.typeArguments) return null;
    const parts = entityParts(node.typeName);
    return parts ? declarationEntries(node.getSourceFile(), parts, path) : null;
  }
  /**
   * @param {ts.SourceFile} sf
   * @param {string[]} parts
   * @param {Set<ts.Node>} path
   * @returns {PropertyEntry[] | null}
   */
  function declarationEntries(sf, parts, path) {
    const decls = ctx.declarationsOf(sf, parts);
    if (decls?.length !== 1 || path.has(decls[0]) || decls[0].typeParameters?.length) return null;
    const [decl] = decls;
    const inner = new Set([...path, decl]);
    location(decl);
    if (ts.isTypeAliasDeclaration(decl)) return entriesOf(decl.type, inner);
    /** @type {Array<PropertyEntry[] | null>} */
    const inherited = [];
    for (const base of (decl.heritageClauses ?? []).flatMap((clause) => clause.types)) {
      const baseParts = !base.typeArguments && entityParts(base.expression);
      inherited.push(baseParts ? declarationEntries(decl.getSourceFile(), baseParts, inner) : null);
    }
    const own = memberEntries(decl.members);
    if (!own || inherited.includes(null)) return null;
    return override([.../** @type {PropertyEntry[][]} */ (inherited).flat(), ...own]);
  }
  return { literalKeys, propertyKeys };
}
