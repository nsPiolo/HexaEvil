# Cartes action — catalogue abandonné

> **Décision (19 septembre 2026) : les cartes action ne seront pas
> implémentées.** Le système demandait une main, une limite de cartes par tour,
> six fenêtres de jeu dans la boucle de tour et une interface propre pour chacune
> — pour de l'agentivité ponctuelle que la forge, les dés spéciaux et les
> artefacts couvrent déjà de façon permanente.
>
> Le document reste ici comme **réservoir d'idées** : les meilleures ont été
> converties en faces de forge, en dés et en artefacts. Voir
> [Ce qui a été recyclé](#ce-qui-a-été-recyclé) ci-dessous. Les chiffres et les
> effets ci-après ne sont plus des spécifications : ce sont des notes.

Consommables à usage unique achetés en boutique (GDD §6.2). Elles agissent sur le
plateau et la résolution, jamais seulement sur l'argent.

Règles de main proposées :

- **main de 5 cartes** au maximum, +1 au rang 2 et +1 au rang 4 ;
- **2 cartes jouées par tour** au maximum, dont une seule entre deux combinaisons ;
- une carte annonce toujours son **moment de jeu** ; jouée hors moment, elle est
  simplement indisponible (grisée) ;
- **règle de Long Shot** : aucune carte ne peut faire franchir l'arrivée à une
  âme. Un déplacement de carte qui atteindrait l'arrivée s'arrête sur la dernière
  case avant. Seuls les dés font gagner ;
- les cartes non jouées se conservent d'une course à l'autre, mais pas d'un cercle
  à l'autre sans l'artefact adéquat (à définir).

## Moments de jeu

| Code | Moment | Ce qu'on sait à ce moment |
|:-:|---|---|
| AC | Avant la course | personnalités, plateau ; les paris initiaux ne sont pas posés |
| AL | Avant le lancer | positions, paris actifs |
| AA | Après le lancer, pendant l'association | les 5 dés du joueur |
| EC | Entre deux combinaisons | le résultat de la combinaison précédente |
| TA | Après la paire adverse, avant sa résolution | la paire de l'adversaire |
| FC | Fin de course, avant le classement | positions finales |

## Échelle de prix

Rareté commune 5 à 15, rare 15 à 30, légendaire 30 à 50. Une carte coûte
volontairement moins qu'un artefact : c'est de l'agentivité ponctuelle, et
le joueur doit pouvoir en acheter deux ou trois par visite sans renoncer au prix
du cercle.

---

## A. Sur les cases (12)

| # | Carte | Moment | Effet | Prix |
|---:|---|:-:|---|---:|
| 1 | Tribune éphémère | AC | Placez une tribune `+1` ou `-1` sur une case libre (hors départ et zone de fin) pour cette course. Chaque âme qui s'y arrête est déplacée et vous rapporte 2. | 10 |
| 2 | Éboulement | AL | Une case de votre choix (hors départ, hors dernière case) est bloquée pour le tour : une âme qui devrait s'y arrêter s'arrête juste avant. | 8 |
| 3 | Pont branlant | AC | Retirez une case du parcours pour la course : le plateau est plus court d'une case. | 15 |
| 4 | Rallonge | AC | Ajoutez une case au parcours pour la course. Le seuil 60 % est recalculé. | 12 |
| 5 | Sables mouvants | AL | Marquez une case : la première âme qui s'y arrête ce tour y reste jusqu'à la fin du tour (les paires adverses ne la déplacent pas). | 10 |
| 6 | Tremplin | AL | Marquez une case : la première âme qui s'y arrête ce tour avance de 2 cases de plus (règle de collision normale). | 15 |
| 7 | Glace noire | AL | Marquez une case : toute âme qui s'y arrête ce tour glisse d'une case en avant, sans collision (elle cohabite). | 8 |
| 8 | Trou de ver | AL | Choisissez deux cases vides : ce tour, une âme qui s'arrête sur l'une réapparaît sur l'autre. | 20 |
| 9 | Fosse de Malebolge ⚠ | AC | Placez une fosse sur une case : toute âme qui s'y arrête recule de 2 **et** vous perdez 3 pièces à chaque déclenchement. | 12 |
| 10 | Ligne d'arrivée avancée | AC | L'arrivée est franchie une case plus tôt pour cette course. Le nombre de cases après l'arrivée augmente d'autant. | 25 |
| 11 | Goudron | AL | Marquez une case : ce tour, toute âme qui s'y arrête perd les déplacements induits (Parasite, Jumeaux, Aimant, Bât). | 8 |
| 12 | Point de rassemblement | FC | Toutes les âmes situées à égalité sur la dernière case sont classées dans l'ordre de leur numéro d'arrivée inversé. | 10 |

## B. Sur les âmes (14)

| # | Carte | Moment | Effet | Prix |
|---:|---|:-:|---|---:|
| 13 | Coup de fouet | EC | Une âme de votre choix avance de 1. | 8 |
| 14 | Croche-pied | EC | Une âme de votre choix recule de 1 (échange si occupé, départ exclu). | 8 |
| 15 | Bouclier de Virgile | AL | Une âme est protégée ce tour : elle ne peut être ni percutée ni échangée. | 12 |
| 16 | Masque de Protée | AA | Échangez l'identité de deux âmes désignées par vos dés Âme : les distances iront à l'autre. | 10 |
| 17 | Transfert | EC | Le prochain déplacement prévu pour une âme s'applique à l'âme directement derrière elle. | 12 |
| 18 | Boulet | AL | Une âme de votre choix ne peut avancer de plus de 1 par déplacement ce tour, quel que soit le dé. | 12 |
| 19 | Ailes de cire ⚠ | AL | Une âme double ses distances positives ce tour ; si elle est percutée ce tour, elle recule de 3. | 18 |
| 20 | Éveil | AC | Donnez pour cette course seulement une personnalité que vous possédez déjà à une seconde âme. | 20 |
| 21 | Amnésie | AC | Retirez la personnalité d'une âme pour cette course (la personnalité revient ensuite). | 8 |
| 22 | Bête de somme | EC | La prochaine âme percutée est portée (règle du Bât de chameau) au lieu d'être sautée. | 12 |
| 23 | Cri de Cerbère | EC | Toutes les âmes sur la case devant l'âme qui vient de bouger reculent de 1. | 15 |
| 24 | Bras de fer | EC | Choisissez deux âmes adjacentes : elles échangent leurs places. | 15 |
| 25 | Faux départ | AL, tour 1 uniquement | Une âme de votre choix commence la course à la case 1. | 10 |
| 26 | Rappel | EC | Une âme en zone de fin recule jusqu'à la case du seuil (échange si occupé). Elle redevient pariable. | 25 |

## C. Sur les dés (12)

| # | Carte | Moment | Effet | Prix |
|---:|---|:-:|---|---:|
| 27 | Relance | AA | Relancez un dé Distance ou un dé Âme. | 6 |
| 28 | Verrou | AL | Choisissez un dé Distance : il garde sa face du tour précédent au lieu d'être lancé. | 10 |
| 29 | Retournement | AA | Retournez un dé Distance : `-1 ↔ 3`, `1 ↔ 2`. | 12 |
| 30 | Double face | AA | Un dé Distance est appliqué deux fois : il forme deux combinaisons avec deux dés Âme différents. | 25 |
| 31 | Face vide | AA | Un dé Âme de votre choix désigne l'âme que vous voulez. | 15 |
| 32 | Copie carbone | AA | Un dé Distance prend la valeur de l'autre. | 10 |
| 33 | Dé fantôme | AA | Ajoutez un dé Distance `+1` à ce lancer. Il consomme le dé Âme inutilisé. | 15 |
| 34 | Écrasement | AA | Réduisez un dé Distance de 1 (minimum -1). Utile pour éviter de percuter ou de franchir trop tôt. | 5 |
| 35 | Dé chargé ⚠ | AA | Ajoutez +2 à un dé Distance. Le tour adverse lance une paire de plus ce tour. | 15 |
| 36 | Séparation | AA | Deux dés désignant la même âme ne se cumulent pas : deux déplacements séparés, dans l'ordre choisi. | 8 |
| 37 | Fusion | AA | Deux dés désignant des âmes différentes deviennent un seul déplacement, sur l'une des deux âmes, de la somme des distances. | 12 |
| 38 | Divination | AL | Lancez vos dés, regardez, puis décidez de tout relancer une fois. | 20 |

## D. Sur la mécanique (12)

| # | Carte | Moment | Effet | Prix |
|---:|---|:-:|---|---:|
| 39 | Inversion | AA | Ce tour, une âme qui percute s'arrête **derrière** l'âme heurtée ; une âme qui recule sur une autre saute **derrière** elle. | 12 |
| 40 | Collision renforcée | AA | Ce tour, l'âme percutée recule de 1 après chaque saut. | 12 |
| 41 | Cohabitation | AA | Ce tour, plus aucune collision : les âmes s'empilent sur les cases. | 10 |
| 42 | Second souffle | EC | Une combinaison déjà résolue est rejouée à l'identique sur la même âme, après les autres. | 25 |
| 43 | Temps mort | AL | Ce tour, l'adversaire ne lance pas de paire. | 20 |
| 44 | Ordre inversé | TA | L'adversaire a lancé sa paire ; vous rejouez l'ordre de vos combinaisons non encore résolues (cette carte se joue si vous possédez une révélation du tour adverse). | 15 |
| 45 | Prolongation | AL | Le seuil de pari est repoussé de 2 cases pour cette course. | 15 |
| 46 | Arrêt sur image | FC | La course s'arrête avant le tour adverse : le classement est établi sans sa dernière paire. | 30 |
| 47 | Tour supplémentaire ⚠ | FC | Une âme a franchi l'arrivée : un tour complet est joué en plus (lancer, combinaisons, adversaire), puis le classement. Vos paris restent actifs. | 30 |
| 48 | Cumul forcé | AA | Deux dés Âme différents deviennent la même âme (celle de votre choix parmi les deux). | 10 |
| 49 | Mainmise | TA | Choisissez la face du dé Distance de la paire adverse parmi `1, 2` (le dé Âme adverse est conservé). | 20 |
| 50 | Cadenas | TA | L'âme désignée par la paire adverse est remplacée par l'âme directement derrière elle. | 15 |

## E. Sur les paris et l'économie (10)

Ces cartes touchent l'argent, mais toujours à travers la course : elles créent ou
déplacent un enjeu, elles ne donnent pas simplement des pièces.

| # | Carte | Moment | Effet | Prix |
|---:|---|:-:|---|---:|
| 51 | Pari tardif | AL | Posez un pari sur une âme déjà en zone de fin, à multiplicateur divisé par 2. | 15 |
| 52 | Assurance | AL | Un pari actif de votre choix ne peut plus perdre sa mise (gain nul au pire). | 12 |
| 53 | Pari exotique | AC | Ajoutez un pari spécial pour cette course : « l'âme X sera percutée au moins 2 fois » (×3) ou « aucune âme ne reculera » (×4). | 10 |
| 54 | Pari sur le chaos | AC | Gagnez 3 pièces par collision (saut ou échange) dans la course, mais tous vos paris Vainqueur pur paient -1 au multiplicateur. | 10 |
| 55 | Doublure | AL | Copiez un pari actif sur une autre âme, même mise, multiplicateur -1. | 15 |
| 56 | Retrait | AL | Annulez un pari actif : 70 % de la mise vous revient. | 8 |
| 57 | Cote glissante | AC | Vos paris posés en course paient +0,5 au multiplicateur, ceux posés avant la course -0,5. | 12 |
| 58 | Pot commun ⚠ | AC | Misez 20 pièces supplémentaires sur le classement complet exact. Si vous gagnez, la boutique suivante est gratuite pour un objet. | 20 |
| 59 | Prêt du stagiaire ⚠ | AC | Recevez 30 pièces pour la course ; rendez 40 à la fin (avant la boutique). Si vous ne pouvez pas, une personnalité vous est retirée. | 5 |
| 60 | Mécénat | FC | L'âme classée dernière vous rapporte 10 si aucun pari n'était posé sur elle. | 8 |

---

## Ce qui a été recyclé

La règle de conversion : une carte, c'est de l'agentivité **ponctuelle à un
moment choisi**. Chaque système permanent a son propre déclencheur, et c'est lui
qui décide où une carte peut atterrir.

| Système | Déclencheur | Cartes qui s'y prêtent |
|---|---|---|
| Face de forge | la face sort — le joueur ne choisit que l'âme et l'ordre | AA / AL qui touchent un déplacement |
| Dé spécial | une distribution, subie à chaque lancer | cartes qui sont « une valeur » ou un chaos récurrent |
| Artefact | règle permanente, ou charge « une fois par course / par cercle » | AC, FC, TA, et toute la famille Mécanique |

### Converties

| Carte | Devient | Où |
|---|---|---|
| 2, 5, 6, 9, 11 (Éboulement, Sables mouvants, Tremplin, Fosse, Goudron) | Bornes du stagiaire (artefact 33) | [`artefacts.md`](artefacts.md) |
| 3, 10 (Pont branlant, Ligne d'arrivée avancée) | Raccourci de Malebolge (artefact 34) | [`artefacts.md`](artefacts.md) |
| 4 (Rallonge) | Chaîne des Limbes (artefact 35) | [`artefacts.md`](artefacts.md) |
| 17 (Transfert) | Face du suiveur (forge 19) | [`forge.md`](forge.md) |
| 24 (Bras de fer) | Bras de fer (forge 17) | [`forge.md`](forge.md) |
| 26 (Rappel) | Crochet de Charon (artefact 41) | [`artefacts.md`](artefacts.md) |
| 30 (Double face) | Écho (forge 16) | [`forge.md`](forge.md) |
| 35 (Dé chargé) | Dé du Damné (dé 12) | [`des.md`](des.md) |
| 37 (Fusion) | Fusion (forge 18) | [`forge.md`](forge.md) |
| 38 (Divination) | Boule de Cocyte (artefact 36) | [`artefacts.md`](artefacts.md) |
| 39 (Inversion) | Revers (forge 15) | [`forge.md`](forge.md) |
| 42 (Second souffle) | Écho du Styx (artefact 37) | [`artefacts.md`](artefacts.md) |
| 43 (Temps mort) | Sommeil du contremaître (artefact 38) | [`artefacts.md`](artefacts.md) |
| 44, 49, 50 (cartes TA) | Dé de Minos (dé 11) | [`des.md`](des.md) |
| 48 (Cumul forcé) | Face grégaire (forge 20) | [`forge.md`](forge.md) |
| 53 (Pari exotique) | Registre des paris exotiques (artefact 39) | [`artefacts.md`](artefacts.md) |
| 57 (Cote glissante) | Cote montante (artefact 40) | [`artefacts.md`](artefacts.md) |

S'y ajoute un objet **sans carte d'origine**, né de la même discussion : la **Roue
d'Ixion** (artefact 42), qui renvoie au départ la première âme franchissant la
ligne si aucun pari du joueur ne porte sur elle.

### Déjà couvertes par un objet existant

1 → Tribune infernale (artefact 19) · 22 → Bât de chameau (artefact 8) ·
28 → Verrou de Minos (artefact 6) · 33 → Troisième dé Distance (dé 6) ·
31 → Face vide (forge 12) · 32 → Miroir (forge 6) · 27 → Feu follet (forge 7) ·
45 → Sablier de Charon (artefact 12) · 51 → Œil du parieur (artefact 27) ·
54 → Bourse percée (artefact 18) · 59 → Dette infernale (artefact 20) ·
52 → Livre des comptes (artefact 14) et Baume du perdant (artefact 31).

### Écartées, et pourquoi

- **7 (Glace noire), 41 (Cohabitation)** et tout ce qui fait tenir deux âmes sur
  la même case : le jeu ne tolère aucune position partagée. Les **couloirs** sont
  déjà la réponse à l'encombrement (une âme se rabat sur une case libre de la même
  colonne, et ne percute que si la colonne entière est pleine), et le classement
  ne connaît pas d'ex æquo — « le bas a toujours raison », voir
  [`regles-du-jeu.md`](regles-du-jeu.md). Une carte qui empile casse les deux.
- **12 (Point de rassemblement)** : il départage des ex æquo qui n'existent pas.
  Même raison que le retrait du Filet du pêcheur (artefact 24).
- **19 (Ailes de cire)** : écartée.
- **20 (Éveil), 21 (Amnésie)** : elles dépendent du système de **personnalités**,
  qui n'existe pas encore dans le proto. Même blocage que le Sceau du stagiaire
  (artefact 25) ; à réexaminer quand les archétypes d'âmes seront en place.
- **25 (Faux départ), 46 (Arrêt sur image), 47 (Tour supplémentaire), 58 (Pot
  commun)** : effets à usage strictement unique ou touchant le principe non
  négociable n° 3 sans contrepartie lisible. La Roue d'Ixion (artefact 42) reprend
  l'intention de la 47 d'une manière qui ne fige pas de classement provisoire.
- Le reste de la famille E (paris et économie) est trop proche d'artefacts
  existants pour justifier un slot.

### À conserver ailleurs

- La **règle de Long Shot** — aucune aide ne fait franchir la ligne d'arrivée,
  seuls les dés font gagner — est montée dans les principes non négociables du
  GDD (§9.3, principe 8). C'est elle qui contraint le Bond, l'Explosive, la
  Boussole des Limbes et les nouveaux artefacts de plateau.
- Le tableau des **moments de jeu** (AC, AL, AA, EC, TA, FC) reste la meilleure
  description des déclencheurs du jeu, cartes ou non. `forge.md` en a une version
  à trois moments (au lancer, à l'association, contre le plateau) ;
  [`ergonomie-ecrans.md`](ergonomie-ecrans.md) s'appuie sur la version à six pour
  la frise de tour. Le **Dé de Minos** est le premier objet à exiger l'ouverture
  réelle de la fenêtre **TA** dans la boucle de tour.

## Répartition et cohérence

| Famille | Cartes | Moments principaux | Ce qu'elle apporte |
|---|---:|---|---|
| Cases | 12 | AC, AL | préparation du plateau, premier pas vers la modification du circuit (GDD §7) |
| Âmes | 14 | EC | agentivité pendant la résolution, sans contrôle direct des dés |
| Dés | 12 | AA | contrôle du hasard par paliers (inspi §2) |
| Mécanique | 12 | AA, TA, FC | la couche 3 de l'inspiration : changer une règle le temps d'un tour |
| Paris / économie | 10 | AC, AL | l'argent à usages multiples, tension prudent / ambitieux / dangereux |

## Cartes à surveiller au POC

- **Tour supplémentaire (47)** et **Arrêt sur image (46)** touchent le principe
  non négociable n°3 (classement définitif après résolution complète). Elles le
  respectent en déplaçant le moment de fin, pas en figeant un classement
  provisoire, mais elles doivent être annoncées très visiblement.
- **Rappel (26)** rend une âme pariable à nouveau : à tester contre le principe
  n°4 (pas de pari au-delà de 60 %). L'esprit est respecté puisque l'âme n'y est
  plus, mais le prix doit rester élevé.
- **Temps mort (43)** supprime le tour adverse : à limiter à une par course.
- Les cartes TA (44, 49, 50) n'ont d'intérêt que si la paire adverse est révélée
  avant résolution ; dans le proto actuel c'est le cas (elle est affichée puis
  résolue après une pause), il faut juste y insérer une fenêtre de jeu.

## Sources d'inspiration

- Aucune aide ne peut faire gagner la course, seuls les dés le peuvent : [Long Shot: The Dice Game (règles)](https://tesera.ru/images/items/1868785/Long_Shot_DG_Rules_Booklet_4.1.pdf), [Nights Around a Table](https://nightsaroundatable.com/2022/02/17/how-to-play-long-shot-the-dice-game/).
- Tuiles `+1 / -1` posées sur la piste qui paient leur propriétaire : [Camel Up (règles)](https://www.ultraboardgames.com/camel-up/game-rules.php).
- Paris exotiques et props : [Ready Set Bet (Board Game Quest)](https://www.boardgamequest.com/ready-set-bet-review/).
