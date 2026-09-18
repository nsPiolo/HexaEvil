import { expect, test } from '@playwright/test'
import { autoToResults, betsPanel, board, openShop, phaseStrip, placeBet, rollDice, shopPanel, slot, start, startRace, tokenButton } from './helpers'
import { RACES_PER_CIRCLE, RACE_SEED, SHOP_SEED, SHOP_SLOTS } from './seeds'

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

  test('E2E-02-B : sans pari, la boutique reste fermée à clé ; le premier pari l’ouvre sur sa vitrine', async ({ page }) => {
    // 02/AC2 — révisé : l'état vide du panneau n'est plus atteignable, c'est le bouton qui
    // refuse l'entrée. Le stagiaire n'ouvre toujours pas la caisse aux indécis, il le dit
    // simplement avant d'ouvrir la porte plutôt qu'après.
    await start(page, { seed: SHOP_SEED })
    const shopBtn = betsPanel(page).getByRole('button', { name: 'Boutique' })
    await expect(shopBtn).toBeDisabled()
    await expect(shopBtn).toHaveAttribute('title', /premier pari/)
    await placeBet(page, { souls: [4], stake: 5, chips: true })
    await expect(shopBtn).toBeEnabled()
    await openShop(page)
    const shop = shopPanel(page)
    await expect(shop.getByRole('article')).toHaveCount(SHOP_SLOTS)
    await expect(shop.getByText(EMPTY_STATE)).toHaveCount(0)
  })

  test('E2E-02-C : le brouillon de ticket survit à l’aller-retour boutique', async ({ page }) => {
    // 02/AC3 — le brouillon testé est un Duel, à deux emplacements : c'est celui qui a le plus
    // à perdre dans un aller-retour. Le Duel étant un pari combiné, il demande le premier grade
    // du stagiaire : on se place au troisième cercle, où les mises valent 10 · 20 · 40 · 100 et
    // l'avance 60 (40 apportés + 60 d'avance = 100 à la table).
    await start(page, { seed: RACE_SEED, race: 2 * RACES_PER_CIRCLE, money: 40 })
    const panel = betsPanel(page)
    // La boutique n'ouvre qu'après un premier pari posé : c'est lui qui déverrouille le bouton.
    // Le brouillon dont on teste la survie est le suivant, monté par-dessus.
    await placeBet(page, { souls: [4], stake: 10 })
    await panel.getByRole('tab', { name: /^Combinés/ }).click()
    await panel.getByRole('button', { name: /^Duel/ }).click()
    await tokenButton(page, 0).click()
    await tokenButton(page, 2).click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByText('Solde après mise : 70 ¤')).toBeVisible()

    await openShop(page)
    await expect(shopPanel(page)).toBeVisible()
    // La boutique masque les paris : sa croix doit les rouvrir, sinon l'écran resterait vide.
    await shopPanel(page).getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')

    await expect(panel.getByRole('button', { name: /^Duel/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(slot(page, 'devant')).toContainText('Homère')
    await expect(slot(page, 'derrière')).toContainText('Aristote')
    await expect(panel.getByText('Solde après mise : 70 ¤')).toBeVisible()
  })

  test('E2E-02-D : course lancée, plus d’accès à la boutique ; l’onglet Paris reste jusqu’à la fin', async ({ page }) => {
    // 02/AC4 — l'unique porte de la boutique est le bouton du pied du panneau de paris,
    // la poignée au-dessus de la piste a été retirée.
    await start(page, { seed: RACE_SEED })
    await expect(betsPanel(page).getByRole('button', { name: 'Boutique' })).toBeVisible()
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    await expect(betsPanel(page).getByRole('button', { name: 'Boutique' })).toHaveCount(0)
    // Avant le lancer on peut encore parier : la poignée résume les mises ; dès les dés lancés, elle ne compte plus que les paris.
    await expect(page.getByTestId('tab-bets')).toHaveText('Paris (1) · 5 ¤ misés')
    await rollDice(page)
    await expect(page.getByTestId('tab-bets')).toHaveText('Paris (1)')
    await autoToResults(page)
    await expect(phaseStrip(page)).toHaveAttribute('data-state', 'none')
    await expect(page.getByTestId('tab-bets')).toHaveCount(0)
  })

  test('E2E-02-E : la boutique ouverte masque piste et paris ; au retour le plateau est dans la fenêtre', async ({ page }) => {
    // 02/AC5
    await page.setViewportSize({ width: 1024, height: 768 })
    await start(page, { seed: RACE_SEED })
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
    await placeBet(page, { souls: [0], stake: 5 })  // sans pari posé, la boutique reste fermée
    await openShop(page)
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
    // Ouverture exclusive : la boutique est seule à l'écran, plateau et paris sont démontés.
    await expect(page.getByTestId('drawer-bets')).toHaveCount(0)
    await expect(board(page)).toHaveCount(0)
    // « Aller aux paris » appartenait à l'état vide, devenu injoignable : la vitrine étant
    // toujours garnie quand on entre, c'est « Retour aux paris » qui referme.
    await shopPanel(page).getByRole('button', { name: 'Retour aux paris' }).click()
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
