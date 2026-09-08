/**
 * Les dialogues — spéc. interface §2 et « À la fin d'un cercle ».
 *
 * Le texte de l'intro est repris **mot pour mot** de la spéc, coquilles
 * comprises quand elles font partie du ton du démon stagiaire.
 */

import type { CircleConfig } from '../core/config/schema'

export interface Bubble {
  readonly who: 'demon' | 'player'
  readonly text: string
}

export const INTRO: readonly Bubble[] = [
  { who: 'demon', text: 'Félicitations, vous êtes mort !' },
  { who: 'demon', text: 'On a étudié votre dossier, et sans grande surprise, vous avez fini ici.' },
  {
    who: 'demon',
    text: 'Je suis en stage, et je n’ai pas les accréditations nécessaires pour vous affecter à la bonne punition, en plus elle est actuellement en réfection…',
  },
  { who: 'demon', text: '…on va devoir attendre le boss…' },
  { who: 'demon', text: '…voilà, voilà… désolé…' },
  { who: 'demon', text: 'Ça vous tente une partie de dés pour tuer le temps ?' },
  { who: 'player', text: 'Non merci, sans plus.' },
  {
    who: 'demon',
    text: 'Non !? Je comprends que vous ne soyez pas d’humeur, mais j’me fais chier ici, et si vous gagnez j’allège votre peine.',
  },
  { who: 'player', text: 'Je ne suis pas là pour vous occuper.' },
  { who: 'demon', text: 'Allez, s’il vous plaît !' },
  { who: 'demon', text: 'Je vous laisse même jouer avec un dé de plus.' },
  { who: 'player', text: 'Bon, ok, mais pas d’entourloupe.' },
  { who: 'demon', text: 'Parfait, on a un pacte !' },
  { who: 'demon', text: 'Ici on joue à une variante du 4-21, donc voilà 3 dés et un jeu de cartes.' },
  { who: 'player', text: 'Je dois pas avoir un dé en plus ?' },
  {
    who: 'demon',
    text: 'Ah oui ! Bon… voilà un 4ᵉ dé, mais on ne prendra que les 3 meilleurs, faut pas abuser non plus.',
  },
  { who: 'player', text: 'Et à quoi servent les cartes au 4-21 ?' },
  { who: 'demon', text: 'À tricher, pardi !?' },
]

/**
 * L'écran de fin de Cercle. La deuxième bulle **dit ce qui change** : c'est la
 * seule information de progression que le joueur reçoit avant de repayer.
 */
export function circleCleared(done: CircleConfig, next: CircleConfig): Bubble[] {
  const changes: string[] = []
  if (next.cards > done.cards) {
    changes.push(`…ils jouent avec ${next.cards} cartes leurs batailles`)
  }
  if (next.dieFaces > done.dieFaces) {
    changes.push(`…ils utilisent des dés à ${next.dieFaces} faces`)
  }
  if (next.winsRequired > done.winsRequired) {
    changes.push(`…et il faudra ${next.winsRequired} victoires pour en sortir`)
  }
  if (changes.length === 0) changes.push('…et ils ne vous feront aucun cadeau')
  return [
    {
      who: 'demon',
      text: 'Félicitations, je ne pensais pas me faire battre par une âme déchue un jour. Je te laisse passer au cercle suivant, mais attention…',
    },
    ...changes.map((text): Bubble => ({ who: 'demon', text })),
  ]
}
