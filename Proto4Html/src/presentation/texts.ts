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
  /** Nom affiché au-dessus de la bulle ; absent = nom par défaut du locuteur (SPEAKERS). Le démon change de nom quand il monte en grade. */
  label?: string
}

/** Noms par défaut des locuteurs dans les bulles. */
export const SPEAKERS: Record<Speaker, string> = { demon: 'Démon stagiaire', player: 'Vous' }

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
  D("Ici on mise sur une course d'âmes damnées, donc voilà {money} pièces pour commencer. Et avant chaque course, je vous avancerai {allowance} pièces de plus : il faut bien que le guichet tourne."),
  D("Ah, et je n'ai le droit de prendre que les paris simples : vainqueur, top 3, dernier, un duel. Les gros tickets, c'est au-dessus de mon grade. Pour l'instant."),
]

/** Fin de la deuxième course : le boss du cercle arrive. */
export const BOSS_ANNOUNCE: readonly Line[] = [
  D("Mon boss est de retour, il nous a vus jouer. Il vous propose de parier avec lui, et si vous avez {price} pièces à la fin, il veut bien vous autoriser à continuer de parier."),
]

/**
 * Grades du démon (boutique-README.md « Déblocage par la hiérarchie du stagiaire »).
 * Un grade est obtenu quand le boss du cercle `afterCircle` est battu et le prix payé ;
 * ses `lines` sont dites dans le dialogue de fin de ce cercle, juste avant l'annonce du
 * cercle suivant. `label` remplace « Démon stagiaire » dans les bulles à partir de là.
 * Pas encore d'effet sur la boutique : le grade est narratif pour l'instant.
 */
export interface DemonRank {
  name: string
  label: string
  afterCircle: number
  lines: readonly Line[]
}

