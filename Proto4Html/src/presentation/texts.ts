/**
 * Tous les textes affichés au joueur, en français. Regroupés ici pour qu'une
 * traduction ultérieure (option « Langue ») n'ait qu'un fichier à toucher.
 * Les dialogues de l'intro, de la fin de 2e course et du cercle 1 viennent de
 * docs/proto4/interface.md ; les autres cercles et la fin sont générés ici.
 */

export type Speaker = 'demon' | 'player' | 'boss'

/**
 * Expressions du stagiaire, disponibles au grade 0 seulement (public/menu/perso/stagiaire_0_*.webp).
 * Aux grades suivants il n'y a qu'un portrait : la `face` d'une ligne y est ignorée.
 */
export type Face = 'normal' | 'neutre' | 'doute' | 'fier' | 'degout'

export interface Line {
  who: Speaker
  text: string
  /** Nom affiché au-dessus de la bulle ; absent = nom par défaut du locuteur (SPEAKERS). Le démon change de nom quand il monte en grade. */
  label?: string
  /** Expression demandée pour cette réplique du démon (grade 0 uniquement) ; absente = `normal`. */
  face?: Face
  /** Portrait affiché pendant la réplique, posé par `spokenBy` (demon.ts) d'après le grade et `face`. */
  portrait?: string
}

/** Noms par défaut des locuteurs dans les bulles ; le boss prend le sien dans `config/race.json`. */
export const SPEAKERS: Record<Speaker, string> = { demon: 'Démon stagiaire', player: 'Vous', boss: 'Le boss du cercle' }

const D = (text: string, face?: Face): Line => (face ? { who: 'demon', text, face } : { who: 'demon', text })
const P = (text: string): Line => ({ who: 'player', text })
const B = (text: string): Line => ({ who: 'boss', text })

export const GAME_NAME = "Sinner's Bet"

export const MENU = {
  continue: 'Continuer',
  newRun: 'Commencer une nouvelle évasion',
  stats: 'Statistiques',
  collection: 'Collection',
  options: 'Option',
  back: 'Retour',
  next: 'Suite',
  skipIntro: "Passer l'introduction",
  skip: 'Passer',
} as const

export const INTRO: readonly Line[] = [
  D('Félicitations, vous êtes mort !', 'fier'),
  D('On a étudié votre dossier, et sans grande surprise, vous avez fini ici.', 'neutre'),
  D("Je suis en stage, et je n'ai pas les accréditations nécessaires pour vous affecter à la bonne punition. En plus elle est actuellement en réfection…", 'normal'),
  D('…on va devoir attendre le boss…', 'doute'),
  D('…voilà, voilà… désolé…', 'normal'),
  D('Ça vous tente un petit pari pour tuer le temps ?', 'fier'),
  P('Non merci, sans plus.'),
  D("Non !? Je comprends que vous ne soyez pas d'humeur, mais je m'ennuie ferme ici. Je vous prête un peu d'argent et vous pourrez conserver vos gains.", 'degout'),
  P("Bon, d'accord, mais pas d'entourloupe."),
  D('Parfait, on a un pacte !', 'fier'),
  D("Ici on mise sur une course d'âmes damnées, donc voilà {money} pièces pour commencer. Et avant chaque course, je vous avancerai {allowance} pièces de plus — davantage à chaque cercle, un stagiaire qui monte en grade a plus de caisse : il faut bien que le guichet tourne.", 'neutre'),
  D("Ah, et je n'ai le droit de prendre que les paris simples : vainqueur, top 3, pas dans le top 3, dernier. Tout ce qui met deux âmes sur le même ticket, c'est au-dessus de mon grade. Pour l'instant.", 'doute'),
]

/** Fin de la deuxième course : le boss du cercle arrive. */
export const BOSS_ANNOUNCE: readonly Line[] = [
  D("Mon boss est de retour, il nous a vus jouer. Il vous propose de parier avec lui, et si vous avez {price} pièces à la fin, il veut bien vous autoriser à continuer de parier.", 'normal'),
]

