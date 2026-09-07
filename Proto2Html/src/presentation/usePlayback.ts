/**
 * Lecture animée de la trace de résolution (`U16`).
 *
 * Le moteur a déjà tout calculé : ce hook ne fait que *rejouer* ses étapes dans
 * le temps. Aucune règle ici (ADR-0003) — si l'animation devait recalculer quoi
 * que ce soit, ce serait un bug.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ForceChange, HexSpace, PlacedTile, ResolutionStep, ResolutionTrace } from '../core/rules/types'

export interface PlaybackFrame {
  /** Plateau à afficher : celui de l'étape en cours, ou l'état réel au repos. */
  readonly tiles: readonly PlacedTile[]
  readonly spaces: readonly HexSpace[]
  /** Force affichée par Tuile, interpolée pendant l'étape. */
  readonly displayedForce: ReadonlyMap<number, number>
  /** Variation en cours, pour l'étiquette flottante « −5 ». */
  readonly deltas: ReadonlyMap<number, number>
  /** Tuiles en train d'être détruites, à faire disparaître. */
  readonly dying: ReadonlySet<number>
  readonly focusUid: number | null
  readonly label: string | null
  readonly kind: ResolutionStep['kind'] | null
  readonly playing: boolean
  readonly stepIndex: number
  readonly stepCount: number
}

export interface Playback extends PlaybackFrame {
  readonly speed: number
  setSpeed(speed: number): void
  skip(): void
}

/** Durée de base d'une étape, en ms, avant application de la vitesse. */
const STEP_MS: Record<ResolutionStep['kind'], number> = {
  heal: 700,
  place: 600,
  effect: 950,
  attack: 1000,
  riposte: 950,
  destroy: 800,
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function usePlayback(
  trace: ResolutionTrace | null,
  restTiles: readonly PlacedTile[],
  restSpaces: readonly HexSpace[],
): Playback {
  const [speed, setSpeed] = useState(1)
  const [seenTrace, setSeenTrace] = useState<ResolutionTrace | null>(null)
  const [stepIndex, setStepIndex] = useState(-1)
  const [progress, setProgress] = useState(1)
  const rafRef = useRef(0)

  const steps = trace?.steps ?? []

  /**
   * Ajustement d'état **pendant le rendu**, pas dans un effet. C'est délibéré :
   * avec un `useEffect`, `playing` restait faux le temps d'un rendu, et l'effet
   * qui ouvre le tour suivant partait avant — l'entretien (F13) écrasait alors
   * l'animation du combat, qu'on ne voyait jamais. Le motif « adjust state when
   * props change » est celui recommandé par React pour ce cas.
   */
  if (trace !== seenTrace) {
    setSeenTrace(trace)
    setStepIndex(steps.length > 0 ? 0 : -1)
    setProgress(0)
  }

  // Avance dans l'étape courante, puis passe à la suivante.
  useEffect(() => {
    const step = stepIndex >= 0 ? trace?.steps[stepIndex] : undefined
    if (!step) return
    const total = trace?.steps.length ?? 0
    const duration = Math.max(60, STEP_MS[step.kind] / Math.max(0.25, speed))
    const start = performance.now()
    let cancelled = false

    const tick = (now: number): void => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / duration)
      setProgress(t)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else if (stepIndex + 1 < total) {
        setStepIndex(stepIndex + 1)
        setProgress(0)
      } else {
        setStepIndex(-1)
        setProgress(1)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [speed, stepIndex, trace])

  const frame = useMemo<PlaybackFrame>(() => {
    const step = stepIndex >= 0 ? (steps[stepIndex] as ResolutionStep | undefined) : undefined
    if (!step) {
      return {
        tiles: restTiles,
        spaces: restSpaces,
        displayedForce: new Map(),
        deltas: new Map(),
        dying: new Set(),
        focusUid: null,
        label: null,
        kind: null,
        playing: false,
        stepIndex: -1,
        stepCount: steps.length,
      }
    }

    const eased = easeOutCubic(progress)
    const displayedForce = new Map<number, number>()
    const deltas = new Map<number, number>()
    for (const change of step.changes as readonly ForceChange[]) {
      displayedForce.set(change.uid, Math.round(change.from + (change.to - change.from) * eased))
      deltas.set(change.uid, change.to - change.from)
    }

    return {
      tiles: step.tiles,
      spaces: step.spaces,
      displayedForce,
      deltas,
      dying: new Set(step.kind === 'destroy' ? step.destroyed : []),
      focusUid: step.focusUid,
      label: step.label,
      kind: step.kind,
      playing: true,
      stepIndex,
      stepCount: steps.length,
    }
  }, [progress, restSpaces, restTiles, stepIndex, steps])

  return {
    ...frame,
    speed,
    setSpeed,
    skip: () => {
      cancelAnimationFrame(rafRef.current)
      setStepIndex(-1)
      setProgress(1)
    },
  }
}
