import { test, expect } from '@playwright/test'
import { board, playTurn, betsPanel, soulChip, start } from './helpers'

const OUT = '/private/tmp/claude-501/-Users-utilisateur-Src-HexaEvil/1fcb7018-0614-4bbb-a4c3-5e960b12a2af/scratchpad'

test.use({ deviceScaleFactor: 2 })

test('capture des cases', async ({ page }) => {
  await start(page, { seed: 97, money: 9999, race: 27 })
  const kinds = await board(page).locator('.cell-special').evaluateAll((els) => els.map((e) => e.className))
  console.log('SPECIAUX', JSON.stringify(kinds))
  await expect(board(page).locator('.cell-special img').first()).toBeVisible()
  await board(page).screenshot({ path: `${OUT}/board-cases-gold.png` })

  // Des jetons posés sur la piste : le marqueur doit rester lisible sous une âme.
  const bets = betsPanel(page)
  await soulChip(page, 'Homère').click()
  await bets.getByRole('group', { name: 'Jetons de mise' }).getByRole('button').first().click()
  await bets.getByRole('button', { name: 'Poser le pari' }).click()
  await page.getByRole('button', { name: 'Lancer la course' }).click()
  for (let i = 0; i < 4; i++) await playTurn(page)
  await board(page).screenshot({ path: `${OUT}/board-cases-jetons.png` })
})
