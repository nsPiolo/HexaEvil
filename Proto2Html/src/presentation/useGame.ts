/** Pilotage de la partie côté interface. Le Core reste seul dépositaire des règles. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadConfig } from '../core/config/load'
import { chooseMove, type AiDecision } from '../core/ai/choose'
import { viewBoard } from '../core/rules/derived'
import {
  freeSpaceKeys,
  handOf,
  legalMoves,
  openTurn,
  passReason,
  playMove,
  playPass,
  setupGame,
  type Move,
} from '../core/rules/game'
import { collect } from '../core/rules/metrics'
import { usePlayback, type Playback } from './usePlayback'
import { playBatch, type BatchSummary } from '../core/rules/driver'
import { createRng } from '../core/rules/random'
import { criticalLinks, suppliedUids } from '../core/rules/supply'
import type { GameConfig, RawConfig } from '../core/config/schema'
import type { GameState, PlayingSide } from '../core/rules/types'
import rawDefault from '../../config/gameplay.json'

export interface GameApi {
  readonly config: GameConfig
  readonly state: GameState
  readonly warnings: readonly string[]
  readonly error: string | null
  readonly configText: string
  readonly hand: readonly string[]
  readonly legal: readonly Move[]
  readonly freeKeys: readonly string[]
  readonly supplied: Readonly<Record<PlayingSide, ReadonlySet<number>>>
  readonly critical: Readonly<Record<PlayingSide, ReadonlySet<number>>>
  readonly view: ReturnType<typeof viewBoard>
  readonly metrics: ReturnType<typeof collect>
  readonly mustPass: ReturnType<typeof passReason>
  readonly lastAi: AiDecision | null
  readonly batch: BatchSummary | null
  /** U16 : lecture animée de la trace émise par le moteur. */
  readonly playback: Playback
  /** Vrai pendant l'animation : les entrées sont verrouillées. */
  readonly locked: boolean
  place(move: Move): void
  pass(): void
  stepAi(): void
  runAiTurns(count: number): void
  reset(seed?: number): void
  applyConfigText(text: string): void
  setConfigText(text: string): void
  runBatch(count: number): void
}

function initialLoad(): { config: GameConfig; warnings: string[] } {
  const { config, warnings } = loadConfig(rawDefault as RawConfig)
  return { config, warnings: [...warnings] }
}

export function useGame(): GameApi {
  const first = useMemo(initialLoad, [])
  const [config, setConfig] = useState<GameConfig>(first.config)
  const [warnings, setWarnings] = useState<readonly string[]>(first.warnings)
  const [error, setError] = useState<string | null>(null)
  const [configText, setConfigText] = useState(() => JSON.stringify(rawDefault, null, 2))
  const [state, setState] = useState<GameState>(() => openTurn(first.config, setupGame(first.config)))
  const [lastAi, setLastAi] = useState<AiDecision | null>(null)
  const [batch, setBatch] = useState<BatchSummary | null>(null)
  const rng = useRef(createRng(first.config.seed + 977))

  /**
   * Applique un tour, puis ouvre le suivant. L'ouverture (entretien F13) est
   * différée : on laisse d'abord l'animation de la résolution se terminer, sinon
   * la trace du soin écraserait celle du combat.
   */
  const [pendingOpen, setPendingOpen] = useState(false)
  const commit = useCallback((next: GameState) => {
    setState(next)
    setPendingOpen(next.outcome === null)
  }, [])

  const place = useCallback(
    (move: Move) => {
      try {
        setError(null)
        commit(playMove(config, state, move, { trace: true }))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [commit, config, state],
  )

  const pass = useCallback(() => {
    const reason = passReason(config, state, state.activeSide)
    if (!reason) {
      setError('Ce camp peut poser : la passe n’est permise que s’il ne peut pas (A5).')
      return
    }
    setError(null)
    commit(playPass(config, state, reason))
  }, [commit, config, state])

  const stepAi = useCallback(() => {
    if (state.outcome) return
    const reason = passReason(config, state, state.activeSide)
    if (reason) {
      setLastAi(null)
      commit(playPass(config, state, reason))
      return
    }
    const decision = chooseMove(config, state, state.activeSide, rng.current)
    if (!decision) return
    setLastAi(decision)
    setError(null)
    commit(playMove(config, state, decision.chosen.move, { trace: true }))
  }, [commit, config, state])

  const runAiTurns = useCallback(
    (count: number) => {
      let current = state
      let decision: AiDecision | null = lastAi
      for (let i = 0; i < count && !current.outcome; i++) {
        const opened = openTurn(config, current)
        const reason = passReason(config, opened, opened.activeSide)
        if (reason) {
          current = playPass(config, opened, reason)
          continue
        }
        const d = chooseMove(config, opened, opened.activeSide, rng.current)
        if (!d) break
        decision = d
        current = playMove(config, opened, d.chosen.move)
      }
      setLastAi(decision)
      // Enchaînement rapide : pas de trace, on ne peut pas animer 400 tours.
      setState(current.outcome ? current : openTurn(config, current))
      setPendingOpen(false)
    },
    [config, lastAi, state],
  )

  const reset = useCallback(
    (seed?: number) => {
      const next: GameConfig = seed === undefined ? config : { ...config, seed }
      rng.current = createRng(next.seed + 977)
      setConfig(next)
      setError(null)
      setLastAi(null)
      setBatch(null)
      setPendingOpen(false)
      setState(openTurn(next, setupGame(next)))
    },
    [config],
  )

  const applyConfigText = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text) as RawConfig
      const { config: next, warnings: w } = loadConfig(parsed)
      rng.current = createRng(next.seed + 977)
      setConfig(next)
      setWarnings([...w])
      setError(null)
      setLastAi(null)
      setBatch(null)
      setPendingOpen(false)
      setState(openTurn(next, setupGame(next)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const runBatch = useCallback(
    (count: number) => {
      setError(null)
      setBatch(playBatch(config, count))
    },
    [config],
  )

  const playback = usePlayback(state.lastResolution, state.tiles, state.spaces)

  // L'ouverture du tour suivant n'a lieu qu'une fois l'animation terminée.
  useEffect(() => {
    if (!pendingOpen || playback.playing) return
    setPendingOpen(false)
    setState((current) => (current.outcome ? current : openTurn(config, current, { trace: true })))
  }, [config, pendingOpen, playback.playing])

  const view = useMemo(() => viewBoard(config, state.tiles), [config, state.tiles])
  const supplied = useMemo(
    () => ({
      player: suppliedUids(view, state.tiles, 'player'),
      demon: suppliedUids(view, state.tiles, 'demon'),
    }),
    [state.tiles, view],
  )
  const critical = useMemo(
    () => ({
      player: criticalLinks(view, state.tiles, 'player'),
      demon: criticalLinks(view, state.tiles, 'demon'),
    }),
    [state.tiles, view],
  )

  return {
    config,
    state,
    warnings,
    error,
    configText,
    hand: useMemo(() => handOf(config, state, state.activeSide), [config, state]),
    legal: useMemo(() => legalMoves(config, state, state.activeSide), [config, state]),
    freeKeys: useMemo(() => freeSpaceKeys(state), [state]),
    supplied,
    critical,
    view,
    metrics: useMemo(() => collect(config, state), [config, state]),
    mustPass: passReason(config, state, state.activeSide),
    lastAi,
    batch,
    playback,
    locked: playback.playing,
    place,
    pass,
    stepAi,
    runAiTurns,
    reset,
    applyConfigText,
    setConfigText,
    runBatch,
  }
}
