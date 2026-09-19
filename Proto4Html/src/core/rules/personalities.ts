/**
 * Personnalités d'âmes — GDD §6.5, docs/proto4/personnalites.md.
 *
 * Une personnalité est un comportement **collé à une âme** et non au joueur : elle ne se
 * déclenche pas, elle change la façon dont cette âme lit les dés, percute, encaisse. Le
 * joueur ne la commande pas ; il la lit avant de parier (GDD §1.3, §6.5). C'est la
 * différence avec un artefact, qui joue pour lui.
 *
 * Deux façons d'en attribuer une :
 *
 * - **la révélation** : à la fin de la première course de chaque cercle, à partir du
 *   troisième, l'âme la mieux classée qui n'en a pas révèle la sienne, tirée au sort
 *   (`revealTarget`, `drawPersonality`) ;
 * - **la boutique** : un objet par personnalité, plus un objet qui en retire une. Le joueur
 *   choisit l'âme, y compris une âme déjà marquée — la nouvelle remplace l'ancienne.
 *
 * Dans les deux cas elle tient **tout le run** : elle voyage dans l'inventaire
 * (`shop/shop.ts`), donc dans la sauvegarde, et une âme n'en porte qu'une à la fois.
 *
 * Où chaque effet est câblé, parce qu'aucun ne se résout au même moment :
 *
 * | Moment | Personnalités | Où |
 * |---|---|---|
 * | lecture de la face | Constant, Opposant | `readDie`, appelé par `effectiveDistance` |
 * | amplitude du déplacement | Ambitieux, Martyr, Condamné | `shapeMove`, idem |
 * | tirage des dés Âme | Tricheur | `rollPlayerDice`, `rollOpponentPair` |
 * | contre le plateau | Résolu, Ogre, Parasite, Martyr (rancunes) | `applyMove` |
 * | règlement des paris | Juge | `settleBets`, par `gainFactor` |
 */
import type { Ranked, SoulId } from './race'
import type { Rng } from './rng'

export const PERSONALITY_IDS = [
  'martyr', 'ambitieux', 'tricheur', 'condamne', 'parasite', 'juge',
  'resolu', 'opposant', 'constant', 'ogre',
] as const
export type PersonalityId = (typeof PERSONALITY_IDS)[number]

/**
 * Personnalité de chaque âme, par id d'âme. Une âme sans personnalité n'a pas d'entrée —
 * l'absence est l'état normal, y compris au dernier cercle.
 */
export type Personalities = Readonly<Record<number, PersonalityId>>

export const NO_PERSONALITIES: Personalities = {}

/** Premier cercle où une âme révèle sa personnalité en fin de première course. */
export const REVEAL_FROM_CIRCLE = 3

/** Valeur que Le Constant lit sur tout dé Distance. */
export const CONSTANT_VALUE = 1

/** L'Ambitieux pousse les grosses valeurs d'un cran de plus, dans les deux sens. */
export const AMBITIOUS_STEP = 1
/** Valeur à partir de laquelle une avancée est « grosse » pour l'Ambitieux. */
export const AMBITIOUS_FROM = 3

/** Le Tricheur : une chance sur autant que le dé Âme qui le désigne soit relancé. */
export const TRICKSTER_ONE_IN = 4

/** L'Ogre : ce que recule l'âme qu'il dépasse en la percutant. */
export const OGRE_PUSH = 1

/** Le Parasite : il avance d'autant quand l'âme devant lui avance d'au moins `PARASITE_TRIGGER`. */
export const PARASITE_STEP = 1
export const PARASITE_TRIGGER = 2

/** Le Juge : facteur sur les gains du joueur selon son propre classement. Les pertes ne bougent pas. */
export const JUDGE_TOP_FACTOR = 1.5
export const JUDGE_LAST_FACTOR = 0.5
/** Rang jusqu'auquel le Juge est content. */
export const JUDGE_TOP = 3

export function personalityOf(personalities: Personalities | undefined, soul: SoulId): PersonalityId | null {
  return personalities?.[soul] ?? null
}

/** L'âme qui porte cette personnalité dans cette course, ou null. Une seule à la fois par id. */
export function soulWith(personalities: Personalities | undefined, id: PersonalityId, soulCount: number): SoulId | null {
  if (!personalities) return null
  for (let s = 0; s < soulCount; s++) if (personalities[s] === id) return s
  return null
}

/**
 * Comment l'âme lit la face du dé Distance, **avant** tout ce que le plateau, le boss ou les
 * objets du joueur y ajoutent : ces deux-là ne modifient pas un déplacement, elles changent
 * ce que le dé veut dire pour cette âme.
 */
