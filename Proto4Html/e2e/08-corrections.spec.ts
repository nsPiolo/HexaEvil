import { expect, test, type Locator, type Page } from '@playwright/test'
import { betsPanel, board, hud, hudMoney, openShop, pairNaturally, placeBet, rollDice, shopPanel, slot, start, startRace, token, tokenButton } from './helpers'
import { CUMUL_SEED, RACE_SEED, SHOP_SEED, START_MONEY } from './seeds'

type Box = { x: number; y: number; width: number; height: number }
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
async function boxOf(l: Locator): Promise<Box> {
  const b = await l.boundingBox()
  expect(b, `élément sans boîte : ${String(l)}`).not.toBeNull()
  return b!
}
/** Contraste WCAG entre deux couleurs CSS `rgb(r, g, b)`. */
function contrast(fg: string, bg: string): number {
  const lum = (css: string): number => {
    const [r, g, b] = css.match(/\d+/g)!.map(Number).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a)
  return (l1! + 0.05) / (l2! + 0.05)
}

/** Les blocs de la rangée haute et la zone haute de la table : aucun ne recouvre un autre, tous dans la fenêtre. */
async function expectHudClear(page: Page, width: number): Promise<void> {
  const items = [page.getByTestId('hud-left'), page.getByTestId('steps'), page.getByTestId('hud-right'), page.getByTestId('drawer-shop')]
  const boxes = await Promise.all(items.map(boxOf))
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i]!.x, `bloc ${i} hors fenêtre à gauche`).toBeGreaterThanOrEqual(0)
    expect(boxes[i]!.x + boxes[i]!.width, `bloc ${i} hors fenêtre à droite`).toBeLessThanOrEqual(width + 1)
    for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i]!, boxes[j]!), `chevauchement entre les blocs ${i} et ${j}`).toBe(false)
  }
  // Les quatre étapes du fil d'Ariane sont visibles.
  await expect(page.getByTestId('steps').getByRole('listitem')).toHaveCount(4)
  for (const s of await page.getByTestId('steps').getByRole('listitem').all()) await expect(s).toBeVisible()
}

