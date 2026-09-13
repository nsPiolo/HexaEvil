/**
 * Machine à états de la course côté écran.
 *
 * Phases :  idle → rolling → pairing → resolving → opponent → (idle | finished)
 *
 * Le noyau est pur ; ici on enchaîne ses fonctions avec des pauses pour que le
 * testeur voie chaque déplacement (exigence du GDD : « animer les transitions »).
 * Un `runId` invalide toute séquence en cours quand on relance une course.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { config } from '../core/config'
import {
  applyMove,
  buildMoves,
  createRace,
  endTurn,
  isPairingComplete,
  naturalCombinations,
  rollOpponentPair,
  rollPlayerDice,
  type Combination,
  type MoveResult,
  type RaceState,
  type Roll,
} from '../core/rules/race'
import { randomSeed, seededRng, type Rng } from '../core/rules/rng'

export type Phase = 'idle' | 'rolling' | 'pairing' | 'resolving' | 'opponent' | 'finished'

export interface LogEntry {
  id: number
  turn: number
  source: 'player' | 'opponent' | 'system'
  text: string
}

export interface RaceUi {
  race: RaceState
  phase: Phase
  /** Lancer du joueur pour ce tour. */
  roll: Roll | null
  /** Combinaisons déjà formées, dans l'ordre de résolution. */
  combinations: Combination[]
  /** Dé Âme cliqué, en attente d'un dé Distance. */
  selectedSoulDie: number | null
  /** Combinaison en cours de résolution (index dans `combinations`), pour la surbrillance. */
  resolvingIndex: number | null
  /** Paire de l'adversaire en cours. */
  opponentRoll: Roll | null
  /** Dernier déplacement joué, pour la bulle « +3 » et la surbrillance du jeton. */
  lastResult: MoveResult | null
  log: LogEntry[]
  seed: number
}

