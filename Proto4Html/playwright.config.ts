/**
 * Tests de bout en bout (docs/proto4/specs/07-tests-e2e-playwright.md) : ils vérifient ce que
 * le joueur voit, lit et manipule. Les règles de course restent couvertes par Vitest.
 *
 * Navigateur : Chromium. Si `PLAYWRIGHT_BROWSERS_PATH` est défini, Playwright s'en sert ;
 * sinon on utilise le Chromium téléchargé par Playwright s'il est présent, et à défaut le
 * Google Chrome installé sur la machine (`channel: 'chrome'`). Aucun téléchargement n'est
 * exigé par le flux de test.
 */
import { defineConfig, devices } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function bundledChromiumPresent(): boolean {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return true
  const roots = [join(homedir(), 'Library', 'Caches', 'ms-playwright'), join(homedir(), '.cache', 'ms-playwright'), join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')]
  return roots.some((r) => existsSync(r) && readdirSync(r).some((d) => d.startsWith('chromium')))
}

const explicitPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
const launch = explicitPath ? { executablePath: explicitPath } : bundledChromiumPresent() ? {} : { channel: 'chrome' as const }

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5183',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    ...launch,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'npm run dev',
    port: 5183,
    reuseExistingServer: true,
    env: { PLAYWRIGHT: '1' },
    timeout: 60_000,
  },
})
