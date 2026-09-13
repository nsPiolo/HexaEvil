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
  ranking,
  naturalCombinations,
  rollOpponentPair,
  rollPlayerDice,
  type Combination,
  type MoveResult,
  type RaceState,
  type Roll,
} from '../core/rules/race'
import { randomSeed, seededRng, type Rng } from '../core/rules/rng'
import type { ArtefactId } from '../core/rules/artefacts'
import { betRefusal, betType, currentMultiplier, fmtMultiplier, potentialPayout, raceProgress, settleBets, type Bet, type BetTypeId, type Settlement } from '../core/rules/bets'

export type Phase = 'betting' | 'idle' | 'rolling' | 'pairing' | 'resolving' | 'opponent' | 'finished'

/** Phases pendant lesquelles on peut poser un pari (le plateau est immobile). */
export const BETTING_PHASES: readonly Phase[] = ['betting', 'idle']

/** Peut-on poser un pari maintenant ? Avant de lancer, ou après le lancer si l'Œil du parieur a été activé ce tour. */
export function canBetNow(ui: Pick<RaceUi, 'phase' | 'lateBetOpen'>): boolean {
  return BETTING_PHASES.includes(ui.phase) || (ui.phase === 'pairing' && ui.lateBetOpen)
}

export interface LogEntry {
  id: number
  turn: number
  source: 'player' | 'opponent' | 'system' | 'bet'
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
  /** Argent du joueur, conservé de course en course. */
  money: number
  bets: Bet[]
  /** Règlement de la course terminée. */
  settlement: Settlement | null
  /** Artefacts possédés (barre provisoire). */
  artefacts: ArtefactId[]
  /** Index de la course dans la session, à partir de 0 ; le cercle en découle. */
  raceIndex: number
  /** Charges restantes de l'Œil du parieur pour le cercle en cours. */
  lateBetCharges: number
  /** L'Œil du parieur a été activé pour ce lancer : on peut parier pendant l'association. */
  lateBetOpen: boolean
}

export interface SessionCarry {
  money: number
  artefacts: ArtefactId[]
  raceIndex: number
  lateBetCharges: number
}

export function circleOf(raceIndex: number): { circle: number; raceInCircle: number } {
  return { circle: Math.floor(raceIndex / config.run.racesPerCircle) + 1, raceInCircle: (raceIndex % config.run.racesPerCircle) + 1 }
}

