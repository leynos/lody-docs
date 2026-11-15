/**
 * Conversion of TypeScript, Zod and Effect schema syntax to JSON Schema.
 *
 * `createConverter` is the facade over one conversion. It creates the shared
 * state (`schema-context.mjs`) and wires the focused converters to it:
 * `schema-types.mjs` for TypeScript types and named DTOs, with the utility
 * types in `schema-utilities.mjs`; `schema-keys.mjs` for finite key sets;
 * `schema-zod.mjs` and `schema-effect.mjs` for runtime schemas. It resolves
 * names only through its source index (`source-index.mjs`), so it performs no
 * I/O of its own beyond parsing a module the index has not yet loaded. The
 * operation builder (`operations.mjs`) drives it.
 */
import { createContext } from './schema-context.mjs';
import { createEffectConverter } from './schema-effect.mjs';
import { createKeyResolver } from './schema-keys.mjs';
import { createTypeConverter } from './schema-types.mjs';
import { createZodConverter } from './schema-zod.mjs';

export { comment, ref } from './schema-context.mjs';

/** @typedef {import('./schema-context.mjs').Unresolved} Unresolved */

/**
 * Create a converter over a source index.
 * @param {import('./source-index.mjs').SourceIndex} index
 * @param {Record<string, any>} [initialSchemas] authored component schemas
 */
export function createConverter(index, initialSchemas = {}) {
  const ctx = createContext(index, initialSchemas);
  ctx.literalKeys = createKeyResolver(ctx).literalKeys;
  const types = createTypeConverter(ctx);
  ctx.convert = types.convert;
  ctx.named = types.named;
  ctx.zod = createZodConverter(ctx);
  ctx.effectSchema = createEffectConverter(ctx);
  return {
    schemas: ctx.schemas,
    unresolved: ctx.unresolved,
    used: ctx.used,
    convert: ctx.convert,
    named: ctx.named,
    location: ctx.location,
  };
}
