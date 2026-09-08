import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5182, open: true },
  test: {
    // Les `*.manual.test.ts` sont des instruments de mesure (GDD §14, M1) :
    // ils impriment des chiffres, n'assertent rien et prennent des minutes.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.manual.test.ts'],
  },
})
