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
  availableActions,
  buildableSpaces,
  createGame,
  drawRefusal,
  drawTile,
  moveRefusal,
  moveTile,
  passTurn,
  exitChangeRefusal,
  exitEditRefusal,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  setExits,
  ticksForRound,
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

/**
 * `U10` — le mode d'édition se referme-t-il après ce clic ?
 *
 * Oui quand on confirme une Sortie déjà désignée (`U13`), ou quand la Tuile a
 * atteint son nombre de Sorties à désigner. Un `Aiguillage` réglé à 2 laisse
 * donc choisir ses deux branches d'affilée, au lieu d'exiger de réouvrir le mode
 * entre les deux. Fonction pure, exportée pour les tests.
 */
export const closesEditAfterClick = (
  current: readonly number[],
  direction: number,
  maxExits: number,
  exitsToDesignate: number,
): boolean =>
  current.includes(direction) ||
  nextExitsOnClick(current, direction, maxExits).length >= Math.max(1, exitsToDesignate)

/** Ce qu'un clic sur un Espace du Plateau veut dire (`U9`, `U16`). */
export type ClickAction =
  | { kind: 'move'; from: HexCoord; to: HexCoord }
  | { kind: 'wire'; coord: HexCoord; direction: number }
  | { kind: 'place'; coord: HexCoord }
  | { kind: 'select'; coord: HexCoord }
  | { kind: 'refused'; coord: HexCoord; reason: string }

/**
 * Une Tuile arrive **nue** : sa Sortie se désigne au clic suivant (`U9`, `T5`).
 * Exporté pour que ce choix soit épinglé par un test plutôt que noyé dans le hook.
 */
export const PLACEMENT_EXITS: readonly number[] = []

/**
 * Le droit d'éditer les Sorties est **une règle**, énoncée par le Core
 * (`exitEditRefusal` : phase, propriétaire, Sorties figées `T8`). L'interface
 * ne fait que le refléter — elle ne le recalcule pas (ADR-0003). Le mode ne
 * s'ouvre jamais tout seul à la sélection : il faut le demander (`U12`).
 */
export const canEditExits = (state: GameState, coord: HexCoord | undefined): boolean =>
  coord !== undefined && exitEditRefusal(state, coord) === undefined

/** La raison du refus, pour l'afficher plutôt que de griser sans explication. */
export const editRefusalAt = (state: GameState, coord: HexCoord | undefined): string | undefined =>
  coord === undefined ? undefined : exitEditRefusal(state, coord)

/**
 * `U9` — interprétation d'un clic, en fonction pure pour être testable sans
 * monter de composant. L'ordre des cas *est* la règle d'ergonomie : câbler la
 * Tuile en mode câblage prime sur poser, poser prime sur sélectionner.
 *
 * `wiring` est la Tuile dont on est en train de régler les Sorties, ou
 * `undefined` hors de ce mode. Sélectionner une Tuile ne l'ouvre pas : seuls le
 * bouton « Éditer » et la pose d'une Tuile y font entrer (`U12`). Il se quitte
 * dès qu'une direction est choisie : sans ça, il resterait armé au retour en
 * phase de pose et le clic suivant orienterait une Sortie au lieu de poser.
 *
 * Une Tuile posée n'a **aucune Sortie** : l'orientation est le second clic, il
 * n'y a pas de direction par défaut à corriger après coup.
 */
export const resolveClick = (
  state: GameState,
  wiring: HexCoord | undefined,
  moveFrom: HexCoord | undefined,
  coord: HexCoord,
  pendingType: TileTypeId | undefined,
): ClickAction => {
  // `U16` — déplacement armé : le clic suivant désigne la destination.
  if (moveFrom !== undefined) {
    const refusal = moveRefusal(state, moveFrom, coord)
    return refusal === undefined
      ? { kind: 'move', from: moveFrom, to: coord }
      : { kind: 'refused', coord, reason: refusal }
  }

  if (wiring && state.phase === 'placement') {
    const direction = directionBetween(wiring, coord)
    if (direction !== undefined) return { kind: 'wire', coord: wiring, direction }
  }

  if (tileAt(state, coord) === undefined) {
    if (pendingType === undefined) {
      return { kind: 'refused', coord, reason: 'aucune Tuile en main : pioche d’abord (A2)' }
    }
    const refusal = placementRefusal(state, coord, pendingType, PLACEMENT_EXITS)
    return refusal === undefined ? { kind: 'place', coord } : { kind: 'refused', coord, reason: refusal }
  }

  return { kind: 'select', coord }
}

