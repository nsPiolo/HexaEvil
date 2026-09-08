/**
 * Lecture animée de la trace (`U2`, `U13`).
 *
 * Le moteur a déjà tout calculé : ce hook ne fait que *rejouer* ses étapes dans
 * le temps. Aucune règle ici — si l'animation devait recalculer quoi que ce
 * soit, ce serait un bug.
 */

import { useEffect, useReducer, useState } from 'react'
import type { GameConfig } from '../core/config/schema'
import { STEP_MS } from './labels'
import { Session } from './session'

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export interface Playback {
  readonly session: Session
  readonly progress: number
}

export function useSession(cfg: GameConfig): Playback {
  const [session] = useState(() => new Session(cfg))
  const [, force] = useReducer((n: number) => n + 1, 0)
  const [progress, setProgress] = useState(1)

  useEffect(() => session.subscribe(force), [session])

  const cursor = session.cursor
  const length = session.queue.length
  const speed = session.speed

  useEffect(() => {
    if (cursor >= length) {
      setProgress(1)
      return
    }
    const step = session.queue[cursor]
    if (!step) return
    const duration = Math.max(60, STEP_MS[step.kind] / Math.max(0.25, speed))
    const start = performance.now()
    let raf = 0
    let cancelled = false
    const tick = (now: number): void => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / duration)
      setProgress(easeOutCubic(t))
      if (t < 1) raf = requestAnimationFrame(tick)
      else session.next()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [session, cursor, length, speed])

  const idle = cursor >= length
  const auto = session.autoPilot
  const screen = session.screen
  const hasAsk = session.ask !== null

  useEffect(() => {
    if (!auto || !idle) return
    if (screen !== 'match' && screen !== 'shop') return
    if (screen === 'match' && !hasAsk) return
    // Une courte pause avant chaque réponse : sans elle, la partie défile sans
    // qu'on ait le temps de lire ce qui se passe.
    const wait = Math.max(120, 500 / Math.max(0.25, speed))
    const timer = setTimeout(() => session.autoStep(), wait)
    return () => clearTimeout(timer)
  }, [session, auto, idle, screen, hasAsk, speed, cursor, length])

  return { session, progress }
}