export function readDie(personality: PersonalityId | null, value: number): number {
  switch (personality) {
    // Le Constant : le dé a beau dire ce qu'il veut, il avance d'une case.
    case 'constant':
      return CONSTANT_VALUE
    // L'Opposant : il prend la valeur opposée, un 2 le fait reculer de 2, un -1 l'avance de 1.
    case 'opposant':
      return -value
    default:
      return value
  }
}

/** Ce que la personnalité a besoin de savoir du plateau pour donner sa forme au déplacement. */
export interface ShapeContext {
  /** Tour en cours, à partir de 1 : Le Condamné part avec un malus. */
  turn: number
  /** Colonne occupée avant le déplacement : Le Condamné accélère depuis la zone de fin. */
  position: number
  /** Première colonne de la zone de fin (`Track.betThresholdColumn`). */
  betThresholdColumn: number
}

/**
 * Amplitude du déplacement une fois la face lue et les autres modificateurs appliqués.
 *
 * Le Condamné du GDD « commence avec un malus puis accélère en approchant de l'arrivée ». Le
 * malus est ici celui du **premier tour** plutôt que du premier déplacement positif : c'est la
 * même lecture pour le joueur (il part lent) et cela se calcule sans mémoriser un compteur par
 * âme et par course, qu'un artefact ou une case spéciale déréglerait sans qu'on le voie.
 */
export function shapeMove(personality: PersonalityId | null, distance: number, ctx: ShapeContext): number {
  switch (personality) {
    // L'Ambitieux : les grands écarts deviennent plus grands, dans les deux sens.
    case 'ambitieux':
      if (distance >= AMBITIOUS_FROM) return distance + AMBITIOUS_STEP
      if (distance <= -1) return distance - AMBITIOUS_STEP
      return distance
    // Le Martyr : il traîne, et ce qu'il perd en route lui revient d'un coup (voir `grudges`).
    case 'martyr':
      return distance > 0 ? Math.max(1, distance - 1) : distance
    // Le Condamné : lourd au départ, lancé une fois la zone de fin atteinte.
    case 'condamne':
      if (distance <= 0) return distance
      if (ctx.position >= ctx.betThresholdColumn) return distance + 1
      return ctx.turn === 1 ? Math.max(0, distance - 1) : distance
    default:
      return distance
  }
}

/**
 * Le Juge : facteur sur les gains de la course selon sa place (GDD §6.5). 1 quand il n'est
 * pas en piste — c'est la seule personnalité qui se lit sur le ticket et non sur la piste,
 * et le joueur doit la surveiller même sans parier dessus.
 */
export function judgeFactor(personalities: Personalities | undefined, ranked: readonly Ranked[]): number {
  const judge = ranked.find((r) => personalityOf(personalities, r.soul.id) === 'juge')
  if (!judge) return 1
  const last = ranked.reduce((m, r) => Math.max(m, r.rank), 0)
  if (judge.rank <= JUDGE_TOP) return JUDGE_TOP_FACTOR
  if (judge.rank === last) return JUDGE_LAST_FACTOR
  return 1
}

/**
 * L'âme qui révèle sa personnalité à la fin de cette course : la mieux classée parmi celles
 * qui n'en ont pas. Rien de laissé au hasard ici — le hasard est dans la personnalité tirée,
 * pas dans la désignation. Null si toutes les âmes en course sont déjà marquées.
 */
export function revealTarget(ranked: readonly Ranked[], personalities: Personalities | undefined): SoulId | null {
  return ranked.find((r) => personalityOf(personalities, r.soul.id) === null)?.soul.id ?? null
}

/**
 * Personnalité tirée pour une révélation. On tire d'abord parmi celles que personne ne porte
 * encore : deux Martyrs sur la même piste diraient deux fois la même chose au joueur, et le
 * catalogue est assez large pour l'éviter jusqu'au dernier cercle. Une fois les dix posées,
 * on retire au hasard parmi toutes.
 */
export function drawPersonality(personalities: Personalities | undefined, rng: Rng): PersonalityId {
  const taken = new Set(Object.values(personalities ?? {}))
  const pool = PERSONALITY_IDS.filter((id) => !taken.has(id))
  const from = pool.length > 0 ? pool : PERSONALITY_IDS
  return from[rng.int(from.length)] ?? 'martyr'
}

/** Une course dont la fin révèle une personnalité : la première de chaque cercle, à partir du troisième. */
export function revealsPersonality(circle: number, raceInCircle: number): boolean {
  return circle >= REVEAL_FROM_CIRCLE && raceInCircle === 1
}

export function isPersonalityId(id: string): id is PersonalityId {
  return (PERSONALITY_IDS as readonly string[]).includes(id)
}
