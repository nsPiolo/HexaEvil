/**
 * Tout le texte français de l'interface — GDD §13.
 *
 * `U3` : chaque étape est **nommée avec sa cause**. Le testeur doit pouvoir lire
 * la règle appliquée sans connaître le GDD par cœur.
 */

import type { DiceHand, FaceEffectId, HandCategory, HandRank, RewardId, Suit } from '../core/rules/types'
import type { TraceStep } from '../core/rules/trace'

export const SUIT_SYMBOL: Record<Suit, string> = {
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  clubs: '♣',
}

export const SUIT_LABEL: Record<Suit, string> = {
  diamonds: 'Carreau',
  hearts: 'Cœur',
  spades: 'Pique',
  clubs: 'Trèfle',
}

export function cardValueLabel(value: number): string {
  if (value === 14) return 'A'
  if (value === 13) return 'R'
  if (value === 12) return 'D'
  if (value === 11) return 'V'
  return String(value)
}

export const CATEGORY_LABEL: Record<HandCategory, string> = {
  cinqIdentiques: '5 identiques',
  quinteFlush: 'quinte flush',
  carre: 'carré',
  full: 'full',
  couleur: 'couleur',
  suite: 'suite',
  brelan: 'brelan',
  doublePaire: 'double paire',
  paire: 'paire',
  carteHaute: 'carte haute',
}

/** `U8b` : le rang **pour cette taille de main** — `C12` est illisible sans lui. */
export function handLabel(rank: HandRank, ladderSize: number): string {
  return `${CATEGORY_LABEL[rank.category]} — ${rank.rank + 1}ᵉ sur ${ladderSize}`
}

export function diceHandLabel(hand: DiceHand): string {
  const v = hand.values
  switch (hand.id) {
    case '421':
      return '4-2-1'
    case 'triple1':
      return '1-1-1'
    case 'triple':
      return `brelan de ${v[0]}`
    case 'pairOfOnes': {
      const x = [...v].sort((a, b) => b - a)[0]
      return `1-1-${x}`
    }
    case 'straight':
      return 'suite'
    case 'nenette':
      return 'nénette'
    case 'junk':
      return 'rien'
  }
}

export function chips(n: number): string {
  return `${n} jeton${Math.abs(n) > 1 ? 's' : ''}`
}

export const REWARD_LABEL: Record<RewardId, string> = {
  give3: 'Donner 3 jetons',
  give5: 'Donner 5 jetons',
  setRerolls: 'Fixer les relances',
  flipDie: 'Retourner un dé',
  extraDie: 'Un dé en plus',
  set42: 'Fixer 4 et 2',
  valuePlus1: '+1 en jetons',
  reroll421: 'Annuler les 4-2-1',
  splitGive: 'Donner aux deux',
  takeLess: 'Encaisser moins',
  nenetteGift: 'La nénette paie',
}

export const REWARD_HELP: Record<RewardId, string> = {
  give3: 'Tout de suite : un adversaire reçoit 3 jetons, pris dans le pot s’il en reste, sinon dans votre réserve.',
  give5: 'Tout de suite : un adversaire reçoit 5 jetons, pris dans le pot s’il en reste, sinon dans votre réserve.',
  setRerolls: '1, 2 ou 3 relances maximum — pour tout le monde, vous compris.',
  flipDie: 'Une fois par partie : un dé montre sa face opposée, telle qu’elle est gravée.',
  extraDie: 'Un dé de plus au **premier lancer de chaque phase**. Le jeu retire ensuite le dé le moins utile, et retient toujours la meilleure combinaison de trois.',
  set42: 'Une fois par partie : deux dés fixés sur 4 et 2, un seul jet, définitif.',
  valuePlus1: 'Toutes vos combinaisons transfèrent 1 jeton de plus.',
  reroll421: 'Un adversaire qui termine sur un 4-2-1 relance automatiquement tous ses dés. Une seule fois par tour.',
  splitGive: 'Quand vous donnez des jetons à un adversaire, l’autre en reçoit la moitié (arrondie à l’inférieur). Sans effet en duel.',
  takeLess: 'Quand vous encaissez des jetons, vous en prenez un de moins — au minimum 1. Moins de jetons à évacuer, mais moins d’argent.',
  nenetteGift: 'Pour tout le monde : une nénette (2-2-1) fait circuler un jeton vers chaque adversaire, même si vous perdez la manche.',
}

