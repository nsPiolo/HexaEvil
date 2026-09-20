import { expect, test, type Page } from '@playwright/test'
import { board, cellOf, pairNaturally, phaseStrip, placeBet, playTurn, playerSlot, resolveTurn, rollDice, start, startRace, token } from './helpers'
import { RACE_SEED, RACE_SEED_EXPECT as E } from './seeds'

/** Pari minimal, course lancée, dés lancés : on est en appariement. */
async function toPairing(page: Page) {
  await start(page, { seed: RACE_SEED })
  await placeBet(page, { souls: [0], stake: 5 })
  await startRace(page)
  await rollDice(page)
}

test.describe('05 · Écran Course (association, file, prévisualisation)', () => {
  test('E2E-05-A : la file se manipule (× dissocie, → échange), à la souris puis au clavier', async ({ page }) => {
    // 05/AC1 — le proto a deux dés Distance : deux combinaisons au plus.
    await toPairing(page)
    await pairNaturally(page)
    const slot = playerSlot(page)
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(2)
    const names = async () => Promise.all([0, 1].map((i) => slot.getByTestId(`combo-${i}`).locator('.combo-soul').innerText()))
    const before = await names()
    // → sur la première : échange avec la suivante.
    await slot.getByTestId('combo-0').getByRole('button', { name: 'Résoudre plus tard' }).click()
    expect(await names()).toEqual([before[1], before[0]])
    // × sur la seconde : elle disparaît, ses dés redeviennent activables, la numérotation repart de 1.
    await slot.getByTestId('combo-1').getByRole('button', { name: 'Dissocier' }).click()
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(1)
    await expect(slot.getByTestId('combo-0').locator('.combo-n')).toHaveText('1')
    await expect(page.getByTestId(/^die-dist-\d+$/).locator(':scope:not(:disabled)')).toHaveCount(0) // aucun dé Âme sélectionné : les dés Distance attendent
    await expect(page.getByTestId(/^die-soul-\d+$/).locator(':scope:not(:disabled)')).toHaveCount(2)
    await expect(slot.getByRole('button', { name: 'Résoudre', exact: true })).toBeDisabled()

    // Au clavier : Tab jusqu'à un dé Âme libre, Entrée ; puis un dé Distance ; puis les commandes de la file.
    const freeSoul = page.getByTestId(/^die-soul-\d+$/).locator(':scope:not(:disabled)').first()
    await freeSoul.focus()
    await page.keyboard.press('Enter')
    const freeDist = page.getByTestId(/^die-dist-\d+$/).locator(':scope:not(:disabled)').first()
    await freeDist.focus()
    await page.keyboard.press('Enter')
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(2)
    await slot.getByTestId('combo-1').getByRole('button', { name: 'Résoudre plus tôt' }).focus()
    await page.keyboard.press('Enter')
    await slot.getByTestId('combo-1').getByRole('button', { name: 'Dissocier' }).focus()
    await page.keyboard.press('Enter')
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(1)
    await slot.getByRole('button', { name: 'Réinitialiser' }).click()
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(0)
  })

  test('E2E-05-B : le fantôme annonce la case exacte où l’âme finira', async ({ page }) => {
    // 05/AC2, 05/AC3 (test croisé prévisualisation ↔ déplacement réel, côté écran)
    await toPairing(page)
    await page.getByTestId('die-soul-0').click()
    await page.getByTestId('die-dist-0').click()
    const ghost = page.getByTestId('ghost-token-0')
    await expect(ghost).toBeVisible()
    const soulName = await ghost.getAttribute('data-soul')
    const cell = Number(await ghost.getAttribute('data-cell'))
    expect({ soulName, cell }, `Graine ${RACE_SEED} : premier déplacement inattendu — re-chercher la graine (e2e/seeds.ts).`).toEqual({ soulName: E.firstMove.soul, cell: E.firstMove.to })
    await expect(ghost).toHaveAttribute('title', new RegExp(`Prochain déplacement : ${soulName} .* → case ${cell}`))
    await expect(playerSlot(page).getByTestId('combo-0')).toContainText('Prévisualisation')
    const soulId = Number((await token(page, 0).page().locator(`[data-testid^="token-"][data-soul="${soulName}"]`).getAttribute('data-testid'))!.replace('token-', ''))
    expect(await cellOf(page, soulId)).not.toBe(cell)
    // Deuxième combinaison : elle a son fantôme elle aussi, et les deux se numérotent pour
    // dire dans quel ordre ils se joueront. Le second est calculé sur le plateau que laisse
    // le premier, pas sur celui d'avant.
    await page.getByTestId('die-soul-1').click()
    await page.getByTestId('die-dist-1').click()
    const ghosts = page.locator('[data-testid^="ghost-token-"]')
    await expect(ghosts).toHaveCount(2)
    await expect(ghosts.nth(0)).toHaveAttribute('title', /^Déplacement 1 : /)
    await expect(ghosts.nth(1)).toHaveAttribute('title', /^Déplacement 2 : /)
    await expect(playerSlot(page).getByTestId('combo-1')).toContainText('Prévisualisation')
    await resolveTurn(page)
    await expect(ghost).toHaveCount(0)
    await expect(ghosts).toHaveCount(0)
    expect(await cellOf(page, soulId)).toBe(cell)
  })

  test('E2E-05-C : la frise indique « ordonner » en appariement et « adversaire » pendant la paire adverse', async ({ page }) => {
    // 05/AC5
    await toPairing(page)
    await expect(phaseStrip(page)).toHaveAttribute('data-state', 'ordonner')
    await expect(phaseStrip(page).getByText('ordonner')).toHaveAttribute('aria-current', 'step')
    await pairNaturally(page)
    await playerSlot(page).getByRole('button', { name: 'Résoudre', exact: true }).click()
    // États transitoires (quelques centaines de ms à ×4) : on sonde toutes les 50 ms.
    const state = () => phaseStrip(page).getAttribute('data-state')
    await expect.poll(state, { intervals: [50], timeout: 10_000 }).toBe('résoudre')
    await expect.poll(state, { intervals: [50], timeout: 20_000 }).toBe('adversaire')
    await expect.poll(state, { intervals: [50], timeout: 20_000 }).toBe('lancer')
  })

  test('E2E-05-D : survoler un dé Âme allume le jeton correspondant, quitter l’éteint', async ({ page }) => {
    // 05/AC6
    await toPairing(page)
    const die = page.getByTestId('die-soul-2')
    const name = (await die.innerText()).trim()
    const tok = page.locator(`[data-testid^="token-"][data-soul="${name}"]`)
    await expect(tok).toHaveAttribute('data-state', 'idle')
    await die.hover()
    await expect(tok).toHaveAttribute('data-state', 'active')
    await page.mouse.move(2, 2)
    await expect(tok).toHaveAttribute('data-state', 'idle')
  })

  test('E2E-05-E : appariement complet et 5 s sans rien faire : « Résoudre » pulse ; une interaction l’arrête', async ({ page }) => {
    // 05/AC7 — à vitesse ×4, le délai est de 5000 / 4 ms.
    await start(page, { seed: RACE_SEED, clock: true })
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    await rollDice(page)
    await pairNaturally(page)
    const resolve = playerSlot(page).getByRole('button', { name: 'Résoudre', exact: true })
    await expect(resolve).toHaveAttribute('data-state', 'idle')
    await page.clock.fastForward(1300)
    await expect(resolve).toHaveAttribute('data-state', 'pulse')
    // Cliquer un dé (le dé Âme resté libre) réarme le délai.
    await page.getByTestId(/^die-soul-\d+$/).locator(':scope:not(:disabled)').first().click()
    await expect(resolve).toHaveAttribute('data-state', 'idle')
  })

  test('E2E-05-F : une collision est racontée en texte dans la ligne d’événement', async ({ page }) => {
    // lisibilité — graine : le joueur percute au tour 2.
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    for (let t = 1; t < E.collisionTurn; t++) await playTurn(page)
    await rollDice(page)
    await pairNaturally(page)
    await resolveTurn(page)
    // Chaque déplacement passe dans la ligne d'événement (aria-live), trop vite pour être lu à ×4 : le récapitulatif du tour garde tous les libellés.
    await page.getByRole('button', { name: '↺ dernier tour' }).click()
    const recap = page.getByRole('dialog', { name: 'Revoir le dernier tour' })
    await expect(recap.getByText(`Tour ${E.collisionTurn}`)).toBeVisible()
    await expect(recap.getByRole('listitem').filter({ hasText: /Percute .+ et saute devant|échange de place/ }), `Graine ${RACE_SEED} : aucune collision racontée au tour ${E.collisionTurn} — re-chercher la graine (e2e/seeds.ts).`).toHaveCount(1)
    await expect(page.locator('.last-event')).toContainText(/./)
  })

  test('E2E-05-G : glisser un dé Âme sur un dé Distance associe ; glisser une carte réordonne la file', async ({ page }) => {
    // recommandation §7.2 (associer et ordonner sont le même geste) — glisser-déposer natif, sans bibliothèque.
    await toPairing(page)
    const slot = playerSlot(page)
    const soul0 = page.getByTestId('die-soul-0')
    await expect(soul0).toHaveAttribute('draggable', 'true')
    await expect(soul0).toHaveAttribute('title', /Glisser sur un dé Distance/)
    await soul0.dragTo(page.getByTestId('die-dist-1'))
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(1)
    await expect(soul0).toBeDisabled()
    await expect(page.getByTestId('die-dist-1')).toBeDisabled()
    await expect(page.getByTestId('ghost-token-0')).toBeVisible()
    await page.getByTestId('die-soul-1').dragTo(page.getByTestId('die-dist-0'))
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(2)
    const names = async () => Promise.all([0, 1].map((i) => slot.getByTestId(`combo-${i}`).locator('.combo-soul').innerText()))
    const before = await names()
    await expect(slot.getByTestId('combo-1')).toHaveAttribute('draggable', 'true')
    await slot.getByTestId('combo-1').dragTo(slot.getByTestId('combo-0'))
    expect(await names()).toEqual([before[1], before[0]])
    // Le glisser-déposer laisse le clic-clic intact : dissocier puis ré-associer au clic.
    await slot.getByTestId('combo-0').getByRole('button', { name: 'Dissocier' }).click()
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(1)
    await page.getByTestId(/^die-soul-\d+$/).locator(':scope:not(:disabled)').first().click()
    await page.getByTestId(/^die-dist-\d+$/).locator(':scope:not(:disabled)').first().click()
    await expect(slot.getByTestId(/^combo-\d+$/)).toHaveCount(2)
    await expect(slot.getByRole('button', { name: 'Résoudre', exact: true })).toBeEnabled()
  })

  test('E2E-05-H : les paris posés vivent pendant la course, le seuil franchi s’écrit, le dernier tour se revoit', async ({ page }) => {
    // recommandations §4.3 (rappel des paris, zone de fin) et §4.7 (récapitulatif du dernier tour)
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    await expect(token(page, 0).getByLabel('Âme pariée')).toBeVisible()
    await expect(token(page, 1).getByLabel('Âme pariée')).toHaveCount(0)
    await startRace(page)
    await expect(page.getByRole('button', { name: '↺ dernier tour' })).toHaveCount(0)
    await playTurn(page)
    const live = playerSlot(page).getByRole('complementary', { name: 'Paris posés' }).getByRole('listitem').first()
    await expect(live.locator('.bet-live')).toHaveText(/^(en bonne voie|compromis) · provisoire$/)
    await expect(live).toHaveAttribute('data-live', /^(on-track|at-risk)$/)
    await page.getByRole('button', { name: '↺ dernier tour' }).click()
    const recap = page.getByRole('dialog', { name: 'Revoir le dernier tour' })
    await expect(recap).toBeVisible()
    await expect(recap.getByText('Tour 1')).toBeVisible()
    await expect(recap.getByRole('listitem')).toHaveCount(5) // lancer + 2 déplacements du joueur, lancer + déplacement adverses
    await expect(recap.getByText(/^Lancer : Distance/)).toBeVisible()
    await expect(recap.getByText(/^L'adversaire lance/)).toBeVisible()
    await recap.getByRole('button', { name: 'Fermer' }).click()
    for (let t = 2; t <= E.zoneTurn; t++) await playTurn(page)
    await expect(board(page).getByText(/60 % · plus de pari/)).toBeVisible()
  })
})