test.describe('08 · Corrections post-test', () => {
  for (const [width, height] of [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]] as const) {
    test(`C1 · rangée HUD sans chevauchement à ${width}×${height}, quel que soit l’état des panneaux`, async ({ page }) => {
      // 08/C1
      await page.setViewportSize({ width, height })
      await start(page, { seed: RACE_SEED })
      await expectHudClear(page, width) // paris ouverts
      await placeBet(page, { souls: [0], stake: 5 })  // déverrouille la boutique
      await openShop(page)
      await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
      await expectHudClear(page, width) // boutique seule à l'écran
      // La boutique masque le reste : on en sort par sa croix, qui ramène aux paris.
      await shopPanel(page).getByRole('button', { name: 'Fermer' }).click()
      await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
      await expectHudClear(page, width) // paris seuls
      await betsPanel(page).getByRole('button', { name: 'Fermer' }).click()
      await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'closed')
      await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')
      await expectHudClear(page, width) // aucun
    })
  }

  test('C2 · panneau de paris ouvert : les 17 colonnes et tous les jetons restent visibles en pleine largeur', async ({ page }) => {
    // 08/C2
    await start(page, { seed: RACE_SEED })
    const heads = board(page).locator('.cells-head .cell')
    await expect(heads).toHaveCount(17)
    for (const h of await heads.all()) {
      const b = await boxOf(h)
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(1440)
    }
    for (let id = 0; id < 5; id++) await expect(token(page, id).locator('.token-body')).toBeVisible()
    const panel = await boxOf(betsPanel(page))
    const track = await boxOf(board(page))
    expect(panel.y, 'le panneau de paris est sous le plateau, pas dessus').toBeGreaterThanOrEqual(track.y + track.height)
    expect(panel.width).toBeGreaterThan(1200)
    // En course aussi : le panneau rouvert prend la zone des dés, jamais le plateau.
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    await page.getByTestId('tab-bets').click()
    const panel2 = await boxOf(betsPanel(page))
    const track2 = await boxOf(board(page))
    expect(panel2.y).toBeGreaterThanOrEqual(track2.y + track2.height)
    await expect(heads.last()).toBeVisible()
  })

  test('C2 · la boutique s’ouvre seule : ni piste ni paris derrière, et les boutons croisés font l’aller-retour', async ({ page }) => {
    // 08/C2 — révisé : la cohabitation des deux panneaux a été remplacée par l'ouverture
    // exclusive, pour que l'achat soit un moment à part et non une troisième chose à lire.
    await start(page, { seed: SHOP_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    const track = await boxOf(board(page))
    expect(track.height).toBeGreaterThan(150)
    await openShop(page)
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
    await expect(board(page)).toHaveCount(0)
    await expect(page.getByTestId('drawer-bets')).toHaveCount(0)
    // Les boutons croisés basculent en un clic, dans les deux sens.
    await shopPanel(page).getByRole('button', { name: 'Retour aux paris' }).click()
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')
    await expect(board(page)).toHaveCount(1)
    await betsPanel(page).getByRole('button', { name: 'Boutique' }).click()
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
    await expect(board(page)).toHaveCount(0)
  })

  test('C2 · au cercle 6 (4 couloirs), la boutique masque aussi tout le reste', async ({ page }) => {
    // 08/C2 — course d'index 15 = cercle 6, course 1. La règle ne dépend plus du nombre de
    // couloirs ni de la hauteur de fenêtre : l'ouverture est exclusive partout.
    await start(page, { seed: RACE_SEED, race: 15 })
    await expect(board(page).locator('.legend li')).toHaveCount(8)
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
    await placeBet(page, { souls: [0] })  // déverrouille la boutique ; mise par défaut : au cercle 6 les jetons ont grandi, « 5 » n’existe plus
    await openShop(page)
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'open')
    await expect(page.getByTestId('drawer-bets')).toHaveCount(0)
    await shopPanel(page).getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByTestId('drawer-bets')).toHaveAttribute('data-state', 'open')
    await expect(page.getByTestId('drawer-shop')).toHaveAttribute('data-state', 'closed')
  })

  test('C3 · deux dés sur la même âme : une seule carte fusionnée, prévisualisation du total, × rend tous les dés', async ({ page }) => {
    // 08/C3 — graine : trois dés Âme sur Virgile, distances +2 et −1.
    await start(page, { seed: CUMUL_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    await rollDice(page)
    await page.getByTestId('die-soul-0').click()
    await page.getByTestId('die-dist-0').click()
    await page.getByTestId('die-soul-1').click()
    await page.getByTestId('die-dist-1').click()
    const cards = page.getByTestId(/^combo-\d+$/)
    await expect(cards, `Graine ${CUMUL_SEED} : le lancer attendu (Virgile ×3, +2 / −1) a changé — re-chercher la graine (e2e/seeds.ts).`).toHaveCount(1)
    const card = page.getByTestId('combo-0')
    await expect(card).toHaveAttribute('data-parts', '2')
    await expect(card.locator('.combo-soul')).toHaveText('Virgile')
    await expect(card.locator('.combo-dist')).toHaveText('+1')
    await expect(card.locator('.combo-parts .face')).toHaveText(['+2', '−1'])
    await expect(page.getByText(/cumulé/)).toHaveCount(0)
    // Prévisualisation du déplacement total : Virgile 0 → 1.
    const ghost = page.getByTestId('ghost-token')
    await expect(ghost).toHaveAttribute('data-soul', 'Virgile')
    await expect(ghost).toHaveAttribute('data-cell', '1')
    // Les badges d'ordre ne comptent que la carte visible : tous à 1.
    for (const id of ['die-soul-0', 'die-soul-1', 'die-dist-0', 'die-dist-1']) await expect(page.getByTestId(id).locator('.die-order')).toHaveText('1')
    await card.getByRole('button', { name: 'Dissocier' }).click()
    await expect(cards).toHaveCount(0)
    await expect(page.getByTestId(/^die-soul-\d+$/).locator(':scope:not(:disabled)')).toHaveCount(3)
    await expect(ghost).toHaveCount(0)
  })

  test('C4 · poser un pari se voit : la liste apparaît au premier ticket, sans défilement', async ({ page }) => {
    // 08/C4 — à 1440×900, sans défilement.
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    const list = panel.locator('#bp-placed')
    // Le compteur repliable « Paris posés (n) » a été retiré : à zéro pari il n'y avait rien à
    // replier, et il répétait une information que la liste porte déjà. Ce qui atteste la pose
    // est donc la liste elle-même, qui n'existe qu'à partir du premier ticket.
    await expect(list).toHaveCount(0)
    await placeBet(page, { souls: [1], stake: 20 })
    await expect(list).toBeVisible()
    await expect(list.getByRole('listitem')).toHaveCount(1)
    const b = await boxOf(list)
    expect(b.y + b.height, 'visible sans défilement').toBeLessThanOrEqual(900)
    // Un deuxième ticket s'ajoute à la suite, la liste reste ouverte.
    await placeBet(page, { souls: [2], stake: 20 })
    await expect(list.getByRole('listitem')).toHaveCount(2)
  })

  test('C5 · le slot d’âme rempli est aussi lisible que la chip sélectionnée', async ({ page }) => {
    // 08/C5
    await start(page, { seed: RACE_SEED })
    await tokenButton(page, 1).click()
    const filled = slot(page, 'Virgile')
    await expect(filled).toContainText('Virgile')
    const name = filled.locator('.bet-slot-name')
    const chip = betsPanel(page).locator('.bet-souls').getByRole('button', { name: /^Virgile/ })
    const style = (l: Locator) => l.evaluate((el) => ({ color: getComputedStyle(el).color, size: parseFloat(getComputedStyle(el).fontSize) }))
    const [s, c] = await Promise.all([style(name), style(chip)])
    expect(contrast(s.color, 'rgb(46, 36, 33)')).toBeGreaterThanOrEqual(contrast(c.color, 'rgb(46, 36, 33)') - 0.01)
    expect(s.size).toBeGreaterThanOrEqual(c.size)
    await expect(filled.locator('.lane-dot')).toBeVisible()
    await expect(betsPanel(page).locator('.bet-slots').getByRole('button')).toHaveCount(1)
  })

  test('C7 · les cinq jetons du départ sont identifiables ; le survol de la légende fait ressortir un jeton enfoui', async ({ page }) => {
    // 08/C7
    await start(page, { seed: RACE_SEED })
    for (let id = 0; id < 5; id++) {
      const body = token(page, id).locator('.token-body')
      await expect(body).toBeVisible()
      await expect(body).toHaveText(/^\S{2}$/)
    }
    // Deux jetons voisins de la pile ne se recouvrent pas de plus de la moitié.
    const a = await boxOf(token(page, 0).locator('.token-body'))
    const b = await boxOf(token(page, 1).locator('.token-body'))
    expect(Math.abs(b.y - a.y)).toBeGreaterThanOrEqual(a.height / 2)
    // Survol de la légende : le jeton s'allume et passe devant.
    await board(page).locator('.legend li').filter({ hasText: 'Aristote' }).hover()
    await expect(token(page, 2)).toHaveAttribute('data-state', 'active')
    const z = await token(page, 2).evaluate((el) => getComputedStyle(el).zIndex)
    expect(Number(z)).toBeGreaterThanOrEqual(2)
  })

  test('C8 · les quatre étapes du fil d’Ariane sont lisibles (contraste AA), la courante mise en avant', async ({ page }) => {
    // 08/C8
    await start(page, { seed: RACE_SEED })
    const steps = page.getByTestId('steps').getByRole('listitem')
    for (const s of await steps.all()) {
      const { color, bg } = await s.evaluate((el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
      expect(contrast(color, bg), `étape « ${await s.innerText()} »`).toBeGreaterThanOrEqual(4.5)
    }
    await expect(steps.filter({ hasText: 'PARI' })).toHaveAttribute('aria-current', 'step')
  })

  test('C9 · la jauge du HUD s’estompe quand un panneau montre la sienne', async ({ page }) => {
    // 08/C9
    await start(page, { seed: RACE_SEED })
    const g = hud(page).getByTestId('money-gauge')
    const opacity = () => g.evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    await expect.poll(opacity).toBeLessThan(0.6)
    await expect(g).toContainText(`${START_MONEY} / 150`)
    await betsPanel(page).getByRole('button', { name: 'Fermer' }).click()
    await expect.poll(opacity).toBe(1)
  })

  test('C10 · la zone adverse n’est qu’une ligne hors de son tour et reprend sa hauteur avec la paire', async ({ page }) => {
    // 08/C10
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    const opp = page.getByRole('region', { name: 'Adversaire' })
    await expect(opp).toHaveAttribute('data-state', 'thin')
    expect((await boxOf(opp)).height).toBeLessThan(50)
    // Pendant la paire adverse (quelques centaines de ms à ×4) : pleine hauteur, dés visibles.
    await rollDice(page)
    await pairNaturally(page)
    await page.getByRole('region', { name: 'Joueur' }).getByRole('button', { name: 'Résoudre', exact: true }).click()
    await expect.poll(() => opp.getAttribute('data-state'), { intervals: [50], timeout: 20_000 }).toBe('full')
    await expect.poll(async () => (await boxOf(opp)).height, { intervals: [50] }).toBeGreaterThanOrEqual(80)
    await expect(page.getByTestId('phase-strip')).toHaveAttribute('data-state', /^(lancer|none)$/, { timeout: 30_000 })
    await expect(opp).toHaveAttribute('data-state', 'thin')
    await expect(hudMoney(page)).toHaveText(/Pièces$/)
  })
})