/**
 * Grades du démon (boutique-README.md « Déblocage par la hiérarchie du stagiaire »).
 * Un grade est obtenu quand le boss du cercle `afterCircle` est battu et le prix payé ;
 * ses `lines` sont dites dans le dialogue de fin de ce cercle, juste avant l'annonce du
 * cercle suivant. `label` remplace « Démon stagiaire » dans les bulles à partir de là, et
 * `portrait` le costume affiché — cinq dessins pour six grades : les deux derniers partagent
 * le costume du boss, le sixième n'étant atteint qu'à l'évasion.
 * Pas encore d'effet sur la boutique : le grade est narratif pour l'instant.
 */
export interface DemonRank {
  name: string
  label: string
  afterCircle: number
  lines: readonly Line[]
  /** Fichier du portrait dans public/menu/perso, sans extension ; avec `faces`, le suffixe d'expression s'y ajoute. */
  portrait: string
  /** Vrai quand ce grade a un fichier par expression (`portrait` + `_` + Face). Seul le stagiaire en a. */
  faces?: boolean
}

/** Expression du démon quand la réplique n'en demande pas. */
const DEFAULT_FACE: Face = 'normal'

/** Portrait à afficher pendant une réplique : le costume vient du grade, la tête de l'expression. */
export function portraitSrc(rank: DemonRank, face?: Face): string {
  return `/menu/perso/${rank.faces ? `${rank.portrait}_${face ?? DEFAULT_FACE}` : rank.portrait}.webp`
}

export const DEMON_RANKS: readonly DemonRank[] = [
  { name: 'Stagiaire', label: 'Démon stagiaire', afterCircle: 0, lines: [], portrait: 'stagiaire_0', faces: true },
  {
    name: 'Assistant',
    label: 'Démon assistant',
    // Le premier grade se gagne au bout de DEUX cercles : un seul ne prouve rien, et
    // l'administration infernale ne promeut pas sur un coup de chance.
    afterCircle: 2,
    portrait: 'stagiaire_1_assistant',
    lines: [
      D("Et… il y a mieux. Minos a enroulé sa queue deux fois autour de mon dossier : je suis assistant. Assistant ! Mon premier grade en trois siècles de stage.", 'fier'),
      P('Félicitations. Ça change quoi ?'),
      D("Pour moi, une chaise avec un dossier. Pour vous, trois tickets de plus au guichet : le « Duel » à ×{duel}, « Deux âmes dans le top 3 » à ×{twoInTop3}, et « Top 3 dans le désordre » à ×{podiumAnyOrder}. Un assistant a le droit de mettre deux âmes sur le même ticket."),
    ],
  },
  {
    name: 'Tourmenteur',
    label: 'Démon tourmenteur',
    afterCircle: 3,
    portrait: 'stagiaire_2_souschef',
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
    portrait: 'stagiaire_3_chef',
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
    portrait: 'stagiaire_4_boss',
    lines: [
      D("Sous-directeur. Le Minotaure a insisté lui-même. Il paraît que je « fais monter les enjeux »."),
      D("Deux échelons sous le boss du neuvième. Il n'y a jamais eu de stagiaire aussi haut. Il n'y a jamais eu de parieur aussi loin non plus."),
      P("On est liés, alors."),
      D("Par un pacte, oui. Ne l'oubliez pas. Moi, je ne l'oublierai pas."),
      D("Et le grand livre s'ouvre : le « Classement complet exact », ×{fullRankingExact}. Personne ne l'a jamais touché. Ce serait amusant que ce soit contre moi."),
    ],
  },
  { name: 'Boss du neuvième', label: 'Le stagiaire promu', afterCircle: 8, lines: [], portrait: 'stagiaire_4_boss' },
]

