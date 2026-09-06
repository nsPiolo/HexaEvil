/**
 * Presentation — pilote le Core, ne décide d'aucune règle (ADR-0003).
 * Toute validation (`placementRefusal`, `exitChangeRefusal`) vient du Core.
 */
import { useCallback, useMemo, useState } from 'react'
import rawGameplay from '../../config/gameplay.json'
import { ConfigError, parseConfig } from '../core/config/load'
import { key, type HexCoord } from '../core/hex/hexCoord'
import { tileAt } from '../core/rules/board'
import {
  createGame,
  exitChangeRefusal,
  placeTile,
  placementRefusal,
  runRound,
  runTick,
  setExits,
} from '../core/rules/encounter'
import type { GameState, TileTypeId } from '../core/rules/types'

const defaultConfigText = JSON.stringify(rawGameplay, null, 2)

const freshGame = (text: string): GameState => createGame(parseConfig(JSON.parse(text)))

export const useGame = () => {
  const [configText, setConfigText] = useState(defaultConfigText)
  const [configError, setConfigError] = useState<string | undefined>(undefined)
  const [history, setHistory] = useState<GameState[]>(() => [freshGame(defaultConfigText)])
  const [selected, setSelected] = useState<HexCoord | undefined>(undefined)
  const [pendingType, setPendingType] = useState<TileTypeId>('quarry')
  const [pendingExits, setPendingExits] = useState<number[]>([0])

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
    (coord: HexCoord) => placementRefusal(state, coord, pendingType, pendingExits),
    [state, pendingType, pendingExits],
  )

  const place = useCallback(
    (coord: HexCoord) => {
      const next = placeTile(state, coord, pendingType, pendingExits)
      if (next !== state) setSelected(coord)
      push(next)
    },
    [state, pendingType, pendingExits, push],
  )

  /** Bascule une Sortie : sur la Tuile sélectionnée, ou sur la pose à venir. */
  const toggleExit = useCallback(
    (direction: number) => {
      if (selected && selectedTile) {
        const exits = selectedTile.exits.includes(direction)
          ? selectedTile.exits.filter((e) => e !== direction)
          : [...selectedTile.exits, direction]
        push(setExits(state, selected, exits))
        return
      }
      setPendingExits((exits) =>
        exits.includes(direction) ? exits.filter((e) => e !== direction) : [...exits, direction],
      )
    },
    [selected, selectedTile, state, push],
  )

  const exitRefusalFor = useCallback(
    (direction: number): string | undefined => {
      if (!selected || !selectedTile) return undefined
      const exits = selectedTile.exits.includes(direction)
        ? selectedTile.exits.filter((e) => e !== direction)
        : [...selectedTile.exits, direction]
      return exitChangeRefusal(state, selected, exits)
    },
    [selected, selectedTile, state],
  )

  const step = useCallback(() => push(runTick(state)), [state, push])
  const round = useCallback(() => push(runRound(state)), [state, push])

  const undo = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }, [])

  const reset = useCallback(() => {
    try {
      setHistory([freshGame(configText)])
      setConfigError(undefined)
      setSelected(undefined)
    } catch (error) {
      setConfigError(error instanceof ConfigError || error instanceof Error ? error.message : String(error))
    }
  }, [configText])

  /** `G4` — recharge la configuration sans recompiler. */
  const applyConfig = useCallback((text: string) => {
    setConfigText(text)
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
    pendingExits,
    configText,
    configError,
    canUndo: history.length > 1,
    setPendingType,
    setConfigText,
    place,
    placementRefusalAt,
    toggleExit,
    exitRefusalFor,
    step,
    round,
    undo,
    reset,
    applyConfig,
    select,
  }
}
