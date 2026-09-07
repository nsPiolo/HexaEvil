/**
 * Valeurs dérivées d'une Tuile — règle F1.
 *
 * Une Tuile stocke `baseForce`(type) + `placementBonus` + `damage` +
 * `grantedShields`, et RIEN d'autre. `force` et `shields` sont recalculés à
 * chaque lecture depuis le Plateau :
 *
 *   force   = baseForce + placementBonus + auraForce − damage
 *   shields = max(0, grantedShields + auraShields)
 *
 * C'est ce qui permet au bonus de pose (F3) d'être figé alors qu'une aura (E4)
 * est vivante — les deux comportements sont incompatibles dans un compteur
 * `force` mutable unique.
 */

import { hexKey, neighbors } from '../hex/hexCoord'
import { matchesTarget } from './relations'
import type { GameConfig } from '../config/schema'
import type { PlacedTile, TileDefinition } from './types'

export interface BoardView {
  readonly byKey: ReadonlyMap<string, PlacedTile>
  readonly byUid: ReadonlyMap<number, PlacedTile>
  readonly defOf: (tile: PlacedTile) => TileDefinition
  /** E7 : une Tuile muette ne projette aucune aura et ne déclenche pas ses effets. */
  readonly isSilenced: (tile: PlacedTile) => boolean
  readonly forceOf: (tile: PlacedTile) => number
  readonly shieldsOf: (tile: PlacedTile) => number
  readonly neighborsOf: (tile: PlacedTile) => PlacedTile[]
}

function definitionOf(config: GameConfig, typeId: string): TileDefinition {
  const def = config.tileTypes.get(typeId)
  if (!def) throw new Error(`Type de Tuile inconnu : « ${typeId} »`)
  return def
}

/**
 * Construit une vue cohérente du Plateau : silence d'abord (il conditionne les
 * auras), puis auras, puis forces et boucliers dérivés.
 */
export function viewBoard(config: GameConfig, tiles: readonly PlacedTile[]): BoardView {
  const byKey = new Map<string, PlacedTile>(tiles.map((t) => [hexKey(t.at), t]))
  const byUid = new Map<number, PlacedTile>(tiles.map((t) => [t.uid, t]))
  const defOf = (tile: PlacedTile): TileDefinition => definitionOf(config, tile.typeId)

  const neighborsOf = (tile: PlacedTile): PlacedTile[] => {
    const out: PlacedTile[] = []
    for (const n of neighbors(tile.at)) {
      const found = byKey.get(hexKey(n))
      if (found) out.push(found)
    }
    return out
  }

  // --- E7 : silence. Calculé avant tout le reste, et non annulable par une autre
  // `N01` (Q6 : `immuneToSilence`), sans quoi la résolution n'aurait pas de point fixe.
  const silenced = new Set<number>()
  for (const source of tiles) {
    const sourceDef = defOf(source)
    for (const aura of sourceDef.aura) {
      if (aura.kind !== 'silence') continue
      for (const other of neighborsOf(source)) {
        if (defOf(other).immuneToSilence) continue
        if (!matchesTarget(aura.target, source.side, other.side)) continue
        silenced.add(other.uid)
      }
    }
  }
  const isSilenced = (tile: PlacedTile): boolean => silenced.has(tile.uid)

  // --- E4 : auras. Somme des termes que projettent les voisins non muets.
  const auraForce = new Map<number, number>()
  const auraShields = new Map<number, number>()
  for (const source of tiles) {
    if (isSilenced(source)) continue
    const sourceDef = defOf(source)
    for (const aura of sourceDef.aura) {
      if (aura.kind === 'silence') continue
      for (const other of neighborsOf(source)) {
        if (!matchesTarget(aura.target, source.side, other.side)) continue
        const bucket = aura.kind === 'force' ? auraForce : auraShields
        bucket.set(other.uid, (bucket.get(other.uid) ?? 0) + aura.amount)
      }
    }
  }

  const forceOf = (tile: PlacedTile): number => {
    const def = defOf(tile)
    return def.force + tile.placementBonus + (auraForce.get(tile.uid) ?? 0) - tile.damage
  }
  const shieldsOf = (tile: PlacedTile): number =>
    Math.max(0, tile.grantedShields + (auraShields.get(tile.uid) ?? 0))

  return { byKey, byUid, defOf, isSilenced, forceOf, shieldsOf, neighborsOf }
}

/** F3 : +1 par Tuile alliée adjacente, lu depuis la Tuile posée (T7). */
export function placementBonusAt(
  view: BoardView,
  side: PlacedTile['side'],
  at: { q: number; r: number },
): number {
  let bonus = 0
  for (const n of neighbors(at)) {
    const other = view.byKey.get(hexKey(n))
    if (!other) continue
    // T7 : la relation se lit depuis la Tuile posée — une neutre ne compte pas.
    if (other.side === side) bonus += 1
  }
  return bonus
}
