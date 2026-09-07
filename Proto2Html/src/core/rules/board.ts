/** Construction du Plateau et tirage des Couleurs — règles B1, B2, C2, C3, C5. */

import { hexKey, hexesInRadius, isInRadius, rotate180 } from '../hex/hexCoord'
import type { GameConfig } from '../config/schema'
import type { Rng } from './random'
import type { ColorId, HexSpace } from './types'

/**
 * C3 : le nombre d'Espaces par Couleur est `round(pct × nbLibres)`, le reste
 * attribué aux Couleurs de plus fort reste (méthode du plus fort reste), puis
 * la liste est mélangée avec la `seed`.
 */
export function allocateColors(config: GameConfig, freeCount: number): ColorId[] {
  const exact = config.activeColors.map((color) => ({
    color,
    ideal: ((config.colorDistribution[color] ?? 0) / 100) * freeCount,
  }))
  const counts = exact.map((e) => ({ color: e.color, n: Math.floor(e.ideal), rest: e.ideal - Math.floor(e.ideal) }))
  let assigned = counts.reduce((s, c) => s + c.n, 0)
  const byRest = [...counts].sort((a, b) => b.rest - a.rest)
  let i = 0
  while (assigned < freeCount) {
    const target = byRest[i % byRest.length]
    if (target) {
      target.n += 1
      assigned += 1
    }
    i += 1
  }
  const out: ColorId[] = []
  for (const c of counts) for (let k = 0; k < c.n; k++) out.push(c.color)
  return out
}

export function buildBoard(config: GameConfig, rng: Rng): HexSpace[] {
  const blockedKeys = new Set(config.blocked.map(hexKey))
  const all = hexesInRadius(config.radius)
  const free = all.filter((c) => !blockedKeys.has(hexKey(c)))

  const colorByKey = new Map<string, ColorId>()

  if (config.symmetricColors) {
    // C5 : miroir par rotation de 180°. On ne tire que la moitié des Espaces et on
    // recopie l'image, pour que les deux camps jouent une position équivalente.
    const representatives: string[] = []
    const seen = new Set<string>()
    for (const c of free) {
      const key = hexKey(c)
      if (seen.has(key)) continue
      const mirrorKey = hexKey(rotate180(c))
      seen.add(key)
      seen.add(mirrorKey)
      representatives.push(key)
    }
    const palette = rng.shuffle(allocateColors(config, representatives.length))
    representatives.forEach((key, idx) => {
      const color = palette[idx] as ColorId
      colorByKey.set(key, color)
      const mirror = hexKey(rotate180({ q: Number(key.split(',')[0]), r: Number(key.split(',')[1]) }))
      if (!colorByKey.has(mirror)) colorByKey.set(mirror, color)
    })
    // Les Espaces dont l'image est bloquée n'ont pas été couverts : on les complète.
    for (const c of free) {
      const key = hexKey(c)
      if (!colorByKey.has(key)) colorByKey.set(key, rng.pick(config.activeColors))
    }
  } else {
    const palette = rng.shuffle(allocateColors(config, free.length))
    free.forEach((c, idx) => colorByKey.set(hexKey(c), palette[idx] as ColorId))
  }

  return all.map((at) => {
    const key = hexKey(at)
    const blocked = blockedKeys.has(key)
    return { at, blocked, color: blocked ? null : (colorByKey.get(key) ?? null) }
  })
}

/** Index rapide Espace → Couleur / bloqué. */
export function spaceIndex(spaces: readonly HexSpace[]): Map<string, HexSpace> {
  return new Map(spaces.map((s) => [hexKey(s.at), s]))
}

export function isPlayableSpace(spaces: Map<string, HexSpace>, tilesByKey: Map<string, unknown>, key: string): boolean {
  const space = spaces.get(key)
  return space !== undefined && !space.blocked && !tilesByKey.has(key)
}

export function boardRadiusContains(config: GameConfig, at: { q: number; r: number }): boolean {
  return isInRadius(at, config.radius)
}