/** `F10` : un symbole par effet de face, et sa règle en une ligne. */
export const EFFECT_SYMBOL: Record<FaceEffectId, string> = {
  freeReroll: '↻',
  takeLess: '⊖',
  wild: '✳',
  payAll: '⇈',
  money: '✦',
  forge: '⚒',
}

export const EFFECT_LABEL: Record<FaceEffectId, string> = {
  freeReroll: 'Relance gratuite',
  takeLess: 'Encaisse un jeton de moins',
  wild: 'Vaut aussi sa face opposée',
  payAll: 'Un jeton du pot pour tous',
  money: '+1 d’argent en fin de tour',
  forge: 'Deux visibles : +1 point de forge',
}

export const EFFECT_HELP: Record<FaceEffectId, string> = {
  freeReroll: 'Quand cette face sort, vous pouvez relancer ce dé sans consommer de jet.',
  takeLess: 'Visible en fin de lancers : un jeton de moins à encaisser, jamais sous 1.',
  wild: 'La face vaut sa valeur ou celle de la face opposée — le jeu prend la meilleure combinaison.',
  payAll: 'À chaque apparition, chaque participant prend un jeton du pot. Vous y compris.',
  money: 'Visible en fin de lancers : +1 d’argent. Si tous vos dés l’affichent, +10.',
  forge: 'Deux exemplaires visibles en fin de lancers : +1 point de forge.',
}

export const PHASE_LABEL = {
  charge: 'Répartition',
  discharge: 'Don',
} as const

