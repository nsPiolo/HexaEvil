/**
 * Instrument de mesure — GDD §14 (`M1`, `M2`, `M2b`, `M5`, `M8`) et §17.
 *
 * N'asserte presque rien : il **imprime des chiffres**. C'est lui qui doit dire
 * si le verrouillage circulaire du §17 est réel, et où placer `S5` (`Q4`).
 *
 *     npm run measure
 */

import { describe, it } from 'vitest'
import { settingsFor, type AiSettings } from '../ai/ai'
import { canEngrave } from '../dice/dice'
import { autoPlay } from '../rules/autoplay'
import { createRng, type Rng } from '../rules/random'
import {
  applyEngrave,
  applyShopCards,
  createRun,
  currentCircle,
  finishMatch,
  openShopOption,
  shopBlockedReason,
  startMatch,
  type RunState,
} from '../rules/run'
import type { TraceStep } from '../rules/trace'
import { config } from './helpers'

const cfg = config()
const RUNS = 200

/** Politique d'achat gloutonne : la stratégie dégénérée du §17, pour la mesurer. */
function greedyShop(run: RunState, rng: Rng): void {
  const targets = [4, 2, 1]
  let guard = 0
  for (;;) {
    if (guard++ > 40) return
    if (run.forgePoints >= (cfg.shop.engraveAll?.cost ?? 2)) {
      const orders = run.dice.map((die, i) => {
        const target = targets[i] as number
        for (let f = 0; f < die.faces.length; f++) {
          if (canEngrave(die, f, target, cfg.dice.maxSameFace).ok) {
            return { dieIndex: i, faceIndex: f, value: target }
          }
        }
        return null
      })
      if (orders.every((o) => o !== null)) {
        applyEngrave(run, 'engraveAll', orders as { dieIndex: number; faceIndex: number; value: number }[])
        continue
      }
    }
    if (shopBlockedReason(run, 'clone') === null) {
      const session = openShopOption(run, 'clone', rng)
      const best = [...session.cards].sort((a, b) => b.value - a.value)[0]
      if (best) {
        applyShopCards(run, session, { uids: [best.uid] })
        continue
      }
    }
    return
  }
}

interface Report {
  runs: number
  completed: number
  circleReached: number[]
  matches: number[]
  moneyAtDeath: number[]
  forgeAtDeath: number[]
  winsByCircle: { wins: number; played: number }[]
  finalWins: number
  finalPlayed: number
  rounds: number[]
  throws: number[]
  combos: Map<string, number>
}

function measure(label: string, expert: boolean, shopping: boolean): Report {
  const r: Report = {
    runs: RUNS,
    completed: 0,
    circleReached: [],
    matches: [],
    moneyAtDeath: [],
    forgeAtDeath: [],
    winsByCircle: cfg.circles.map(() => ({ wins: 0, played: 0 })),
    finalWins: 0,
    finalPlayed: 0,
    rounds: [],
    throws: [],
    combos: new Map(),
  }

  for (let seed = 1; seed <= RUNS; seed++) {
    const rng = createRng(seed * 7919)
    const run = createRun(cfg)
    let matches = 0
    while (run.status === 'playing' && matches < 200) {
      const ci = run.circleIndex
      const isFinal = run.wins + 1 >= currentCircle(run).winsRequired
      const settings: AiSettings | undefined = expert
        ? { ...settingsFor(cfg.ai, 0, ci), topN: 1 }
        : undefined
      const driver = startMatch(run, rng)
      const { steps, result } = autoPlay(driver, {
        cfg,
        circleIndex: ci,
        participants: driver.participants,
        rng,
        settings,
      })
      if (!result) break
      matches++
      for (const s of steps as TraceStep[]) {
        if (s.kind === 'turnEnd') r.combos.set(s.hand.id, (r.combos.get(s.hand.id) ?? 0) + 1)
      }
      r.rounds.push(result.rounds)
      r.throws.push(result.throws)
      const slot = r.winsByCircle[ci]
      if (slot) {
        slot.played++
        if (result.humanWon) slot.wins++
      }
      if (isFinal) {
        r.finalPlayed++
        if (result.humanWon) r.finalWins++
      }
      finishMatch(run, result)
      if (shopping && run.status === 'playing') greedyShop(run, rng)
    }
    r.circleReached.push(run.circleIndex + 1)
    r.matches.push(matches)
    if (run.status === 'won') r.completed++
    else {
      r.moneyAtDeath.push(run.money)
      r.forgeAtDeath.push(run.forgePoints)
    }
  }

  print(label, r)
  return r
}

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] as number
}

function print(label: string, r: Report): void {
  const hist = new Map<number, number>()
  for (const c of r.circleReached) hist.set(c, (hist.get(c) ?? 0) + 1)
  /* eslint-disable no-console */
  console.log(`\n════════ ${label} ════════`)
  console.log(`runs : ${r.runs} · runs complets : ${r.completed} (${((100 * r.completed) / r.runs).toFixed(1)} %)`)
  console.log(`parties par run : moyenne ${mean(r.matches).toFixed(1)} · médiane ${median(r.matches)}`)
  console.log(
    `à la mort : ${mean(r.moneyAtDeath).toFixed(1)} d'argent · ${mean(r.forgeAtDeath).toFixed(2)} point de forge`,
  )
  console.log(`durée d'une partie : ${median(r.rounds)} manches · ${median(r.throws)} jets (médianes)`)
  console.log('Cercle atteint :')
  for (const [c, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`   Cercle ${String(c).padStart(2)} : ${String(n).padStart(4)} runs  ${'█'.repeat(Math.round((60 * n) / r.runs))}`)
  }
  console.log('taux de victoire par Cercle :')
  r.winsByCircle.forEach((s, i) => {
    if (s.played === 0) return
    console.log(
      `   Cercle ${String(i + 1).padStart(2)} : ${((100 * s.wins) / s.played).toFixed(1)} % sur ${s.played} parties`,
    )
  })
  if (r.finalPlayed > 0) {
    console.log(
      `dernières parties de Cercle (à 3) : ${((100 * r.finalWins) / r.finalPlayed).toFixed(1)} % sur ${r.finalPlayed}`,
    )
  }
  const totalCombos = [...r.combos.values()].reduce((a, b) => a + b, 0)
  console.log('mains de dés retenues :')
  for (const [id, n] of [...r.combos.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${id.padEnd(11)} ${((100 * n) / totalCombos).toFixed(2)} %`)
  }
}

describe('M1 — mode lot', () => {
  it('mesure les runs', () => {
    measure('joueur au niveau des démons, sans achats — la ligne de base du §17', false, false)
    measure('joueur expert, sans achats — mesure l’effet de S5 (Q4)', true, false)
    measure('joueur expert, achats gloutons — mesure la courbe d’amélioration (Q2)', true, true)
  }, 900_000)
})
