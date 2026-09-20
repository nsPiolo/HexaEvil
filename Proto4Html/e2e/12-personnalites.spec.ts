import { expect, test } from '@playwright/test'
import { autoToResults, board, openShop, placeBet, resultsDialog, shopPanel, start, token } from './helpers'
import { MASK_SEED, MASK_SEED_EXPECT as M, RACES_PER_CIRCLE, REVEAL_RACE_INDEX } from './seeds'

/**
 * Personnalités d'âmes (GDD §6.5). Deux chemins mènent une âme à en porter une : le masque
 * acheté en boutique, et la révélation de fin de première course à partir du cercle 3. Les
 * deux se vérifient au même endroit — le signe posé sur le jeton, qui est la seule chose que
 * le joueur regarde avant de parier.
 */
test.describe('12 · Personnalités des âmes', () => {
  test('E2E-12-A : un masque demande quelle âme marquer, et le signe apparaît sur son jeton', async ({ page }) => {
    await start(page, { seed: MASK_SEED, money: 200 })
    await placeBet(page, { souls: [0], stake: 5 })
    await openShop(page)
    const shop = shopPanel(page)
    const mask = shop.getByRole('article').filter({ hasText: M.name })
    await expect(mask.locator('.shop-kind')).toHaveText('Masque')
    await mask.getByRole('button', { name: /Acheter|Confirmer/ }).click()
    await expect(shop.getByText(`${M.name} — quelle âme marquer ?`)).toBeVisible()
    // Chaque âme de la course est proposée, et aucune ne porte encore quoi que ce soit.
    const souls = shop.locator('.shop-souls .shop-soul')
    await expect(souls).toHaveCount(M.souls)
    await expect(souls.first()).toContainText('sans personnalité')
    await souls.first().click()
    // La boutique masque la piste : on en sort pour voir le jeton.
    await shop.getByRole('button', { name: 'Retour aux paris' }).click()
    // Le jeton de l'âme marquée porte le signe, et sa bulle énonce la règle au survol.
    const marked = token(page, 0)
    await expect(marked.locator('.token-mark')).toHaveText(M.glyph)
    const tip = page.getByTestId('token-tip-0')
    await expect(tip).toBeHidden()
    await marked.getByRole('button').hover()
    await expect(tip).toBeVisible()
    await expect(tip).toContainText(M.personality)
    // Et la légende du plateau le redit, pour l'âme marquée seulement.
    await expect(board(page).locator('.legend .pmark')).toHaveCount(1)
  })

  test('E2E-12-B : à la fin de la première course du cercle 3, une âme révèle sa personnalité', async ({ page }) => {
    await start(page, { race: REVEAL_RACE_INDEX })
    // Pas de mise imposée : les jetons grandissent avec le cercle, celui du cercle 1 n'existe plus.
    await placeBet(page, { souls: [0] })
    const dialog = await autoToResults(page)
    // L'âme désignée est la mieux classée : la première ligne du classement, aucune n'étant marquée.
    const first = (await dialog.locator('.rank-name').first().innerText()).trim()
    await dialog.getByRole('button', { name: 'Continuer', exact: true }).click()
    const reveal = page.locator('.unlock-screen')
    await expect(reveal.getByRole('heading', { name: 'Une âme se découvre' })).toBeVisible()
    await expect(reveal).toContainText(first)
    // Le signe qu'on retrouvera sur le jeton, et le portrait du masque qui pose cette personnalité.
    await expect(reveal.locator('.reveal-glyph')).toBeVisible()
    await expect(reveal.locator('.reveal-art')).toBeVisible()
    // On repart sur la carte, la personnalité acquise pour le reste du run.
    await reveal.getByRole('button', { name: 'Continuer' }).click()
    await expect(resultsDialog(page)).toHaveCount(0)
  })

  test('E2E-12-C : avant le cercle 3, aucune âme n’est marquée', async ({ page }) => {
    await start(page, { race: RACES_PER_CIRCLE })
    await expect(board(page).locator('.token-mark')).toHaveCount(0)
  })
})