export interface CircleTexts {
  /** Nom ordinal affiché en overlay : « 1er Cercle ». */
  ordinal: string
  /** Écran de transition après le cercle, prix payé. Dit ce qui change au cercle suivant. */
  success: readonly Line[]
  /** Écran de transition après le cercle, prix impayable : fin de run. */
  failure: readonly Line[]
  /**
   * Scène jouée juste avant la course du boss (la dernière du cercle) : le boss se présente,
   * le stagiaire commente. `{boss}` est son nom et `{price}` le prix de sortie du cercle.
   */
  bossIntro: readonly Line[]
}

/**
 * Un bloc par cercle : les neuf de Dante, puis la montée du mode démon (GDD §8.1). Au-delà du
 * dernier, `circleTexts` (demon.ts) rejoue ce dernier bloc — le quinzième est donc écrit pour
 * être redit à chaque tour de paradis, sans promettre de suite.
 */
export const CIRCLES: readonly CircleTexts[] = [
  {
    ordinal: '1er',
    success: [
      D("Félicitations, je ne pensais pas que vous pouviez réussir.", 'fier'),
      D('Si ça vous va, je vais vous coacher. On va vous tester dans les autres cercles.'),
      D("J'ai bien tenté de faire remonter votre nom. On m'a répondu qu'un cercle, ça arrive à n'importe quel mort. Tenez-en deux et ça devient un dossier.", 'doute'),
      D('Prochain arrêt : la Luxure. Des vents éternels y bousculent les âmes, il y en aura {souls} au départ, une de plus. Et le tarif de sortie monte à {price} pièces.'),
    ],
    failure: [D("Bon, vous êtes nul en fait !! Finalement, j'ai trouvé quelle punition éternelle vous allez subir. Bye.", 'degout')],
    bossIntro: [
      B('Alors c\'est vous. Le mort qui joue aux dés au lieu de descendre.'),
      D('Charon, monsieur. Il a payé son passage, techniquement…', 'normal'),
      B("Techniquement. J'ai passé neuf mille ans à compter des pièces, petit. Je sais ce que veut dire techniquement."),
      B('Une course, alors. Si vous sortez d\'ici avec {price} pièces, je vous laisse la barque. Sinon, je vous mets à la rame.'),
      P('Et si je gagne, c\'est vous qui ramez ?'),
      B('Personne n\'a jamais vécu assez longtemps pour me poser la question.'),
    ],
  },
  {
    ordinal: '2e',
    success: [
      D('Deux cercles ! Mon chef de service a cessé de me tutoyer, c\'est bon signe.'),
      D('La Gourmandise nous attend : de la boue jusqu\'aux genoux et Cerbère qui ronge tout ce qui traîne. Toujours {souls} âmes au départ, mais la sortie coûte {price} pièces.'),
    ],
    failure: [D("Dommage. Les vents de la Luxure vous emportent, et moi je retourne classer des dossiers. Bye.")],
    bossIntro: [
      B('{boss}. Je juge, j\'enroule ma queue, j\'envoie. C\'est un métier simple.'),
      D('Il ne vous a pas encore jugé. C\'est bon signe. Enfin, c\'est un signe.'),
      B('Deux tours de queue pour vous. Ou trois. Je compterai en route, les vents décideront du reste.'),
      B('{price} pièces à la sortie. Pariez, ça m\'évitera de réfléchir.'),
    ],
  },
  {
    ordinal: '3e',
    success: [
      D("Vous avez le nez pour les bonnes cotes. On m'a confié un badge d'accès au quatrième."),
      D("L'Avarice : des âmes qui poussent des poids face à face, éternellement. {souls} âmes au départ, une de plus, et {price} pièces pour passer."),
    ],
    failure: [D("Cerbère a faim, et vous n'avez plus rien à miser. Vous connaissez la sortie… enfin, non, justement. Bye.")],
    bossIntro: [
      D('Alors. {boss} ne parle pas. Il a trois gueules et aucune n\'a jamais servi à ça.'),
      B('GRRRR.'),
      D('Ce qu\'il veut dire, c\'est que la boue ralentit tout le monde et qu\'il mord ce qui traîne.'),
      P('Et {price} pièces pour ressortir.'),
      D('Vous apprenez vite. Ne lui tendez pas la main.'),
    ],
  },
  {
    ordinal: '4e',
    success: [
      D("Quatre cercles. Les avares ont pleuré en vous voyant repartir avec leur argent. Moi, j'ai eu une prime."),
      D("La Colère, maintenant : le Styx, un marais où les âmes se frappent sans fin. Toujours {souls} âmes, et {price} pièces pour la sortie."),
    ],
    failure: [D("Les avares gardent tout, vous compris. Ça finit bizarrement bien pour eux. Bye.")],
    bossIntro: [
      B('Pape Satàn, pape Satàn aleppe !'),
      D('Personne n\'a jamais su ce que ça voulait dire. Moi non plus.'),
      B('Ça veut dire : montrez-moi votre bourse.'),
      B('{price} pièces à la sortie. Ici, on pousse des poids pour l\'éternité pour beaucoup moins que ça.'),
    ],
  },
  {
    ordinal: '5e',
    success: [
      D("Vous êtes ressorti du Styx sans une éclaboussure. Le boss a demandé votre nom. Le mien aussi, pour une fois."),
      D("L'Hérésie ensuite : des tombes incandescentes, et {souls} âmes au départ, une de plus. La sortie passe à {price} pièces."),
    ],
    failure: [D("Le Styx vous garde. Pas de rancune : je vous mets dans le marais, c'est juste à côté du bureau. Bye.")],
    bossIntro: [
      B('Montez. Le Styx est calme aujourd\'hui. Calme pour le Styx.'),
      D('Ne regardez pas dans l\'eau.'),
      B('Regardez dans l\'eau, au contraire. Vous y verrez tous ceux qui ont parié avant vous.'),
      P('Ils ont perdu ?'),
      B('Ils ont discuté. {price} pièces, et vous traversez sans vous mouiller.'),
    ],
  },
  {
    ordinal: '6e',
    success: [
      D("Six cercles. On me laisse remplacer des âmes en course, maintenant. Coach titulaire, presque."),
      D("La Violence est en trois sous-cercles : fleuve de sang, buissons, sable brûlant. Toujours {souls} âmes, mais {price} pièces pour passer."),
    ],
    failure: [D("Les tombes de l'Hérésie ont une place libre, ça tombe bien. Bye.")],
    bossIntro: [
      B('Trois voix, un seul avis : vous n\'avez rien à faire ici.'),
      D('Elles disent ça à tout le monde. Elles le pensent aussi.'),
      B('Les tombes sont ouvertes, elles chauffent depuis ce matin. Il en reste une à votre taille.'),
      B('{price} pièces pour la refermer sans vous dedans.'),
    ],
  },
  {
    ordinal: '7e',
    success: [
      D("Sept cercles. Mon boss commence à me regarder de travers. Je crois qu'il a compris qui coache qui."),
      D("La Fraude : dix fosses concentriques, les Malebolge, pleines de séducteurs et de faussaires. {souls} âmes au départ, une de plus, et {price} pièces de sortie."),
    ],
    failure: [D("Le sable brûlant, le fleuve de sang… choisissez, je suis bon prince. Bye.")],
    bossIntro: [
      D('Ne le regardez pas dans les yeux. Ni ailleurs, d\'ailleurs.'),
      B('JE SUIS CALME.'),
      D('Il n\'est pas calme.'),
      B('{price} PIÈCES ET VOUS PASSEZ. C\'EST ÉCRIT. JE RESPECTE CE QUI EST ÉCRIT.'),
      P('Il crie toujours ?'),
      D('Non. Parfois il charge.'),
    ],
  },
  {
    ordinal: '8e',
    success: [
      D("Huit cercles. Il ne reste que la Trahison. Et… on m'a promu. Je dirige le neuvième."),
      D("Ce n'est pas un problème, hein ? Un pacte, c'est un pacte. Il y aura {souls} âmes au départ, gelées dans le Cocyte, et il faudra {price} pièces pour sortir. Pour de bon."),
    ],
    failure: [D("Les faussaires vous ont eu à votre propre jeu. Une fosse vous attend au fond des Malebolge. Bye.")],
    bossIntro: [
      B('Bienvenue. Asseyez-vous, prenez ce que vous voulez, c\'est offert.'),
      D('Ne prenez rien.'),
      B('On me dit souvent que j\'ai un visage honnête. C\'est la queue qu\'il faut surveiller.'),
      B('La course sera régulière, je vous en donne ma parole. {price} pièces à la sortie.'),
      D('Sa parole. Voilà.'),
    ],
  },
  {
    ordinal: '9e',
    success: [
      D("Vous… vous avez payé. Contre moi. Contre le neuvième cercle."),
      D("Un pacte, c'est un pacte. La porte est là, ouverte. Personne n'est jamais remonté d'ici, alors ne racontez pas comment vous avez fait."),
      P("Et vous ?"),
      D("Moi ? Patron d'un cercle, et toujours pas grand-chose. Il me manque un parieur qui sache lire une course."),
      D("Parce qu'il y a autre chose, au-dessus. J'ai vu les registres : les fonds marins, une falaise, une ville, une montagne, le ciel. Et tout en haut, un guichet que personne n'a jamais tenu."),
      D("Alors : la porte, ou la montée. Vous gardez la monnaie dans les deux cas."),
    ],
    failure: [D("À une pièce près. C'est le cercle de la Trahison, vous vous attendiez à quoi ? Bienvenue dans la glace. Bye.")],
    bossIntro: [
      B('Vous voilà. Dernier cercle, dernier guichet — et de mon côté du comptoir, cette fois.'),
      P('Vous m\'avez coaché pendant huit cercles.'),
      B('Et j\'ai appris en vous regardant. Je connais vos paris avant que vous les posiez.'),
      B('{price} pièces. Un pacte, c\'est un pacte : je ne triche pas. Je gagne, c\'est différent.'),
    ],
  },
  {
    ordinal: '10e',
    success: [
      D("Premier cercle au-dessus de l'enfer, et vous respirez encore. Enfin, vous ne respiriez déjà plus, mais l'idée est là."),
      D("La falaise ensuite : du basalte noir, des chaînes qui pendent et rien pour se rattraper. Toujours {souls} âmes, et {price} pièces pour monter d'un cran."),
    ],
    failure: [D("L'eau vous garde. C'est calme, au fond. Vous aurez tout le temps de recompter ce qu'il vous manquait.")],
    bossIntro: [
      B("On ne parle pas, ici. On gargouille. Vous vous y ferez."),
      D("C'est {boss}. Il tient le guichet du fond depuis que la cathédrale a coulé."),
      B("Les paris descendent lentement, comme tout le reste. {price} pièces et je vous laisse remonter."),
      P("Et si je reste ?"),
      B("Personne ne reste. Tout le monde coule."),
    ],
  },
  {
    ordinal: '11e',
    success: [
      D("Vous grimpez plus vite que les chaînes ne tombent. Je note."),
      D("Au-dessus : une ville. Des rues, des balcons de fer, de la suie, et des âmes qui font la queue devant des guichets fermés. {souls} âmes en course et {price} pièces de péage."),
    ],
    failure: [D("La paroi est longue et vous n'avez plus de quoi payer la corde. Bonne descente.")],
    bossIntro: [
      B("{boss}. Je compte les chaînes, et il en manque toujours une."),
      D("Ne demandez pas où elle est passée."),
      B("Elle est autour de quelqu'un. Montez donc, si vous avez {price} pièces au bout. Sinon vous ferez le poids qui manque."),
    ],
  },
  {
    ordinal: '12e',
    success: [
      D("Une ville entière qui attend son tour, et c'est vous qui passez devant. Ça ne se fait pas. J'adore."),
      D("La montagne, maintenant : des séracs, de la neige de nuit, des cordes gelées. {souls} âmes au départ et {price} pièces pour continuer."),
    ],
    failure: [D("Vous voilà dans la file. Elle avance, paraît-il. Personne ne l'a vérifié.")],
    bossIntro: [
      B("Bonjour. Prenez un ticket. Asseyez-vous. Le guichet ouvre bientôt."),
      D("Il dit ça depuis quatre siècles."),
      B("Le guichet ouvre bientôt. Pour vous, exceptionnellement : une course, {price} pièces, et vous passez devant tout le monde."),
      P("Et eux ?"),
      B("Eux ? Eux attendent. C'est leur métier."),
    ],
  },
  {
    ordinal: '13e',
    success: [
      D("Il fait froid et vous pariez encore. Je commence à croire que vous aimez ça."),
      D("Au-dessus de la montagne, il n'y a plus de sol : le ciel, des murs de nuages et un pont rompu. {souls} âmes, {price} pièces."),
    ],
    failure: [D("La corde a gelé, vos mains aussi, et votre bourse est vide. La montagne vous garde debout, au moins.")],
    bossIntro: [
      B("…"),
      D("{boss} ne dit jamais rien. Il attend que vous ayez froid."),
      B("…"),
      D("Voilà. Il attend. {price} pièces, et il vous laisse passer avant que vos doigts ne tombent."),
    ],
  },
  {
    ordinal: '14e',
    success: [
      D("Un pont rompu, et vous êtes de l'autre côté. Je ne demande pas comment."),
      D("Il reste une marche. Tout en haut : des gradins de nuage, des anneaux d'or et un guichet que personne n'a jamais tenu. {souls} âmes et {price} pièces."),
    ],
    failure: [D("Le vent a emporté le reste. Vous tombez longtemps. Très longtemps. J'ai le temps de vous saluer.")],
    bossIntro: [
      B("Je suis le courant d'air entre deux mondes. On ne me voit pas, on me subit."),
      D("Il aime bien cette phrase. Il la répète à chaque orage."),
      B("Rien ne tient en l'air, parieur. Ni les âmes, ni les tickets, ni vous. {price} pièces si vous tenez quand même."),
    ],
  },
  {
    ordinal: '15e',
    success: [
      D("Nous y sommes. Au-dessus, il n'y a plus rien — alors on recommence ici, et le tarif monte."),
      D("Les gradins se remplissent à nouveau, les anneaux tournent, et le guichet reste ouvert. {souls} âmes au départ, {price} pièces pour le tour suivant."),
      P("Ça ne s'arrête jamais ?"),
      D("Vous avez eu une porte. Vous ne l'avez pas prise."),
    ],
    failure: [D("Au paradis aussi, on ferme le guichet quand la bourse est vide. Asseyez-vous dans les gradins, vous regarderez les autres.")],
    bossIntro: [
      B("Vous m'avez reconnu ? Je vous ai coaché pendant neuf cercles, et j'avais un badge en plastique."),
      P("Vous avez des ailes."),
      B("On me les a données en haut. Personne ne m'a expliqué pourquoi, et je n'ai pas posé la question."),
      B("{price} pièces. Et cette fois, c'est moi qui lis la course avant vous."),
    ],
  },
]

