/**
 * Presentation — pilote le Core, ne décide d'aucune règle (ADR-0003).
 * Toute validation (`placementRefusal`, `exitChangeRefusal`) vient du Core.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseConfig } from '../core/config/load'
import { directionBetween, key, neighbors, type HexCoord } from '../core/hex/hexCoord'
import { tileAt } from '../core/rules/board'
import { tileType } from '../core/rules/recipes'
import {
  createGame,
  exitChangeRefusal,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  setExits,
} from '../core/rules/encounter'
import type { GameConfig, GameState, TileTypeId } from '../core/rules/types'

/** Vitesses de lecture : durée d'un Tick à l'écran (`U6`). */
export const SPEEDS = {
  lent: 900,
  normal: 480,
  rapide: 240,
  instantané: 0,
} as const

export type Speed = keyof typeof SPEEDS

/** Ce qu'un clic sur un Espace du Plateau veut dire (`U9`). */
export type ClickAction =
  | { kind: 'wire'; coord: HexCoord; direction: number }
  | { kind: 'place'; coord: HexCoord }
  /** `arm` : la Tuile cliquée passe en mode câblage. */
  | { kind: 'select'; coord: HexCoord; arm: boolean }
  | { kind: 'refused'; coord: HexCoord; reason: string }

/**
 * Une Tuile arrive **nue** : sa Sortie se désigne au clic suivant (`U9`, `T5`).
 * Exporté pour que ce choix soit épinglé par un test plutôt que noyé dans le hook.
 */
export const PLACEMENT_EXITS: readonly number[] = []

/** Une Tuile est câblable si elle est au joueur, pendant la phase de pose (`T5`). */
const isWirable = (state: GameState, coord: HexCoord): boolean =>
  state.phase === 'placement' && tileAt(state, coord)?.owner === 'player'

/**
 * `U9` — interprétation d'un clic, en fonction pure pour être testable sans
 * monter de composant. L'ordre des cas *est* la règle d'ergonomie : câbler la
 * Tuile en mode câblage prime sur poser, poser prime sur sélectionner.
 *
 * `wiring` est la Tuile dont on est en train de régler les Sorties, ou
 * `undefined` hors de ce mode. Le mode se quitte dès qu'une direction est
 * choisie : sans ça, il resterait armé au retour en phase de pose et le clic
 * suivant orienterait une Sortie au lieu de poser une Tuile.
 *
 * Une Tuile posée n'a **aucune Sortie** : l'orientation est le second clic, il
 * n'y a pas de direction par défaut à corriger après coup.
 */
export const resolveClick = (
  state: GameState,
  wiring: HexCoord | undefined,
  coord: HexCoord,
  pendingType: TileTypeId,
): ClickAction => {
  if (wiring && state.phase === 'placement') {
    const direction = directionBetween(wiring, coord)
    if (direction !== undefined) return { kind: 'wire', coord: wiring, direction }
  }

  if (tileAt(state, coord) === undefined) {
    const refusal = placementRefusal(state, coord, pendingType, PLACEMENT_EXITS)
    return refusal === undefined ? { kind: 'place', coord } : { kind: 'refused', coord, reason: refusal }
  }

  // Re-cliquer la Tuile en cours de câblage quitte le mode sans la désélectionner.
  const alreadyWiring = wiring !== undefined && key(wiring) === key(coord)
  return { kind: 'select', coord, arm: !alreadyWiring && isWirable(state, coord) }
}

/**
 * `U9` — jeu de Sorties obtenu en cliquant la direction `direction`.
 * Cliquer une Sortie déjà désignée la retire ; en désigner une de plus que ce
 * que la Tuile autorise **remplace la plus ancienne**, ce qui donne la bascule
 * attendue sur une Tuile à Sortie unique. Fonction pure, exportée pour les tests.
 */
export const nextExitsOnClick = (
  current: readonly number[],
  direction: number,
  maxExits: number,
): number[] => {
  if (current.includes(direction)) return current.filter((e) => e !== direction)
  if (maxExits <= 0) return [...current]
  const next = [...current, direction]
  return next.slice(Math.max(0, next.length - maxExits))
}

const freshGame = (text: string): GameState => createGame(parseConfig(JSON.parse(text)))

/**
 * `config` est déjà validée : la validation du démarrage vit dans `App`, qui
 * peut ainsi afficher l'erreur au lieu de laisser l'application planter (`G1`).
 */
