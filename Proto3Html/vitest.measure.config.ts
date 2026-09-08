import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.manual.test.ts'],
    testTimeout: 600_000,
  },
})
