/** Les dix types de paris du GDD proto4 §3.2 à §3.4. Séparé de `bets.ts` pour que la config puisse l'importer sans cycle. */
export const BET_TYPE_IDS = [
  'winner',
  'top3',
  'notTop3',
  'last',
  'podiumAnyOrder',
  'twoInTop3',
  'duel',
  'podiumExact',
  'fullRankingExact',
  'winnerAndLast',
] as const

export type BetTypeId = (typeof BET_TYPE_IDS)[number]
