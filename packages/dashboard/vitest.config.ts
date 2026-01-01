import { defineConfig } from 'vitest/config'

// Vitest configuration for the dashboard tests. Use jsdom and raise the
// testTimeout so CI/runner environments with slower transforms don't
// cause flakey failures.
export default defineConfig({
  test: {
    environment: 'jsdom',
    testTimeout: 20000,
    globals: true,
    setupFiles: [],
  },
})
