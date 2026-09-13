/**
 * Tous les textes affichés au joueur, en français. Regroupés ici pour qu'une
 * traduction ultérieure (option « Langue ») n'ait qu'un fichier à toucher.
 * Les dialogues de l'intro, de la fin de 2e course et du cercle 1 viennent de
 * docs/proto4/interface.md ; les autres cercles et la fin sont générés ici.
 */

export type Speaker = 'demon' | 'player'
export interface Line {
  who: Speaker
  text: string
}

const D = (text: string): Line => ({ who: 'demon', text })
const P = (text: string): Line => ({ who: 'player', text })

export const GAME_NAME = "Sinner's Bet"

export const MENU = {
  continue: 'Continuer',
  newRun: 'Commencer une nouvelle évasion',
  stats: 'Statistiques',
  options: 'Option',
  back: 'Retour',
  next: 'Suite',
  skipIntro: "Passer l'introduction",
  skip: 'Passer',
} as const

export const INTRO: readonly Line[] = [
  D('Félicitations, vous êtes mort !'),
  D('On a étudié votre dossier, et sans grande surprise, vous avez fini ici.'),
  D("Je suis en stage, et je n'ai pas les accréditations nécessaires pour vous affecter à la bonne punition. En plus elle est actuellement en réfection…"),
  D('…on va devoir attendre le boss…'),
  D('…voilà, voilà… désolé…'),
  D('Ça vous tente un petit pari pour tuer le temps ?'),
  P('Non merci, sans plus.'),
  D("Non !? Je comprends que vous ne soyez pas d'humeur, mais je m'ennuie ferme ici. Je vous prête un peu d'argent et vous pourrez conserver vos gains."),
  P("Bon, d'accord, mais pas d'entourloupe."),
  D('Parfait, on a un pacte !'),
  D("Ici on mise sur une course d'âmes damnées, donc voilà {money} pièces pour commencer."),
]

/** Fin de la deuxième course : le boss du cercle arrive. */
export const BOSS_ANNOUNCE: readonly Line[] = [
  D("Mon boss est de retour, il nous a vus jouer. Il vous propose de parier avec lui, et si vous avez {price} pièces à la fin, il veut bien vous autoriser à continuer de parier."),
]

export interface CircleTexts {
  /** Nom ordinal affiché en overlay : « 1er Cercle ». */
  ordinal: string
  /** Écran de transition après le cercle, prix payé. Dit ce qui change au cercle suivant. */
  success: readonly Line[]
  /** Écran de transition après le cercle, prix impayable : fin de run. */
  failure: readonly Line[]
}