/**
 * `U9` — jeu de Sorties obtenu en cliquant la direction `direction`.
 *
 * Cliquer une Sortie **déjà désignée la conserve** : le geste vaut alors
 * confirmation, et l'appelant referme le mode d'édition (`U13`). En désigner une
 * de plus que ce que la Tuile autorise **remplace la plus ancienne**, ce qui
 * donne la bascule attendue sur une Tuile à Sortie unique.
 * Fonction pure, exportée pour les tests.
 */
export const nextExitsOnClick = (
  current: readonly number[],
  direction: number,
  maxExits: number,
): number[] => {
  if (current.includes(direction)) return [...current]
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
  const [handPick, setHandPick] = useState<TileTypeId | undefined>(undefined)
  const [moveFrom, setMoveFrom] = useState<HexCoord | undefined>(undefined)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [queued, setQueued] = useState(0)
  const [notice, setNotice] = useState<string | undefined>(undefined)
  /** Tuile dont on règle les Sorties (`U9`). Indépendant de la sélection. */
  const [wiringAt, setWiringAt] = useState<HexCoord | undefined>(undefined)

  const state = history[history.length - 1]!

  /** Tuile de la main choisie pour la pose : le choix explicite, sinon la première. */
  const pendingType: TileTypeId | undefined =
    handPick !== undefined && state.hand.includes(handPick) ? handPick : state.hand[0]

  const push = useCallback((next: GameState) => {
    setHistory((h) => (next === h[h.length - 1] ? h : [...h, next]))
  }, [])

  const selectedTile = useMemo(
    () => (selected ? tileAt(state, selected) : undefined),
    [state, selected],
  )

  /** Refus de la pose envisagée sur l'Espace visé, pour l'affichage (`A2`). */
  const placementRefusalAt = useCallback(
    (coord: HexCoord) =>
      pendingType === undefined
        ? 'aucune Tuile en main (A2)'
        : placementRefusal(state, coord, pendingType, PLACEMENT_EXITS),
    [state, pendingType],
  )

  /**
   * `T5`, `U9` — le mode câblage n'est actif que pendant la phase de pose : un
   * Tick en cours le suspend sans qu'on ait à le désarmer explicitement.
   */
  const wiring = state.phase === 'placement' ? wiringAt : undefined

  const wireTargets = useMemo(() => (wiring ? neighbors(wiring).map(key) : []), [wiring])

  /** `B12` — Espaces posables, calculés une fois par état plutôt qu'à chaque case. */
  const buildable = useMemo(() => new Set(buildableSpaces(state).map(key)), [state])

  /** Désigne la Sortie d'une Tuile posée vers `direction` (`U9`, `U13`). */
  const setExitTo = useCallback(
    (coord: HexCoord, direction: number) => {
      const tile = tileAt(state, coord)
      if (!tile) return

      // Cliquer une Sortie déjà désignée la confirme : rien à changer, on
      // referme simplement le mode. Repasser par `setExits` remettrait le
      // tourniquet à zéro pour rien (`D8`).
      if (tile.exits.includes(direction)) {
        setNotice(undefined)
        setWiringAt(undefined)
        return
      }

      const type = tileType(state.config, tile.typeId)
      const exits = nextExitsOnClick(tile.exits, direction, type.maxExits)
      const refusal = exitChangeRefusal(state, coord, exits)
      if (refusal !== undefined) {
        setNotice(refusal)
        return
      }
      setNotice(undefined)
      // `U10` — on ne referme le mode qu'une fois le compte de Sorties atteint.
      if (closesEditAfterClick(tile.exits, direction, type.maxExits, type.exitsToDesignate ?? 1)) {
        setWiringAt(undefined)
      }
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
      const action = resolveClick(state, wiring, moveFrom, coord, pendingType)
      switch (action.kind) {
        case 'move':
          setNotice(undefined)
          setMoveFrom(undefined)
          setSelected(action.to)
          push(moveTile(state, action.from, action.to))
          return
        case 'wire':
          setExitTo(action.coord, action.direction)
          return
        case 'place':
          if (pendingType === undefined) return
          setNotice(undefined)
          setSelected(action.coord)
          setWiringAt(action.coord) // la Tuile posée attend sa direction
          push(placeTile(state, action.coord, pendingType, PLACEMENT_EXITS))
          return
        case 'refused':
        case 'select':
          setNotice(action.kind === 'refused' ? action.reason : undefined)
          setWiringAt(undefined) // sélectionner n'édite pas (U12)
          setSelected((current) => (current && key(current) === key(coord) ? undefined : coord))
          return
      }
    },
    [state, wiring, moveFrom, pendingType, setExitTo, push],
  )

  /** `A2`, `A5` — les actions qui ne passent pas par le Plateau. */
  const draw = useCallback(() => {
    const refusal = drawRefusal(state)
    if (refusal !== undefined) {
      setNotice(refusal)
      return
    }
    setNotice(undefined)
    push(drawTile(state))
  }, [state, push])

  const pass = useCallback(() => {
    setNotice(undefined)
    setMoveFrom(undefined)
    push(passTurn(state))
  }, [state, push])

  /** `U16` — arme le déplacement de la Tuile sélectionnée, ou l'annule. */
  const toggleMove = useCallback(() => {
    if (moveFrom !== undefined) {
      setMoveFrom(undefined)
      return
    }
    if (selected === undefined) return
    const refusal = moveRefusal(state, selected, selected)
    // « déjà là » signifie que la Tuile est déplaçable : seule la destination manque.
    if (refusal !== undefined && !refusal.includes('déjà là')) {
      setNotice(refusal)
      return
    }
    setNotice(undefined)
    setWiringAt(undefined)
    setMoveFrom(selected)
  }, [moveFrom, selected, state])

  /** `U12` — ouvre ou ferme le mode d'édition sur la Tuile sélectionnée. */
  const editable = canEditExits(state, selected)

  const toggleWiring = useCallback(() => {
    if (!selected) return
    setWiringAt((current) =>
      current && key(current) === key(selected) ? undefined : editable ? selected : undefined,
    )
  }, [selected, editable])

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
      setQueued(ticksForRound(state.config, state.round))
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
    setMoveFrom(undefined)
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }, [])

  const reset = useCallback(() => {
    setQueued(0)
    setWiringAt(undefined)
    setMoveFrom(undefined)
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
    buildable,
    actions: availableActions(state),
    canMoveSelected:
      selected !== undefined && moveRefusal(state, selected, selected)?.includes('déjà là') === true,
    moveFrom,
    draw,
    pass,
    toggleMove,
    ticksThisRound:
      state.phase === 'placement' ? ticksForRound(state.config, state.round) : state.ticksLeftInRound,
    wireTargets,
    wiring,
    /** Vrai quand la Tuile inspectée est celle qu'on est en train de câbler. */
    wiringSelected: wiring !== undefined && selected !== undefined && key(wiring) === key(selected),
    /** Vrai quand la Tuile inspectée peut passer en édition (`U12`). */
    canEditExits: editable,
    /** Sorties restant à désigner sur la Tuile en édition (`U10`). */
    exitsLeftToDesignate:
      wiring === undefined || selectedTile === undefined
        ? 0
        : Math.max(
            0,
            (tileType(state.config, selectedTile.typeId).exitsToDesignate ?? 1) -
              selectedTile.exits.length,
          ),
    /** Pourquoi elle ne le peut pas, le cas échéant (`T5`, `T8`). */
    editRefusal: selected !== undefined && !editable ? editRefusalAt(state, selected) : undefined,
    toggleWiring,
    playing: queued > 0,
    canUndo: history.length > 1,
    setSpeed,
    setPendingType: setHandPick,
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
