/**
 * Lexique français — la langue de référence du jeu. Toute clé naît ici : `Pack` se déduit
 * de ce fichier, donc une clé ajoutée ici et oubliée dans `en.ts` ne compile pas.
 * Les dialogues de l'intro, de la fin de 2e course et du cercle 1 viennent de
 * docs/proto4/interface.md ; les autres cercles et la fin sont générés ici.
 *
 * Rien ne s'importe d'ici : l'écran passe par `./index`, qui sert le pack de la langue
 * choisie dans les options.
 */
import type { BetRefusal, BetTier, CancelRefusal } from '../../core/rules/bets'
import type { BetTypeId } from '../../core/rules/betTypes'
import type { BossEffectId } from '../../core/rules/boss'
import type { PersonalityId } from '../../core/rules/personalities'
import type { MoveNoteId } from '../../core/rules/race'
import type { ItemKind, Rarity } from '../../core/shop/items'
import type { PurchaseLog } from '../../core/shop/shop'
import { B, D, P, type BetTypeText, type CircleTexts, type DemonRank, type Fmt, type HelpSection, type Line, type Speaker } from './types'

/** Nom du démon qui vous coache. Judas Iscariote : le traître, qui finira boss du neuvième cercle. */
const DEMON_NAME = 'Iscariote'

/** Noms par défaut des locuteurs dans les bulles ; le boss prend le sien dans `config/race.json`. */
const SPEAKERS: Record<Speaker, string> = { demon: `${DEMON_NAME}, stagiaire`, player: 'Vous', boss: 'Le boss du cercle' }

const GAME_NAME = "Sinner's Bet"