export const ENDINGS = {
  gameOverTitle: 'Punition éternelle',
  gameOverBody: 'Le prix du cercle était de {price} pièces. Il vous en manquait {missing}.',
  escapeTitle: 'Évasion',
  escapeBody: 'Neuf cercles traversés, {money} pièces en poche. Le stagiaire est devenu boss, et vous, vous êtes sorti.',
  /** Au neuvième cercle payé, la porte n'est pas la seule issue (GDD §5.3, §8.1). */
  escapeStay: 'Ou vous restez, du bon côté du guichet cette fois, et vous montez voir ce qu\'il y a au-dessus de l\'enfer.',
  escapeContinue: 'Monter avec lui',
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
  terrain: 'Terrain : {name}',
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
  title: 'Les cercles',
  subtitle: 'Cliquez sur la prochaine course pour la lancer.',
  current: 'Vous êtes ici',
  done: 'course jouée',
  next: 'prochaine course',
  locked: 'à venir',
  boss: 'Boss',
  power: 'Pouvoir',
  track: 'Piste',
  lanes: '{n} couloir{s}',
  blocked: '{n} case{s} bloquée{s} (colonnes {columns})',
  noBlocked: 'aucune case bloquée',
  terrain: 'Terrain',
  terrainDrawn: 'tiré au sort au départ de chaque course',
  terrainOne: 'terrain unique',
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

/**
 * Collection : les objets de boutique débloqués d'un run à l'autre (core/shop/unlocks.ts).
 * Les scellés se comptent mais ne se nomment pas — c'est la surprise de fin de cercle.
 */
export const COLLECTION = {
  title: 'Collection',
  count: '{n} objets sur {total} en rayon',
  hint: 'Chaque cercle payé descelle un objet, pour toutes tes évasions à venir.',
  locked: '{n} objet{s} encore scellé{s}. Le stagiaire refuse d’en dire le nom.',
  complete: 'Le catalogue est entier. Le stagiaire n’a plus rien à cacher.',
  lockedCard: 'Scellé',
  lockedTitle: 'Objet encore scellé : franchis un cercle pour en desceller un.',
  empty: 'Rien en rayon. Ce n’est pas normal : vérifie shop.unlockedAtStart.',
} as const

/** Révélation de fin de cercle : l'objet que le cercle payé vient de desceller. */
export const UNLOCK = {
  title: 'La réserve s’entrouvre',
  intro: 'Le stagiaire disparaît sous le guichet, remonte poussiéreux, et pose ça devant toi.',
  added: 'Descellé pour de bon : cet objet peut désormais sortir en vitrine, dans cette évasion comme dans les suivantes.',
  next: 'Continuer',
  remaining: 'Encore {n} objet{s} sous scellé.',
  last: 'C’était le dernier. Le catalogue est entier.',
} as const

/** Dette infernale : le marché proposé quand le prix du cercle est hors d'atteinte. */
export const DEBT = {
  title: 'Le stagiaire sort un registre',
  lead: 'Le cercle coûte {price} pièces. Vous en avez {money}. Il en manque {missing}.',
  offer: '« Je peux avancer {borrow} pièces. Une seule fois, et je ne fais pas ça par bonté. »',
  cost: 'Le prix du cercle suivant montera de {interest} pièces.',
  accept: 'Emprunter {borrow} pièces',
  refuse: 'Refuser et rester ici',
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
  emptySlot: "Emplacement d'âme vide",
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
  trayLabel: 'Jetons de mise',
  chipHint: 'Glissez ce jeton dans le logement, ou cliquez-le',
  chipChosen: 'Jeton posé : c’est la mise en cours',
  tooRich: 'Solde insuffisant ({n} ¤)',
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
  /** Emplacements pleins : l'achat d'un artefact en détruit un (artefacts.md). */
  replaceArtefact: 'quel artefact sacrifier ?',
  replaceArtefactWarning: 'L’artefact choisi est détruit, sans remboursement. Pour récupérer des pièces, revendez-le d’abord dans l’atelier.',
  forgeLimit: 'Un dé ne porte pas plus de {n} faces forgées. Décapez-en une dans l’atelier pour faire de la place.',
  /** Atelier : défaire ce qu'on possède (revente d'artefact, décapage de face). */
  workshop: 'Atelier — {n}/{slots} artefacts, revendre ou décaper',
  sell: 'Revendre {name} (+{back} ¤)',
  sellTitle: 'Revente à 40 % du prix du cercle : {back} pièces, et l’emplacement se libère.',
  decapTitle: 'Décaper cette face : elle retrouve sa valeur d’origine pour {cost} pièces.',
  replace: 'Remplacer ce dé',
} as const

/** Écran de course : frise de sous-phases, file de combinaisons, prévisualisation (spec 05). */
/** Objets que le joueur déclenche lui-même depuis l'écran de course. */
export const ITEMS = {
  tribuneHint: 'Tribune infernale : choisissez une case libre, hors départ et hors zone de fin.',
  double: 'Pièce à deux faces : doubler {stake} ¤ de mises',
} as const

export const RACE = {
  /** Objets déclenchés sur un dé précis pendant l'appariement (Fiole, Élan, Verrou). */
  fiole: '+1',
  fioleTitle: 'Fiole de sang : +1 sur ce dé, une fois par tour, payé comptant.',
  momentum: '»',
  momentumTitle: 'Élan : relancer ce dé et ajouter le résultat, quel qu’il soit.',
  lock: '⚿',
  lockTitle: 'Verrou de Minos : garder ce dé sur sa face pour le prochain lancer.',
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
  /** Cases spéciales du terrain : elles n'agissent que sur l'âme qui s'y arrête (GDD §2.2). */
  specialMark: { gold: '¤', trap: '✷', boost: '▲' } as const,
  special: {
    gold: 'Case payante : l’âme qui s’y arrête vous rapporte {n} pièces.',
    trap: 'Piège : l’âme qui s’y arrête recule de {n} case(s).',
    boost: 'Tremplin : l’âme qui s’y arrête avance de {n} case(s) de plus.',
  } as const,
  tribune: 'Tribune infernale',
  tribuneTitle: 'Tribune infernale : l’âme qui s’arrête ici vous paie et repart poussée.',
  tribunePlace: 'Poser la tribune sur la case {column}',
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
    'Vous êtes mort. Bienvenue. Le démon stagiaire qui gère votre dossier s’ennuie ferme, alors il vous propose un pacte : pariez sur des courses d’âmes damnées, gagnez assez de pièces pour payer votre passage, et remontez les neuf cercles de l’enfer. **Lui, il coache. Vous, vous misez.** Au neuvième, la porte s’ouvre — et rien ne vous oblige à la prendre.',
    'Cette page répond à trois questions : *comment se joue une course ?*, *comment gagne-t-on de l’argent ?*, *comment sort-on d’un cercle ?*',
    'L’aide se consulte à tout moment : elle **n’interrompt rien** de la course en cours.',
  ],
  sections: [
    {
      id: 'but',
      title: 'Le but',
      icon: '⛓️',
      blocks: [
        { kind: 'p', text: 'S’évader de l’enfer. Chaque cercle a un **prix de sortie** (150 pièces pour le premier, de plus en plus cher ensuite). Vous avez **trois courses** par cercle pour réunir la somme — la troisième se joue contre le boss du cercle.' },
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
        { kind: 'p', text: 'Deux choses à savoir sur les cotes : elles **fondent** à mesure que la course avance (parier tard, c’est parier sûr, donc parier petit), et tout ticket qui met **deux âmes ou plus** est **verrouillé au début** — le stagiaire n’a pas le grade pour les encaisser. Les combinés s’ouvrent à son premier grade, au bout de deux cercles ; les gros tickets bien plus tard.' },
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

/**
 * Rang du cercle affiché dans le HUD (« 1er », « 9e », « 23e »). Les cercles écrits ont leur
 * forme dans CIRCLES ; au-delà, le jeu continue de compter (GDD §8.1).
 */
export function ordinalOf(circle: number): string {
  return CIRCLES[circle - 1]?.ordinal ?? `${circle}e`
}

/** Remplace les {clés} d'un texte. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (values[k] !== undefined ? String(values[k]) : `{${k}}`))
}
