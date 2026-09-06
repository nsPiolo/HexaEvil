/**
 * Animation du dernier Tick (`U6`, `U7`). Ne calcule rien sur les règles : elle
 * ne fait que mettre en mouvement les événements énoncés par le Core
 * (`state.events`).
 */
import { useEffect, useRef, useState } from 'react'
import { key, type HexCoord } from '../core/hex/hexCoord'
import type { GameState, ResourceId, TickEvent } from '../core/rules/types'

export type MoveAnim = Readonly<{ from: HexCoord; to: HexCoord; carrying?: ResourceId | undefined }>

export type Ghost = Readonly<{ id: number; side: 'player' | 'demon'; coord: HexCoord; cause: string }>

export type Floater = Readonly<{
  id: string
  coord: HexCoord
  text: string
  kind: 'gain' | 'loss' | 'progress-up' | 'progress-down'
  slot: number
  /** 0 à l'apparition, 1 à l'extinction. */
  age: number
}>

const FLOATER_MS = 1150

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Agrège les événements de stock d'un Tick en une étiquette par Tuile et par
 * signe : un « +2 » plutôt que deux « +1 » superposés. Fonction pure, exportée
 * pour être testée sans monter de composant.
 */
export const aggregateFloaters = (
  events: readonly TickEvent[],
  born: number,
): Omit<Floater, 'age'>[] => {
  type Bucket = { coord: HexCoord; total: number; resources: Set<ResourceId> }
  const gains = new Map<string, Bucket>()
  const losses = new Map<string, Bucket>()
  const progress = new Map<string, { coord: HexCoord; total: number }>()

  for (const event of events) {
    if (event.kind === 'stock') {
      const bucket = event.delta >= 0 ? gains : losses
      const k = key(event.coord)
      const current = bucket.get(k) ?? { coord: event.coord, total: 0, resources: new Set() }
      current.total += event.delta
      current.resources.add(event.resource)
      bucket.set(k, current)
    } else if (event.kind === 'progress') {
      const k = key(event.coord)
      const current = progress.get(k) ?? { coord: event.coord, total: 0 }
      current.total += event.delta
      progress.set(k, current)
    }
  }

  const out: Omit<Floater, 'age'>[] = []
  const slots = new Map<string, number>()
  const nextSlot = (k: string): number => {
    const slot = slots.get(k) ?? 0
    slots.set(k, slot + 1)
    return slot
  }

  for (const [k, p] of progress) {
    out.push({
      id: `${born}-${k}-progress`,
      coord: p.coord,
      text: `${p.total >= 0 ? '+' : '−'}${Math.abs(p.total)}`,
      kind: p.total >= 0 ? 'progress-up' : 'progress-down',
      slot: nextSlot(k),
    })
  }
  for (const [k, g] of gains) {
    out.push({
      id: `${born}-${k}-gain`,
      coord: g.coord,
      text: `+${g.total}`,
      kind: 'gain',
      slot: nextSlot(k),
    })
  }
  for (const [k, l] of losses) {
    out.push({
      id: `${born}-${k}-loss`,
      coord: l.coord,
      text: `−${Math.abs(l.total)}`,
      kind: 'loss',
      slot: nextSlot(k),
    })
  }
  return out
}

/**
 * `moveMs` = durée d'interpolation d'un déplacement. À 0 (vitesse instantanée
 * ou mouvement réduit), tout est rendu à l'état final sans animation.
 */
export const useAnimation = (state: GameState, moveMs: number) => {
  const [, setFrame] = useState(0)
  const moves = useRef(new Map<number, MoveAnim>())
  const ghosts = useRef<Ghost[]>([])
  const pending = useRef<{ items: Omit<Floater, 'age'>[]; born: number }[]>([])
  const startedAt = useRef(0)
  const lastTick = useRef(-1)
  const raf = useRef<number | undefined>(undefined)

  const reduced = prefersReducedMotion()
  const duration = reduced ? 0 : moveMs

  // Ingestion : un nouveau Tick déroulé devient une transition à animer.
  if (state.tick !== lastTick.current) {
    const forward = state.tick > lastTick.current
    lastTick.current = state.tick
    moves.current = new Map()
    ghosts.current = []
    if (forward && state.events.length > 0) {
      const born = performance.now()
      startedAt.current = born
      for (const event of state.events) {
        if (event.kind === 'move') {
          moves.current.set(event.entityId, { from: event.from, to: event.to, carrying: event.carrying })
        } else if (event.kind === 'destroy') {
          ghosts.current.push({ id: event.entityId, side: event.side, coord: event.coord, cause: event.cause })
        }
      }
      const items = aggregateFloaters(state.events, born)
      if (items.length > 0) pending.current.push({ items, born })
    } else {
      pending.current = []
    }
  }

  // Boucle d'animation : elle ne tourne que s'il y a quelque chose à animer.
  useEffect(() => {
    const step = () => {
      const now = performance.now()
      pending.current = pending.current.filter((batch) => now - batch.born < FLOATER_MS)
      const movingDone = duration === 0 || now - startedAt.current >= duration
      if (movingDone && pending.current.length === 0) {
        raf.current = undefined
        setFrame((f) => f + 1)
        return
      }
      setFrame((f) => f + 1)
      raf.current = requestAnimationFrame(step)
    }
    if (raf.current === undefined) raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== undefined) {
        cancelAnimationFrame(raf.current)
        raf.current = undefined
      }
    }
  }, [state, duration])

  const now = typeof performance === 'undefined' ? 0 : performance.now()
  const elapsed = now - startedAt.current
  const t = duration === 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration))
  // Départ et arrivée adoucis, pour lire le pas plutôt qu'un glissement uniforme.
  const eased = t * t * (3 - 2 * t)

  const floaters: Floater[] = pending.current.flatMap((batch) =>
    batch.items.map((item) => ({ ...item, age: Math.min(1, (now - batch.born) / FLOATER_MS) })),
  )

  return {
    /** Facteur d'interpolation du déplacement en cours, adouci. */
    t: eased,
    moves: moves.current,
    ghosts: t < 1 ? ghosts.current : [],
    floaters,
    reduced,
  }
}
