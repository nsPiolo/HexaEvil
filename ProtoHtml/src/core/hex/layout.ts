/**
 * Conversion coordonnée axiale -> pixel, pour l'affichage SVG uniquement.
 * Orientation *pointy-top* (`B7`). Aucune règle de jeu ne dépend de ce module.
 */
import type { HexCoord } from './hexCoord'

export type Point = Readonly<{ x: number; y: number }>

/** Centre en pixels d'un Espace, `size` = rayon du cercle circonscrit. */
export const hexToPixel = (c: HexCoord, size: number): Point => ({
  x: size * Math.sqrt(3) * (c.q + c.r / 2),
  y: size * 1.5 * c.r,
})

/** Les 6 sommets d'un hexagone pointy-top, prêts pour un `<polygon>`. */
export const hexCorners = (center: Point, size: number): Point[] =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = ((60 * i - 30) * Math.PI) / 180
    return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) }
  })

/**
 * Angle du côté correspondant à l'Accès `index` (l'index de `HEX_DIRECTIONS`).
 * E = 0°, NE = -60°, NW = -120°, W = 180°, SW = 120°, SE = 60°.
 */
export const accessAngle = (index: number): number => (-60 * index * Math.PI) / 180

/** Petit triangle pointant vers l'extérieur, pour matérialiser une Sortie (`D2`). */
export const exitMarker = (center: Point, size: number, access: number): Point[] => {
  const a = accessAngle(access)
  const tip = { x: center.x + size * 0.94 * Math.cos(a), y: center.y + size * 0.94 * Math.sin(a) }
  const baseDist = size * 0.58
  const spread = size * 0.2
  const bx = center.x + baseDist * Math.cos(a)
  const by = center.y + baseDist * Math.sin(a)
  return [
    tip,
    { x: bx - spread * Math.sin(a), y: by + spread * Math.cos(a) },
    { x: bx + spread * Math.sin(a), y: by - spread * Math.cos(a) },
  ]
}

export const cornersToPoints = (points: readonly Point[]): string =>
  points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
