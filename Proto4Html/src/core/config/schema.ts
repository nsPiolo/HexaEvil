/** Forme validée de `config/race.json` (GDD proto4 §9.1 : tout ce qui est chiffré vit là). */
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
  animation: {
    stepMs: number
    diceMs: number
    pauseMs: number
  }
}
