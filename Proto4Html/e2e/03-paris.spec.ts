import { expect, test } from '@playwright/test'
import { betsPanel, hudMoney, placeBet, placedBets, playTurn, slot, start, startRace, token, tokenButton } from './helpers'
import { RACES_PER_CIRCLE, RACE_SEED, RACE_SEED_EXPECT } from './seeds'

const THRESHOLD_TEXT = 'A dépassé le seuil de pari'

test.describe('03 · Écran Paris (le ticket de guichet)', () => {
  test('E2E-03-A : ticket prêt → gain potentiel et solde après mise, recalculés à chaque changement', async ({ page }) => {
    // 03/AC1
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    await tokenButton(page, 1).click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByText('Gain potentiel : +24 ¤ (×2.2)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 80 ¤')).toBeVisible()
    await panel.getByRole('button', { name: '10', exact: true }).click()
    await expect(panel.getByText('Gain potentiel : +12 ¤ (×2.2)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 90 ¤')).toBeVisible()
    // Changer de type vide les âmes : le ticket disparaît, on redésigne et la cote suit.
    await panel.getByRole('button', { name: /^Top 3/ }).click()
    await expect(panel.getByText(/^Gain potentiel/)).toHaveCount(0)
    await tokenButton(page, 1).click()
    await expect(panel.getByText('Gain potentiel : +5 ¤ (×1.5)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 90 ¤')).toBeVisible()
  })

  test('E2E-03-B : Duel — deux jetons remplissent les slots dans l’ordre, re-clic retire, troisième sans effet', async ({ page }) => {
    // 03/AC2 — le Duel est un pari combiné : il demande le premier grade du stagiaire, gagné
    // à la fin du deuxième cercle. On se place donc au troisième (race = 2 cercles de courses).
    await start(page, { seed: RACE_SEED, race: 2 * RACES_PER_CIRCLE })
    const panel = betsPanel(page)
    await panel.getByRole('tab', { name: /^Combinés/ }).click()
    await panel.getByRole('button', { name: /^Duel/ }).click()
    await tokenButton(page, 0).click()
    await tokenButton(page, 2).click()
    await expect(slot(page, 'devant')).toContainText('Homère')
    await expect(slot(page, 'derrière')).toContainText('Aristote')
    await expect(token(page, 0)).toHaveAttribute('data-state', 'picked')
    await expect(token(page, 2)).toHaveAttribute('data-state', 'picked')
    // Une troisième âme n'est pas sélectionnable : le bouton est désactivé, la sélection ne change pas.
    await expect(tokenButton(page, 3)).toBeDisabled()
    await expect(panel.getByText('2/2')).toBeVisible()
    // Recliquer le premier jeton le retire : il reste Aristote, en tête.
    await tokenButton(page, 0).click()
    await expect(token(page, 0)).not.toHaveAttribute('data-state', 'picked')
    await page.mouse.move(2, 2)
    await expect(token(page, 0)).toHaveAttribute('data-state', 'idle')
    await expect(slot(page, 'devant')).toContainText('Aristote')
    await expect(panel.getByText('1/2')).toBeVisible()
  })

  test('E2E-03-C : une âme au-delà du seuil est refusée côté chips et côté jetons, même explication', async ({ page }) => {
    // 03/AC3 — graine : une âme entre dans la zone de fin après le tour 4, la course continue.
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [0], stake: 5 })
    await startRace(page)
    let zoneSoul: { id: number; name: string } | null = null
    for (let turn = 1; turn <= RACE_SEED_EXPECT.zoneTurn + 2 && zoneSoul === null; turn++) {
      await playTurn(page)
      for (let id = 0; id < 5; id++) {
        const cell = Number(await token(page, id).getAttribute('data-cell'))
        if (cell >= 9) zoneSoul = { id, name: (await token(page, id).getAttribute('data-soul')) ?? '' }
      }
    }
    expect(zoneSoul, `Graine ${RACE_SEED} : aucune âme n’a atteint la zone de fin dans les ${RACE_SEED_EXPECT.zoneTurn + 2} premiers tours — re-chercher la graine (e2e/seeds.ts).`).not.toBeNull()
    // Ouvrir le panneau de paris : les paris sont fermés, la raison est écrite.
    await page.getByTestId('tab-bets').click()
    const panel = betsPanel(page)
    await expect(panel.getByText(/a dépassé le seuil de 60 % : plus de pari/).first()).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Poser le pari' })).toBeDisabled()
    const chip = panel.locator('.bet-souls').getByRole('button', { name: new RegExp(`^${zoneSoul!.name}`) })
    await expect(chip).toBeDisabled()
    await expect(chip).toHaveAttribute('title', THRESHOLD_TEXT)
    await expect(chip).toContainText('60 %')
    const tok = token(page, zoneSoul!.id).locator('.token-body')
    await expect(tok).toHaveAttribute('title', new RegExp(THRESHOLD_TEXT))
  })

  test('E2E-03-D : « Retirer » rembourse la mise exacte en préparation, disparaît après le lancement', async ({ page }) => {
    // 03/AC4
    await start(page, { seed: RACE_SEED })
    await placeBet(page, { souls: [1], stake: 20 })
    await expect(hudMoney(page)).toHaveText('80 Pièces')
    const panel = betsPanel(page)
    await expect(panel.getByRole('button', { name: 'Retirer' })).toHaveCount(1)
    await panel.getByRole('button', { name: 'Retirer' }).click()
    await expect(hudMoney(page)).toHaveText('100 Pièces')
    // Plus aucun ticket : la liste disparaît au lieu d'afficher un état vide.
    await expect(panel.locator('#bp-placed')).toHaveCount(0)
    await placeBet(page, { souls: [1], stake: 20 })
    await startRace(page)
    await page.getByTestId('tab-bets').click()
    await expect(placedBets(page).filter({ hasText: 'Vainqueur pur' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Retirer' })).toHaveCount(0)
  })

  test('E2E-03-E : un pari verrouillé reste visible, désactivé, avec le grade en texte', async ({ page }) => {
    // 01/C3 · lisibilité. Deux états à couvrir, parce qu'ils ne se ressemblent pas :
    // un palier ENTIÈREMENT verrouillé (son onglet le dit et ne s'ouvre pas) et un palier
    // PARTIEL (l'onglet s'ouvre, le pari hors de portée reste lisible mais désactivé).
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    // Au départ, le stagiaire n'a aucun grade : les combinés comme les avancés sont fermés.
    for (const tier of ['Combinés', 'Avancés']) {
      const tab = panel.getByRole('tab', { name: new RegExp(`^${tier}`) })
      await expect(tab).toContainText('verrouillé')
      await expect(tab).toBeDisabled()
    }

    // Au quatrième cercle (grade Tourmenteur), le palier avancé s'entrouvre : « Vainqueur +
    // dernier » est ouvert, le « Podium exact » attend encore le grade suivant.
    await start(page, { seed: RACE_SEED, race: 3 * RACES_PER_CIRCLE })
    const later = betsPanel(page)
    await later.getByRole('tab', { name: /^Avancés/ }).click()
    const locked = later.getByRole('button', { name: /^Podium exact/ })
    await expect(locked).toBeVisible()
    await expect(locked).toBeDisabled()
    await expect(locked).toContainText('dès Contremaître')
    await expect(locked).toHaveAttribute('title', 'Ce pari s’ouvrira quand le stagiaire sera Contremaître.')
    await expect(later.getByRole('button', { name: /^Vainqueur \+ dernier/ })).toBeEnabled()
  })

  test('E2E-03-F : la mise se pose au clic comme au glisser-déposer, et le jeton trop cher est refusé', async ({ page }) => {
    // 03/AC1 · la zone de mise (jetons peints, logement de pierre)
    await start(page, { seed: RACE_SEED, money: 5 })
    const panel = betsPanel(page)
    const socket = panel.getByTestId('stake-socket')
    // Mise de départ : le premier palier est dans le logement, sa place sur le rebord est vide.
    await expect(socket).toContainText('5')
    await expect(panel.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true')
    // Solde 25 (5 + l'avance de 20) : 50 est hors de portée, donc ni cliquable ni déplaçable.
    const tooRich = panel.getByRole('button', { name: '50', exact: true })
    await expect(tooRich).toBeDisabled()
    await expect(tooRich).toHaveAttribute('title', 'Solde insuffisant (25 ¤)')
    // Au clic.
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(socket).toContainText('20')
    await expect(panel.getByRole('button', { name: '20', exact: true })).toHaveAttribute('aria-pressed', 'true')
    // Au glisser-déposer : le jeton 10 tombe dans le logement et remplace le 20.
    await panel.getByRole('button', { name: '10', exact: true }).dragTo(socket)
    await expect(socket).toContainText('10')
    await tokenButton(page, 1).click()
    await expect(panel.getByText('Solde après mise : 15 ¤')).toBeVisible()
    // Seule la mise maximum prend feu : le reste du temps le logement reste froid.
    await expect(socket.locator('.stake-flames')).toHaveCount(0)
  })

  /**
   * Au-delà du dernier cercle écrit (quinze), l'échelle passe en croissance géométrique et un
   * cinquième jeton apparaît : tout le solde d'un coup. C'est le seul jeton dont la valeur suit
   * la bourse, et la seule mise possible une fois qu'elle a dépassé les quatre paliers.
   */
  test('E2E-03-H : le jeton All-in n’existe qu’au-delà des cercles écrits, et vaut ce que le guichet accepte', async ({ page }) => {
    const WRITTEN = 15
    await start(page, { race: (WRITTEN - 1) * RACES_PER_CIRCLE, money: 5000 })
    await expect(betsPanel(page).locator('.stake-chip-allin')).toHaveCount(0)

    await start(page, { race: WRITTEN * RACES_PER_CIRCLE, money: 5000 })
    const panel = betsPanel(page)
    // L'échelle compose au lieu de suivre la droite : 40·80·160·400 au quinzième, ×1,35 au seizième.
    await expect(panel.locator('.stake-tray .stake-chip')).toHaveText(['', '110', '215', '540', 'All-in'])
    // 5000 de bourse plus l'avance du cercle : le jeton annonce la somme, il ne la cache pas.
    const allin = panel.locator('.stake-chip-allin')
    await expect(allin).toHaveAttribute('aria-label', 'All-in : 5320 ¤')
    await tokenButton(page, 0).click()
    await allin.click()
    await expect(panel.getByTestId('stake-socket')).toContainText('5320')
    await panel.getByRole('button', { name: 'Poser le pari' }).click()
    await expect(placedBets(page)).toHaveCount(1)
    await expect(placedBets(page).first()).toContainText('5320')
    // Bourse vide : le jeton s'éteint plutôt que de proposer une mise de zéro.
    await expect(allin).toBeDisabled()
    await expect(allin).toHaveAttribute('aria-label', 'Plus rien à miser')
  })

  test('E2E-03-G : seule la mise maximum enflamme le logement', async ({ page }) => {
    // 03/AC1 · le feu dit « tu joues gros », pas « tu as choisi »
    await start(page, { seed: RACE_SEED, money: 200 })
    const panel = betsPanel(page)
    const flames = panel.getByTestId('stake-socket').locator('.stake-flames')
    await expect(flames).toHaveCount(0)
    await panel.getByRole('button', { name: '50', exact: true }).click()
    await expect(flames).toBeVisible()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(flames).toHaveCount(0)
  })
})
