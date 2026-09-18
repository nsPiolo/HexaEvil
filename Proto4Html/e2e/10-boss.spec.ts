import { expect, test } from '@playwright/test'
import { start } from './helpers'
import { RACES_PER_CIRCLE, RACE_SEED } from './seeds'

/**
 * Course du boss. Son pouvoir change les règles de cette course-là seulement, et il n'était
 * annoncé que sur la carte, deux écrans plus tôt : le joueur devait le retenir. Le bandeau le
 * garde sous les yeux pendant toute la course — c'est ce que ce fichier vérifie, ainsi que le
 * fait qu'il ne s'affiche pas quand il n'y a pas de boss.
 */
const BOSS_RACE = (circle: number): number => (circle - 1) * RACES_PER_CIRCLE + RACES_PER_CIRCLE - 1

test.describe('10 · Course du boss', () => {
  test('E2E-10-A : le bandeau nomme le boss et énonce son pouvoir, pendant toute sa course', async ({ page }) => {
    await start(page, { seed: RACE_SEED, race: BOSS_RACE(3) })
    const bar = page.getByTestId('boss-power')
    await expect(bar).toBeVisible()
    await expect(bar).toContainText('Cerbère')
    // Le texte est celui de la carte (config `power`), pas une reformulation.
    await expect(bar).toContainText('mordue')
    await expect(bar).toContainText('Actif sur cette course uniquement')
  })

  test('E2E-10-B : une course ordinaire n’a pas de bandeau', async ({ page }) => {
    await start(page, { seed: RACE_SEED, race: BOSS_RACE(3) - 1 })
    await expect(page.getByTestId('boss-power')).toHaveCount(0)
  })
})
