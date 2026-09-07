/**
 * Coordonnées axiales (q, r) — ADR-0001, règle B1.
 * Orientation d'affichage : pointy-top (B8), purement visuelle.
 */

export interface HexCoord {
  readonly q: number
  readonly r: number
}

/** Les 6 directions voisines, en ordre horaire depuis l'est. */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function hexKey(c: HexCoord): string {
  return `${c.q},${c.r}`
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number)
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`Clé hexagonale invalide : « ${key} »`)
  }
  return { q, r }
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r
}

export function neighbors(c: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }))
}

/** Rotation de 180° autour du centre — sert à la symétrie du relief et des Couleurs (B12, C5). */
export function rotate180(c: HexCoord): HexCoord {
  return { q: -c.q, r: -c.r }
}

/** Distance hexagonale, via les coordonnées cubiques (ADR-0001). */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))
}

/** Tous les Espaces d'un Plateau hexagonal de rayon donné (B1). */
export function hexesInRadius(radius: number): HexCoord[] {
  const out: HexCoord[] = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) out.push({ q, r })
    }
  }
  return out
}

export function isInRadius(c: HexCoord, radius: number): boolean {
  return Math.abs(c.q) <= radius && Math.abs(c.r) <= radius && Math.abs(c.q + c.r) <= radius
}