const MENU = {
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

const INTRO: readonly Line[] = [
  D('Félicitations, vous êtes mort !', 'fier'),
  D('On a étudié votre dossier, et sans grande surprise, vous avez fini ici.', 'neutre'),
  D("Iscariote, démon stagiaire. Je n'ai pas les accréditations pour vous affecter à la bonne punition… *et de toute façon, elle est en réfection*.", 'normal'),
  D('…on va devoir attendre le boss. Désolé.', 'doute'),
  D("Ça vous tente un petit pari en attendant ? Vous avez l'éternité devant vous, autant en perdre un morceau.", 'fier'),
  P("Non merci. J'ai déjà tout perdu une fois."),
  D("Justement, vous connaissez la procédure. Et moi je m'ennuie ferme : je vous prête de quoi miser, vous gardez vos gains.", 'doute'),
  P("Bon, d'accord. Mais pas d'entourloupe."),
  D("Aucune. Vous avez ma parole… *et sur ce point, croyez-moi, j'ai une réputation*.", 'fier'),
  D("Ici on mise sur une course d'âmes damnées, donc voilà {money} pièces pour commencer. Et avant chaque course, je vous avancerai {allowance} pièces de plus.", 'neutre'),
  D("Ah, et je n'ai le droit de prendre que les paris simples : vainqueur, top 3, pas dans le top 3, dernier. Tout ce qui met deux âmes sur le même ticket, c'est au-dessus de mon grade. Pour l'instant.", 'doute'),
  D("Une dernière chose, vous en ferez ce que vous voudrez : ici, tout se paie. Les punitions, les passages… les portes. Gagnez assez, et vous ne resterez peut-être pas.", 'neutre'),
]

/**
 * Fin de l'avant-dernière course du **premier** cercle : le joueur ignore encore qu'un boss
 * ferme chaque cercle, on le lui apprend ici.
 */
const BOSS_ANNOUNCE: readonly Line[] = [
  D("Mon boss est de retour, il nous a vus jouer. Il veut sa part : {price} pièces à la fin du cercle, et il tiendra lui-même la dernière course.", 'normal'),
  D("Vous payez, il vous laisse monter d'un cercle. Vous ne payez pas, il vous garde… *c'est son métier, il le fait bien*.", 'doute'),
]

/**
 * Même moment, aux cercles suivants. La règle est acquise : le stagiaire rappelle seulement que
 * la prochaine course est celle du boss et ce qu'elle coûte. Il n'en présente aucun — le boss du
 * cercle se présente lui-même juste avant sa course (`bossIntro`), et le doubler ici le
 * dépouillerait de son entrée. Une variante par cercle, rejouées en boucle au-delà de la liste :
 * la même phrase neuf fois de suite ne s'entendrait plus.
 */
const BOSS_ANNOUNCE_NEXT: readonly (readonly Line[])[] = [
  [D("Vous connaissez la maison, maintenant : la dernière course du cercle, c'est le boss qui la tient. {price} pièces en poche à l'arrivée, et on passe.", 'neutre')],
  [D("Prochaine course, dernière du cercle. Le patron d'ici descend tenir le guichet lui-même, et il faudra {price} pièces pour qu'il ouvre la porte.", 'normal')],
  [D("Encore une, et c'est celle du boss. Je vous le dis franchement : sans {price} pièces au bout, on ne sort pas de ce cercle.", 'doute')],
  [D("Le boss a réservé la dernière course. Il réserve toujours… *il n'y a jamais personne*. {price} pièces à la fin, pas une de moins : c'est moi qui tiens les comptes.", 'neutre')],
  [D("Dernière course du cercle, donc dernière chance de réunir les {price} pièces. Le boss, lui, n'accepte pas les acomptes.", 'normal')],
  [D("La suivante est pour le boss… *ils y tiennent tous, c'est leur seul moment de gloire*. {price} pièces et on file au cercle d'après.", 'fier')],
  [D("On arrive au bout du cercle, et le bout d'un cercle, c'est toujours un boss. {price} pièces à l'arrivée, sinon on reste.", 'neutre')],
]

/**
 * Dernier cercle avant l'évasion : le boss de la Trahison, c'est le stagiaire lui-même, promu
 * au cercle précédent. La variante générique gâcherait le seul retournement de la partie — il
 * annonce donc un boss qu'il connaît bien, sans se nommer, et `bossIntro` fait le reste.
 */
const BOSS_ANNOUNCE_SELF: readonly Line[] = [
  D("Dernière course du dernier cercle. {price} pièces, et la porte s'ouvre. Pour de bon."),
  D("C'est le boss de la Trahison qui tient le guichet. Je le connais bien."),
  P('Il est comment ?'),
  D('Ponctuel.'),
]

/**
 * Grades du démon (boutique-README.md « Déblocage par la hiérarchie du stagiaire »).
 * Un grade est obtenu quand le boss du cercle `afterCircle` est battu et le prix payé ;
 * ses `lines` sont dites dans le dialogue de fin de ce cercle, juste avant l'annonce du
 * cercle suivant. `label` — le nom du démon suivi de son grade — change dans les bulles à partir de là, et
 * `portrait` le costume affiché — cinq dessins pour six grades : les deux derniers partagent
 * le costume du boss, le sixième n'étant atteint qu'à l'évasion.
 * Pas encore d'effet sur la boutique : le grade est narratif pour l'instant.
 */
const DEMON_RANKS: readonly DemonRank[] = [
  { name: 'Stagiaire', label: `${DEMON_NAME}, stagiaire`, afterCircle: 0, lines: [], portrait: 'stagiaire_0', faces: true },
  {
    name: 'Assistant',
    label: `${DEMON_NAME}, assistant`,
    // Le premier grade se gagne au bout de DEUX cercles : un seul ne prouve rien, et
    // l'administration infernale ne promeut pas sur un coup de chance.
    afterCircle: 2,
    portrait: 'stagiaire_1_assistant',
    lines: [
      D("Et… il y a mieux. Minos a enroulé sa queue deux fois autour de mon dossier : je suis assistant. Assistant ! Mon premier grade en trois siècles de stage.", 'fier'),
      P('Félicitations. Ça change quoi ?'),
      D("Pour moi, une chaise avec un dossier. Pour vous, le droit de mettre deux âmes sur le même ticket : le « Duel » à ×{duel}, « Deux âmes dans le top 3 » à ×{twoInTop3}, « Top 3 dans le désordre » à ×{podiumAnyOrder}."),
      D("Ne regardez pas que la cote. Un vainqueur, ça se devine. Un duel, ça se lit. Ce n'est pas le même métier, et vous allez avoir besoin du second."),
    ],
  },
  {
    name: 'Tourmenteur',
    label: `${DEMON_NAME}, tourmenteur`,
    afterCircle: 3,
    portrait: 'stagiaire_2_souschef',
    lines: [
      D("Cerbère a signé mon évaluation. Avec trois gueules, ça compte triple : tourmenteur, deuxième échelon."),
      D("J'ai le droit de tourmenter, maintenant. Officiellement. Je vais commencer par mon ancien chef de service."),
      P("Et moi, je suis sur la liste ?"),
      D("Vous ? Vous me rapportez trop. Tant que vous gagnez, je ne tourmente que vos adversaires."),
      D("Et j'ai un tampon de plus : le pari « Vainqueur + dernier » vous est ouvert, à ×{winnerAndLast}. Deux paris en un, et il se joue au fond du classement… *là où personne ne regarde jamais*."),
    ],
  },
  {
    name: 'Contremaître',
    label: `${DEMON_NAME}, contremaître`,
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
    label: `${DEMON_NAME}, sous-directeur`,
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
  { name: 'Boss du neuvième', label: `${DEMON_NAME}, boss du neuvième`, afterCircle: 8, lines: [], portrait: 'stagiaire_4_boss' },
]

/**
 * Un bloc par cercle : les neuf de Dante, puis la montée du mode démon (GDD §8.1). Au-delà du
 * dernier, `circleTexts` (demon.ts) rejoue ce dernier bloc — le quinzième est donc écrit pour
 * être redit à chaque tour de paradis, sans promettre de suite.
 *
 * Le « Bye. » qui clôt les `failure` s'arrête au neuvième : c'est la signature du stagiaire tant
 * qu'il est chez lui. Au-dessus de l'enfer il n'est plus en terrain connu et ne congédie plus
 * personne — l'absence est voulue, ne pas « compléter » les cercles 10 à 15.
 */
const CIRCLES: readonly CircleTexts[] = [
  {
    ordinal: '1er',
    success: [
      D("Félicitations, je ne pensais pas que vous pouviez réussir.", 'fier'),
      D('Si ça vous va, je vais vous coacher. On va vous tester dans les autres cercles.'),
      D("J'ai bien tenté de faire remonter votre nom. On m'a répondu qu'un cercle, ça arrive à n'importe quel mort. Tenez-en deux et ça devient un dossier.", 'doute'),
      D('Prochain arrêt : la Luxure. Des vents éternels y bousculent les âmes, il y en aura {souls} au départ, une de plus. Et le tarif de sortie monte à {price} pièces.'),
    ],
    failure: [D("Bon. Les travaux sont finis, j'ai récupéré mes accréditations ce matin… *et votre punition éternelle avec*. Dommage, on s'amusait bien. Bye.", 'degout')],
    bossIntro: [
      B('Alors c\'est vous. Le mort qui joue aux dés au lieu de descendre.'),
      D('Charon, monsieur. Il a payé son passage, techniquement…', 'normal'),
      B("Techniquement. J'ai passé neuf mille ans à compter des pièces, petit. Je sais ce que veut dire techniquement."),
      B('Une course, alors. Si vous sortez d\'ici avec {price} pièces, je vous laisse la barque. Sinon, je vous mets à la rame.'),
      P('Et si je gagne, c\'est vous qui ramez ?'),
      B("Vous êtes le premier à la poser. Les autres, je les entends surtout ramer."),
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
      P('Il a dit tout ça ?'),
      D("Il a surtout dit {price} pièces. Le reste, c'est du contexte. Ne lui tendez pas la main."),
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
      D("Six cercles. On m'a donné un casier, un badge, et le droit de dire « nous » en réunion. Coach titulaire, presque."),
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
      D("Ce n'est pas un problème, hein ? Un pacte, c'est un pacte. Il y aura {souls} âmes au départ, une de plus, gelées dans le Cocyte, et il faudra {price} pièces pour sortir. Pour de bon."),
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
      B('Vous voilà. Dernier cercle, dernier guichet… *et de mon côté du comptoir, cette fois*.'),
      P("Vous aviez donné votre parole."),
      B("Et je l'ai tenue. Huit cercles, pas une entourloupe. Vous ne m'avez jamais demandé ce qu'il y avait au neuvième."),
      P("Iscariote. J'aurais dû me méfier d'un nom pareil."),
      B("Tout le monde le dit après. Personne ne le dit avant : c'est tout le métier."),
      B("{price} pièces. Je ne triche pas, je n'ai jamais triché. Je gagne… *ce n'est pas la même chose*."),
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
      B("{boss}. Je ne gèle personne. J'attends, et les âmes gèlent toutes seules. C'est le même résultat en moins fatigant."),
      P("Et la course ?"),
      B("La course attend aussi. {price} pièces, avant que vos doigts ne tombent."),
      D("…"),
      P("Vous n'avez rien à dire, pour une fois ?"),
      D("Il fait trop froid pour être drôle."),
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
      D("Nous y sommes. Au-dessus, il n'y a plus rien… *alors on recommence ici, et le tarif monte*."),
      D("Les gradins se remplissent à nouveau, les anneaux tournent, et le guichet reste ouvert. {souls} âmes au départ, {price} pièces pour le tour suivant."),
      P("Ça ne s'arrête jamais ?"),
      D("Vous avez eu une porte. Vous ne l'avez pas prise."),
    ],
    failure: [D("Au paradis aussi, on ferme le guichet quand la bourse est vide. Asseyez-vous dans les gradins, vous regarderez les autres.")],
    bossIntro: [
      B("Des dés, des tickets, des âmes qui courent. On y joue encore, en bas. C'est primitif."),
      P("Et vous descendez pour ça ?"),
      B("J'aime bien ces jeux primitifs. Tout le monde y passe, et personne ne lève les yeux. C'est la meilleure place de la maison."),
      B("{price} pièces. Et cette fois, c'est moi qui lis la course avant vous."),
    ],
  },
]

const ENDINGS = {
  gameOverTitle: 'Punition éternelle',
  gameOverBody: 'Le prix du cercle était de {price} pièces. Il vous en manquait {missing}.',
  escapeTitle: 'Évasion',
  escapeBody: 'Neuf cercles traversés, {money} pièces en poche. Le stagiaire est devenu boss, et vous, vous êtes sorti.',
  /** Au neuvième cercle payé, la porte n'est pas la seule issue (GDD §5.3, §8.1). */
  escapeStay: 'Ou vous restez, du bon côté du guichet cette fois, et vous montez voir ce qu\'il y a au-dessus de l\'enfer.',
  escapeContinue: 'Monter avec lui',
  backToMenu: 'Retour au menu',
} as const

const HUD = {
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
  /** Bandeau de la course du boss : son pouvoir ne vaut que sur cette course (GDD §5.1). */
  bossPowerTitle: 'Pouvoir de {boss}',
  bossPowerHint: 'Actif sur cette course uniquement',
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

const MAP = {
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

const STATS = {
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
const COLLECTION = {
  title: 'Collection',
  count: '{n} objets sur {total} en rayon',
  hint: 'Chaque cercle payé descelle un objet, pour toutes vos évasions à venir.',
  locked: '{n} objet{s} encore scellé{s}. Le stagiaire refuse d’en dire le nom.',
  complete: 'Le catalogue est entier. Le stagiaire n’a plus rien à cacher.',
  lockedCard: 'Scellé',
  lockedTitle: 'Objet encore scellé : franchissez un cercle pour en desceller un.',
  empty: 'Rien en rayon. Ce n’est pas normal : vérifie shop.unlockedAtStart.',
} as const

/** Révélation de fin de cercle : l'objet que le cercle payé vient de desceller. */
const UNLOCK = {
  title: 'La réserve s’entrouvre',
  intro: 'Le stagiaire disparaît sous le guichet, remonte poussiéreux, et pose ça devant vous.',
  added: 'Descellé pour de bon : cet objet peut désormais sortir en vitrine, dans cette évasion comme dans les suivantes.',
  next: 'Continuer',
  remaining: 'Encore {n} objet{s} sous scellé.',
  last: 'C’était le dernier. Le catalogue est entier.',
} as const

/** Dette infernale : le marché proposé quand le prix du cercle est hors d'atteinte. */
const DEBT = {
  title: 'Le stagiaire sort un registre',
  lead: 'Le cercle coûte {price} pièces. Vous en avez {money}. Il en manque {missing}.',
  offer: '« Je peux avancer {borrow} pièces. Une seule fois, et je ne fais pas ça par bonté. »',
  cost: 'Le prix du cercle suivant montera de {interest} pièces.',
  accept: 'Emprunter {borrow} pièces',
  refuse: 'Refuser et rester ici',
} as const

const OPTIONS = {
  title: 'Option',
  volume: 'Volume',
  volumeDisabled: "pas de musique pour l'instant",
  language: 'Langue',
  speed: 'Vitesse des animations',
} as const

/** Paris verrouillés par le grade du stagiaire ; ticket de guichet (spec 03). */
const BETS = {
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
  diceSeen: 'Dés lancés : {souls} — {dist}',
  trayLabel: 'Jetons de mise',
  chipHint: 'Glissez ce jeton dans le logement, ou cliquez-le',
  chipChosen: 'Jeton posé : c’est la mise en cours',
  tooRich: 'Solde insuffisant ({n} ¤)',
} as const

/** Jauge des trois usages : solde, misé en course, prix du cercle (spec 01/C1). */
const GAUGE = {
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
const SHOP = {
  emptyState: 'Posez d’abord un pari, le stagiaire n’ouvre pas la caisse aux indécis.',
  goToBets: 'Aller aux paris',
  emptyVitrine: 'Rien en rayon aujourd’hui. Le stagiaire hausse les épaules.',
  risk: { safe: 'Sûr', bold: 'Ambitieux', danger: 'Danger ⚠' } as const,
  riskTitle: {
    safe: 'Sans contrepartie, impact au plus moyen.',
    bold: 'Impact fort ou extrême : change la façon de jouer le cercle.',
    danger: 'Cet objet a une contrepartie : lisez-la avant d’acheter.',
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
  /** Masques (GDD §6.5) : l'achat se termine par le choix de l'âme marquée. */
  pickSoul: 'quelle âme marquer ?',
  pickSoulStrip: 'quelle âme libérer ?',
  markWarning: `Le masque tient jusqu'à la fin du run et remplace ce que l'âme portait déjà.`,
  stripWarning: `Seules les âmes marquées peuvent être libérées.`,
  soulPlain: 'sans personnalité',
  mark: 'Marquer',
  strip: 'Retirer',
} as const

/** Écran de course : frise de sous-phases, file de combinaisons, prévisualisation (spec 05). */
/** Objets que le joueur déclenche lui-même depuis l'écran de course. */
const ITEMS = {
  tribuneHint: 'Tribune infernale : choisissez une case libre, hors départ et hors zone de fin.',
  double: 'Pièce à deux faces : doubler {stake} ¤ de mises',
} as const

const RACE = {
  /** Touche qui lance les dés : la plus grande du clavier pour le geste le plus répété. */
  rollKey: 'Espace',
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
const BET_LIVE = {
  onTrack: 'en bonne voie',
  atRisk: 'compromis',
  provisional: 'provisoire',
  title: 'D’après les positions actuelles ; seul le classement final compte.',
  betted: 'Âme pariée',
} as const

/** Plateau. */
const BOARD = {
  /** Cases spéciales du terrain : elles n'agissent que sur l'âme qui s'y arrête (GDD §2.2). */
  specialMark: { gold: '¤', trap: '✷', boost: '▲' } as const,
  special: {
    // `{s}` porte le pluriel (voir `fill`) : ces phrases sont désormais affichées telles
    // quelles dans la bulle de survol, où « 1 case(s) » se verrait.
    gold: 'Case payante : l’âme qui s’y arrête vous rapporte {n} pièce{s}, à condition que vous ayez un pari ouvert sur elle.',
    trap: 'Piège : l’âme qui s’y arrête recule de {n} case{s}.',
    boost: 'Tremplin : l’âme qui s’y arrête avance de {n} case{s} de plus.',
  } as const,
  blockedTitle: 'Case bloquée (colonne {column}, couloir {lane}) : aucune âme ne peut s’y arrêter.',
  tribune: 'Tribune infernale',
  tribuneTitle: 'Tribune infernale : l’âme qui s’arrête ici vous paie et repart poussée.',
  tribunePlace: 'Poser la tribune sur la case {column}',
  zoneClosed: 'plus de pari',
  zoneClosedTitle: 'Une âme a franchi le seuil : plus aucun pari sur cette course.',
  tieColumn: 'Même colonne : le couloir le plus bas devant.',
  personality: 'Personnalité — {name} : {effect}',
} as const

/** Modale de fin de course (spec 06). */
const RESULTS = {
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
const GLOSSARY = {
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
const HELP = {
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
            '**Lancez les dés.** Deux dés **Distance** (−1, +1, +2, +3) et trois dés **Âme** (chacun désigne une coureuse).',
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
            '**Simples** — une seule âme sur le ticket, lisibles et ouverts dès le départ : vainqueur (×{winner}), top 3 (×{top3}), pas dans le top 3 (×{notTop3}), dernière place (×{last}).',
            '**Combinés** — **deux âmes sur le même ticket** : le duel « A finit devant B » (×{duel}), deux âmes dans le top 3 (×{twoInTop3}), le podium dans le désordre (×{podiumAnyOrder}). La cote n’est pas toujours plus grosse — ce qui change, c’est qu’un duel se **lit** quand un vainqueur se devine.',
            '**Gros tickets** — le podium exact (×{podiumExact}) et le classement complet (×{fullRankingExact}) : de quoi payer un cercle entier d’un coup, si vous lisez la course comme un livre ouvert. Entre les deux, « vainqueur ET dernier » (×{winnerAndLast}) ne demande que de regarder les deux bouts — presque personne ne regarde le fond du classement.',
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
      id: 'personnalites',
      title: 'Les personnalités des âmes',
      icon: '🎭',
      blocks: [
        { kind: 'p', text: 'À partir du **troisième cercle**, à la fin de la première course, une âme révèle sa personnalité. Ce n’est pas un tirage : c’est **la mieux classée de celles qui n’en avaient pas**. La personnalité, elle, est tirée au sort — et elle reste attachée à cette âme **jusqu’à la fin de votre évasion**.' },
        { kind: 'p', text: 'Une âme marquée porte un signe sur son jeton. Passez la souris dessus : la règle est écrite en toutes lettres. Elle est visible **avant les paris**, et c’est tout l’intérêt — une personnalité ne se déclenche pas, elle se lit.' },
        {
          kind: 'ul',
          items: [
            'certaines changent la **lecture du dé** : Le Constant avance toujours d’une case, L’Opposant prend l’inverse de ce que le dé annonce ;',
            'd’autres changent l’**amplitude** : L’Ambitieux amplifie les grands écarts, Le Martyr traîne puis rattrape d’un coup, Le Condamné part lent et finit lancé ;',
            'd’autres encore changent le **plateau** : Le Résolu traverse les cases bloquées, L’Ogre écrase ce qu’il dépasse, Le Parasite suit l’âme qui le précède ;',
            'Le Juge, lui, ne court pas différemment : il **change vos gains** selon sa propre place. Surveillez-le même sans parier dessus.',
          ],
        },
        { kind: 'p', text: 'La boutique vend un **masque** par personnalité : vous choisissez l’âme, et le masque remplace ce qu’elle portait. Le masque brisé, lui, libère une âme marquée.' },
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
const DEV = {
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

// ---- Tables indexées par les identifiants du noyau ---------------------------
// Le moteur ne porte que des ids et des nombres ; les mots sont ici, une colonne par langue.
// Les `Record` sont typés sur les ids : un effet, un pari ou une rareté ajoutés au noyau
// ne compilent plus tant que toutes les langues ne les ont pas nommés.

/** Annonce du pouvoir d'un boss. `{n}` prend la valeur de l'effet, `(s)` s'accorde dessus. */
const BOSS_EFFECTS: Readonly<Record<BossEffectId, string>> = {
  extraPairs: 'L’adversaire lance {n} paire(s) de plus par tour.',
  harshNegatives: 'Toute distance négative recule de {n} case(s) de plus, des deux côtés.',
  bite: 'Une âme percutée est mordue : elle recule de {n} case(s) après le saut.',
  costlyLateBets: 'Un pari posé en course coûte {n} fois sa mise.',
  pushBack: 'Reculer sur une âme la pousse en arrière au lieu d’échanger.',
  betThreshold: 'Le seuil de pari tombe à {n} % du parcours.',
  opponentBoost: 'Les distances positives de l’adversaire gagnent {n} case(s).',
  lyingSoulDice: 'Une fois sur {n}, un dé Âme désigne l’âme voisine.',
  targetBettedSouls: 'Les paires adverses visent vos âmes pariées et les font reculer.',
  slowWater: 'Toute distance positive perd {n} case(s), des deux côtés.',
  chained: 'Une âme percutée est enchaînée : elle ne bouge plus pendant {n} tour(s).',
  closeWindow: '{n} type(s) de pari deviennent indisponibles, en rotation à chaque tour.',
  frozenLanes: 'Une âme ne se déporte plus dans un autre couloir : elle percute.',
  backdraft: 'À la fin de chaque tour, toutes les âmes reculent de {n} case(s).',
  replayTurn: 'Le tour d’arrivée est résolu une seconde fois, adversaire compris.',
}

const BET_TIERS: Readonly<Record<BetTier, string>> = { simple: 'Simples', intermediate: 'Combinés', advanced: 'Avancés' }

const BET_TYPE_TEXTS: Readonly<Record<BetTypeId, BetTypeText>> = {
  winner: { label: 'Vainqueur pur', description: `L'âme termine première.` },
  top3: { label: 'Top 3', description: `L'âme termine dans les trois premières.` },
  notTop3: { label: 'Pas dans le top 3', description: `L'âme ne termine pas dans les trois premières.` },
  last: { label: 'Dernière place', description: `L'âme termine dernière.` },
  podiumAnyOrder: { label: 'Top 3 dans le désordre', description: 'Les trois âmes occupent les trois premières places, dans un ordre quelconque.' },
  twoInTop3: { label: 'Deux âmes dans le top 3', description: 'Les deux âmes terminent toutes deux dans le top 3.' },
  duel: { label: 'Duel', description: 'La première âme termine devant la seconde.', slots: ['devant', 'derrière'] },
  podiumExact: { label: 'Podium exact', description: 'Les trois premières places, dans cet ordre exact.', slots: ['1re', '2e', '3e'] },
  fullRankingExact: { label: 'Classement complet exact', description: 'Toutes les positions finales, dans cet ordre exact.' },
  winnerAndLast: { label: 'Vainqueur + dernier', description: 'La première et la dernière âme, exactement.', slots: ['vainqueur', 'dernier'] },
}

const BET_REFUSALS: Readonly<Record<BetRefusal['kind'], string>> = {
  raceFinished: 'La course est terminée.',
  bettingClosed: 'Une âme a dépassé le seuil : plus de pari sur cette course.',
  soulTwice: 'Une âme ne peut être désignée qu’une fois.',
  missingSouls: 'Désignez {needed} âme{s} ({given}/{needed}).',
  tooManySouls: 'Trop d’âmes désignées.',
  unknownSoul: 'Âme inconnue.',
  alreadyPlaced: 'Ce pari est déjà posé.',
  noStake: 'Choisissez une mise.',
  tooExpensive: 'Pas assez d’argent pour cette mise.',
}

const CANCEL_REFUSALS: Readonly<Record<CancelRefusal, string>> = {
  raceStarted: 'La course est lancée : un pari posé ne se retire plus.',
  notFound: 'Pari introuvable.',
  alreadySettled: 'Ce pari est déjà réglé.',
}

const ITEM_KINDS: Readonly<Record<ItemKind, string>> = { artefact: 'Artefact', die: 'Dé', forge: 'Forge', personality: 'Masque' }
const RARITIES: Readonly<Record<Rarity, string>> = { common: 'commun', rare: 'rare', legendary: 'légendaire' }

/** Ligne de journal d'un achat. `{name}` est l'objet, `{die}` le dé visé, `{n}` son numéro. */
const PURCHASE_LOG: Readonly<Record<PurchaseLog['kind'], string>> = {
  decap: 'Face décapée sur le {die} n°{n} : elle revaut {value}.',
  artefactSold: 'Artefact revendu : {name}.',
  artefactReplaced: `{name} remplace {replaced} — l'ancien est détruit.`,
  artefactBought: 'Artefact acquis : {name}.',
  dieAdded: '{name} rejoint le lancer : {count} dés Distance.',
  dieReplaced: '{name} remplace le {die} n°{n}.',
  faceForged: '{name} gravée sur le {die} n°{n}, face {value}.',
  personalityGiven: '{who} porte désormais {personality}{replaced}.',
  personalityRemoved: '{who} perd {personality} : plus rien ne la distingue.',
}

/** Ce que remplace un masque posé sur une âme déjà marquée : glissé dans `personalityGiven`. */
const PURCHASE_REPLACED = ' (à la place de {personality})'

/** Récit d'un déplacement dans le journal. Les quatre dernières s'ajoutent à `move`. */
const MOVE = {
  blockedAtStart: '{who} {dist}{notes} : sur la ligne de départ, ne recule pas.',
  move: '{who} {dist}{notes} : case {from} → {to}.',
  notes: ' ({notes})',
  notesSeparator: ' ; ',
  detourBlocked: ' Couloir bloqué, se décale sur le couloir {lane}.',
  detourOccupied: ' Case occupée, se décale sur le couloir {lane}.',
  jump: ' Percute {souls} et saute devant.',
  swap: ' Recule sur {soul} : échange de place ({soul} passe en {to}).',
  crossedFinish: ` Franchit l'arrivée !`,
} as const

/** Ce qui a modifié un déplacement, cité entre parenthèses dans le journal. */
const MOVE_NOTES: Readonly<Record<MoveNoteId, string>> = {
  harshNegatives: 'Reculs aggravés : {value}',
  slowWater: 'Eaux lourdes : +{value}',
  clepsydreFlip: 'Clepsydre : {from} → +{to}',
  clepsydreBoost: 'Clepsydre : +{from} → +{to}',
  seal: 'Sceau du parieur : +{value}',
  compass: 'Boussole des Limbes',
  bite: 'Morsure',
  riggedScales: 'Balance truquée',
  camelPack: 'Bât de chameau',
  cocytusChain: 'Chaîne du Cocyte',
  magnet: 'Aimant',
  explosive: 'Explosive',
  explosiveSelf: 'Explosive : personne percuté',
  stand: 'Tribune infernale',
  trap: 'Piège',
  boost: 'Tremplin',
  personalityDie: '{who} lit {from} → {to}',
  personalityMove: '{who} : {from} → {to}',
  grudge: 'Rancunes du Martyr : +{value}',
  ogre: `L'Ogre bouscule : −{value}`,
  parasite: 'Le Parasite suit : +{value}',
}

/**
 * Les dix personnalités (GDD §6.5). `name` est le nom affiché partout — jeton, masque de
 * boutique, journal — et `effect` la règle en une phrase, celle que le joueur lit au survol
 * d'un jeton marqué. Le symbole est gravé sur la vignette du masque, pas écrit ici.
 */
const PERSONALITIES: Readonly<Record<PersonalityId, { name: string; effect: string }>> = {
  martyr: {
    name: 'Le Martyr',
    effect: `Avance d'une case de moins (jamais moins de 1). Chaque fois qu'on le percute ou qu'on l'échange, il garde rancune : tout lui revient d'un bloc en entrant en zone de fin.`,
  },
  ambitieux: {
    name: `L'Ambitieux`,
    effect: `Ses avancées de 3 ou plus gagnent une case, ses reculs en perdent une. Il finit rarement au milieu.`,
  },
  tricheur: {
    name: 'Le Tricheur',
    effect: `Une fois sur quatre, le dé Âme qui le désigne est relancé — le vôtre comme celui de l'adversaire.`,
  },
  condamne: {
    name: 'Le Condamné',
    effect: `Ses avancées du premier tour perdent une case ; celles qu'il entame depuis la zone de fin en gagnent une.`,
  },
  parasite: {
    name: 'Le Parasite',
    effect: `Dès que l'âme juste devant lui avance de 2 cases ou plus, il avance de 1 dans la foulée.`,
  },
  juge: {
    name: 'Le Juge',
    effect: `Ne court pas différemment, mais compte : dans le top 3, vos gains de la course sont multipliés par 1,5 ; dernier, ils sont divisés par deux. Vos pertes ne bougent pas.`,
  },
  resolu: {
    name: 'Le Résolu',
    effect: `Les cases bloquées n'existent pas pour lui : il s'y arrête comme sur n'importe quelle autre, sans jamais dévier de couloir.`,
  },
  opposant: {
    name: `L'Opposant`,
    effect: `Lit l'inverse du dé Distance : un +2 le fait reculer de deux cases, un -1 l'avance d'une.`,
  },
  constant: {
    name: 'Le Constant',
    effect: `Quel que soit le dé Distance, il avance d'une case. Jamais plus, jamais moins, jamais en arrière.`,
  },
  ogre: {
    name: `L'Ogre`,
    effect: `L'âme qu'il dépasse en la percutant recule d'une case de plus.`,
  },
}

/**
 * Révélation de personnalité : l'écran joué à la fin de la première course d'un cercle, à
 * partir du troisième. L'âme n'est pas tirée au sort — c'est la mieux classée qui n'avait
 * encore rien à dire d'elle-même, et le texte le dit pour que le joueur voie la règle.
 */
const REVEAL = {
  title: 'Une âme se découvre',
  intro: `{who} a fini {rank} de la course. Le stagiaire feuillette son dossier, siffle entre ses dents, et vous tend la fiche.`,
  rankFirst: 'en tête',
  lead: 'Désormais, et pour tout ce qui reste de votre évasion :',
  kept: 'Cette personnalité reste attachée à {who} jusqu’à la fin du run. Un masque de la boutique peut la remplacer, ou la retirer.',
  next: 'Continuer',
} as const

/** Journal de la course, sous le plateau. */
const LOG = {
  label: 'Journal de la course',
  title: 'Journal',
  raceHeader: 'Cercle {circle}, course {n}/{total} — terrain « {terrain} », {souls} âmes, {columns} cases, {lanes} couloir{s}{blocked}, graine {seed}. Posez vos paris.',
  raceHeaderBlocked: ', {n} case{s} bloquée{s}',
  allowance: 'Le stagiaire vous avance {n} pièces pour cette course{bonus}.',
  allowanceBonus: ' (dont {n} grâce à la {item})',
  raceStart: 'La course commence.',
  betPlaced: 'Pari {type} sur {souls} : mise {stake}{paid} à {mult}, rapporte {payout} si gagné.',
  betPaid: ' (payée {cost})',
  betCancelled: 'Pari {type} retiré : {refund} pièces rendues.',
  betWon: 'Pari {type} ({souls}) gagné : +{net} net (mise {stake} rendue).',
  betLost: 'Pari {type} ({souls}) perdu : −{stake}.',
  lateBetOpen: `Œil du parieur : vous pouvez parier après avoir vu vos dés, jusqu'à la résolution.`,
  shopOpen: 'La boutique ouvre : {n} objets en vitrine.',
  rerolled: 'Vitrine renouvelée pour {cost} pièces.',
  thresholdMoved: 'Seuil de pari à {pct} % dès cette course.',
  sold: '{name} revendu : +{back} pièces.',
  purchase: '{text} ({cost} pièces)',
  purchaseFreeForge: `{text} — offert par le Marteau d'Héphaïstos.`,
  holedPurse: 'Bourse percée : +{n} pièces.',
  stand: 'Tribune infernale : +{n} pièces.',
  standPlaced: 'Tribune infernale posée case {column}.',
  mirrorFirst: 'Miroir de Narcisse : l’adversaire joue en premier.',
  opponentRoll: `L'adversaire lance : {who} {dist}.`,
  opponentReplay: `L'adversaire rejoue : {who} {dist}.`,
  foresight: '{source} : {names}.',
  foresightAll: 'Fouet du contremaître',
  foresightFirst: 'Œil de Charon',
  roll: 'Lancer : Distance {dist} — Âmes {souls}.',
  gildedFace: 'Face dorée : +{n} pièces.',
  tip: 'Pourboire du stagiaire : +{n} pièces.',
  vial: 'Fiole de sang : dé n°{n} à {face} pour {cost} pièces.',
  momentum: 'Élan : {added} ajouté, le dé n°{n} vaut {face}.',
  lockOff: 'Verrou de Minos levé.',
  lockOn: 'Verrou de Minos : le dé n°{n} gardera {face}.',
  doubled: `Pièce à deux faces : mises doublées (−{cost} pièces). L'adversaire lance une paire de plus.`,
  dieCost: '{name} : −{cost} pièces pour cette association.',
  dieUnpaid: `{name} : pas assez d'argent, la face vaut 0.`,
  angelReplay: `L'Ange rejoue le dernier tour.`,
  raceEnd: `Une âme a franchi l'arrivée : fin de course au tour {turn}.`,
  judgeTop: 'Le Juge ({who}) finit {rank} : vos gains de la course sont multipliés par 1,5.',
  judgeLast: `Le Juge ({who}) finit dernier : vos gains de la course sont divisés par deux. Vos pertes, elles, restent entières.`,
  bookRefund: 'Livre des comptes : {n} pièces remboursées.',
  balmRefund: 'Baume du perdant : {n} pièces rendues sur les mises perdues.',
  tally: 'Bilan des paris : {net}. Argent : {money}.',
} as const

/**
 * Libellés d'écran qui n'appartiennent à aucun des groupes ci-dessus : titres de panneaux,
 * intitulés lus par les lecteurs d'écran, boutons. Rangés par panneau.
 */
const UI = {
  menu: { noRun: 'Aucune évasion en cours', devTitle: 'Menu développeur (Ctrl+Maj+D)' },
  bets: {
    panel: 'Paris',
    placed: 'Paris posés',
    open: 'Poser un pari',
    submit: 'Poser le pari',
    none: 'Aucun pari pour cette course.',
    needOne: 'Au moins un pari pour lancer la course.',
    lastCall: 'Dernier moment pour parier ce tour.',
    draft: '{type} · mise {stake} à {mult}.',
    raceOver: 'Course terminée : les paris sont réglés.',
    rolled: 'Les dés sont lancés : les paris reprennent au prochain tour.',
    resolving: 'Paris suspendus pendant la résolution.',
    shopNeedsBet: 'La boutique n’ouvre sa caisse qu’après un premier pari',
    raceNeedsBet: 'Lancer la course — pose d’abord un pari',
    noBetYet: 'Il faut au moins un pari initial',
    diceRolled: 'Les dés sont lancés : plus de pari avant le prochain tour.',
    waitResolution: 'Attendez la fin de la résolution.',
    windowClosed: 'Guichet fermé ce tour : {type} est indisponible.',
    counterCut: 'Ce guichet prend sa part : il faut {cost} pièces pour miser {stake}.',
    thresholdPassed: 'Une âme a dépassé le seuil de {pct} % : plus de pari.',
    pickMore: 'Choisis encore {n} âme{s} — dans le panneau ou en cliquant les jetons du plateau.',
    decayed: ' Cotes décotées : course à {pct} %.',
  },
  ticket: {
    soul: 'Âme',
    souls: 'Âmes',
    soulsOrdered: 'Âmes, dans l’ordre',
    ifWon: '+{net} si gagné',
    won: 'gagné +{net}',
    lost: 'perdu −{stake}',
    turn: ' · tour {n}',
    coins: '{n} pièces',
    bestBet: '+{n} pièces',
  },
  board: { label: 'Plateau de course', start: 'Départ', finish: 'Arrivée', souls: 'Âmes en course' },
  play: {
    player: 'Joueur',
    opponent: 'Adversaire',
    soulDice: 'Dés Âme',
    distanceDice: 'Dés Distance',
    roll: 'Lancer les dés',
    resolve: 'Résoudre',
    reset: 'Réinitialiser',
    cumul: 'cumul de {n} dés',
    betsDone: 'Paris posés. Passez par la boutique si vous voulez, puis lancez la course.',
    rolling: 'Les dés roulent…',
    ordered: 'Ordre fixé. Résolvez, ou réordonnez la file (glisser, ← → ×) avant.',
    pickDistance: 'Choisissez maintenant un dé Distance à lui associer.',
    resolving: 'Résolution de vos combinaisons…',
    finished: 'Course terminée.',
    prepNoBet: 'Posez au moins un pari initial pour ouvrir la boutique et lancer la course.',
    idle: 'Tour {n} — lancez les dés.{lastCall}',
    idleLastCall: ' Dernier moment pour parier ce tour.',
    pairing: `Glissez (ou cliquez) un dé Âme sur un dé Distance. L'ordre des cartes est l'ordre de résolution ({n}/{total}){unused}.`,
    unusedOne: ' — 1 dé Âme restera inutilisé',
    unusedMany: ' — {n} dés Âme resteront inutilisés',
    opponentTurn: `Tour de l'adversaire…`,
    placedCount: 'Paris posés ({n})',
  },
  game: { steps: 'Étapes', auto: 'auto', autoTitle: 'Mode test : enchaîne les tours tout seul', activeArtefacts: 'Artefacts actifs', noArtefact: 'Aucun artefact. La boutique en propose entre les paris et la course.' },
  inventory: { label: 'Inventaire', distanceDice: 'Dés Distance', baseDie: 'Dé de base' },
  ranking: { final: 'Classement final', tally: 'Bilan des paris', none: 'Aucun pari sur cette course.' },
  shop: { closed: 'La boutique est fermée.', notInWindow: 'Objet absent de la vitrine.', notEnoughMoney: 'Pas assez d’argent.', alreadyOwned: 'Déjà possédé.', noFaceLeft: 'Plus aucune face à forger.', nothingToStrip: 'Aucune âme marquée dans cette course.', sellFailed: 'Revente impossible.', decapCost: 'Le décapage coûte {cost} pièces.', pickDie: 'quel dé remplacer ?', pickFace: 'quelle face forger ?', alreadyForged: 'Déjà forgée', slotsFull: 'Emplacements pleins', afterBets: 'Paris posés : ce qui reste est à dépenser… ou à garder.', till: 'Le stagiaire tient la caisse.' },
  /** Refus d'un objet déclenché à la main, depuis l'écran de course. */
  artefacts: {
    notOwned: 'Artefact non possédé.',
    decapFailed: 'Décapage impossible.',
    noVial: 'Vous ne possédez pas la Fiole de sang.',
    vialUsed: 'La Fiole a déjà servi ce tour.',
    diePaired: 'Ce dé est déjà associé.',
    vialCash: 'Il faut {cost} pièces comptant : la Fiole ne fait pas crédit.',
    noMomentumFace: `Ce dé n'a pas de face d'élan.`,
    momentumUsed: 'Élan déjà pris sur ce dé.',
    dieNotFound: 'Dé introuvable.',
    noLock: 'Vous ne possédez pas le Verrou de Minos.',
    noCoin: 'Vous ne possédez pas la Pièce à deux faces.',
    coinUsed: 'La pièce a déjà été jetée cette course.',
    nothingToDouble: 'Aucun pari ouvert à doubler.',
    doubleCost: 'Il faut {cost} pièces pour doubler toutes les mises.',
    noStand: 'Vous ne possédez pas la Tribune infernale.',
    badCell: 'Case impossible : hors départ, hors zone de fin, et libre.',
  },
  map: { crossed: 'Cercle traversé.' },
  dialogue: { end: 'Terminer' },
} as const

/**
 * Règles d'écriture du français : « 23e », pluriel à partir de deux, virgule décimale.
 * Le zéro reste au singulier — aucune de ces phrases ne s'écrit avec zéro, elles ne sont
 * affichées que lorsqu'il y a quelque chose à annoncer.
 */
const fmt: Fmt = {
  // « 1er » et non « 1e » : la règle vaut pour les rangs de classement comme pour les cercles.
  ordinal: (n) => (n === 1 ? '1er' : `${n}e`),
  plural: (n) => (n > 1 ? 's' : ''),
  odds: (m) => String(m).replace('.', ','),
}

export const FR = {
  GAME_NAME,
  SPEAKERS,
  MENU,
  INTRO,
  BOSS_ANNOUNCE,
  BOSS_ANNOUNCE_NEXT,
  BOSS_ANNOUNCE_SELF,
  DEMON_RANKS,
  CIRCLES,
  ENDINGS,
  HUD,
  MAP,
  STATS,
  COLLECTION,
  UNLOCK,
  REVEAL,
  DEBT,
  OPTIONS,
  BETS,
  GAUGE,
  SHOP,
  ITEMS,
  RACE,
  BET_LIVE,
  BOARD,
  RESULTS,
  GLOSSARY,
  HELP,
  DEV,
  BOSS_EFFECTS,
  BET_TIERS,
  BET_TYPE_TEXTS,
  BET_REFUSALS,
  CANCEL_REFUSALS,
  ITEM_KINDS,
  RARITIES,
  PURCHASE_LOG,
  PURCHASE_REPLACED,
  PERSONALITIES,
  MOVE,
  MOVE_NOTES,
  LOG,
  UI,
  fmt,
}
