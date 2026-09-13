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
  /** `F10` (`ghostDie`) : dés temporaires qu'un tour peut gagner au plus. */
  readonly ghostDiceMax: number
  /** `F10` (`forceReroll`) : faces visibles nécessaires, et dés à relancer. */
  readonly forceRerollThreshold: number
  readonly forceRerollDice: number
  /** `F10` (`wild35`) : les deux valeurs que la face peut prendre. */
  readonly wild35Values: readonly number[]
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

export type CombinationValue =
  | number
  | 'dieValue'
  | 'thirdDie'
  | { readonly facesPlus: number }
  /** `B23` : un plancher plat, plus un supplément par dé au-delà du minimum. */
  | { readonly flat: number; readonly perExtraDie: number }

export interface CombinationSpec {
  readonly rank: number
  readonly tieBreak: number
  readonly value: CombinationValue
  /** `B23`/`B24` : dés que la combinaison exige. 3 par défaut (`D1`). */
  readonly minDice?: number
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
  /** `B20` : la combinaison dont cette récompense relève le plancher en jetons. */
  readonly combination?: CombinationId
  readonly floor?: number
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
  /** `A9` : acheter un bonus tiré au sort dans le catalogue. */
  | 'buyBonus'
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
  /** `D5` : dés qu'un jet doit relancer au minimum — sinon garder tout vaudrait un arrêt. */
  readonly minReroll: number
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
  /** `A8` : bonus possédés au départ d'un run. */
  readonly startingBonuses: readonly RewardId[]
  /** `B2` : bonus que chaque participant mise au début de la rencontre. */
  readonly bonusPick: number
  /** `A9` : ce que la boutique tire au hasard à chaque visite. */
  readonly shopOffers: { readonly bonuses: number; readonly deck: number }
  readonly shop: Readonly<Record<ShopOptionId, ShopEntry>>
  readonly forgePointEveryNMatches: number
  /** `J9` : prime fixe encaissée en gagnant une rencontre. */
  readonly winBonusMoney: number
  readonly rules: RulesConfig
  readonly debugStart: { readonly circle: number; readonly money: number; readonly forgePoints: number }
  readonly ai: AiConfig
  readonly ui: { readonly animationSpeed: number; readonly batchMode: boolean }
}
