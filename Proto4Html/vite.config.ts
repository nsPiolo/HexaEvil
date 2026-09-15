import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Sous Playwright (webServer), on n'ouvre pas d'onglet dans le navigateur de la machine.
  server: { port: 5183, open: !process.env.PLAYWRIGHT && !process.env.CI },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
