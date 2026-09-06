/**
 * HexCoord — coordonnée axiale (q, r) d'un Espace du Plateau.
 * GDD §3 `B1`, ADR-0001. Référence : https://www.redblobgames.com/grids/hexagons/
 *
 * Miroir TypeScript du futur `Core/Hex/HexCoord` (C#) : mêmes noms
 * d'opérations, pour que les règles validées ici se transposent sans
 * traduction de vocabulaire.
 */
export type HexCoord = Readonly<{ q: number; r: number }>

/** Coordonnée cubique (x, y, z) avec x + y + z = 0 — utilisée pour les calculs. */
export type CubeCoord = Readonly<{ x: number; y: number; z: number }>

export const hex = (q: number, r: number): HexCoord => ({ q, r })

export const toCube = ({ q, r }: HexCoord): CubeCoord => ({ x: q, y: -q - r, z: r })

export const fromCube = ({ x, z }: CubeCoord): HexCoord => ({ q: x, r: z })

/**
 * Les 6 Accès d'une Tuile (`D1`), dans l'ordre des noms de direction.
 * L'index dans ce tableau **est** l'identifiant d'un Accès dans tout le moteur.
 */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 }, // E
  { q: 1, r: -1 }, // NE
  { q: 0, r: -1 }, // NW
  { q: -1, r: 0 }, // W
  { q: -1, r: 1 }, // SW
  { q: 0, r: 1 }, // SE
]

export const DIRECTION_NAMES = ['E', 'NE', 'NW', 'W', 'SW', 'SE'] as const

export type DirectionName = (typeof DIRECTION_NAMES)[number]

export const isDirectionName = (name: string): name is DirectionName =>
  (DIRECTION_NAMES as readonly string[]).includes(name)

export const directionIndex = (name: DirectionName): number => DIRECTION_NAMES.indexOf(name)

export const directionName = (index: number): DirectionName => {
  const name = DIRECTION_NAMES[index]
  if (!name) throw new Error(`Index de direction hors bornes : ${index}`)
  return name
}

/**
 * Accès opposé : celui que l'on rencontre en face en franchissant `index`.
 * Sert à `D5` (une Sortie doit faire face à une Entrée).
 */
export const oppositeAccess = (index: number): number => (index + 3) % 6

/**
 * L'Accès de `from` qui mène à `to`, ou `undefined` si `to` n'est pas voisin.
 * Sert à désigner une Sortie en cliquant l'hexagone visé (`U9`).
 */
export const directionBetween = (from: HexCoord, to: HexCoord): number | undefined => {
  const dq = to.q - from.q
  const dr = to.r - from.r
  const index = HEX_DIRECTIONS.findIndex((d) => d.q === dq && d.r === dr)
  return index === -1 ? undefined : index
}

export const add = (a: HexCoord, b: HexCoord): HexCoord => ({ q: a.q + b.q, r: a.r + b.r })

export const equals = (a: HexCoord, b: HexCoord): boolean => a.q === b.q && a.r === b.r

/** L'Espace voisin dans la direction `index`. */
export const neighbor = (c: HexCoord, index: number): HexCoord => {
  const d = HEX_DIRECTIONS[index]
  if (!d) throw new Error(`Index de direction hors bornes : ${index}`)
  return add(c, d)
}

/** Les 6 voisins de `c` (sans filtrage : certains peuvent être hors Plateau). */
export const neighbors = (c: HexCoord): HexCoord[] => HEX_DIRECTIONS.map((d) => add(c, d))

/** Distance en nombre d'Espaces (distance cubique / 2). */
export const distance = (a: HexCoord, b: HexCoord): number => {
  const ca = toCube(a)
  const cb = toCube(b)
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z))
}

/** Tous les Espaces à distance <= `radius` de `center`, `center` inclus. */
export const range = (center: HexCoord, radius: number): HexCoord[] => {
  const out: HexCoord[] = []
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r++) out.push(add(center, hex(q, r)))
  }
  return out
}

/** Clé stable pour Record/Set/React (`"q,r"`). */
export const key = ({ q, r }: HexCoord): string => `${q},${r}`

export const parseKey = (k: string): HexCoord => {
  const [q, r] = k.split(',').map(Number)
  return hex(q ?? 0, r ?? 0)
}
