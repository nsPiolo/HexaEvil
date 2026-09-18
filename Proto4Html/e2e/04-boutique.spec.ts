import { expect, test, type Page } from '@playwright/test'
import { hudMoney, openShop, placeBet, shopPanel, start } from './helpers'
import { SHOP_SEED, SHOP_SEED_EXPECT as E, SHOP_SLOTS, START_MONEY } from './seeds'

/** Pose un pari de 5 sur Homère et ouvre la boutique : la vitrine de la graine apparaît. */
async function openShopWithBet(page: Page) {
  await placeBet(page, { souls: [0], stake: 5 })
  await openShop(page)
  const shop = shopPanel(page)
  await expect(shop.getByRole('article')).toHaveCount(SHOP_SLOTS)
  return shop
}

const article = (shop: ReturnType<typeof shopPanel>, name: string) => shop.getByRole('article').filter({ hasText: name })

test.describe('04 · Écran Boutique (la vitrine à trois tentations)', () => {
  test('E2E-04-A : bandeau DANGER avec contrepartie en texte, vitrine triée du plus sûr au plus dangereux', async ({ page }) => {
    // 04/AC1
    await start(page, { seed: SHOP_SEED })
    const shop = await openShopWithBet(page)
    const banners = await shop.locator('.shop-risk').allInnerTexts()
    expect(banners.map((b) => b.trim().toLowerCase()), `Graine ${SHOP_SEED} : vitrine inattendue — re-chercher la graine (e2e/seeds.ts).`).toEqual(E.order.map((b) => b.toLowerCase()))
    const danger = article(shop, E.danger.name)
    await expect(danger.locator('.shop-risk')).toHaveText(/danger/i)
    await expect(danger.getByText(E.danger.warning)).toBeVisible()
    // La ligne « Impact : … » a été retirée des tuiles (elle doublait le bandeau de risque et
    // le texte de contrepartie). Le champ `impact` reste dans le catalogue et sert au calcul
    // du risque, c'est lui qui est vérifié par le bandeau ci-dessus.
    await expect(article(shop, E.die.name).locator('.shop-risk')).toHaveText(/sûr/i)
  })

  test('E2E-04-B : achat ≥ seuil en deux clics, « Confirmer 80 ¤ » entre les deux, retour à « Acheter » après 3 s', async ({ page }) => {
    // 04/AC3
    await start(page, { seed: SHOP_SEED, clock: true })
    const shop = await openShopWithBet(page)
    // Un objet sous le seuil s'achète en un clic (le dé demande ensuite sa cible ; on annule).
    await article(shop, E.die.name).getByRole('button', { name: 'Acheter' }).click()
    await expect(shop.getByText(`${E.die.name} — quel dé remplacer ?`)).toBeVisible()
    await shop.getByRole('button', { name: 'Annuler' }).click()
    const btn = article(shop, E.confirm.name).getByRole('button', { name: /Acheter|Confirmer/ })
    await expect(btn).toHaveText('Acheter')
    await btn.click()
    await expect(btn).toHaveText(`Confirmer ${E.confirm.price} ¤`)
    await expect(hudMoney(page)).toHaveText(`${START_MONEY - 5} Pièces`)
    // Sans second clic, le bouton retombe après le délai de confirmation.
    await page.clock.fastForward(3000)
    await expect(btn).toHaveText('Acheter')
    // Deux clics : achat.
    await btn.click()
    await expect(btn).toHaveText(`Confirmer ${E.confirm.price} ¤`)
    await btn.click()
    await expect(hudMoney(page)).toHaveText(`${START_MONEY - 5 - E.confirm.price} Pièces`)
    await expect(article(shop, E.confirm.name)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Inventaire' })).toContainText(E.confirm.name)
  })

  test('E2E-04-C : remplacement de dé — faces actuelles → nouvelles faces pour chaque option', async ({ page }) => {
    // 04/AC4
    await start(page, { seed: SHOP_SEED })
    const shop = await openShopWithBet(page)
    await article(shop, E.die.name).getByRole('button', { name: 'Acheter' }).click()
    await expect(shop.getByText('faces actuelles → nouvelles faces')).toBeVisible()
    const options = shop.locator('.shop-die')
    await expect(options).toHaveCount(2)
    for (const opt of await options.all()) {
      await expect(opt.locator('.shop-compare .shop-faces-preview').first()).toHaveText(/-1\s*\+1\s*\+2\s*\+3/)
      await expect(opt.locator('.shop-arrow')).toHaveText('→')
      await expect(opt.locator('.shop-faces-new')).toHaveText(new RegExp(E.die.faces.map((f) => f.replace('+', '\\+')).join('\\s*')))
      await expect(opt.getByRole('button', { name: 'Remplacer ce dé' })).toBeEnabled()
    }
    await options.first().getByRole('button', { name: 'Remplacer ce dé' }).click()
    await expect(hudMoney(page)).toHaveText(`${START_MONEY - 5 - E.die.price} Pièces`)
    await expect(page.getByRole('region', { name: 'Inventaire' })).toContainText(E.die.name)
  })

  test('E2E-04-D : un objet trop cher reste entièrement lisible, seul l’achat est désactivé', async ({ page }) => {
    // 04/AC5 — rien d'apporté : l'avance de 20 moins la mise de 5 laisse 15, tout est trop cher (le moins cher est à 30).
    await start(page, { seed: SHOP_SEED, money: 0 })
    const shop = await openShopWithBet(page)
    for (const art of await shop.getByRole('article').all()) {
      await expect(art.getByRole('heading')).toBeVisible()
      await expect(art.getByRole('button', { name: 'Acheter' })).toBeDisabled()
      await expect(art.locator('.shop-price')).toHaveText(/\d+ pièces/)
      await expect(art.locator('.shop-price')).toHaveClass(/shop-price-over/)
    }
    const die = article(shop, E.die.name)
    await expect(die.getByText(/Remplace un dé Distance/)).toBeVisible()
    await expect(die.locator('.shop-faces-preview .face')).toHaveCount(E.die.faces.length)
    await expect(die.locator('.shop-price')).toHaveText(`${E.die.price} pièces`)
  })
})