/** La phrase qui nomme l'étape en cours, avec la règle qu'elle applique. */
export function describeStep(step: TraceStep, names: readonly string[]): string {
  const who = (i: number): string => names[i] ?? `#${i}`
  switch (step.kind) {
    case 'matchStart':
      return step.isCircleFinal
        ? `Dernière partie du Cercle ${step.circle} — trois participants, ${chips(step.pot)} dans le pot`
        : `Cercle ${step.circle} — duel, ${chips(step.pot)} dans le pot`
    case 'rewardsDrawn':
      return `${step.offered.length} récompenses sur la table pour ${step.offered.length - 1} batailles`
    case 'duelStart':
      return `Bataille de cartes ${step.index + 1} sur ${step.total} — ${step.handSize} carte${step.handSize > 1 ? 's' : ''}`
    case 'duelDraw':
      return 'Chacun tire dans son propre deck'
    case 'duelMulligan': {
      const total = step.swaps.reduce((a, b) => a + b, 0)
      return total === 0
        ? `Changement ${step.pass} — personne ne change de carte`
        : `Changement ${step.pass} — ${total} carte${total > 1 ? 's' : ''} échangée${total > 1 ? 's' : ''}`
    }
    case 'duelReveal':
      return 'Révélation des mains'
    case 'coinFlip':
      return `${step.reason} — la pièce tombe sur ${step.result}, ${who(step.winner)} l’emporte`
    case 'duelWon':
      return `${who(step.who)} remporte la bataille avec ${CATEGORY_LABEL[step.category as HandCategory] ?? step.category}`
    case 'rewardTaken':
      return `${who(step.who)} prend « ${REWARD_LABEL[step.id]} »`
    case 'rewardSetting':
      return `${who(step.who)} choisit : ${step.detail}`
    case 'rewardApplied': {
      const source =
        step.fromOwner === 0
          ? 'pris dans le pot'
          : step.fromPot === 0
            ? `pris dans la réserve de ${who(step.owner)}`
            : `dont ${step.fromPot} du pot et ${step.fromOwner} de sa réserve`
      return `${REWARD_LABEL[step.id]} — ${who(step.target)} reçoit ${chips(step.amount)}, ${source}`
    }
    case 'phaseStart':
      return step.phase === 'charge'
        ? `Phase de répartition — on vide le pot, la pire main encaisse. ${who(step.leader)} mène.`
        : `Phase de don — la meilleure main donne, le premier à zéro gagne. ${who(step.leader)} mène.`
    case 'roundStart':
      return `Manche ${step.round} — ${who(step.leader)} ouvre et fixe le nombre de jets`
    case 'throw': {
      const head = `${who(step.who)} — jet ${step.throwNo}/${step.maxThrows}`
      const tail = ` · ${diceHandLabel(step.hand)} (${step.hand.chipValue})`
      if (step.via === 'set42') return `${head} · 4 et 2 fixés, jet unique et définitif${tail}`
      const extra = step.values.length > 3 ? ` · meilleurs 3 dés sur ${step.values.length}` : ''
      return `${head}${extra}${tail}`
    }
    case 'dropDie':
      return `Le dé en plus a joué : ${who(step.who)} repart avec ${step.values.length} dés, le ${step.before[step.dropped]} est écarté`
    case 'flipUsed':
      return `${who(step.who)} retourne un dé : ${step.from} devient ${step.to} · ${diceHandLabel(step.hand)}`
    case 'turnEnd':
      return `${who(step.who)} s’arrête sur ${diceHandLabel(step.hand)} — ${chips(step.hand.chipValue)}`
    case 'roundResult': {
      const best = step.hands[step.best]
      const label = best ? diceHandLabel(best) : ''
      if (step.phase === 'charge') {
        return `${who(step.worst)} a la pire main : il prend ${chips(step.amount)} au pot — la valeur du ${label} de ${who(step.best)}`
      }
      if (step.best === step.worst) return 'Personne à qui donner'
      return `${who(step.best)} l’emporte avec ${label} et donne ${chips(step.amount)} à ${who(step.worst)}`
    }
    case 'out':
      return step.place === 1
        ? `${who(step.who)} n’a plus de jetons — il gagne la partie`
        : `${who(step.who)} n’a plus de jetons — ${step.place}ᵉ`
    case 'phaseEnd':
      return step.phase === 'charge' ? 'Le pot est vide' : 'Phase de don terminée'
    case 'forcedReroll':
      return `4-2-1 annulé par ${who(step.owner)} — ${who(step.who)} relance tout et retombe sur ${diceHandLabel(step.hand)}`
    case 'sideGift':
      return `${REWARD_LABEL.splitGive} — ${who(step.to)} reçoit aussi ${chips(step.amount)}`
    case 'nenetteGift':
      return step.source === 'pot'
        ? `Nénette de ${who(step.who)} — chaque adversaire prend ${chips(step.amount)} au pot`
        : `Nénette de ${who(step.who)} — il donne ${chips(step.amount)} à chaque adversaire`
    case 'faceBonus':
      return `${EFFECT_SYMBOL[step.effect]} ${who(step.who)} — ${step.detail}`
    case 'matchEnd':
      return step.humanWon ? 'Vous remportez la partie' : 'Partie perdue'
  }
}

/** Durée d'affichage d'une étape, en ms, avant application de la vitesse (`U13`). */
export const STEP_MS: Record<TraceStep['kind'], number> = {
  matchStart: 1400,
  rewardsDrawn: 1100,
  duelStart: 700,
  duelDraw: 900,
  duelMulligan: 900,
  duelReveal: 1400,
  coinFlip: 1800,
  duelWon: 1100,
  rewardTaken: 1100,
  rewardSetting: 1000,
  rewardApplied: 1300,
  phaseStart: 1600,
  roundStart: 700,
  throw: 900,
  dropDie: 1100,
  faceBonus: 1200,
  forcedReroll: 1500,
  sideGift: 1100,
  nenetteGift: 1300,
  flipUsed: 1200,
  turnEnd: 500,
  roundResult: 1600,
  out: 1500,
  phaseEnd: 1000,
  matchEnd: 1600,
}
