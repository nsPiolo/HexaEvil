import { expect, test } from '@playwright/test'
import { autoToResults, gauge, hud, placeBet, resultsDialog, start } from './helpers'
import { RACE_SEED, RACE_SEED_EXPECT as E, TIE_RACE_INDEX, TIE_SEED } from './seeds'

const TIE_TEXT = 'départage : même colonne, le couloir le plus bas devant'

test.describe('06 · Résultats et gains', () => {
  test('E2E-06-A : les tickets se révèlent un à un avec le compteur ; un clic révèle tout ; pas de rejeu à la réouverture', async ({ page }) => {
    // 06/AC1 — à vitesse ×1 : la modale s'ouvre 700 ms après la fin, puis un ticket toutes les 500 ms après la cascade (600 ms).
    // On lit les états dans l'ordre (chaque assertion attend l'état suivant) : c'est la séquence qui est vérifiée.
    await start(page, { seed: RACE_SEED, speed: 1 })
    await placeBet(page, { souls: [0], stake: 5 })
    await placeBet(page, { souls: [1], stake: 5, type: 'Top 3' })
    await placeBet(page, { souls: [2], stake: 5, type: 'Dernière place' })
    await hud(page).getByRole('button', { name: 'auto' }).click()
    const dialog = resultsDialog(page)
    await expect(dialog).toBeVisible({ timeout: 180_000 })
    const tickets = [0, 1, 2].map((i) => dialog.getByTestId(`bet-ticket-${i}`))
    for (const t of tickets) await expect(t).toHaveAttribute('data-state', 'hidden')
    await expect(dialog.getByText('Net de la course : +0 ¤')).toBeVisible()
    await expect(dialog.getByRole('list').last().getByText('?')).toHaveCount(3)

    // Le premier ticket se retourne, les deux autres sont encore masqués ; le compteur a bougé.
    await expect(tickets[0]!).toHaveAttribute('data-state', /^(won|lost)$/)
    await expect(tickets[1]!).toHaveAttribute('data-state', 'hidden')
    await expect(tickets[2]!).toHaveAttribute('data-state', 'hidden')
    expect(await dialog.locator('.settlement-net').innerText()).not.toBe('Net de la course : +0 ¤')
    await expect(tickets[1]!).toHaveAttribute('data-state', /^(won|lost)$/)
    await expect(tickets[2]!).toHaveAttribute('data-state', 'hidden')

    // Un clic dans la modale révèle tout, immédiatement.
    await dialog.getByRole('heading', { name: 'Classement final' }).click()
    for (const t of tickets) await expect(t).toHaveAttribute('data-state', /^(won|lost)$/)
    // 06-D : chaque ticket énonce son état et son net en texte.
    const nets: number[] = []
    for (const t of tickets) {
      const status = await t.locator('.bet-status').innerText()
      expect(status).toMatch(/^(gagné \+\d+|perdu −\d+)$/)
      nets.push(status.startsWith('gagné') ? Number(status.replace('gagné +', '')) : -Number(status.replace('perdu −', '')))
    }
    const total = nets.reduce((s, n) => s + n, 0)
    await expect(dialog.getByText(`Net de la course : ${total >= 0 ? '+' : '−'}${Math.abs(total)} ¤`)).toBeVisible()

    // Fermer, rouvrir : tout est révélé d'emblée, la séquence ne rejoue pas.
    await dialog.getByRole('button', { name: 'Voir la table' }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByTestId('tab-results').click()
    await expect(dialog).toBeVisible()
    for (const t of [0, 1, 2].map((i) => dialog.getByTestId(`bet-ticket-${i}`))) await expect(t).toHaveAttribute('data-state', /^(won|lost)$/)
  })

  test('E2E-06-B : la jauge de la modale dit exactement ce qui manque et en combien de courses', async ({ page }) => {
    // 06/AC3 — 80 + 20 d'avance, pari auto « Vainqueur pur · Homère » gagné : 113 pièces après la 1re course du cercle.
    await start(page, { seed: RACE_SEED })
    const dialog = await autoToResults(page)
    const g = gauge(dialog)
    await expect(g, `Graine ${RACE_SEED} : solde final inattendu — re-chercher la graine (e2e/seeds.ts).`).toContainText(`${E.finalMoney} / 150`)
    await expect(g).toContainText(`encore ${E.missing} ¤ à trouver en 2 courses`)
    await expect(g).toHaveAttribute('data-state', 'warn')
  })

  test('E2E-06-C : le départage entre deux âmes de la même colonne est énoncé, une seule fois', async ({ page }) => {
    // 06/AC4 — cercle 2 (deux couloirs), graine figée.
    await start(page, { seed: TIE_SEED, race: TIE_RACE_INDEX })
    const dialog = await autoToResults(page)
    const ranks = dialog.getByRole('list').first().getByRole('listitem')
    await expect(ranks.filter({ hasText: /couloir \d/ }).first()).toBeVisible()
    const tie = dialog.getByText(TIE_TEXT)
    await expect(tie, `Graine ${TIE_SEED} (course ${TIE_RACE_INDEX}) : pas exactement une ligne de départage — re-chercher la graine (e2e/seeds.ts).`).toHaveCount(1)
    // La ligne est entre deux rangs de même colonne.
    const items = await ranks.allInnerTexts()
    const k = items.findIndex((t) => t.includes(TIE_TEXT))
    const caseOf = (t: string): string | undefined => t.match(/case (\d+)/)?.[1]
    expect(k).toBeGreaterThan(0)
    expect(caseOf(items[k - 1]!)).toBe(caseOf(items[k + 1]!))
    await expect(dialog.getByText('paire adverse comprise')).toBeVisible()
  })
})