export const SPEEDS = [0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function fmt(d: number): string {
  return d > 0 ? `+${d}` : `${d}`
}

function initial(seed: number, carry: SessionCarry): RaceUi {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  return {
    race: createRace(config, carry.artefacts.includes('sablier') ? { betThresholdRatio: config.artefacts.sablier.betThresholdRatio } : {}),
    phase: 'betting',
    roll: null,
    combinations: [],
    selectedSoulDie: null,
    resolvingIndex: null,
    opponentRoll: null,
    lastResult: null,
    log: [{ id: 0, turn: 1, source: 'system', text: `Cercle ${circle}, course ${raceInCircle}/${config.run.racesPerCircle} — ${config.souls.count} âmes, ${config.track.columns} cases, graine ${seed}. Posez vos paris initiaux.` }],
    seed,
    money: carry.money,
    bets: [],
    settlement: null,
    artefacts: carry.artefacts,
    raceIndex: carry.raceIndex,
    lateBetCharges: carry.lateBetCharges,
    lateBetOpen: false,
  }
}

export function useRace() {
  const [seed, setSeed] = useState(randomSeed)
  const [ui, setUi] = useState<RaceUi>(() => initial(seed, { money: config.economy.startingMoney, artefacts: [], raceIndex: 0, lateBetCharges: 0 }))
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

  const startRace = useCallback((carry: SessionCarry) => {
    runId.current += 1
    const s = randomSeed()
    rngRef.current = seededRng(s)
    logId.current = 1
    setSeed(s)
    commit(initial(s, carry))
  }, [commit])

  const fullCharges = (artefacts: readonly ArtefactId[]): number => (artefacts.includes('lateBet') ? config.artefacts.lateBet.chargesPerCircle : 0)

  /** Nouvelle course, argent et artefacts conservés ; les charges reviennent au changement de cercle. */
  const newRace = useCallback(() => {
    const u = uiRef.current
    const raceIndex = u.raceIndex + 1
    const newCircle = raceIndex % config.run.racesPerCircle === 0
    startRace({ money: u.money, artefacts: u.artefacts, raceIndex, lateBetCharges: newCircle ? fullCharges(u.artefacts) : u.lateBetCharges })
  }, [startRace])
  /** Nouvelle session : argent au capital initial, artefacts conservés, cercle 1. */
  const resetSession = useCallback(() => {
    const u = uiRef.current
    startRace({ money: config.economy.startingMoney, artefacts: u.artefacts, raceIndex: 0, lateBetCharges: fullCharges(u.artefacts) })
  }, [startRace])

  /** Barre provisoire d'artefacts. Le Sablier s'applique à la course suivante ; l'Œil reçoit ses charges tout de suite. */
  const toggleArtefact = useCallback((id: ArtefactId) => {
    const u = uiRef.current
    const on = u.artefacts.includes(id)
    const artefacts = on ? u.artefacts.filter((a) => a !== id) : [...u.artefacts, id]
    let lateBetCharges = u.lateBetCharges
    if (id === 'lateBet') lateBetCharges = on ? 0 : config.artefacts.lateBet.chargesPerCircle
    commit(pushLog({ ...u, artefacts, lateBetCharges, lateBetOpen: on && id === 'lateBet' ? false : u.lateBetOpen }, 'system', on ? `Artefact retiré : ${id === 'lateBet' ? 'Œil du parieur' : 'Sablier de Charon'}.` : `Artefact acquis : ${id === 'lateBet' ? 'Œil du parieur' : 'Sablier de Charon'}${id === 'sablier' ? ' (seuil à 70 % dès la prochaine course)' : ''}.`))
  }, [commit, pushLog])

  /** Œil du parieur : ouvre la fenêtre de pari après le lancer, une charge par cercle. */
  const useLateBet = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'pairing' || !u.artefacts.includes('lateBet') || u.lateBetCharges <= 0 || u.lateBetOpen) return
    commit(pushLog({ ...u, lateBetCharges: u.lateBetCharges - 1, lateBetOpen: true }, 'system', "Œil du parieur : vous pouvez parier après avoir vu vos dés, jusqu'à la résolution."))
  }, [commit, pushLog])

  const beginRace = useCallback(() => {
    const u = uiRef.current
    if (u.phase !== 'betting') return
    const n = u.bets.length
    // Au moins un pari initial : sans enjeu, pas de course (GDD §2.1, étape 3).
    if (n === 0) return
    commit(pushLog({ ...u, phase: 'idle' }, 'system', `Course lancée avec ${n} pari${n > 1 ? 's' : ''} initia${n > 1 ? 'ux' : 'l'}.`))
  }, [commit, pushLog])

  const betId = useRef(1)
  const placeBet = useCallback((type: BetTypeId, souls: readonly number[], stake: number): string | null => {
    const u = uiRef.current
    if (!canBetNow(u)) return u.phase === 'pairing' ? 'Les dés sont lancés : plus de pari avant le prochain tour.' : 'Attendez la fin de la résolution.'
    const refusal = betRefusal(u.race, type, souls, stake, u.money, u.bets)
    if (refusal) return refusal
    const multiplier = currentMultiplier(config.economy.multipliers[type], raceProgress(u.race), config.economy.decay)
    const bet: Bet = { id: betId.current++, type, souls: [...souls], stake, multiplier, turn: u.phase === 'betting' ? 0 : u.race.turn, status: 'open', payout: 0 }
    const names = souls.map((id) => u.race.souls[id]?.name ?? `#${id}`).join(betType(type).ordered ? ' > ' : ', ')
    const gain = potentialPayout(stake, multiplier)
    commit(pushLog({ ...u, money: u.money - stake, bets: [...u.bets, bet] }, 'bet', `Pari ${betType(type).label} sur ${names} : mise ${stake} à ${fmtMultiplier(multiplier)}, rapporte ${gain} si gagné.`))
    return null
  }, [commit, pushLog])

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
    commit({ ...s, phase: 'resolving', selectedSoulDie: null, lateBetOpen: false })
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
      let done = pushLog({ ...u, race: ended, phase: 'finished', resolvingIndex: null }, 'system', `Une âme a franchi l'arrivée : fin de course au tour ${ended.turn}.`)
      const settlement = settleBets(done.bets, ranking(ended))
      for (const b of settlement.bets) {
        const names = b.souls.map((id) => ended.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' > ' : ', ')
        done = pushLog(done, 'bet', b.status === 'won' ? `Pari ${betType(b.type).label} (${names}) gagné : +${b.payout}.` : `Pari ${betType(b.type).label} (${names}) perdu : −${b.stake}.`)
      }
      if (settlement.bets.length > 0) {
        const net = settlement.returned - settlement.staked
        done = pushLog(done, 'system', `Bilan des paris : ${net >= 0 ? '+' : '−'}${Math.abs(net)}. Argent : ${done.money + settlement.returned}.`)
      }
      commit({ ...done, bets: settlement.bets, settlement, money: done.money + settlement.returned })
    } else {
      commit({ ...u, race: ended, phase: 'idle', resolvingIndex: null, roll: null, combinations: [], opponentRoll: null })
    }
  }, [commit, pushLog, resolveMoves, wait])

  // Mode auto : enchaîne les tours avec les combinaisons naturelles.
  useEffect(() => {
    if (!auto) return
    if (ui.phase === 'betting') {
      // Le mode auto pose un pari minimal (Vainqueur pur sur la première âme) s'il le peut, sinon il s'arrête.
      if (ui.bets.length === 0) {
        const stake = config.economy.stakes[0] ?? 0
        if (placeBet('winner', [0], stake) !== null) {
          setAuto(false)
          return
        }
      }
      beginRace()
    }
    else if (ui.phase === 'idle') void rollDice()
    else if (ui.phase === 'pairing') {
      autoPair()
      void resolve()
    }
  }, [auto, ui.phase, ui.bets.length, beginRace, placeBet, rollDice, autoPair, resolve])

  return {
    ui,
    speed,
    setSpeed,
    auto,
    setAuto,
    actions: { newRace, resetSession, beginRace, placeBet, toggleArtefact, useLateBet, rollDice, pickSoulDie, pickDistanceDie, resetPairing, autoPair, resolve },
  }
}
