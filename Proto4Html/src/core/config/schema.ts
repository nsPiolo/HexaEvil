import type { BetTypeId } from '../rules/betTypes'

/** Forme validée de `config/race.json` (GDD proto4 §9.1 : tout ce qui est chiffré vit là). */
/** Case bloquée d'un cercle (rétrécissement, GDD §2.2). */
export interface BlockedCell {
  column: number
  lane: number
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
    stakes: readonly number[]
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
    circles: readonly {
      name: string
      price: number
      souls: number
      /** Couloirs de la piste (GDD §2.2). Pas encore appliqué en course. */
      lanes: number
      /** Cases bloquées : colonne de parcours (1 = première après le départ), couloir (0 = celui du bas). */
      blocked: readonly BlockedCell[]
      boss: string
      power: string
    }[]
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
  }
}
