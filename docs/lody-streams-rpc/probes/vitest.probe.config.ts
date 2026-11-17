/**
 * Vitest configuration for the Streams RPC probes.
 *
 * Runs `validators.probe.test.ts` (as `tests/zz-probe.test.ts`) and the live
 * probe that `build_live_probe.py` writes (`tests/zz-live.test.ts`) from
 * `packages/loro-streams-rpc` in a scratch export of Lody. The aliases point
 * `acp-extension-dsh/capabilities` and `acp-extension-core`, which
 * `@lody/shared` imports, straight at the TypeScript sources of those
 * submodules in the scratch copy, which were fetched separately (see the probe
 * limits in `conformance.md`). It does not run from this repository, and no
 * gate here uses it.
 */
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: {
    'acp-extension-dsh/capabilities': path.resolve(__dirname, '../acp-extension-dsh/src/capabilities.ts'),
    'acp-extension-core': path.resolve(__dirname, '../acp-extension-core/src/index.ts'),
  } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});
