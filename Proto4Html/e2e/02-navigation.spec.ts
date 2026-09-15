import { expect, test } from '@playwright/test'
import { autoToResults, betsPanel, board, phaseStrip, placeBet, rollDice, shopPanel, slot, start, startRace, tokenButton } from './helpers'
import { RACE_SEED, SHOP_SEED } from './seeds'

const EMPTY_STATE = 'Pose d’abord un pari, le stagiaire n’ouvre pas la caisse aux indécis.'

test.describe('02 · Navigation Pari ↔ Boutique', () => {
  test('E2E-02-A : la poignée repliée résume les paris : « Paris (2) · 30 ¤ misés »', async ({ page }) => {
    // 02/AC1
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [0], stake: 10 })
    await placeBet(page, { souls: [1], stake: 20 })
    await betsPanel(page).getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('tab-bets')).toHaveText('Paris (2) · 30 ¤ misés')
  })

  test('E2E-02-B : sans pari, la boutique s’ouvre sur l’état vide ; le premier pari fait apparaître la vitrine', async ({ page }) => {
    // 02/AC2
    await start(page, { seed: SHOP_SEED })
    await page.getByTestId('tab-shop').click()
    const shop = shopPanel(page)
    await expect(shop).toBeVisible()
    await expect(shop.getByText(EMPTY_STATE)).toBeVisible()
    await expect(shop.getByRole('button', { name: 'Aller aux paris' })).toBeVisible()
    await expect(shop.getByRole('article')).toHaveCount(0)
    // Le tiroir boutique recouvre le bord du plateau en écran large : on désigne l'âme par sa chip.
    await placeBet(page, { souls: [4], stake: 5, chips: true })
    await expect(shop.getByRole('article')).toHaveCount(4)
    await expect(shop.getByText(EMPTY_STATE)).toHaveCount(0)
  })

  test('E2E-02-C : le brouillon de ticket survit à l’aller-retour boutique', async ({ page }) => {
    // 02/AC3
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    await panel.getByRole('tab', { name: /^Combinés/ }).click()
    await panel.getByRole('button', { name: /^Duel/ }).click()
    await tokenButton(page, 0).click()
    await tokenButton(page, 2).click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByText('Solde après mise : 80 ¤')).toBeVisible()

    await page.getByTestId('tab-shop').click()
    await expect(shopPanel(page)).toBeVisible()
    await shopPanel(page).getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')

    await expect(panel.getByRole('button', { name: /^Duel/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(slot(page, 'devant')).toContainText('Homère')
    await expect(slot(page, 'derrière')).toContainText('Aristote')
    await expect(panel.getByText('Solde après mise : 80 ¤')).toBeVisible()
  })

  test('E2E-02-D : course lancée, plus d’onglet Boutique ; l’onglet Paris reste jusqu’à la fin', async ({ page }) => {
    // 02/AC4
    await start(page, { seed: RACE_SEED })
    await expect(page.getByTestId('tab-shop')).toBeVisible()
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    await expect(page.getByTestId('tab-shop')).toHaveCount(0)
    // Avant le lancer on peut encore parier : la poignée résume les mises ; dès les dés lancés, elle ne compte plus que les paris.
    await expect(page.getByTestId('tab-bets')).toHaveText('Paris (1) · 5 ¤ misés')
    await rollDice(page)
    await expect(page.getByTestId('tab-bets')).toHaveText('Paris (1)')
    await autoToResults(page)
    await expect(phaseStrip(page)).toHaveAttribute('data-state', 'none')
    await expect(page.getByTestId('tab-bets')).toHaveCount(0)
  })

  test('E2E-02-E : en écran étroit, un panneau replie l’autre et le plateau reste dans la fenêtre', async ({ page }) => {
    // 02/AC5
    await page.setViewportSize({ width: 1024, height: 768 })
    await start(page, { seed: RACE_SEED })
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
    await page.getByTestId('tab-shop').click()
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'closed')
    await shopPanel(page).getByRole('button', { name: 'Aller aux paris' }).click()
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')
    const box = await board(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(1024)
    expect(box!.y + box!.height).toBeLessThanOrEqual(768)
  })
})
