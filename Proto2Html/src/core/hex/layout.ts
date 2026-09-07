/** Passage coordonnée axiale → pixels, en pointy-top (règle B8). Présentation uniquement. */

import type { HexCoord } from './hexCoord'

export interface Point {
  readonly x: number
  readonly y: number
}

const SQRT3 = Math.sqrt(3)

export function hexToPixel(c: HexCoord, size: number): Point {
  return {
    x: size * SQRT3 * (c.q + c.r / 2),
    y: size * 1.5 * c.r,
  }
}

/** Les 6 sommets d'un hexagone pointy-top, pour un `points` de <polygon>. */
export function hexCorners(center: Point, size: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    out.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) })
  }
  return out
}

export function cornersToPoints(corners: Point[]): string {
  return corners.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}
