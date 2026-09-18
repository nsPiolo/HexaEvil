import { expect, test } from '@playwright/test'
import { board, start } from './helpers'
import { RACES_PER_CIRCLE, RACE_SEED } from './seeds'

/**
 * Marqueurs de case et info au survol. Pas de spec d'ergonomie derrière ce fichier : les
 * dessins et la bulle ont été ajoutés après la série 01–08. Ce qu'il couvre est ce qui se
 * casse sans bruit — une image qui rate son emplacement, une bulle coupée par le plateau —
 * et que ni le typage ni les tests unitaires ne voient.
 *
 * Cercle 10 (`race = 9 × RACES_PER_CIRCLE`) : sept couloirs, des cases bloquées sur presque
 * toutes les lignes et les trois types de case spéciale sur chaque variante de terrain.
 */
const CERCLE_10 = 9 * RACES_PER_CIRCLE

test.describe('09 · Cases marquées', () => {
  test('E2E-09-A : chaque marqueur est dessiné dans sa propre case, pas au centre du plateau', async ({ page }) => {
    await start(page, { seed: RACE_SEED, race: CERCLE_10 })
    const marks = board(page).locator('.cell-special, .cell-blocked-mark')
    const n = await marks.count()
    expect(n).toBeGreaterThan(3)
    for (let i = 0; i < n; i++) {
      const mark = marks.nth(i)
      const box = (await mark.boundingBox())!
      const cell = (await mark.locator('xpath=..').boundingBox())!
      // Le marqueur tient dans sa case, à un pixel d'arrondi près. Tant que `.cell` était en
      // `position: static`, il se calait sur toute la grille et les marqueurs se superposaient.
      expect(box.width, `marqueur ${i}`).toBeLessThanOrEqual(cell.width + 1)
      expect(box.x + 1).toBeGreaterThanOrEqual(cell.x)
      expect(box.y + 1).toBeGreaterThanOrEqual(cell.y)
    }
  })

  test('E2E-09-B : le survol dit l’effet et sa valeur, sans sortir du plateau', async ({ page }) => {
    await start(page, { seed: RACE_SEED, race: CERCLE_10 })
    const plateau = (await board(page).boundingBox())!
    const cells = board(page).locator('.track .cell').filter({ has: page.locator('.cell-tip') })
    const n = await cells.count()
    expect(n).toBeGreaterThan(3)
    for (let i = 0; i < n; i++) {
      const cell = cells.nth(i)
      const tip = cell.locator('.cell-tip')
      await expect(tip).toBeHidden()
      await cell.hover()
      await expect(tip).toBeVisible()
      // Une bulle qui déborde du plateau est coupée : `.board` défile en x, donc il rogne en y.
      const b = (await tip.boundingBox())!
      expect(b.y, `bulle ${i} au-dessus du plateau`).toBeGreaterThanOrEqual(plateau.y)
      expect(b.y + b.height, `bulle ${i} sous le plateau`).toBeLessThanOrEqual(plateau.y + plateau.height)
    }
  })

  test('E2E-09-C : les cases spéciales annoncent leur valeur, au singulier comme au pluriel', async ({ page }) => {
    await start(page, { seed: RACE_SEED, race: CERCLE_10 })
    // `textContent` et non `innerText` : la bulle est en `visibility: hidden` hors survol,
    // et `innerText` ne rend que ce qui est affiché — il renverrait une chaîne vide.
    const textes = await board(page).locator('.cell-special').evaluateAll((els) =>
      els.map((e) => e.parentElement!.querySelector('.cell-tip')!.textContent ?? ''),
    )
    expect(textes.length).toBeGreaterThan(0)
    for (const t of textes) {
      expect(t, 'la bulle doit porter un nombre').toMatch(/\d/)
      expect(t, 'pluriel non résolu').not.toContain('(s)')
      expect(t).not.toMatch(/\b1 (cases|pièces)\b/)
    }
  })
})