export const SPEEDS = [0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function fmt(d: number): string {
  return d > 0 ? `+${d}` : `${d}`
}

function initial(seed: number): RaceUi {
  return {
    race: createRace(config),
    phase: 'idle',
    roll: null,
    combinations: [],
    selectedSoulDie: null,
    resolvingIndex: null,
    opponentRoll: null,
    lastResult: null,
    log: [{ id: 0, turn: 1, source: 'system', text: `Nouvelle course — ${config.souls.count} âmes, ${config.track.columns} cases, graine ${seed}.` }],
    seed,
  }
}

export function useRace() {
  const [seed, setSeed] = useState(randomSeed)
  const [ui, setUi] = useState<RaceUi>(() => initial(seed))
  const [speed, setSpeed] = useState<Speed>(1)
  const [auto, setAuto] = useState(false)

  // La vérité vit dans `uiRef` : les séquences asynchrones lisent et écrivent dessus,
  // `setUi` ne sert qu'à rafraîchir l'écran. Évite de dépendre du moment où React
  // applique une mise à jour fonctionnelle.
  const uiRef = useRef<RaceUi>(ui)
  const commit = useCallback((u: RaceUi): RaceUi => {
    uiRef.current = u
    setUi(u)
    return u
  }, [])

  const rngRef = useRef<Rng>(seededRng(seed))
  const runId = useRef(0)
  const logId = useRef(1)
  const speedRef = useRef<Speed>(speed)
  speedRef.current = speed

  const wait = useCallback(async (ms: number, id: number): Promise<boolean> => {
    await sleep(ms / speedRef.current)
    return runId.current === id
  }, [])

  const pushLog = useCallback((u: RaceUi, source: LogEntry['source'], text: string): RaceUi => {
    return { ...u, log: [...u.log, { id: logId.current++, turn: u.race.turn, source, text }] }
  }, [])

  const describe = useCallback((u: RaceUi, r: MoveResult): string => {
    const name = (id: number): string => u.race.souls[id]?.name ?? `#${id}`
    const who = name(r.move.soul)
    const dist = r.move.parts.length > 1 ? `${r.move.parts.map((p) => fmt(p.distance)).join(' ')} = ${fmt(r.move.distance)}` : fmt(r.move.distance)
    if (r.blockedAtStart) return `${who} ${dist} : sur la ligne de départ, ne recule pas.`
    let s = `${who} ${dist} : case ${r.from} → ${r.to}.`
    if (r.collision?.kind === 'jump') s += ` Percute ${r.collision.over.map(name).join(', ')} et saute devant.`
    if (r.collision?.kind === 'swap') s += ` Recule sur ${name(r.collision.with)} : échange de place (${name(r.collision.with)} passe en ${r.collision.otherTo}).`
    if (r.crossedFinish) s += ` Franchit l'arrivée !`
    return s
  }, [])

  const newRace = useCallback(() => {
    runId.current += 1
    const s = randomSeed()
    rngRef.current = seededRng(s)
    logId.current = 1
    setSeed(s)
    commit(initial(s))
  }, [commit])

  /** Résout une liste de déplacements avec animation ; renvoie false si la séquence a été annulée. */
  const resolveMoves = useCallback(
    async (id: number, moves: ReturnType<typeof buildMoves>, indexOf: (i: number) => number | null): Promise<boolean> => {
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i]
        if (!m) continue
        commit({ ...uiRef.current, resolvingIndex: indexOf(i) })
        if (!(await wait(config.animation.pauseMs, id))) return false
        const u = uiRef.current
        const { state, result } = applyMove(u.race, m)
        commit(pushLog({ ...u, race: state, lastResult: result }, m.source, describe(u, result)))
        if (!(await wait(config.animation.stepMs, id))) return false
      }
      return true
    },
    [commit, describe, pushLog, wait],
  )

  const rollDice = useCallback(async () => {
    const id = runId.current
    const u = uiRef.current
    if (u.phase !== 'idle') return
    commit({ ...u, phase: 'rolling', roll: null, combinations: [], selectedSoulDie: null, lastResult: null, opponentRoll: null })
    const roll = rollPlayerDice(config, u.race.souls.length, rngRef.current)
    if (!(await wait(config.animation.diceMs, id))) return
    const v = uiRef.current
    const names = roll.soul.map((s) => v.race.souls[s]?.name ?? `#${s}`)
    commit(pushLog({ ...v, phase: 'pairing', roll }, 'player', `Lancer : Distance ${roll.distance.map(fmt).join(' / ')} — Âmes ${names.join(' / ')}.`))
  }, [commit, pushLog, wait])

  const pickSoulDie = useCallback((i: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || u.combinations.some((c) => c.soulDie === i)) return
    commit({ ...u, selectedSoulDie: u.selectedSoulDie === i ? null : i })
  }, [commit])

  const pickDistanceDie = useCallback((i: number) => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || u.selectedSoulDie === null || u.combinations.some((c) => c.distanceDie === i)) return
    commit({ ...u, combinations: [...u.combinations, { soulDie: u.selectedSoulDie, distanceDie: i }], selectedSoulDie: null })
  }, [commit])

  const resetPairing = useCallback(() => {
    const u = uiRef.current
    if (u.phase === 'pairing') commit({ ...u, combinations: [], selectedSoulDie: null })
  }, [commit])

  const autoPair = useCallback(() => {
    const u = uiRef.current
    if (u.phase === 'pairing' && u.roll) commit({ ...u, combinations: naturalCombinations(u.roll), selectedSoulDie: null })
  }, [commit])

  const resolve = useCallback(async () => {
    const id = runId.current
    const s = uiRef.current
    if (s.phase !== 'pairing' || !s.roll || !isPairingComplete(s.roll, s.combinations)) return
    commit({ ...s, phase: 'resolving', selectedSoulDie: null })
    const moves = buildMoves(s.roll, s.combinations, 'player')
    // Une âme cumulée n'a qu'un déplacement : on surligne la première combinaison qui la vise.
    const indexOf = (i: number): number | null => {
      const first = moves[i]?.parts[0]
      return first ? s.combinations.findIndex((c) => c.soulDie === first.soulDie && c.distanceDie === first.distanceDie) : null
    }
    if (!(await resolveMoves(id, moves, indexOf))) return

    // Tour de l'adversaire (§2.5.2).
    commit({ ...uiRef.current, phase: 'opponent', resolvingIndex: null })
    for (let k = 0; k < config.opponent.rollsPerTurn; k++) {
      const pair = rollOpponentPair(config, uiRef.current.race.souls.length, rngRef.current)
      commit({ ...uiRef.current, opponentRoll: null, lastResult: null })
      if (!(await wait(config.animation.diceMs, id))) return
      const u = uiRef.current
      const name = u.race.souls[pair.soul[0] ?? 0]?.name ?? '?'
      commit(pushLog({ ...u, opponentRoll: pair }, 'opponent', `L'adversaire lance : ${name} ${fmt(pair.distance[0] ?? 0)}.`))
      if (!(await resolveMoves(id, buildMoves(pair, naturalCombinations(pair), 'opponent'), () => null))) return
    }

    const u = uiRef.current
    const ended = endTurn(u.race)
    if (ended.finished) {
      commit(pushLog({ ...u, race: ended, phase: 'finished', resolvingIndex: null }, 'system', `Une âme a franchi l'arrivée : fin de course au tour ${ended.turn}.`))
    } else {
      commit({ ...u, race: ended, phase: 'idle', resolvingIndex: null, roll: null, combinations: [], opponentRoll: null })
    }
  }, [commit, pushLog, resolveMoves, wait])

  // Mode auto : enchaîne les tours avec les combinaisons naturelles.
  useEffect(() => {
    if (!auto) return
    if (ui.phase === 'idle') void rollDice()
    else if (ui.phase === 'pairing') {
      autoPair()
      void resolve()
    }
  }, [auto, ui.phase, rollDice, autoPair, resolve])

  return {
    ui,
    speed,
    setSpeed,
    auto,
    setAuto,
    actions: { newRace, rollDice, pickSoulDie, pickDistanceDie, resetPairing, autoPair, resolve },
  }
}
