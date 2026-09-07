/** Forme brute du fichier `config/gameplay.json` (règle G1). Data pure, ADR-0003. */

import type { Aura, ColorId, OnPlaceEffect, Side } from '../rules/types'

export interface RawCoord {
  readonly q: number
  readonly r: number
}

export interface RawColor {
  readonly id: string
  readonly prefix: string
  readonly label: string
  readonly hex: string
}

export interface RawBoard {
  readonly radius: number
  readonly blocked?: readonly RawCoord[]
  readonly colorDistribution: Readonly<Record<string, number>>
  readonly symmetricColors?: boolean
}

export interface RawSetupEntry extends RawCoord {
  readonly side: Side
  readonly type: string
}

export interface RawTileType {
  readonly id: string
  readonly force: number
  readonly shields?: number
  readonly role?: 'king' | 'tower'
  readonly immuneToSilence?: boolean
  readonly onPlace?: readonly OnPlaceEffect[]
  readonly aura?: readonly Aura[]
}

export interface RawAiSide {
  readonly profile: string
  readonly level: string
}

export interface RawAi {
  readonly player: RawAiSide | null
  readonly demon: RawAiSide | null
  readonly profiles: Readonly<Record<string, { readonly attack: number; readonly defense: number }>>
  readonly levels: Readonly<Record<string, { readonly topN: number; readonly skipBest?: number }>>
  readonly weights: Readonly<Record<string, number>>
}

export interface RawConfig {
  readonly seed: number
  readonly firstPlayer: 'player' | 'demon'
  readonly handSize: number
  readonly startingColor: string | null
  readonly upkeepHeal: number
  readonly upkeepHealsKing?: boolean
  readonly colors: readonly RawColor[]
  readonly board: RawBoard
  readonly setup: readonly RawSetupEntry[]
  readonly tileTypes: readonly RawTileType[]
  readonly decks: { readonly player: readonly string[]; readonly demon: readonly string[] | 'sameAsPlayer' }
  readonly ai: RawAi
}

/** Configuration validée, prête pour le Core. */
export interface GameConfig {
  readonly seed: number
  readonly firstPlayer: 'player' | 'demon'
  readonly handSize: number
  readonly startingColor: ColorId | null
  readonly upkeepHeal: number
  readonly upkeepHealsKing: boolean
  readonly colors: readonly RawColor[]
  /** C1 : les Couleurs dont le pourcentage est > 0. */
  readonly activeColors: readonly ColorId[]
  readonly colorDistribution: Readonly<Record<string, number>>
  readonly radius: number
  readonly blocked: readonly RawCoord[]
  readonly symmetricColors: boolean
  readonly setup: readonly RawSetupEntry[]
  readonly tileTypes: ReadonlyMap<string, import('../rules/types').TileDefinition>
  readonly decks: Readonly<Record<'player' | 'demon', readonly string[]>>
  readonly ai: RawAi
}

export interface LoadReport {
  readonly config: GameConfig
  /** Filtrages silencieux et déséquilibres — règle G2, B12. */
  readonly warnings: readonly string[]
}
