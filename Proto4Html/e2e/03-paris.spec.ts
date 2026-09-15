import { expect, test } from '@playwright/test'
import { betsPanel, hudMoney, placeBet, placedBets, playTurn, slot, start, startRace, token, tokenButton } from './helpers'
import { RACE_SEED, RACE_SEED_EXPECT } from './seeds'

const THRESHOLD_TEXT = 'A dépassé le seuil de pari'

test.describe('03 · Écran Paris (le ticket de guichet)', () => {
  test('E2E-03-A : ticket prêt → gain potentiel et solde après mise, recalculés à chaque changement', async ({ page }) => {
    // 03/AC1
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    await tokenButton(page, 1).click()
    await panel.getByRole('button', { name: '20', exact: true }).click()
    await expect(panel.getByText('Gain potentiel : +50 ¤ (×3.5)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 80 ¤')).toBeVisible()
    await panel.getByRole('button', { name: '10', exact: true }).click()
    await expect(panel.getByText('Gain potentiel : +25 ¤ (×3.5)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 90 ¤')).toBeVisible()
    // Changer de type vide les âmes ; on redésigne et la cote suit.
    await panel.getByRole('button', { name: /^Top 3/ }).click()
    await expect(panel.getByText(/Choisis encore 1 âme/)).toBeVisible()
    await tokenButton(page, 1).click()
    await expect(panel.getByText('Gain potentiel : +5 ¤ (×1.5)')).toBeVisible()
    await expect(panel.getByText('Solde après mise : 90 ¤')).toBeVisible()
  })

  test('E2E-03-B : Duel — deux jetons remplissent les slots dans l’ordre, re-clic retire, troisième sans effet', async ({ page }) => {
    // 03/AC2
    await start(page, { seed: RACE_SEED })
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
    await expect(panel.getByText('Aucun pari pour cette course.')).toBeVisible()
    await placeBet(page, { souls: [1], stake: 20 })
    await startRace(page)
    await page.getByTestId('tab-bets').click()
    await expect(placedBets(page).filter({ hasText: 'Vainqueur pur' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Retirer' })).toHaveCount(0)
  })

  test('E2E-03-E : un pari verrouillé reste visible, désactivé, avec le grade en texte', async ({ page }) => {
    // 01/C3 · lisibilité
    await start(page, { seed: RACE_SEED })
    const panel = betsPanel(page)
    await panel.getByRole('tab', { name: /^Combinés/ }).click()
    const locked = panel.getByRole('button', { name: /^Top 3 dans le désordre/ })
    await expect(locked).toBeVisible()
    await expect(locked).toBeDisabled()
    await expect(locked).toContainText('dès Assistant')
    await expect(locked).toHaveAttribute('title', 'Ce pari s’ouvrira quand le stagiaire sera Assistant.')
    // Le palier entièrement verrouillé l'écrit aussi.
    await expect(panel.getByRole('tab', { name: /^Avancés/ })).toContainText('verrouillé')
  })
})
