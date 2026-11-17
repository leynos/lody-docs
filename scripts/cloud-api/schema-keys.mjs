/**
 * Finite key sets: record keys, `Pick`/`Omit` keys and `keyof`.
 *
 * `createKeyResolver` returns `literalKeys`, which turns a key type made only
 * of string literals into its distinct keys, and `propertyKeys`, the property
 * names `keyof` sees, with numeric names kept as numbers. Both resolve every
 * name in the module that uses it (`schema-scope.mjs`). For a name neither
 * declared nor imported, `literalKeys` accepts the indexed declarations only
 * when they all give the same keys, which is then exact whichever one is
 * meant. `propertyKeys` gives an exact set only when no property is declared
 * twice anywhere in the flattened type (intersections, aliases, parentheses
 * and interface bases), except as repeats of one identical declaration, so
 * TypeScript cannot have reduced it to `never`. Anything else yields null,
 * which the type converter (`schema-types.mjs`, `schema-utilities.mjs`)
 * reports as `x-unresolved`.
 */
import ts from 'typescript';
import { entityParts } from './schema-scope.mjs';

/**
 * @typedef {object} PropertyEntry
 * @property {string | number} key
 * @property {ts.TypeNode | undefined} type the declared type; undefined for a method
 */

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
 * Whether every declaration of a property has the same type text in the same
 * module, so that repeating it cannot make an intersection `never`.
 * @param {PropertyEntry[]} entries
 */
const identical = (entries) =>
  entries.every(
    (entry) =>
      entry.type !== undefined &&
      entries[0].type !== undefined &&
      entry.type.getText() === entries[0].type.getText() &&
      entry.type.getSourceFile() === entries[0].type.getSourceFile(),
  );

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
      const candidates = parts ? ctx.declarationsOf(node, parts) : null;
      if (candidates === null) return null;
      // Only a non-generic alias can name a literal key set; any other kind
      // (an enum, a class, an interface) is not expanded here.
      const results = candidates.map((decl) =>
        ts.isTypeAliasDeclaration(decl) && !decl.typeParameters?.length
          ? literalKeys(decl.type)
          : null,
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
    const entries = entriesOf(node, new Set());
    if (!entries) return null;
    // Declarations are grouped by TypeScript's property identity: a numeric
    // name is its canonical number string (`1`, `1.0`, `0x1` and `1e0` are all
    // "1"), the same property as the quoted name '1'.
    /** @type {Map<string, PropertyEntry[]>} */
    const byName = new Map();
    for (const entry of entries) {
      const name = String(entry.key);
      byName.set(name, [...(byName.get(name) ?? []), entry]);
    }
    for (const declarations of byName.values()) {
      // A property spelt both as a number and as a string has no single key
      // type.
      if (new Set(declarations.map((entry) => typeof entry.key)).size > 1) return null;
      // A property declared more than once anywhere in the flattened type
      // could make an intersection `never`, whose key set is every key; only
      // repeats of one identical declaration are accepted.
      if (!identical(declarations)) return null;
    }
    return [...byName.values()].map((declarations) => declarations[0].key);
  }
  /**
   * Every property declaration of a type, with the whole intersection tree
   * flattened through parentheses, aliases and interface bases; nothing is
   * merged or dropped, so that `propertyKeys` sees every repeat.
   * @param {ts.TypeNode} node
   * @param {Set<ts.Node>} path declarations being expanded, to stop cycles
   * @returns {PropertyEntry[] | null}
   */
  function entriesOf(node, path) {
    if (ts.isParenthesizedTypeNode(node)) return entriesOf(node.type, path);
    if (ts.isTypeLiteralNode(node)) return memberEntries(node.members);
    if (ts.isIntersectionTypeNode(node)) {
      const parts = node.types.map((part) => entriesOf(part, path));
      return parts.includes(null) ? null : /** @type {PropertyEntry[][]} */ (parts).flat();
    }
    if (!ts.isTypeReferenceNode(node) || node.typeArguments) return null;
    const parts = entityParts(node.typeName);
    return parts ? declarationEntries(node, parts, path) : null;
  }
  /**
   * @param {ts.Node} at the reference
   * @param {string[]} parts
   * @param {Set<ts.Node>} path
   * @returns {PropertyEntry[] | null}
   */
  function declarationEntries(at, parts, path) {
    const decls = ctx.declarationsOf(at, parts);
    if (decls?.length !== 1 || path.has(decls[0]) || decls[0].typeParameters?.length) return null;
    const [decl] = decls;
    if (!ts.isTypeAliasDeclaration(decl) && !ts.isInterfaceDeclaration(decl)) return null;
    const inner = new Set([...path, decl]);
    location(decl);
    if (ts.isTypeAliasDeclaration(decl)) return entriesOf(decl.type, inner);
    /** @type {Array<PropertyEntry[] | null>} */
    const inherited = [];
    for (const base of (decl.heritageClauses ?? []).flatMap((clause) => clause.types)) {
      const baseParts = !base.typeArguments && entityParts(base.expression);
      inherited.push(baseParts ? declarationEntries(base, baseParts, inner) : null);
    }
    const own = memberEntries(decl.members);
    if (!own || inherited.includes(null)) return null;
    // A redeclared inherited member is kept as a second declaration too.
    return [.../** @type {PropertyEntry[][]} */ (inherited).flat(), ...own];
  }
  return { literalKeys, propertyKeys };
}
