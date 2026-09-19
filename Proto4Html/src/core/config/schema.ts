import type { BetTypeId } from '../rules/betTypes'
import type { BossEffect } from '../rules/boss'

/** Forme validée de `config/race.json` (GDD proto4 §9.1 : tout ce qui est chiffré vit là). */
/** Case bloquée d'un cercle (rétrécissement, GDD §2.2). */
export interface BlockedCell {
  column: number
  lane: number
}

/**
 * Case spéciale d'un terrain (GDD §2.2). Elle agit quand une âme **s'y arrête**, jamais quand
 * elle la traverse : une case ne se déclenche qu'à l'atterrissage, sinon le plateau deviendrait
 * illisible dès qu'un dé fait +3.
 *
 * - `trap` : l'âme recule de `value` cases ;
 * - `boost` : elle avance de `value` cases ;
 * - `gold` : elle vous rapporte `value` pièces, **à condition d'avoir un pari ouvert sur cette
 *   âme** : la case paie le parieur, pas le spectateur.
 * - `tar` : l'âme qui s'y arrête perd ses déplacements induits jusqu'à la fin du tour
 *   (Parasite, Jumeaux, Aimant, Bât, Boussole, Écho). Posée par les Bornes du stagiaire, pas
 *   par un terrain de cercle.
 */
export type SpecialCellKind = 'trap' | 'boost' | 'gold' | 'tar'

export interface SpecialCell {
  column: number
  lane: number
  kind: SpecialCellKind
  value: number
}

/**
 * Variante de terrain d'un cercle : un même cercle en propose plusieurs et une est tirée au
 * début de chaque course, pour que les trois courses d'un cercle ne se jouent pas sur la même
 * piste. Un cercle à un seul couloir n'en a qu'une, sans case bloquée : une case bloquée y
 * fermerait la colonne entière.
 */
export interface Terrain {
  name: string
  blocked: readonly BlockedCell[]
  /** Cases spéciales de la variante (pièges, bonus, cases payantes). Vide par défaut. */
  specials: readonly SpecialCell[]
}

/** Un cercle de la course : ce que `config/race.json` décrit pour chacun. */
export interface CircleConfig {
  name: string
  price: number
  souls: number
  /** Couloirs de la piste (GDD §2.2). */
  lanes: number
  /** Variantes de terrain du cercle, non vide : une est tirée au début de chaque course. */
  terrains: readonly Terrain[]
  boss: string
  /** Pouvoir du boss, tel qu'il est annoncé au joueur sur la carte. */
  power: string
  /**
   * Ce que le moteur applique de ce pouvoir, sur la dernière course du cercle seulement
   * (`rules/boss.ts`). Vide = boss sans effet mécanique.
   */
  powers: readonly BossEffect[]
}

export interface RaceConfig {
  souls: {
    /** Nombre d'âmes au départ (5 au cercle 1). */
    count: number
    /** Réservoir de noms ; les `count` premiers sont utilisés. */
    names: readonly string[]
  }
  track: {
    /** Cases de parcours, colonne 0 = départ. L'arrivée est franchie à la colonne `columns`. */
    columns: number
    /** Cases situées après l'arrivée, pour classer plusieurs arrivées le même tour. */
    cellsAfterFinish: number
    /** Part du parcours au-delà de laquelle un pari n'est plus possible (repère visuel ici). */
    betThresholdRatio: number
  }
  dice: {
    distanceFaces: readonly number[]
    distanceDice: number
    soulDice: number
  }
  opponent: {
    rollsPerTurn: number
  }
  economy: {
    startingMoney: number
    /** Avance versée au joueur au début de chaque course du cercle 1 (avant les paris initiaux). */
    raceAllowance: number
    /** Croissance de l'avance par cercle (0,5 = +50 % de celle du cercle 1 à chaque cercle). Voir `allowanceAtCircle`. */
    allowanceGrowthPerCircle: number
    /** Mises proposées au cercle 1, croissantes. Voir `stakesAtCircle` (rules/stakes.ts) pour les suivants. */
    stakes: readonly number[]
    /** Croissance de l'échelle des mises par cercle (0,25 = +25 % du cercle 1 à chaque cercle). */
    stakeGrowthPerCircle: number
    multipliers: Readonly<Record<BetTypeId, number>>
    /** Niveau du stagiaire (index de grade, 0 au départ) à partir duquel chaque type de pari est ouvert. */
    betUnlockLevel: Readonly<Record<BetTypeId, number>>
    decay: {
      exponent: number
      minMultiplier: number
    }
  }
  run: {
    racesPerCircle: number
    /**
     * Cercle dont le paiement libère de l'enfer (le neuvième) : le joueur y choisit entre sortir
     * et continuer comme démon dans les cercles suivants (GDD §5.3).
     */
    escapeCircle: number
    /**
     * Facteur appliqué au prix du dernier cercle écrit, par cercle supplémentaire : au-delà de la
     * liste, le jeu rejoue le dernier cercle avec un prix qui monte, sans fin (GDD §8.1).
     */
    beyondPriceGrowth: number
    circles: readonly CircleConfig[]
  }
  artefacts: {
    lateBet: { chargesPerCircle: number }
    sablier: { betThresholdRatio: number }
  }
  animation: {
    stepMs: number
    diceMs: number
    pauseMs: number
    /** Intervalle entre deux tickets révélés dans la modale de fin de course. */
    betRevealMs: number
    /** Inactivité avant que « Résoudre » pulse, appariement complet. */
    idlePulseMs: number
    /** Transition du remplissage de la jauge solde / prix du cercle. */
    gaugeMs: number
    /** Durée de la confirmation « Pari posé : … » dans le pied du panneau de paris. */
    betConfirmMs: number
  }
}
