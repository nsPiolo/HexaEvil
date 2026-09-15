/**
 * Aides communes aux tests E2E (spec 07). Sélection par rôle et libellé d'abord ; les
 * `data-testid` servent là où le libellé est ambigu (onglets, dés, jetons, cartes de la file).
 * Aucun `waitForTimeout` : on attend des états.
 */
import { expect, type Locator, type Page } from '@playwright/test'

export interface StartOptions {
  seed?: number
  money?: number
  race?: number
  /** Vitesse des animations (1 à 4 ; 4 par défaut en mode e2e). */
  speed?: number
  /** Installe l'horloge pilotable (`page.clock`) avant de charger la page. */
  clock?: boolean
}

/** Nouveau run directement sur l'écran de jeu (`?e2e=1`, vitesse ×4), graine fixée si demandée. */
export async function start(page: Page, opts: StartOptions = {}): Promise<void> {
  if (opts.clock) await page.clock.install()
  const q = new URLSearchParams({ e2e: '1' })
  if (opts.seed !== undefined) q.set('seed', String(opts.seed))
  if (opts.money !== undefined) q.set('money', String(opts.money))
  if (opts.race !== undefined) q.set('race', String(opts.race))
  if (opts.speed !== undefined) q.set('speed', String(opts.speed))
  await page.goto(`/?${q.toString()}`)
  await expect(playerSlot(page)).toBeVisible()
}

export const betsPanel = (page: Page): Locator => page.getByRole('region', { name: 'Paris', exact: true })
export const shopPanel = (page: Page): Locator => page.getByRole('region', { name: 'Boutique', exact: true })
export const board = (page: Page): Locator => page.getByRole('region', { name: 'Plateau de course' })
export const playerSlot = (page: Page): Locator => page.getByRole('region', { name: 'Joueur' })
export const resultsDialog = (page: Page): Locator => page.getByRole('dialog', { name: 'Résultat de la course' })
export const hud = (page: Page): Locator => page.locator('.hud-right')
export const hudMoney = (page: Page): Locator => hud(page).getByText(/^\d+ Pièces$/)
export const phaseStrip = (page: Page): Locator => page.getByTestId('phase-strip')
export const gauge = (scope: Locator): Locator => scope.getByTestId('money-gauge')
export const token = (page: Page, soulId: number): Locator => page.getByTestId(`token-${soulId}`)
export const tokenButton = (page: Page, soulId: number): Locator => token(page, soulId).getByRole('button')

/** Chip d'une âme dans le panneau de paris, par son nom. */
export const soulChip = (page: Page, name: string): Locator => betsPanel(page).locator('.bet-souls').getByRole('button', { name: new RegExp(`^${name}`) })
/** Emplacement d'âme du ticket par son intitulé (« devant », « derrière », « 1re »…). */
export const slot = (page: Page, label: string): Locator => betsPanel(page).locator('.bet-slots').getByRole('button', { name: new RegExp(`^${label}`, 'i') })
/** Liste des paris posés dans le panneau. */
export const placedBets = (page: Page): Locator => betsPanel(page).locator('.bets').getByRole('listitem')

/** Valeurs « solde / prix » d'une jauge, en texte normalisé. */
export async function gaugeValues(g: Locator): Promise<string> {
  return (await g.locator('.gauge-values').innerText()).replace(/\s+/g, ' ').trim()
}

export interface BetOptions {
  /** Âmes désignées en cliquant leurs jetons sur le plateau, dans l'ordre. */
  souls: number[]
  /** Désigner par les chips du panneau plutôt que par les jetons (quand un tiroir recouvre le plateau). */
  chips?: boolean
  stake?: number
  /** Palier puis type, par libellé ; par défaut le type courant (Vainqueur pur au départ). */
  tier?: 'Simples' | 'Combinés' | 'Avancés'
  type?: string
}

/** Remplit le ticket dans le panneau de paris (ouvert) et le pose. */
export async function placeBet(page: Page, { souls, stake, tier, type, chips }: BetOptions): Promise<void> {
  const panel = betsPanel(page)
  if (tier) await panel.getByRole('tab', { name: new RegExp(`^${tier}`) }).click()
  if (type) await panel.getByRole('button', { name: new RegExp(`^${type}`) }).click()
  for (const id of souls) {
    if (chips) await soulChip(page, (await token(page, id).getAttribute('data-soul')) ?? '').click()
    else await tokenButton(page, id).click()
  }
  if (stake !== undefined) await panel.getByRole('button', { name: String(stake), exact: true }).click()
  await panel.getByRole('button', { name: 'Poser le pari' }).click()
}

/** Lance la course depuis le panneau de paris. */
export async function startRace(page: Page): Promise<void> {
  await betsPanel(page).getByRole('button', { name: 'Lancer la course', exact: true }).click()
  await expect(phaseStrip(page)).toHaveAttribute('data-state', 'lancer')
}

/** Lance les dés et attend l'appariement. */
export async function rollDice(page: Page): Promise<void> {
  await playerSlot(page).getByRole('button', { name: 'Lancer les dés' }).click()
  await expect(phaseStrip(page)).toHaveAttribute('data-state', 'ordonner')
}

/** Associe dé Âme i ↔ dé Distance i pour chaque dé Distance (appariement « naturel »). */
export async function pairNaturally(page: Page): Promise<void> {
  const distCount = await page.getByTestId(/^die-dist-\d+$/).count()
  for (let i = 0; i < distCount; i++) {
    await page.getByTestId(`die-soul-${i}`).click()
    await page.getByTestId(`die-dist-${i}`).click()
  }
}

/** Résout et attend la fin du tour (prochain lancer, ou fin de course). */
export async function resolveTurn(page: Page): Promise<void> {
  await playerSlot(page).getByRole('button', { name: 'Résoudre', exact: true }).click()
  await expect(phaseStrip(page)).toHaveAttribute('data-state', /^(lancer|none)$/, { timeout: 30_000 })
}

/** Un tour complet en appariement naturel. */
export async function playTurn(page: Page): Promise<void> {
  await rollDice(page)
  await pairNaturally(page)
  await resolveTurn(page)
}

/** Enclenche le mode auto du HUD et attend la modale de résultats. */
export async function autoToResults(page: Page): Promise<Locator> {
  await hud(page).getByRole('button', { name: 'auto' }).click()
  const dialog = resultsDialog(page)
  await expect(dialog).toBeVisible({ timeout: 80_000 })
  return dialog
}

/** Colonne (case) d'une âme d'après son jeton. */
export async function cellOf(page: Page, soulId: number): Promise<number> {
  return Number(await token(page, soulId).getAttribute('data-cell'))
}
