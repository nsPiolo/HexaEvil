import { expect, test } from '@playwright/test'
import { autoToResults, betsPanel, gauge, gaugeValues, hud, hudMoney, placeBet, shopPanel, start } from './helpers'
import { RACE_SEED, SHOP_SEED } from './seeds'

test.describe('01 · Jauge des trois usages', () => {
  test('E2E-01-A : la même jauge aux quatre endroits (HUD, paris, boutique, résultats)', async ({ page }) => {
    // 01/AC1
    await start(page, { seed: RACE_SEED })
    const hudGauge = gauge(hud(page))
    await expect(hudGauge).toBeVisible()
    await expect(hudGauge).toContainText('100 / 200')
    await expect(hudGauge).toContainText('solde')
    await expect(hudGauge).toContainText('prix du cercle')

    // Panneau de paris (ouvert au départ) : mêmes valeurs.
    expect(await gaugeValues(gauge(betsPanel(page)))).toBe(await gaugeValues(hudGauge))

    // Boutique (état vide sans pari, mais la jauge est là) : mêmes valeurs.
    await page.getByTestId('tab-shop').click()
    await expect(shopPanel(page)).toBeVisible()
    expect(await gaugeValues(gauge(shopPanel(page)))).toBe(await gaugeValues(hudGauge))

    // Modale de résultats : mêmes valeurs qu'un HUD mis à jour après règlement.
    const dialog = await autoToResults(page)
    expect(await gaugeValues(gauge(dialog))).toBe(await gaugeValues(hudGauge))
  })

  test('E2E-01-B : à 87/200, « encore 113 ¤ à trouver » ; une mise de 20 fait passer à 67', async ({ page }) => {
    // 01/AC2
    await start(page, { seed: RACE_SEED, money: 87 })
    const g = gauge(hud(page))
    await expect(g).toContainText('87 / 200')
    await expect(g).toContainText('encore 113 ¤ à trouver')
    await expect(g).toHaveAttribute('data-state', 'warn')
    await placeBet(page, { souls: [1], stake: 20 })
    await expect(g).toContainText('67 / 200')
    await expect(g).toContainText('encore 133 ¤ à trouver')
    await expect(gauge(betsPanel(page))).toContainText('67 / 200')
  })

  test('E2E-01-C : l’avertissement ne bloque rien, miser et acheter restent possibles', async ({ page }) => {
    // 01/AC4
    await start(page, { seed: SHOP_SEED, money: 87 })
    const panel = betsPanel(page)
    await page.getByTestId('token-1').getByRole('button').click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Poser le pari' })).toBeEnabled()
    await panel.getByRole('button', { name: 'Poser le pari' }).click()
    await expect(hudMoney(page)).toHaveText('67 Pièces')
    await page.getByTestId('tab-shop').click()
    const shop = shopPanel(page)
    // À 67 pièces : le Dé des Limbes (30) s'achète, l'Œil du parieur (80) non — solde réellement insuffisant.
    await expect(shop.getByRole('article').filter({ hasText: 'Dé des Limbes' }).getByRole('button', { name: 'Acheter' })).toBeEnabled()
    await expect(shop.getByRole('article').filter({ hasText: 'Œil du parieur' }).getByRole('button', { name: 'Acheter' })).toBeDisabled()
  })
})
