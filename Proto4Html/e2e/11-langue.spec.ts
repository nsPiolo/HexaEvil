/**
 * La langue anglaise, de bout en bout : `?lang=en` doit servir l'anglais partout, y compris
 * dans ce qui vient de la configuration (âmes, cercles, boss, objets), et le choix fait dans
 * les options doit tenir d'un écran à l'autre et d'une session à l'autre.
 *
 * Le reste de la suite lit le français : c'est la langue par défaut, et rien ici ne doit la
 * déplacer.
 */
import { expect, test } from '@playwright/test'
import { betsPanel, hud, start, tokenButton } from './helpers'

/** Panneau de paris en anglais : les helpers communs visent les libellés français. */
const enBets = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Bets', exact: true })

test.describe('11 · Langue', () => {
  test('E2E-11-A : ?lang=en met l’écran de jeu en anglais, noms d’âmes compris', async ({ page }) => {
    await page.goto('/?e2e=1&seed=1&lang=en')
    await expect(page.getByRole('main')).toBeVisible()

    // HUD et panneaux : ils viennent du lexique.
    await expect(hud(page).getByText(/^\d+ Coins$/)).toBeVisible()
    await expect(enBets(page)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Race board' })).toBeVisible()

    // Les noms d'âmes viennent de la configuration : ils passent par `config/i18n/en.json`.
    await expect(enBets(page).getByText('Virgil', { exact: true })).toBeVisible()
    await expect(enBets(page).getByText('Homère', { exact: true })).toHaveCount(0)

    // Le journal est écrit dans la langue du moment : le HUD en affiche la dernière ligne,
    // ici l'avance versée avant les paris.
    await expect(page.getByText(/^The intern advances you \d+ coins for this race/)).toBeVisible()
    // Et les types de pari, qui viennent du noyau par leurs ids.
    await expect(enBets(page).getByRole('button', { name: /^Outright winner/ })).toBeVisible()
  })

  test('E2E-11-B : le français reste la langue par défaut, sans paramètre', async ({ page }) => {
    await start(page, { seed: 1 })
    await expect(hud(page).getByText(/^\d+ Pièces$/)).toBeVisible()
    await expect(betsPanel(page)).toBeVisible()
    await expect(betsPanel(page).getByText('Virgile', { exact: true })).toBeVisible()
    await expect(page.getByText(/^Le stagiaire vous avance \d+ pièces pour cette course/)).toBeVisible()
  })

  test('E2E-11-C : le choix des options bascule l’interface et survit au rechargement', async ({ page }) => {
    await page.goto('/')
    const options = page.getByRole('button', { name: 'Option', exact: true })
    // L'écran de chargement dure cinq secondes avant de céder la place au menu.
    await expect(options).toBeVisible({ timeout: 15000 })
    await options.click()

    await expect(page.getByRole('heading', { name: 'Option', exact: true })).toBeVisible()
    await page.getByRole('combobox').selectOption('en')
    // La bascule est immédiate : l'écran ouvert se réécrit sans rechargement.
    await expect(page.getByRole('heading', { name: 'Options', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '← Back' }).click()
    await expect(page.getByRole('button', { name: 'Start a new escape' })).toBeVisible()

    // Le choix est enregistré : un rechargement sans paramètre revient en anglais.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Start a new escape' })).toBeVisible({ timeout: 15000 })
  })

  test('E2E-11-D : la boutique nomme ses objets en anglais', async ({ page }) => {
    await page.goto('/?e2e=1&seed=1&money=500&lang=en')
    await expect(page.getByRole('main')).toBeVisible()

    // Le guichet n'ouvre qu'après un premier pari : une âme, une mise, le ticket.
    await tokenButton(page, 0).click()
    await enBets(page).getByRole('button', { name: '10', exact: true }).click()
    await enBets(page).getByRole('button', { name: 'Place the bet' }).click()
    await enBets(page).getByRole('button', { name: 'Shop', exact: true }).click()

    const shop = page.getByRole('region', { name: 'Shop', exact: true })
    await expect(shop).toBeVisible()
    await expect(shop.getByRole('article').first()).toBeVisible()
    // Les cartes viennent de `config/shop.json` traduit : plus un bouton ni une rareté en français.
    await expect(shop.getByText(/Acheter|Confirmer|commun|légendaire/)).toHaveCount(0)
    await expect(shop.getByRole('button', { name: /^(Buy|Confirm)/ }).first()).toBeVisible()
  })
})
