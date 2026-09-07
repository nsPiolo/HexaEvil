import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5181, open: true },
  test: {
    // Les `*.manual.test.ts` sont des instruments de mesure (§14, M4) : ils
    // impriment des chiffres, n'assertent rien et prennent des minutes.
    // `npm run measure` les lance explicitement.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.manual.test.ts'],
  },
})
