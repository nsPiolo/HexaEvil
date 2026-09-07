/**
 * U4 — aperçu de résolution avant la pose.
 *
 * On ne réimplémente rien : on rejoue le coup dans le Core et on compare. C'est
 * la seule façon d'être sûr que l'aperçu dit la vérité.
 */

import { hexKey } from '../core/hex/hexCoord'
import { viewBoard } from '../core/rules/derived'
import { playMove, type Move } from '../core/rules/game'
import { opposite } from '../core/rules/relations'
import { suppliedUids } from '../core/rules/supply'
import type { GameConfig } from '../core/config/schema'
import type { ColorId, GameState, PlayingSide } from '../core/rules/types'

export interface PreviewLine {
  readonly at: { q: number; r: number }
  readonly typeId: string
  readonly before: number
  readonly after: number | null
}

export interface Preview {
  readonly ok: true
  readonly typeId: string
  readonly side: PlayingSide
  /** Force avec laquelle la Tuile attaque, lue à l'instant de la pose (F5 étape 1). */
  readonly placedForce: number
  /** Boucliers qu'elle aura à la pose, auras comprises (E4). */
  readonly placedShields: number
  readonly placementBonus: number
  readonly survives: boolean
  readonly supplied: boolean
  readonly damaged: readonly PreviewLine[]
  readonly destroyed: readonly PreviewLine[]
  readonly offeredColor: ColorId | null
  /** C10 : la Couleur offerte fera-t-elle passer l'adversaire ? */
  readonly starvesEnemy: boolean
  readonly winsNow: boolean
  readonly hurtsOwnKing: number
}

export type PreviewResult = Preview | { readonly ok: false; readonly reason: string }

export function previewMove(config: GameConfig, state: GameState, move: Move): PreviewResult {
  let after: GameState
  try {
    after = playMove(config, state, move, { trace: true })
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }

  const side = state.activeSide
  const enemy = opposite(side)
  const beforeView = viewBoard(config, state.tiles)
  const afterView = viewBoard(config, after.tiles)
  const placedUid = after.nextUid - 1
  const placed = afterView.byUid.get(placedUid)

  /**
   * Valeurs de la Tuile **à l'instant du combat** : après le bonus de pose (`F3`)
   * et ses propres effets (`E1`), avant la riposte. On ne les recalcule pas : on
   * les lit dans la trace du moteur (`U16`), sur la dernière étape qui précède
   * l'attaque. C'est la seule façon d'être sûr que le fantôme annonce exactement
   * ce que la résolution appliquera — boucliers gagnés à la pose compris, et
   * silence d'une `N01` voisine compris (`E7`).
   */
  const steps = after.lastResolution?.steps ?? []
  const preCombat = [...steps].reverse().find((s) => s.kind === 'place' || s.kind === 'effect')
  const atPlacement = viewBoard(config, preCombat?.tiles ?? after.tiles)
  const atCombat = atPlacement.byUid.get(placedUid)
  const placedForce = atCombat ? atPlacement.forceOf(atCombat) : 0
  const placedShields = atCombat ? atPlacement.shieldsOf(atCombat) : 0
  const placementBonus = atCombat?.placementBonus ?? 0

  const damaged: PreviewLine[] = []
  const destroyed: PreviewLine[] = []
  for (const tile of state.tiles) {
    const before = beforeView.forceOf(tile)
    const still = afterView.byUid.get(tile.uid)
    if (!still) {
      destroyed.push({ at: tile.at, typeId: tile.typeId, before, after: null })
    } else {
      const now = afterView.forceOf(still)
      if (now !== before) damaged.push({ at: tile.at, typeId: tile.typeId, before, after: now })
    }
  }

  const kingBefore = state.tiles.find((t) => t.side === side && beforeView.defOf(t).role === 'king')
  const kingAfter = kingBefore ? afterView.byUid.get(kingBefore.uid) : undefined
  const hurtsOwnKing =
    kingBefore && kingAfter ? Math.max(0, beforeView.forceOf(kingBefore) - afterView.forceOf(kingAfter)) : 0

  const enemyKingGone = !after.tiles.some((t) => t.side === enemy && afterView.defOf(t).role === 'king')
  const offeredColor = after.imposedColor
  const starvesEnemy = offeredColor !== null && (after.decks[enemy][offeredColor]?.length ?? 0) === 0

  return {
    ok: true,
    typeId: move.typeId,
    side,
    placedForce,
    placedShields,
    placementBonus,
    survives: placed !== undefined,
    supplied: placed !== undefined && suppliedUids(afterView, after.tiles, side).has(placed.uid),
    damaged,
    destroyed,
    offeredColor,
    starvesEnemy,
    winsNow: enemyKingGone,
    hurtsOwnKing,
  }
}

export function keyOf(at: { q: number; r: number }): string {
  return hexKey(at)
}
