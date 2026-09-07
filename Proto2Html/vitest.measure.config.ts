import { defineConfig } from 'vitest/config'

/**
 * Configuration dédiée aux instruments de mesure (§14, M4).
 * `npm run measure` — ces fichiers impriment des chiffres et n'assertent rien,
 * ils sont donc exclus de `npm test`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.manual.test.ts'],
    testTimeout: 900_000,
  },
})
