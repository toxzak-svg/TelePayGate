<<<<<<< HEAD
import { defineConfig } from 'vitest/config'
=======
import { defineConfig } from "vitest/config";
>>>>>>> main

// Vitest configuration for the dashboard tests. Use jsdom and raise the
// testTimeout so CI/runner environments with slower transforms don't
// cause flakey failures.
export default defineConfig({
  test: {
<<<<<<< HEAD
    environment: 'jsdom',
    testTimeout: 20000,
=======
    environment: "jsdom",
>>>>>>> main
    globals: true,
    setupFiles: [],
  },
})