export const useGame = (config: GameConfig, initialText: string) => {
  const [configText, setConfigText] = useState(initialText)
  const [configError, setConfigError] = useState<string | undefined>(undefined)
  const [history, setHistory] = useState<GameState[]>(() => [createGame(config)])
  const [selected, setSelected] = useState<HexCoord | undefined>(undefined)
  const [pendingType, setPendingType] = useState<TileTypeId>('quarry')
  const [speed, setSpeed] = useState<Speed>('normal')
  const [queued, setQueued] = useState(0)
  const [notice, setNotice] = useState<string | undefined>(undefined)
  /** Tuile dont on règle les Sorties (`U9`). Indépendant de la sélection. */
  const [wiringAt, setWiringAt] = useState<HexCoord | undefined>(undefined)

  const state = history[history.length - 1]!

  const push = useCallback((next: GameState) => {
    setHistory((h) => (next === h[h.length - 1] ? h : [...h, next]))
  }, [])

  const selectedTile = useMemo(
    () => (selected ? tileAt(state, selected) : undefined),
    [state, selected],
  )

  /** Refus de la pose envisagée sur l'Espace visé, pour l'affichage (`T6`). */
  const placementRefusalAt = useCallback(
    (coord: HexCoord) => placementRefusal(state, coord, pendingType, PLACEMENT_EXITS),
    [state, pendingType],
  )

  /**
   * `T5`, `U9` — le mode câblage n'est actif que pendant la phase de pose : un
   * Tick en cours le suspend sans qu'on ait à le désarmer explicitement.
   */
  const wiring = state.phase === 'placement' ? wiringAt : undefined

  const wireTargets = useMemo(
    () => (wiring ? neighbors(wiring).map(key) : []),
    [wiring],
  )

  /** Bascule la Sortie d'une Tuile posée vers `direction` (`U9`). */
  const setExitTo = useCallback(
    (coord: HexCoord, direction: number) => {
      const tile = tileAt(state, coord)
      if (!tile) return
      const exits = nextExitsOnClick(tile.exits, direction, tileType(state.config, tile.typeId).maxExits)
      const refusal = exitChangeRefusal(state, coord, exits)
      if (refusal !== undefined) {
        setNotice(refusal)
        return
      }
      setNotice(undefined)
      setWiringAt(undefined) // une direction choisie = on quitte le mode (U9)
      push(setExits(state, coord, exits))
    },
    [state, push],
  )

  /**
   * Un seul geste pour tout le plateau : câbler la Tuile sélectionnée si on
   * clique un de ses voisins, sinon poser, sinon sélectionner. La pose se fait
   * donc en deux temps — cliquer l'Espace, puis cliquer le voisin visé.
   */
  const clickSpace = useCallback(
    (coord: HexCoord) => {
      const action = resolveClick(state, wiring, coord, pendingType)
      switch (action.kind) {
        case 'wire':
          setExitTo(action.coord, action.direction)
          return
        case 'place':
          setNotice(undefined)
          setSelected(action.coord)
          setWiringAt(action.coord) // la Tuile posée attend sa direction
          push(placeTile(state, action.coord, pendingType, PLACEMENT_EXITS))
          return
        case 'refused':
          setNotice(action.reason)
          setWiringAt(undefined)
          setSelected((current) => (current && key(current) === key(coord) ? undefined : coord))
          return
        case 'select':
          setNotice(undefined)
          setWiringAt(action.arm ? action.coord : undefined)
          setSelected((current) =>
            current && key(current) === key(coord) && !action.arm ? undefined : coord,
          )
          return
      }
    },
    [state, wiring, pendingType, setExitTo, push],
  )

  /**
   * Bascule une Sortie depuis les boutons de direction. Ils ne servent qu'au cas
   * qu'aucun hexagone ne couvre — une Sortie vers l'extérieur du Plateau.
   */
  const toggleExit = useCallback(
    (direction: number) => {
      if (wiring) setExitTo(wiring, direction)
    },
    [wiring, setExitTo],
  )

  const tickMs = SPEEDS[speed]

  /**
   * `U6` — les Ticks se déroulent un par un, espacés de `tickMs`, sinon les 5
   * Ticks d'une Manche seraient invisibles. En vitesse instantanée, on résout
   * toute la file d'un coup et l'historique ne garde qu'une étape.
   */
  useEffect(() => {
    if (queued <= 0) return
    if (state.outcome !== 'ongoing') {
      setQueued(0)
      return
    }
    if (tickMs === 0) {
      let next = state
      for (let i = 0; i < queued && next.outcome === 'ongoing'; i++) next = runTick(next)
      setQueued(0)
      push(next)
      return
    }
    const timer = window.setTimeout(() => {
      setQueued((q) => Math.max(0, q - 1))
      push(runTick(state))
    }, tickMs)
    return () => window.clearTimeout(timer)
  }, [queued, state, tickMs, push])

  const step = useCallback(() => setQueued((q) => q + 1), [])
  const round = useCallback(() => {
    if (state.phase === 'placement') {
      setQueued(state.config.ticksPerRound)
      return
    }
    setQueued((q) => q + state.ticksLeftInRound)
  }, [state])

  /** Déroule tout, sans animation : pour mesurer une partie entière. */
  const finish = useCallback(() => {
    let next = state
    let guard = 5000
    while (next.outcome === 'ongoing' && guard-- > 0) next = runRound(next)
    setQueued(0)
    push(next)
  }, [state, push])

  const undo = useCallback(() => {
    setQueued(0)
    setWiringAt(undefined)
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }, [])

  const reset = useCallback(() => {
    setQueued(0)
    setWiringAt(undefined)
    try {
      setHistory([freshGame(configText)])
      setConfigError(undefined)
      setSelected(undefined)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : String(error))
    }
  }, [configText])

  /** `G4` — recharge la configuration sans recompiler. */
  const applyConfig = useCallback((text: string) => {
    setConfigText(text)
    setQueued(0)
    setWiringAt(undefined)
    try {
      setHistory([freshGame(text)])
      setConfigError(undefined)
      setSelected(undefined)
      return true
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : String(error))
      return false
    }
  }, [])

  const select = useCallback((coord: HexCoord | undefined) => {
    setSelected((current) => (current && coord && key(current) === key(coord) ? undefined : coord))
  }, [])

  return {
    state,
    selected,
    selectedTile,
    pendingType,
    configText,
    configError,
    speed,
    tickMs,
    notice,
    wireTargets,
    wiring,
    /** Vrai quand la Tuile inspectée est celle qu'on est en train de câbler. */
    wiringSelected: wiring !== undefined && selected !== undefined && key(wiring) === key(selected),
    playing: queued > 0,
    canUndo: history.length > 1,
    setSpeed,
    setPendingType,
    setConfigText,
    clickSpace,
    placementRefusalAt,
    toggleExit,
    step,
    round,
    finish,
    undo,
    reset,
    applyConfig,
    select,
  }
}
