/**
 * Règle F14 — chaîne de ravitaillement.
 *
 * Une Tuile du camp S est ravitaillée s'il existe un chemin de Tuiles DU CAMP S,
 * adjacentes deux à deux, qui la relie au Roi de S. Le Roi est ravitaillé
 * (chemin de longueur 0). Espaces vides, Tuiles adverses et Tuiles neutres ne
 * transmettent pas le ravitaillement — ça découle de T7 : une Tuile de camp
 * n'est jamais alliée d'une neutre.
 */

import { hexKey, neighbors } from '../hex/hexCoord'
import type { BoardView } from './derived'
import type { PlacedTile, PlayingSide } from './types'

/** UIDs des Tuiles de `side` reliées à leur Roi. Vide si le Roi est mort. */
export function suppliedUids(view: BoardView, tiles: readonly PlacedTile[], side: PlayingSide): Set<number> {
  const king = tiles.find((t) => t.side === side && view.defOf(t).role === 'king')
  const supplied = new Set<number>()
  if (!king) return supplied

  const stack: PlacedTile[] = [king]
  supplied.add(king.uid)
  while (stack.length > 0) {
    const current = stack.pop() as PlacedTile
    for (const n of neighbors(current.at)) {
      const other = view.byKey.get(hexKey(n))
      // La chaîne ne passe que par des Tuiles du même camp (T7, F14).
      if (!other || other.side !== side || supplied.has(other.uid)) continue
      supplied.add(other.uid)
      stack.push(other)
    }
  }
  return supplied
}

/**
 * Maillons critiques : Tuiles dont la disparition couperait au moins une autre
 * Tuile du ravitaillement. Sert à l'affichage (U10) et au barème d'IA (I5b).
 */
export function criticalLinks(view: BoardView, tiles: readonly PlacedTile[], side: PlayingSide): Set<number> {
  const base = suppliedUids(view, tiles, side)
  const critical = new Set<number>()
  for (const candidate of tiles) {
    if (candidate.side !== side) continue
    if (view.defOf(candidate).role === 'king') continue
    const without = tiles.filter((t) => t.uid !== candidate.uid)
    const viewWithout = { ...view, byKey: new Map(without.map((t) => [hexKey(t.at), t])) } as BoardView
    const after = suppliedUids(viewWithout, without, side)
    for (const uid of base) {
      if (uid !== candidate.uid && !after.has(uid)) {
        critical.add(candidate.uid)
        break
      }
    }
  }
  return critical
}
