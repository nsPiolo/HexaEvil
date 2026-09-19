import { expect, test } from '@playwright/test'
import { autoToResults, betsPanel, gauge, gaugeValues, hud, hudMoney, openShop, placeBet, shopPanel, start } from './helpers'
import { ALLOWANCE, RACE_SEED, SHOP_SEED, SHOP_SEED_EXPECT, START_MONEY } from './seeds'

test.describe('01 · Jauge des trois usages', () => {
  test('E2E-01-A : la même jauge aux quatre endroits (HUD, paris, boutique, résultats)', async ({ page }) => {
    // 01/AC1
    await start(page, { seed: RACE_SEED })
    const hudGauge = gauge(hud(page))
    await expect(hudGauge).toBeVisible()
    await expect(hudGauge).toContainText(`${START_MONEY} / 150`)
    // L'avance du stagiaire est versée avant les paris et racontée sous le plateau.
    await expect(page.locator('.last-event')).toContainText(`Le stagiaire vous avance ${ALLOWANCE} pièces`)
    await expect(hudGauge).toContainText('solde')
    await expect(hudGauge).toContainText('prix du cercle')

    // Panneau de paris (ouvert au départ) : mêmes valeurs.
    expect(await gaugeValues(gauge(betsPanel(page)))).toBe(await gaugeValues(hudGauge))

    // Boutique (elle n'ouvre qu'après un premier pari) : mêmes valeurs, mises à jour de la mise.
    await placeBet(page, { souls: [0], stake: 5 })
    await openShop(page)
    await expect(shopPanel(page)).toBeVisible()
    expect(await gaugeValues(gauge(shopPanel(page)))).toBe(await gaugeValues(hudGauge))

    // Modale de résultats : mêmes valeurs qu'un HUD mis à jour après règlement.
    const dialog = await autoToResults(page)
    expect(await gaugeValues(gauge(dialog))).toBe(await gaugeValues(hudGauge))
  })

  test('E2E-01-B : à 87/150, « encore 63 ¤ à trouver » ; une mise de 20 fait passer à 67', async ({ page }) => {
    // 01/AC2 — 67 apportés + 20 d'avance = 87 à la table.
    await start(page, { seed: RACE_SEED, money: 87 - ALLOWANCE })
    const g = gauge(hud(page))
    await expect(g).toContainText('87 / 150')
    await expect(g).toContainText('encore 63 ¤ à trouver')
    await expect(g).toHaveAttribute('data-state', 'warn')
    await placeBet(page, { souls: [1], stake: 20 })
    await expect(g).toContainText('67 / 150')
    await expect(g).toContainText('encore 83 ¤ à trouver')
    await expect(gauge(betsPanel(page))).toContainText('67 / 150')
  })

  test('E2E-01-C : l’avertissement ne bloque rien, miser et acheter restent possibles', async ({ page }) => {
    // 01/AC4
    await start(page, { seed: SHOP_SEED, money: 87 - ALLOWANCE })
    const panel = betsPanel(page)
    await page.getByTestId('token-1').getByRole('button').click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Poser le pari' })).toBeEnabled()
    await panel.getByRole('button', { name: 'Poser le pari' }).click()
    await expect(hudMoney(page)).toHaveText('67 Pièces')
    await openShop(page)
    const shop = shopPanel(page)
    // À 67 pièces : le dé à 30 s'achète, l'objet à 85 non — solde réellement insuffisant.
    await expect(shop.getByRole('article').filter({ hasText: SHOP_SEED_EXPECT.die.name }).getByRole('button', { name: 'Acheter' })).toBeEnabled()
    await expect(shop.getByRole('article').filter({ hasText: SHOP_SEED_EXPECT.confirm.name }).getByRole('button', { name: 'Acheter' })).toBeDisabled()
  })
})
