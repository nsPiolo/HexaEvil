/**
 * Forme de la configuration — GDD §15. Ces types décrivent le fichier
 * `config/gameplay.json`, seule autorité sur les valeurs de gameplay (`G3`).
 */

import type { CombinationId, FaceEffectId, HandCategory, RewardId, Suit } from '../rules/types'

export interface CircleConfig {
  readonly n: number
  readonly cards: number
  readonly dieFaces: number
  readonly pot: number
  readonly winsRequired: number
}

export interface CardsConfig {
  readonly values: readonly number[]
  readonly suits: readonly Suit[]
  readonly minDeckSize: number
  readonly minValue: number
  readonly maxValue: number
  readonly mulligans: number
  readonly flushMinSize: number
  readonly straightMinSize: number
  readonly handRankings: Readonly<Record<number, readonly HandCategory[]>>
}

export interface FaceEffectsConfig {
  /** Effets proposés à chaque gravure — la valeur de la face ne bouge pas (`F11`). */
  readonly effectOptions: number
  /** Valeurs proposées en plus — l'effet de la face ne bouge pas (`F11`). */
  readonly valueOptions: number
  /** Symboles `⚒` visibles en fin de lancers pour gagner un point de forge (`F10`). */
  readonly forgeThreshold: number
  readonly catalogue: readonly FaceEffectId[]
}

export interface DiceConfig {
  readonly startingFaces: readonly number[]
  readonly faceEffects: FaceEffectsConfig
  /** `D3b` : combien de dés chacun lance. Le jeu en retient toujours 3. */
  readonly playerDice: number
  readonly demonDice: number
  readonly defaultMaxRerolls: number
}

export type CombinationValue = number | 'dieValue' | 'thirdDie' | { readonly facesPlus: number }

export interface CombinationSpec {
  readonly rank: number
  readonly tieBreak: number
  readonly value: CombinationValue
}

export type CombinationsConfig = Readonly<Record<CombinationId, CombinationSpec>>

export interface RewardSpec {
  readonly id: RewardId
  /** Présent sur les récompenses qui déplacent des jetons (`B6`). */
  readonly amount?: number
  /** `B6` : on prend d'abord dans le pot, puis dans sa propre réserve. */
  readonly source?: 'potThenOwner'
  readonly scope?: 'all' | 'owner'
  /** `B3e` : récompense sans effet en duel, donc jamais proposée en duel. */
  readonly needsThree?: boolean
  readonly uses?: string
}

export interface SeriesSpec {
  readonly phase: 'charge' | 'discharge'
  readonly duels: number
}

export interface ShopEntry {
  readonly cost: number
  readonly currency: 'money' | 'forge'
  readonly pool?: number
}

export type ShopOptionId =
  | 'removeTwo'
  | 'plusOneTwo'
  | 'clone'
  | 'removeOne'
  | 'recolor'
  | 'engraveOne'
  | 'engraveAll'

export interface AiProfile {
  readonly dischargeGreed: number
  readonly dischargeGreedThreshold: number
}

export interface AiConfig {
  readonly demons: readonly { readonly name: string; readonly profile: string; readonly level: string }[]
  readonly profiles: Readonly<Record<string, AiProfile>>
  readonly levels: Readonly<Record<string, { readonly temperature: number }>>
  readonly levelByCircle: readonly string[]
  readonly rewardWeights: Readonly<Record<string, number>>
}

export interface RulesConfig {
  readonly leaderCapsThrows: boolean
  readonly leaderRotates: boolean
  readonly firstLeader: 'lastCardDuelWinner' | 'player'
  readonly runEndsOnLoss: boolean
  readonly carryOverBetweenRuns: {
    readonly money: number
    readonly forgePoints: number
    readonly deck: boolean
    readonly dice: boolean
  }
  readonly maxDeadRounds: number
}

export interface GameConfig {
  readonly seed: number
  readonly participants: { readonly default: number; readonly circleFinal: number }
  readonly battleSeries: readonly SeriesSpec[]
  readonly circles: readonly CircleConfig[]
  readonly combinations: CombinationsConfig
  readonly dice: DiceConfig
  readonly cards: CardsConfig
  readonly rewards: readonly RewardSpec[]
  readonly shop: Readonly<Record<ShopOptionId, ShopEntry>>
  readonly forgePointEveryNMatches: number
  readonly rules: RulesConfig
  readonly debugStart: { readonly circle: number; readonly money: number; readonly forgePoints: number }
  readonly ai: AiConfig
  readonly ui: { readonly animationSpeed: number; readonly batchMode: boolean }
}
