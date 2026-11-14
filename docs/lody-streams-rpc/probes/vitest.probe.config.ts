import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: {
    'acp-extension-dsh/capabilities': path.resolve(__dirname, '../acp-extension-dsh/src/capabilities.ts'),
    'acp-extension-core': path.resolve(__dirname, '../acp-extension-core/src/index.ts'),
  } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});