export const DEMON_RANKS: readonly DemonRank[] = [
  { name: 'Stagiaire', label: 'Démon stagiaire', afterCircle: 0, lines: [] },
  {
    name: 'Assistant',
    label: 'Démon assistant',
    afterCircle: 1,
    lines: [
      D("Et… j'ai une nouvelle. Charon a signé un papier : je suis assistant. Assistant ! Mon premier grade en trois siècles de stage."),
      P('Félicitations. Ça change quoi ?'),
      D("Pour moi, une chaise avec un dossier. Pour vous, deux tickets de plus au guichet : « Deux âmes dans le top 3 » à ×{twoInTop3}, et « Top 3 dans le désordre » à ×{podiumAnyOrder}. Un assistant a le droit de prendre des paris combinés."),
    ],
  },
  {
    name: 'Tourmenteur',
    label: 'Démon tourmenteur',
    afterCircle: 3,
    lines: [
      D("Pendant que Cerbère cherchait sa balle, on m'a remis un grade : tourmenteur. Deuxième échelon."),
      D("J'ai le droit de tourmenter, maintenant. Officiellement. Je vais commencer par mon ancien chef de service."),
      P("Et moi, je suis sur la liste ?"),
      D("Vous ? Vous me rapportez trop. Tant que vous gagnez, je ne tourmente que vos adversaires."),
      D("Et j'ai un tampon de plus : le pari « Vainqueur + dernier » vous est ouvert. ×{winnerAndLast} si vous lisez les deux bouts de la course."),
    ],
  },
  {
    name: 'Contremaître',
    label: 'Démon contremaître',
    afterCircle: 5,
    lines: [
      D("Phlégyas a rendu mon évaluation. Contremaître. J'ai une équipe, un bureau, une fenêtre sur la lave."),
      D("Un contremaître, ça ne coache plus dans son coin : on me regarde. Alors ne me faites pas honte au sixième."),
      P("C'est vous qui parlez de honte ?"),
      D("Je parle d'image de marque. Mon nom est sur votre dossier, maintenant. En gros."),
      D("En échange, un contremaître peut ouvrir le guichet du « Podium exact » : trois âmes, dans l'ordre, ×{podiumExact}. Le genre de ticket qui change une évasion."),
    ],
  },
  {
    name: 'Sous-directeur',
    label: 'Démon sous-directeur',
    afterCircle: 7,
    lines: [
      D("Sous-directeur. Le Minotaure a insisté lui-même. Il paraît que je « fais monter les enjeux »."),
      D("Deux échelons sous le boss du neuvième. Il n'y a jamais eu de stagiaire aussi haut. Il n'y a jamais eu de parieur aussi loin non plus."),
      P("On est liés, alors."),
      D("Par un pacte, oui. Ne l'oubliez pas. Moi, je ne l'oublierai pas."),
      D("Et le grand livre s'ouvre : le « Classement complet exact », ×{fullRankingExact}. Personne ne l'a jamais touché. Ce serait amusant que ce soit contre moi."),
    ],
  },
  { name: 'Boss du neuvième', label: 'Le stagiaire promu', afterCircle: 8, lines: [] },
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
  /** Poignées repliées : elles résument leur contenu (spec 02/C1). */
  tabBets: 'Paris ({n})',
  tabBetsStaked: 'Paris ({n}) · {staked} ¤ misés',
  tabShop: 'Boutique · {n} objet{s}',
  tabShopClosed: 'Boutique',
  tabResults: 'Gains — revoir le classement et le bilan',
  tabShortcut: 'Raccourci clavier : {key}',
  circle: '{ordinal} Cercle',
  race: '{n} course sur {total}',
  bossRace: 'Course du boss ({n} sur {total})',
  raceOrdinals: ['1re', '2e', '3e', '4e', '5e'] as const,
  coins: '{n} Pièces',
  artefacts: '{n} artefact{s}',
  price: 'Prix du cercle : {price} pièces',
  demon: 'Coach : {rank}',
  results: 'Gains',
  raceResult: 'Résultat de la course',
  seeTable: 'Voir la table',
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
  track: 'Piste',
  lanes: '{n} couloir{s}',
  blocked: '{n} case{s} bloquée{s} (colonnes {columns})',
  noBlocked: 'aucune case bloquée',
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

/** Paris verrouillés par le grade du stagiaire ; ticket de guichet (spec 03). */
export const BETS = {
  locked: 'Ce pari s’ouvrira quand le stagiaire sera {rank}.',
  lockedBadge: 'dès {rank}',
  tierLocked: 'verrouillé',
  gain: 'Gain potentiel : +{net} ¤ (×{mult})',
  after: 'Solde après mise : {n} ¤',
  cancel: 'Retirer',
  cancelTitle: 'Rembourse la mise ({stake} ¤). Possible tant que la course n’est pas lancée.',
  overThreshold: 'A dépassé le seuil de pari',
  pickOnBoard: 'Cliquer pour désigner cette âme',
  unpickOnBoard: 'Cliquer pour la retirer du ticket',
  placed: 'Pari posé : {type} · {souls} · {stake} ¤ → +{net} si gagné',
  placedCount: 'Paris posés ({n})',
  placedToggle: 'Afficher ou replier la liste des paris posés',
  diceSeen: 'Dés lancés : {souls} — {dist}',
} as const

/** Jauge des trois usages : solde, misé en course, prix du cercle (spec 01/C1). */
export const GAUGE = {
  label: 'Solde et prix du cercle',
  balance: 'solde',
  price: 'prix du cercle',
  missing: 'encore {missing} ¤ à trouver',
  missingIn: 'encore {missing} ¤ à trouver en {n} course{s}',
  covered: 'prix du cercle couvert',
  margin: 'marge de jeu : +{n} ¤',
  tooltip: 'Solde {money} · misé en course {staked} · prix du cercle {price}',
} as const

/** Boutique : état vide, triade de risque, confirmation (specs 02/C2 et 04). */
export const SHOP = {
  emptyState: 'Pose d’abord un pari, le stagiaire n’ouvre pas la caisse aux indécis.',
  goToBets: 'Aller aux paris',
  emptyVitrine: 'Rien en rayon aujourd’hui. Le stagiaire hausse les épaules.',
  risk: { safe: 'Sûr', bold: 'Ambitieux', danger: 'Danger ⚠' } as const,
  riskTitle: {
    safe: 'Sans contrepartie, impact au plus moyen.',
    bold: 'Impact fort ou extrême : change la façon de jouer le cercle.',
    danger: 'Cet objet a une contrepartie : lis-la avant d’acheter.',
  } as const,
  impact: 'Impact : {impact}',
  impactLabel: { faible: 'faible', moyen: 'moyen', fort: 'fort', extreme: 'extrême' } as const,
  buy: 'Acheter',
  confirm: 'Confirmer {price} ¤',
  confirmTitle: 'Achat important : un second clic confirme.',
  compare: 'faces actuelles → nouvelles faces',
  replace: 'Remplacer ce dé',
} as const

/** Écran de course : frise de sous-phases, file de combinaisons, prévisualisation (spec 05). */
export const RACE = {
  phases: ['préparer', 'lancer', 'ordonner', 'résoudre', 'adversaire'] as const,
  phasesLabel: 'Étapes du tour',
  queue: 'File de combinaisons',
  remove: 'Dissocier',
  removeTitle: 'Dissocier : les deux dés redeviennent disponibles',
  moveUp: 'Résoudre plus tôt',
  moveDown: 'Résoudre plus tard',
  afterPrevious: 'Résolue après les précédentes : seule la première est prévisualisée.',
  previewTitle: 'Prochain déplacement : {name} {dist} → case {to}',
  previewGhost: 'Prévisualisation',
  dragSoul: 'Glisser sur un dé Distance pour associer (ou cliquer, puis cliquer un dé Distance)',
  dropHere: 'Déposer le dé Âme ici',
  dragCard: 'Glisser pour changer l’ordre de résolution',
  cumul: '{total} ({parts})',
  cumulInto: 'cumulé dans la carte n°{n}',
  recap: '↺ dernier tour',
  recapTitle: 'Revoir le dernier tour',
  recapEmpty: 'Rien à revoir : personne n’a encore bougé.',
  recapTurn: 'Tour {n}',
} as const

/** État vivant d'un pari pendant la course (provisoire : le classement n'est définitif qu'à la fin). */
export const BET_LIVE = {
  onTrack: 'en bonne voie',
  atRisk: 'compromis',
  provisional: 'provisoire',
  title: 'D’après les positions actuelles ; seul le classement final compte.',
  betted: 'Âme pariée',
} as const

/** Plateau. */
export const BOARD = {
  zoneClosed: 'plus de pari',
  zoneClosedTitle: 'Une âme a franchi le seuil : plus aucun pari sur cette course.',
  tieColumn: 'Même colonne : le couloir le plus bas devant.',
} as const

/** Modale de fin de course (spec 06). */
export const RESULTS = {
  subtitle: 'Établi après la résolution complète du tour {turn}, paire adverse comprise.',
  net: 'Net de la course : {net} ¤',
  refund: 'Livre des comptes : {n} ¤ remboursés',
  tieBreak: 'départage : même colonne, le couloir le plus bas devant',
  arrivedEarlier: 'a franchi l’arrivée le {n} · doublé pendant la fin du tour',
  arrivedLater: 'a franchi l’arrivée le {n} · a dépassé après l’arrivée',
  skip: 'Cliquer pour tout révéler',
  hidden: '?',
} as const

/** Glossaire : les termes canon reçoivent une explication au survol (spec 01/C4). */
export const GLOSSARY = {
  percuter: 'Percuter : atterrir en avançant sur une case occupée → saut devant.',
  echanger: 'Échanger : atterrir en reculant sur une case occupée → échange de place.',
  detour: 'Détour : la case visée est bloquée ou occupée, l’âme se décale sur un autre couloir.',
  departBloque: 'Ligne de départ : on ne recule pas plus loin, l’âme reste en place.',
  arrivee: 'Arrivée franchie : la course s’arrête à la fin du tour.',
  zoneDeFin: 'Zone de fin : cases à partir du seuil, où l’on ne parie plus.',
  combinaison: 'Combinaison : un dé Âme associé à un dé Distance, résolue dans l’ordre choisi.',
  charge: 'Charge : nombre d’utilisations restantes d’un objet limité.',
} as const

/**
 * Page d'aide (bouton « Aide » du HUD) : un index à gauche, une section à la fois
 * à droite. Le contenu reprend docs/proto4/regles-du-jeu.md. Balisage inline
 * accepté dans les textes : **gras** et *italique* (rendu par HelpPanel).
 */
export interface HelpBlock {
  /** 'p' paragraphe · 'h' sous-titre · 'ul' puces · 'ol' étapes numérotées. */
  kind: 'p' | 'h' | 'ul' | 'ol'
  text?: string
  items?: readonly string[]
}
export interface HelpSection {
  id: string
  /** Libellé dans l'index de gauche, titre de la carte de droite. */
  title: string
  icon: string
  blocks: readonly HelpBlock[]
}

export const HELP = {
  open: 'Aide',
  title: 'Aide — Sinner’s Bet',
  navLabel: 'Sections de l’aide',
  close: 'Fermer',
  intro: [
    'Vous êtes mort. Bienvenue. Le démon stagiaire qui gère votre dossier s’ennuie ferme, alors il vous propose un pacte : pariez sur des courses d’âmes damnées, gagnez assez de pièces pour payer votre passage, et remontez les neuf cercles de l’enfer. **Lui, il coache. Vous, vous misez.**',
    'Cette page répond à trois questions : *comment se joue une course ?*, *comment gagne-t-on de l’argent ?*, *comment sort-on d’un cercle ?*',
    'L’aide se consulte à tout moment : elle **n’interrompt rien** de la course en cours.',
  ],
  sections: [
    {
      id: 'but',
      title: 'Le but',
      icon: '⛓️',
      blocks: [
        { kind: 'p', text: 'S’évader de l’enfer. Chaque cercle a un **prix de sortie** (200 pièces pour le premier, de plus en plus cher ensuite). Vous avez **trois courses** par cercle pour réunir la somme — la troisième se joue contre le boss du cercle.' },
        { kind: 'p', text: 'Si vous pouvez payer à la fin, vous montez. Sinon… le stagiaire a déjà choisi votre punition éternelle.' },
        { kind: 'p', text: 'Perdre une course n’est jamais la fin : c’est la caisse vide à la fin du cercle qui vous condamne.' },
      ],
    },
    {
      id: 'course',
      title: 'Une course, tour par tour',
      icon: '🎲',
      blocks: [
        { kind: 'p', text: 'Les âmes damnées courent sur une piste de cases. **Vous ne les contrôlez pas** — vous les poussez, discrètement. À chaque tour :' },
        {
          kind: 'ol',
          items: [
            '**Lancez les dés.** Deux dés **Distance** (de −1 à +3) et trois dés **Âme** (chacun désigne une coureuse).',
            '**Associez.** Collez un dé Âme sur un dé Distance : ça fait une combinaison « Platon avance de +2 ». Un dé Âme restera toujours sur le carreau — à vous de choisir lequel.',
            '**Ordonnez.** L’ordre de résolution, c’est VOTRE décision, et c’est là que tout se joue : avancer Platon avant ou après Virgile ne raconte pas la même course.',
            '**Résolvez, puis subissez.** Vos combinaisons s’appliquent une à une… puis l’adversaire lance sa propre paire de dés. Lui ne vous demande pas votre avis.',
          ],
        },
        { kind: 'p', text: 'Deux dés sur la même âme ? Les distances s’additionnent en un seul bond.' },
      ],
    },
    {
      id: 'collisions',
      title: 'Les collisions',
      icon: '💥',
      blocks: [
        { kind: 'p', text: 'Les cases sont petites et les damnés n’ont aucune politesse :' },
        {
          kind: 'ul',
          items: [
            'Une âme qui **avance** sur une case occupée la **percute** et **saute devant** elle : le percuteur gagne une case de plus. Provoquer une collision est parfois le meilleur coup du tour.',
            'Une âme qui **recule** sur une case occupée **échange sa place** avec elle.',
          ],
        },
      ],
    },
    {
      id: 'couloirs',
      title: 'Les couloirs',
      icon: '🛤️',
      blocks: [
        { kind: 'p', text: 'Au premier cercle, la piste n’a qu’un couloir : chaque atterrissage sur une âme est une collision. Ensuite, à chaque âme ajoutée au départ, la piste gagne un couloir — jusqu’à six au neuvième cercle. Trois choses à retenir :' },
        {
          kind: 'ul',
          items: [
            '**Seule la colonne compte.** Les couloirs sont des files côte à côte ; votre position dans la course, c’est votre colonne, pas votre couloir. Changer de couloir ne fait ni avancer ni reculer.',
            '**On se rabat quand c’est pris.** Une âme atterrit dans son couloir si la case est libre. Occupée ou **bloquée** (éboulis, chaînes) ? Elle se rabat sur une case libre de la même colonne — la plus **basse** d’abord. Et si toute la colonne est pleine, alors seulement, c’est la collision : saut devant en avançant, échange en reculant.',
            '**Le bas a toujours raison.** À colonne égale en fin de course, l’âme du couloir le plus bas — le plus proche de vous — passe devant. Jamais d’ex æquo en enfer : le classement tranche tout, couloir compris.',
          ],
        },
        { kind: 'p', text: 'Les cases bloquées rétrécissent la piste et créent des embouteillages : ce sont des pièges à collisions, repérez-les avant de miser.' },
      ],
    },
    {
      id: 'arrivee',
      title: 'L’arrivée',
      icon: '🏁',
      blocks: [
        { kind: 'p', text: 'Dès qu’une âme franchit la ligne, **le tour se termine quand même** — vos combinaisons restantes et la paire adverse sont jouées. Le classement n’est établi qu’après.' },
        { kind: 'p', text: 'Une course peut donc se retourner sur la ligne : *franchir en premier ne garantit pas de finir premier.*' },
      ],
    },
    {
      id: 'paris',
      title: 'Les paris',
      icon: '🎫',
      blocks: [
        { kind: 'p', text: 'Les paris sont votre vraie arme. Avant la course, posez au moins un pari. Pendant la course, vous pouvez en rajouter… tant que l’âme visée n’a pas dépassé le **seuil de pari** (60 % du parcours). Au-delà, le guichet est fermé pour elle : trop facile, même pour un démon.' },
        { kind: 'h', text: 'Trois familles de tickets' },
        {
          kind: 'ul',
          items: [
            '**Simples** — lisibles, petits gains : vainqueur (×3,5), top 3 (×1,5), pas dans le top 3 (×2), dernière place (×3,5).',
            '**Combinés** — un duel (« A finit devant B »), deux âmes dans le top 3, le podium dans le désordre. Plus risqué, mieux payé.',
            '**Gros tickets** — podium exact (×40), vainqueur ET dernier (×14), classement complet (×80). De quoi payer un cercle entier d’un coup… si vous lisez la course comme un livre ouvert.',
          ],
        },
        { kind: 'p', text: 'Deux choses à savoir sur les cotes : elles **fondent** à mesure que la course avance (parier tard, c’est parier sûr, donc parier petit), et les gros tickets sont **verrouillés au début** — le stagiaire n’a pas le grade pour les encaisser. Pas encore.' },
      ],
    },
    {
      id: 'argent',
      title: 'Votre argent a trois vies',
      icon: '💰',
      blocks: [
        { kind: 'p', text: 'Chaque pièce peut devenir **une mise**, **un achat en boutique**, ou **une part du prix du cercle**. Les trois se disputent le même tas.' },
        { kind: 'p', text: 'Dépenser, c’est s’armer ; garder, c’est survivre. La jauge en haut de l’écran vous rappelle en permanence où vous en êtes par rapport au prix de sortie.' },
      ],
    },
    {
      id: 'boutique',
      title: 'La boutique du stagiaire',
      icon: '🛒',
      blocks: [
        { kind: 'p', text: 'Entre les paris et la course, le stagiaire ouvre sa petite caisse (une fois votre premier pari posé — il ne sert pas les indécis) :' },
        {
          kind: 'ul',
          items: [
            'des **dés spéciaux** qui remplacent un dé Distance — le prudent Dé des Limbes (1, 1, 2, 2), le Dé de Glace et ses extrêmes (−1, −1, 2, 5)… ;',
            'la **forge**, pour modifier une face de dé, une seule, mais pour toujours ;',
            'des **artefacts**, effets permanents qui tordent les règles en votre faveur — l’Œil du parieur pour miser après avoir vu vos dés, le Sablier de Charon qui repousse le seuil de pari à 70 %…',
          ],
        },
        { kind: 'p', text: 'Chaque objet annonce la couleur : **SÛR**, **AMBITIEUX** ou **DANGER** — et un objet dangereux dit toujours ce qu’il vous coûtera. En enfer, au moins, les contrats sont clairs.' },
      ],
    },
    {
      id: 'grades',
      title: 'Les grades du stagiaire',
      icon: '👑',
      blocks: [
        { kind: 'p', text: 'Plus votre poulain — vous — impressionne, plus le stagiaire grimpe dans la hiérarchie : Assistant, Tourmenteur, Contremaître, Sous-directeur… Chaque promotion **ouvre de nouveaux paris** et garnit la boutique.' },
        { kind: 'p', text: 'Après le huitième cercle, il obtient même une belle promotion. Au neuvième — le cercle de la Trahison — devinez qui tient le guichet en face de vous.' },
      ],
    },
    {
      id: 'conseils',
      title: 'Les trois conseils',
      icon: '😈',
      blocks: [
        {
          kind: 'ol',
          items: [
            '« Pariez avant de rêver : un ticket simple payé vaut mieux qu’un podium exact raté. Les gros tickets, c’est pour les courses que vous avez préparées. »',
            '« L’ordre des combinaisons est gratuit et c’est le coup le plus fort du jeu. Regardez l’aperçu avant de résoudre — l’enfer est déterministe, profitez-en. »',
            '« Gardez toujours de quoi payer le cercle. Je vous aime bien, mais un pacte, c’est un pacte. »',
          ],
        },
        { kind: 'p', text: '*Bonne chance. Vous en aurez besoin — enfin, non : vous aurez besoin de bien lire.*' },
      ],
    },
  ] as const satisfies readonly HelpSection[],
} as const

/** Menu de développement (bouton « dev » discret, Ctrl+Maj+D). */
export const DEV = {
  open: 'dev',
  title: 'Menu développeur',
  hint: 'Fixe le solde et la course de reprise. L’inventaire est conservé, la course en cours est abandonnée, la sauvegarde est écrasée.',
  money: 'Pièces',
  circle: 'Cercle',
  race: 'Course du cercle',
  bossRace: 'boss',
  apply: 'Appliquer',
  cancel: 'Annuler',
} as const

/** Remplace les {clés} d'un texte. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (values[k] !== undefined ? String(values[k]) : `{${k}}`))
}