export const CIRCLES: readonly CircleTexts[] = [
  {
    ordinal: '1er',
    success: [
      D("Félicitations, je ne pensais pas que vous pouviez réussir."),
      D('Si ça vous va, je vais vous coacher. On va vous tester dans les autres cercles.'),
      D('Prochain arrêt : la Luxure. Des vents éternels y bousculent les âmes, il y en aura {souls} au départ, une de plus. Et le tarif de sortie monte à {price} pièces.'),
    ],
    failure: [D("Bon, vous êtes nul en fait !! Finalement, j'ai trouvé quelle punition éternelle vous allez subir. Bye.")],
  },
  {
    ordinal: '2e',
    success: [
      D('Deux cercles ! Mon chef de service a cessé de me tutoyer, c\'est bon signe.'),
      D('La Gourmandise nous attend : de la boue jusqu\'aux genoux et Cerbère qui ronge tout ce qui traîne. Toujours {souls} âmes au départ, mais la sortie coûte {price} pièces.'),
    ],
    failure: [D("Dommage. Les vents de la Luxure vous emportent, et moi je retourne classer des dossiers. Bye.")],
  },
  {
    ordinal: '3e',
    success: [
      D("Vous avez le nez pour les bonnes cotes. On m'a confié un badge d'accès au quatrième."),
      D("L'Avarice : des âmes qui poussent des poids face à face, éternellement. {souls} âmes au départ, une de plus, et {price} pièces pour passer."),
    ],
    failure: [D("Cerbère a faim, et vous n'avez plus rien à miser. Vous connaissez la sortie… enfin, non, justement. Bye.")],
  },
  {
    ordinal: '4e',
    success: [
      D("Quatre cercles. Les avares ont pleuré en vous voyant repartir avec leur argent. Moi, j'ai eu une prime."),
      D("La Colère, maintenant : le Styx, un marais où les âmes se frappent sans fin. Toujours {souls} âmes, et {price} pièces pour la sortie."),
    ],
    failure: [D("Les avares gardent tout, vous compris. Ça finit bizarrement bien pour eux. Bye.")],
  },
  {
    ordinal: '5e',
    success: [
      D("Vous êtes ressorti du Styx sans une éclaboussure. Le boss a demandé votre nom. Le mien aussi, pour une fois."),
      D("L'Hérésie ensuite : des tombes incandescentes, et {souls} âmes au départ, une de plus. La sortie passe à {price} pièces."),
    ],
    failure: [D("Le Styx vous garde. Pas de rancune : je vous mets dans le marais, c'est juste à côté du bureau. Bye.")],
  },
  {
    ordinal: '6e',
    success: [
      D("Six cercles. On me laisse remplacer des âmes en course, maintenant. Coach titulaire, presque."),
      D("La Violence est en trois sous-cercles : fleuve de sang, buissons, sable brûlant. Toujours {souls} âmes, mais {price} pièces pour passer."),
    ],
    failure: [D("Les tombes de l'Hérésie ont une place libre, ça tombe bien. Bye.")],
  },
  {
    ordinal: '7e',
    success: [
      D("Sept cercles. Mon boss commence à me regarder de travers. Je crois qu'il a compris qui coache qui."),
      D("La Fraude : dix fosses concentriques, les Malebolge, pleines de séducteurs et de faussaires. {souls} âmes au départ, une de plus, et {price} pièces de sortie."),
    ],
    failure: [D("Le sable brûlant, le fleuve de sang… choisissez, je suis bon prince. Bye.")],
  },
  {
    ordinal: '8e',
    success: [
      D("Huit cercles. Il ne reste que la Trahison. Et… on m'a promu. Je dirige le neuvième."),
      D("Ce n'est pas un problème, hein ? Un pacte, c'est un pacte. Il y aura {souls} âmes au départ, gelées dans le Cocyte, et il faudra {price} pièces pour sortir. Pour de bon."),
    ],
    failure: [D("Les faussaires vous ont eu à votre propre jeu. Une fosse vous attend au fond des Malebolge. Bye.")],
  },
  {
    ordinal: '9e',
    success: [
      D("Vous… vous avez payé. Contre moi. Contre le neuvième cercle."),
      D("Un pacte, c'est un pacte. La porte est là. Personne n'est jamais remonté d'ici, alors ne racontez pas comment vous avez fait."),
      P("Et vous ?"),
      D("Moi ? Je suis patron d'un cercle. Il me manque juste un parieur qui sache lire une course. Vous connaissez quelqu'un ?"),
      D("Allez, filez. Et gardez la monnaie."),
    ],
    failure: [D("À une pièce près. C'est le cercle de la Trahison, vous vous attendiez à quoi ? Bienvenue dans la glace. Bye.")],
  },
]

export const ENDINGS = {
  gameOverTitle: 'Punition éternelle',
  gameOverBody: 'Le prix du cercle était de {price} pièces. Il vous en manquait {missing}.',
  escapeTitle: 'Évasion',
  escapeBody: 'Neuf cercles traversés, {money} pièces en poche. Le stagiaire est devenu boss, et vous, vous êtes sorti.',
  backToMenu: 'Retour au menu',
} as const

export const HUD = {
  steps: ['Pari', 'Boutique', 'Course', 'Gains'] as const,
  circle: '{ordinal} Cercle',
  race: '{n} course sur {total}',
  bossRace: 'Course du boss ({n} sur {total})',
  raceOrdinals: ['1re', '2e', '3e', '4e', '5e'] as const,
  coins: '{n} Pièces',
  artefacts: '{n} artefact{s}',
  price: 'Prix du cercle : {price} pièces',
  bets: 'Paris',
  shop: 'Boutique',
  close: 'Fermer',
  leaveShop: 'Partir à la course',
  toRace: 'Lancer la course',
  nextRace: 'Continuer',
  menu: 'Menu',
} as const

export const MAP = {
  title: 'Les neuf cercles',
  subtitle: 'Cliquez sur la prochaine course pour la lancer.',
  current: 'Vous êtes ici',
  done: 'course jouée',
  next: 'prochaine course',
  locked: 'à venir',
  boss: 'Boss',
  power: 'Pouvoir',
  powerPending: 'règle à venir dans le proto',
  price: 'Prix du cercle',
  priceHidden: 'inconnu tant que vous n’y êtes pas',
  race: 'Course {n}',
  bossRace: 'Course du boss',
  launch: 'Lancer la course',
  circleOf: 'Cercle {n} — {name}',
} as const

export const STATS = {
  title: 'Statistiques',
  attempts: 'Nombre de tentatives',
  escapes: "Nombre d'évasions",
  bestCircle: 'Cercle atteint',
  moneyWon: 'Argent gagné',
  moneySpent: 'Argent dépensé',
  races: 'Courses jouées',
  bestBet: 'Meilleur pari',
  none: '—',
} as const

export const OPTIONS = {
  title: 'Option',
  volume: 'Volume',
  volumeDisabled: "pas de musique pour l'instant",
  language: 'Langue',
  languageDisabled: 'seul le français est disponible pour l’instant',
  speed: 'Vitesse des animations',
} as const

/** Remplace les {clés} d'un texte. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (values[k] !== undefined ? String(values[k]) : `{${k}}`))
}
