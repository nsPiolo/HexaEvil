/**
 * Profils de joueur simulé (équilibrage, `npm run balance`).
 *
 * Le nombre de cercles franchis dépend surtout de **comment** on joue, pas seulement des prix :
 * un profil fixe les trois décisions qui pèsent, pour qu'on compare des prix à jeu constant.
 *
 * Ce sont des modèles, pas des joueurs : ils servent à encadrer l'équilibrage, pas à le prouver.
 */
import type { BetTypeId } from '../src/core/rules/bets'

/** Comment le joueur apparie ses dés Âme et ses dés Distance à chaque tour. */
export type Pairing =
  /** Dé Âme i avec dé Distance i, sans réfléchir : le joueur qui n'a pas vu que l'ordre était gratuit. */
  | 'naturelle'
  /** La plus grande distance sur l'âme pariée, la plus petite sur celle qui la gêne le plus. */
  | 'favorite'

/** Ce que le joueur pose comme paris avant le départ. */
export type Betting =
  /** Un seul ticket simple, mise minimale : le joueur qui ne veut pas perdre. */
  | 'prudent'
  /** Deux ou trois tickets simples, mise moyenne : le joueur qui étale. */
  | 'etale'
  /** La plus grosse cote ouverte par son grade, grosse mise : le joueur qui vise le jackpot. */
  | 'gourmand'

/** Ce que le joueur achète en boutique. */
export type Shopping =
  /** Il n'ouvre jamais la boutique. */
  | 'rien'
  /** Il achète le meilleur objet sans contrepartie qu'il peut payer, en gardant de quoi miser. */
  | 'prudent'

/** Le joueur repose-t-il des paris pendant la course, une fois le plateau lisible ? */
export type LateBets =
  /** Il pose tout avant le départ et ne touche plus à rien. */
  | 'aucun'
  /** À chaque tour, tant que le guichet est ouvert, il remise sur l'âme en tête. La cote a décoté,
   *  mais l'issue est bien plus sûre : c'est le geste que fait n'importe quel joueur qui regarde. */
  | 'opportuniste'

export interface Profile {
  name: string
  pairing: Pairing
  betting: Betting
  shopping: Shopping
  lateBets: LateBets
  /** Part du solde qu'il accepte de miser sur une course (le reste sert à payer le cercle). */
  stakeShare: number
}

/** Les trois profils du rapport : un plancher, un milieu, un plafond. */
export const PROFILES: readonly Profile[] = [
  { name: 'débutant', pairing: 'naturelle', betting: 'prudent', shopping: 'rien', lateBets: 'aucun', stakeShare: 0.15 },
  { name: 'appliqué', pairing: 'favorite', betting: 'etale', shopping: 'prudent', lateBets: 'opportuniste', stakeShare: 0.3 },
  { name: 'joueur', pairing: 'favorite', betting: 'gourmand', shopping: 'prudent', lateBets: 'opportuniste', stakeShare: 0.7 },
]

/** Types de paris que chaque style essaie, du plus sûr au plus rentable. */
export const BETTING_ORDER: Readonly<Record<Betting, readonly BetTypeId[]>> = {
  prudent: ['top3', 'notTop3', 'winner'],
  etale: ['top3', 'notTop3', 'last', 'winner'],
  gourmand: ['fullRankingExact', 'podiumExact', 'winnerAndLast', 'podiumAnyOrder', 'twoInTop3', 'duel', 'winner'],
}

/**
 * Nombre de tickets posés au départ d'une course. Le jeu n'en limite pas le nombre : c'est le
 * profil qui se retient. « gourmand » en pose autant qu'il peut payer, pour que le rapport
 * mesure bien le plafond de revenu du jeu et pas celui du modèle.
 */
export const TICKETS: Readonly<Record<Betting, number>> = { prudent: 1, etale: 3, gourmand: 8 }
