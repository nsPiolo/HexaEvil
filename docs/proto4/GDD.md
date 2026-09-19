# Sinner's Bet — Game Design Document

Ce document décrit ce qui est dans le proto html permettant de tester la mécanique du jeu.

> Note importante : dans le proto, il faut pouvoir changer les paramètres du jeu à partir d'un fichier unique et lisible humainement.

> Dans le poc, il est important d'animer les transitions pour permettre au tester de comprendre ce qu'il se passe.

On va tester une autre mécanique, complètement différente de la mécanique de ./docs/proto/gameplay.md et de celle de ./docs/proto2/gameplay.md

Répertoire de sortie : ./Proto3Html (React et Typescript)

## Table des matières

1. [Pitch et positionnement](#1-pitch-et-positionnement)
2. [Boucle de gameplay centrale](#2-boucle-de-gameplay-centrale)
3. [Système de paris](#3-système-de-paris)
4. [Structure en cercles et condition de run](#4-structure-en-cercles-et-condition-de-run)
5. [Boss, coaching et sous-intrigue du stagiaire](#5-boss-coaching-et-sous-intrigue-du-stagiaire)
6. [Boutique, artefacts, cartes actions et archétypes d'âmes](#6-boutique-artefacts-cartes-actions-et-archétypes-dâmes)
7. [Modification du circuit](#7-modification-du-circuit)
8. [Post-jeu](#8-post-jeu)
9. [Points ouverts / à définir plus tard](#9-points-ouverts--à-définir-plus-tard)

---

## 1. Pitch et positionnement

### 1.1 Pitch

Le joueur est mort et arrive en enfer. Un démon stagiaire, qui doit attendre son supérieur avant de pouvoir affecter le joueur à une punition, lui propose une partie pour tuer le temps : une course d'âmes damnées sur un plateau, avec des dés et des paris.

De victoire en victoire, le joueur traverse les neuf cercles des enfers pour tenter de se sauver. Le stagiaire remarque ses compétences et propose de le coacher afin de le présenter au boss de chaque cercle. Si son « poulain » progresse, le stagiaire progresse lui aussi dans la hiérarchie infernale. La partie devient ainsi à la fois une épreuve de survie économique et la formation professionnelle improbable d'un démon ambitieux.

Après le neuvième cercle, le joueur peut choisir de conclure son aventure ou de continuer sous une nouvelle forme : devenir démon et affronter des cercles supplémentaires, générés procéduralement.

### 1.2 Genre et inspirations

**Genre :** jeu de plateau numérique et de pari roguelike, avec construction légère de synergies par cartes, dés et artefacts.

Le jeu s'inspire notamment de *Balatro*, *Wildfrost*, *CloverPit*, *Black Jacket*, *Dice Legent* et *Gambonanza* pour leur lisibilité, leurs systèmes de risque/récompense, leurs combinaisons et leurs boucles de progression. Voir fichier `inspi.md`

### 1.3 Promesse joueur

> « Comment influencer la course pour que mes paris soient gagnants ? »

Le joueur ne dirige pas directement les coureurs. Il lit une situation partiellement chaotique, choisit ses paris, réorganise les résultats du lancer et utilise ses outils pour influencer indirectement la course. La victoire repose donc sur l'interprétation, la prise de risque et la capacité à transformer un lancer imparfait en résultat rentable.

### 1.4 Piliers de conception

- **Parier avant de savoir :** le joueur s'engage financièrement, puis cherche à faire travailler les probabilités en sa faveur.
- **Décider avec les dés :** un même lancer fournit plusieurs possibilités et son ordre de résolution est une décision stratégique.
- **Influencer sans contrôler :** les cartes, les âmes, les cases et les artefacts modifient la course sans réduire le joueur à un contrôle direct.
- **Risque soutenable :** une course perdue ne met pas immédiatement fin au run ; la tension vient de la gestion du prix du cercle.
- **Montée en puissance lisible :** les synergies deviennent plus fortes et plus étranges à mesure que l'on traverse l'enfer.

---

## 2. Boucle de gameplay centrale

### 2.1 Cycle macro

1. Découvrir le cercle, son prix et ses règles spéciales.
2. Poser les paris initiaux sur une ou plusieurs âmes.
3. Préparer la course : boutique, amélioration des dés, coaching et ajustement des âmes.
4. Lancer les dés et choisir les associations et l'ordre de résolution.
5. Résoudre les déplacements, les collisions, les cases et les effets actifs.
6. Poser éventuellement de nouveaux paris tant que la fenêtre autorisée est ouverte.
7. Le jeu lance aussi une ou plusieures paires de dés pour faire progresser aléatoirement les âmes.
8. Répéter les tours jusqu'à ce qu'une âme franchisse l'arrivée, puis établir le classement après la résolution complète du tour.
9. Encaisser les paris gagnants, appliquer les pertes et accéder à la boutique.
10. Après 2 courses, faite une 3eme course contre le boss du cercle. Cette course dispose de règles spéciale.
11. Payer le prix du cercle si les finances le permettent, sinon fin de la partie.

### 2.2 Le plateau

Chaque course utilise un circuit linéaire ressemblant à un plateau de jeu de société.

| Élément | Règle / fonction | Valeur indicative de POC |
|---|---|---:|
| Couloir | Chemin entre le départ et l'arrivée ; un couloir de plus à chaque âme ajoutée | 1 au cercle 1 (5 âmes), 2 au cercle 2 (6 âmes)… |
| Colonne de parcours | Distance en nombre de case entre le départ et l'arrivée | 10 à 20 colonnes |
| Case de parcours | Position et déclenchement des effets | 10 à 20 case par ligne |
| Ligne de départ | Position initiale commune | 1 |
| Ligne d'arrivée | Déclenche la résolution finale | 1 |
| Cases après l'arrivée | Permettent de classer plusieurs arrivées du même tour | 2 à 4 |
| Départage dans une colonne | Deux âmes dans la même colonne : la plus **en bas** est devant | — |
| Zones de pari | Signalent la limite de prise de paris | seuil à 60 % du parcours |
| Cases spéciales | Pièges, bonus et cases payantes ; elles n'agissent qu'à l'arrêt, et la payante seulement sur une âme pariée | 0 aux cercles 1-2, 1 au 3, 2 au 6, 3 au 10 |

La piste est représentée par un ou plusieurs **couloirs** parallèles. Au premier cercle il n'y en a qu'un, pour 5 âmes. À partir du second cercle, chaque fois qu'une âme est ajoutée au départ (cercles 2, 4, 6, 8, 9, voir §4.1), un couloir est ajouté aussi : 6 âmes et 2 couloirs au cercle 2, 7 âmes et 3 couloirs au cercle 4, etc. Le nombre de couloirs est donc `âmes − 4`, une valeur de configuration.

Chaque couloir est découpé en cases. Les cases des couloirs sont alignées entre elles et forment une **colonne** : la position d'une âme dans la course est sa colonne, son couloir ne sert qu'au départage et au choix de la case (§2.6). Les couloirs sont dessinés de haut en bas ; le couloir **du bas** est le plus proche du joueur, c'est celui qui a la priorité dans tous les arbitrages.

Dans certaines colonnes, les cases d'un couloir peuvent être manquantes ou **bloquées**, forçant l'âme à se déporter sur une autre case de la colonne. Ce rétrécissement de la piste va provoquer des événements stratégiques. La ligne de départ est commune : toutes les âmes y tiennent sans collision.

Chaque cercle propose plusieurs **variantes de terrain** — chacune son nom et ses cases bloquées — et une seule est tirée au départ de chaque course : les trois courses d'un cercle ne se jouent donc pas sur la même piste, et la carte annonce les variantes possibles sans dire laquelle sortira. Une colonne n'est jamais entièrement bloquée, il y reste toujours une case libre ; le cercle 1, qui n'a qu'un couloir, n'a donc qu'une variante, sans case bloquée (`run.circles[].terrains` dans `config/race.json`).

Le seuil de 60 % est matérialisé par des zones de couleur. Un pari supplémentaire ne peut pas cibler une âme qui a dépassé ce seuil. La course continue jusqu'à ce qu'au moins une âme franchisse l'arrivée ; le tour en cours est néanmoins résolu jusqu'au bout. Le classement final est ensuite calculé à partir des positions atteintes après cette résolution complète, y compris les cases situées au-delà de l'arrivée.

### 2.3 Âmes en course

Le joueur ne contrôle pas directement les âmes. Chaque âme possède une identité, un comportement et éventuellement un pouvoir. Le nombre d'âmes commence à **5 au premier cercle** et peut augmenter avec les cercles ; la valeur exacte est une donnée de configuration.

Par défaut, les âmes ont une personnalité neutre et sans pouvoir. Le joueur pourra les améliorer en leur assignant une personnalité.

### 2.4 Lancer initial et dés

Au début du jeu, un lancer comporte :

- **2 dés Distance**, à 4 faces, indicativement `-1, 1, 2, 3` ;
- **2 dés Âme**, qui désignent chacun une âme participante.

Les valeurs et la composition du lancer sont ajustables dans la configuration du POC. Les cercles avancés peuvent fournir davantage de dés Âme et/ou des dés spéciaux.

Le joueur peut associer librement chaque dé Âme à un dé Distance. L'ordre de sélection des combinaison est important car elle indique l'ordre de résolution des actions. C'est important car quand deux âmes se retrouvent sur la même case un effet particulier survient.

### 2.5.1 Résolution d'un tour

Pour chaque combinaison **Âme + Distance** :

1. déterminer l'identité de l'âme, en tenant compte des effets éventuels ;
2. calculer la distance effective ;
3. déplacer l'âme dans l'ordre choisi ;
4. résoudre la collision et les effets de case ;
5. mettre à jour la position et l'état des paris ;
6. passer à la combinaison suivante.

Si plusieurs dés désignent la même âme, les distances se **cumulent par défaut** et sont appliquées comme un déplacement total. Un artefact spécifique peut remplacer ce cumul par une relance unique des deux dés concernés.

### 2.5.2 Tour de l'adversaire

A la suite de la résolution des combinaisons du joueur. 
L'adversaire (l'ordinateur), lance 1 ou plusieurs fois (en fonction de la configuration) une paire de dés, et on résout ensuite cette combinaison.

### 2.6 Recul et collisions

#### Couloirs : choix de la case d'arrivée

Une âme se déplace d'un nombre de **colonnes** égal à la distance. La case où elle atterrit dans la colonne d'arrivée se choisit ainsi, en priorité dans **son couloir** (celui où elle se trouve au moment de bouger) :

1. La case de son couloir est **vide** : elle y va.
2. La case de son couloir est **bloquée** (manquante ou rétrécissement) : elle va dans une autre case de la colonne, une case **vide** en priorité ; s'il n'y en a pas, la case **la plus en bas** de la colonne, et elle y percute l'âme en place (règle de collision ci-dessous).
3. La case de son couloir est **occupée par une âme** : s'il existe une autre case vide dans la colonne, elle y va ; sinon elle **percute** l'âme en place.

Quand plusieurs cases conviennent (plusieurs cases vides, par exemple), on prend toujours **la plus en bas**. Après le déplacement, le couloir de l'âme est celui de la case où elle a atterri. Une collision n'a donc lieu que lorsque la colonne d'arrivée est pleine ; au premier cercle, avec un seul couloir, chaque atterrissage sur une âme est une collision, comme avant.

#### Collisions

- Une âme sur la case de départ ne peut pas reculer : une distance négative ne la déplace pas (mais elle peut être sélectionnée par le dé).
- Lorsqu'une âme avance et doit percuter une âme (colonne pleine), elle **saute devant** l'âme percutée : elle atterrit dans la colonne suivante, en appliquant à nouveau le choix de la case ci-dessus (et donc en cascade si cette colonne est pleine aussi).
- Lorsqu'une âme recule et doit percuter une âme (colonne pleine), elle **échange sa place** avec l'âme percutée : chacune prend la case de l'autre.
- Les effets de collision sont résolus à chaque déplacement, dans l'ordre choisi par le joueur.
- Les effets de cartes, d'âmes ou de boss peuvent modifier ces règles ; ils doivent alors être signalés clairement avant la résolution.

Le système doit rester déterministe après le lancer : l'aléatoire provient principalement des dés et des effets explicitement annoncés, tandis que l'ordre de résolution est une décision du joueur.

### 2.7 Fin de course et récompense

Dès qu'une âme franchit l'arrivée, les combinaisons restantes du tour sont résolues, ainsi que le tour de l'adversaire. Le classement est calculé ensuite, par colonne atteinte (cases après l'arrivée comprises). Deux âmes dans la **même colonne** sont départagées par leur couloir : **la plus en bas est devant**. Il n'y a donc jamais d'ex æquo. Les paris sont évalués contre ce classement, les gains et pertes sont appliqués, puis la boutique et les éventuelles récompenses de fin de course deviennent accessibles.

---

## 3. Système de paris

### 3.1 Principes

Les paris sont la ressource stratégique et économique principale. Une phase de paris initiaux a lieu avant chaque course. Des paris supplémentaires peuvent être posés pendant la course, tant que l'âme ciblée n'a pas dépassé 60 % du parcours. Plusieurs paris peuvent être actifs simultanément, y compris sur des âmes ou des conditions différentes.

Chaque pari indique avant validation : son coût, son multiplicateur de gain, les conditions de réussite et les éventuelles pénalités. Les multiplicateurs ci-dessous sont indicatifs et doivent être équilibrés dans la configuration du POC.

### 3.2 Paris simples — faciles, peu rentables

| # | Type | Condition de réussite | Exemple / intention |
|---:|---|---|---|
| 1 | **Vainqueur pur** | L'âme choisie termine première | Pari de base, lisible et peu rémunérateur. |
| 2 | **Top 3 sans ordre** | L'âme choisie termine dans les trois premières, sans exiger sa position | Plus tolérant qu'un résultat exact. |
| 3 | **Pas dans le top 3** | L'âme choisie ne termine pas dans les trois premières | Devient plus facile et moins rentable quand le nombre d'âmes augmente. |
| 4 | **Dernière place** | L'âme choisie termine dernière | Lecture simple d'une âme faible ou pénalisée. |

### 3.3 Paris intermédiaires — ordre partiel, rentabilité moyenne

| # | Type | Condition de réussite | Exemple / intention |
|---:|---|---|---|
| 5 | **Top 3 dans le désordre** | Les trois âmes sélectionnées occupent les trois premières places, dans n'importe quel ordre | Deviner le podium sans prendre le risque de l'ordre exact. |
| 6 | **Deux âmes dans le top 3** | Deux âmes désignées terminent toutes deux dans le top 3, la troisième place étant libre | Pari sur une combinaison partielle. |
| 7 | **Duel de classement** | L'âme A termine devant l'âme B | Variante de pari hippique basée sur un ordre relatif. |

### 3.4 Paris avancés — précision élevée, très rentables

| # | Type | Condition de réussite | Exemple / intention |
|---:|---|---|---|
| 8 | **Podium exact** | Les trois premiers sont correctement prédits dans l'ordre exact | Pari emblématique à forte exigence. |
| 9 | **Classement complet exact** | Toutes les positions finales sont correctement prédites | Très risqué, réservé aux situations où le joueur a beaucoup d'informations. |
| 10 | **Vainqueur + dernier exacts** | Le premier et le dernier sont correctement prédits, indépendamment des places intermédiaires | Exige une lecture simultanée des deux extrêmes. |

Le joueur pari avec son argent, le même qu'il va utiliser pour améliorer ses actions.

### 3.5 Timing et arbitrages

- **Avant la course :** possibilité de poser les paris initiaux, d'analyser les archétypes et de préparer le circuit.
- **Pendant la course :** possibilité de compenser un pari mal engagé ou d'exploiter un retournement, mais seulement tant qu'aucune âme n'est dans la zone de fin course (aprés le seuil).
- **Après le seuil de 60 % :** aucun nouveau pari ; les paris déjà posés restent valides.
- **Après la résolution finale :** tous les paris sont évalués sur le classement définitif, jamais sur un classement provisoire observé au milieu du tour.

---

## 4. Structure en cercles et condition de run

### 4.1 Organisation d'un run

Le jeu principal comprend **9 cercles**, inspirés de la *Divine Comédie*. Chaque cercle contient **2 courses**, suivies d'une course contre son boss. Le prix du cercle est connu dès l'entrée dans celui-ci et affiché avant la première course.

Les valeurs numériques sont indicatives :

| Paramètre | Intention | Exemple de configuration |
|---|---|---:|
| Nombre de cercles principaux | Progression complète | 9 |
| Courses par cercle | Construction de la tension économique | 3 |
| Prix du cercle | Somme à payer à la fin du cercle | à définir par cercle, ex. 100 à 1 000 |
| Âmes par course | Complexité croissante | 5 au cercle 1, puis augmentation de 1 aux cercle : 2,4,6,8,9 |
| Couloirs | Un de plus à chaque âme ajoutée (§2.2) | 1 au cercle 1, 2 au cercle 2, 3 au cercle 4, 4 au cercle 6, 5 au cercle 8, 6 au cercle 9 |
| Cases | Longueur variable du plateau | 10 à 20 au départ, puis modifications |

### 4.2 Économie et condition de fin de run

L'argent est gagné ou perdu via les paris. Le joueur doit gérer son capital pendant les trois courses, acheter avec prudence et conserver assez de ressources pour payer le prix annoncé.

**Dans le proto** : l'échelle des mises (`economy.stakes`, 5 · 10 · 20 · 50 au cercle 1) grandit avec le cercle de `economy.stakeGrowthPerCircle` (0,5 = +50 % de l'échelle du cercle 1 par cercle, arrondi à 5), par la même règle que les prix de la boutique. C'est le revenu qui suit les prix de sortie : mesuré (`docs/proto4/equilibrage.md`), c'est ce qui permet à une bourse qui a pris de l'avance de composer jusqu'à l'évasion. L'avance de course grandit de la même façon (`economy.allowanceGrowthPerCircle`, 1,0 : 20 au cercle 1, 40 au deuxième, 180 au neuvième) — le revenu indépendant de la bourse qui permet de repartir après avoir payé un cercle. Le plus petit jeton reste plafonné à l'avance du cercle : elle seule permet toujours le pari minimum.

**Règle impérative : perdre une course isolée ne met pas fin au run.** Une course peut être déficitaire et le joueur peut poursuivre les deux courses restantes du cercle. Le run se termine uniquement si, à la fin des trois courses, le joueur est incapable de payer le prix du cercle.

Lorsque le prix est payable, il est débité, le cercle est terminé et le joueur passe au suivant. Les détails de récompense liés à la victoire du boss, à la narration ou à l'excédent d'argent restent compatibles avec cette règle et devront être équilibrés séparément.

### 4.3 Les neuf cercles

Le thème général de chaque cercle et les règles de course doivent augmenter la pression, la quantité d'informations et la complexité des paris. Les détails des cercles 1 à 8 ne sont pas tous fixés à ce stade.

| Cercle | Péché | Châtiment | Habitants |
|--------|-------|-----------|-----------|
| **1** | Limbes | Pas de châtiment physique, mais séparation éternelle de Dieu | Justes nés avant le Christ (Homère, Virgile, Aristote, etc.) |
| **2** | Luxure | Tourmentés par des vents éternels qui les projettent sans repos | Didon, Cléopâtre, Tristan, Isolde, Paolo et Francesca |
| **3** | Gourmandise | Immergés dans une boue fétide, rongés par Cerbère | Ciacco, les gourmands anonymes |
| **4** | Avarice & Prodigalité | Contraints de pousser des poids éternellement, face à face | Les avares et les prodigues |
| **5** | Colère | Plongés dans le Styx, le marais de la colère, où ils se frappent mutuellement | Les colérique et les querelleurs |
| **6** | Hérésie | Enfermés dans des tombes brûlantes et incandescentes | Les hérétiques (Farinata degli Uberti, etc.) |
| **7** | Violence | Divisé en 3 sous-cercles : contre autrui (fleuve Phlégéthon), contre soi-même (buissons), contre Dieu (désert de sable brûlant) | Meurtriers, tyrans, suicidés, blasphémateurs |
| **8** | Fraude | 10 fosses concentriques (Malebolge) avec différents châtiments : flagellés, submergés, enfoncés la tête en bas, rongés par des vers, etc. | Les fraudeurs (séducteurs, flatteurs, alchimistes, faux prophètes, semeurs de discorde, faussaires) |
| **9** | Trahison | Gelés dans la glace du Coccyte, à différents niveaux d'immersion | Les traîtres (traîtres aux parents, à la patrie, aux hôtes, aux maîtres) — Lucifer au centre |



## 5. Boss, coaching et sous-intrigue du stagiaire

### 5.1 Rencontres de boss

Le boss de cercle est affronté via la mécanique de course adaptée : le plateau, les dés et les paris restent le langage commun, mais le boss impose des règles spéciales, des restrictions ou des effets qui reflètent son identité. La rencontre peut donc modifier les dés, les collisions, les fenêtres de pari, les cases ou le comportement des âmes.

Chaque boss doit présenter :

- une règle spéciale compréhensible avant le lancement ;
- une faiblesse ou un angle de lecture exploitable ;
- une récompense cohérente avec le risque ;
- une mise en scène qui fait progresser l'intrigue du stagiaire.

**Dans le proto** : le pouvoir d'un boss est une liste d'**effets typés**
(`src/core/rules/boss.ts`), pas un texte. `config/race.json` porte les deux : `power`
est l'annonce faite au joueur sur la carte, `powers` est ce que le moteur applique —
uniquement sur la dernière course du cercle. Les quinze effets sont indépendants les
uns des autres, ce qui permet de les assembler (§8.1) ; les couples qui s'annulent ou
s'embrouillent sont déclarés incompatibles et ne sortent jamais ensemble.

Le boss du neuvième cercle est le **démon stagiare qui a été promu**, cohérent avec le cercle de la trahison.

### 5.2 Le stagiaire et le coaching

Le démon stagiaire s'appelle **Iscariote**. Il se présente par son nom dès l'introduction ;
son grade le suit partout où il parle (« Iscariote, stagiaire », puis « Iscariote,
assistant »…), si bien qu'une promotion se voit au-dessus de la bulle sans qu'on ait
à l'annoncer. Le nom est un indice posé d'entrée sur la fin : le traître par excellence
finit boss du neuvième cercle, celui de la Trahison (§5.1).

Au début, le stagiaire cherche simplement à occuper son temps avant l'affectation du joueur. Après les premières victoires, il reconnaît les compétences du joueur et propose un coaching. Il l'aide à se préparer aux boss des cercles et présente son poulain aux supérieurs.

La sous-intrigue suit deux progressions liées :

- le joueur apprend à lire, parier et manipuler les courses ;
- le stagiaire gagne en reconnaissance et monte dans la hiérarchie si son poulain progresse.

Le coaching peut attribuer des bonus ou malus de long terme à des âmes, influencer les archétypes rencontrés et débloquer la modification du circuit. Il s'agit d'une amélioration de run et d'un axe narratif, pas d'un contrôle direct de la course.

C'est le démon stagiaire qui peut remplacer les âmes en course par des âmes ayant une personnalité et un effet spéciale - cette capacité se débloque avec la monté dans la hiérachie du démon.

### 5.3 Réussite, sortie et renversement

Après le neuvième cercle, le joueur peut choisir de terminer le jeu. Il peut aussi continuer comme démon dans les cercles 10 et suivants. La transition exacte, la nature de la promotion et la forme de la fin principale sont à préciser dans l'écriture narrative, sans modifier les règles établies ci-dessus.

**Dans le proto** : le neuvième cercle payé, l'écran « Évasion » propose les deux issues — rentrer au menu, ou monter avec le stagiaire. L'évasion est comptée dans les statistiques dans les deux cas : elle est acquise, c'est la sortie qui est refusée. Tant que le joueur n'est pas rentré au menu, le run reste ouvert et sauvegardé (`run.escapeCircle` dans `config/race.json`).

---

## 6. Boutique, artefacts, cartes actions et archétypes d'âmes

### 6.1 Boutique et monnaie

La monnaie du jeu est l'argent, principalement obtenu grâce aux paris. La boutique est accessible avant la première course du cercle et à chaque fin de course ou de cercle, selon l'écran de progression retenu.

Achats possibles :

- cartes actions ;
- dés spéciaux ;
- forge ou modification d'une face de dé ;
- amélioration ou ralentissement d'une âme spécifique avant la course ;
- artefacts permanents/passifs pour le run.

Le contenu acheté doit influencer directement la course ou l'économie des paris. Les prix, stocks et rafraîchissements sont des paramètres de configuration.

Les options d'achat évolue avec la monté du démon stagiaire dans la hiérarchie.

### 6.2 Cartes actions

Les cartes actions sont consommables ou limitées par run, selon l'équilibrage. Elles ne doivent pas se limiter à modifier l'argent : elles agissent sur le plateau et la résolution.

| Famille | Exemples d'effets à prototyper |
|---|---|
| Sur les cases | Ajouter temporairement une case, neutraliser un piège, renforcer la valeur d'une case, déplacer un effet. |
| Sur les âmes | Avancer ou ralentir une âme, la protéger d'une collision, inverser un bonus, échanger deux identités. |
| Sur les dés | Relancer, verrouiller, convertir une face, modifier un dé Âme ou Distance, changer l'ordre disponible. |
| Sur la mécanique | Modifier une collision, prolonger une fenêtre de pari, ignorer ponctuellement la limite d'une âme, transformer un cumul en résolutions séparées. |

Les cartes doivent être lisibles au moment de leur utilisation et préciser si elles s'appliquent avant un lancer, entre deux combinaisons ou pendant une résolution.

### 6.3 Dés spéciaux et forge

Les dés spéciaux proposent des faces ou des règles différentes des dés de départ. La forge permet de choisir ou de modifier une face d'un dé. La puissance de la forge doit être limitée par son coût, sa rareté ou son nombre d'utilisations afin de conserver une part d'incertitude.

Les valeurs de la forge et les faces disponibles restent à définir dans le fichier de configuration du POC.

### 6.4 Artefacts

Les artefacts sont des objets à effets permanents ou passifs, collectionnés pendant un run dans l'esprit de *Balatro* ou *Wildfrost*. Ils peuvent :

- modifier les multiplicateurs ou les règles de paiement des paris ;
- changer le comportement d'un type de dé ;
- transformer une collision ou un cumul ;
- favoriser un archétype d'âme ;
- rendre une stratégie cohérente sur plusieurs courses.

Un artefact est toujours actif après acquisition, sauf si sa description indique une charge, une limite ou une condition. La capacité maximale d'artefacts et les règles de remplacement sont à tester en POC.

### 6.5 Archétypes d'âmes

Le coaching peut attribuer des bonus ou malus de long terme aux âmes et introduire des archétypes reconnaissables. **Dans l'interface, on les appelle des personnalités** — « archétype » reste le mot du document de conception, « personnalité » celui que lit le joueur.

Les six archétypes de base sont :

| Archétype | Description et rôle dans les paris |
|---|---|
| **Le Martyr** | Avance lentement, gagne un bonus lorsqu'il est dépassé, peut revenir brutalement en fin de course. Il rend les paris précoces risqués et récompense la lecture des remontées. |
| **L'Ambitieux** | Avance souvent de beaucoup, subit des pénalités sur les cases dangereuses, bon pari risqué. Il peut dominer une course mais s'expose fortement au circuit. |
| **Le Tricheur** | Peut changer l'identité indiquée par le dé, mais certains joueurs ou boss peuvent bloquer son pouvoir. Il crée une incertitude spécifique autour des dés Âme. |
| **Le Condamné** | Commence avec un malus, devient de plus en plus rapide en approchant de l'arrivée. Il favorise les paris tardifs et les scénarios de rattrapage. |
| **Le Parasite** | Avance lorsqu'une autre âme avance, peut voler des cases ou des bonus. Il crée des dépendances entre paris et retournements de classement. |
| **Le Juge** | Ne gagne pas forcément la course, modifie les gains des paris en fonction de son classement. Il influence l'économie même sans terminer premier. |

Quatre archétypes s'y ajoutent dans le proto, pour couvrir les axes que les six premiers laissaient vides — traverser le plateau, lire le dé à l'envers, ne jamais varier, bousculer :

| Archétype | Description et rôle dans les paris |
|---|---|
| **Le Résolu** | Passe sur les cases bloquées comme si elles étaient normales. Son intérêt dépend entièrement du terrain tiré, annoncé avant les paris : c'est le seul archétype dont la valeur change d'une course à l'autre. |
| **L'Opposant** | Prend la valeur opposée sur le dé Distance : un +2 le fait reculer de deux cases, un −1 l'avance d'une. Le joueur doit inverser sa main pour lui. |
| **Le Constant** | Considère que la valeur du dé est toujours de 1. L'âme la plus prévisible du plateau, un mètre étalon contre lequel se lisent les autres. |
| **L'Ogre** | Quand il saute devant une âme, l'âme dépassée subit un mouvement de −1. Son voisinage est dangereux, ses duels très lisibles. |

**Attribution.** À partir du troisième cercle, à la fin de la première course de chaque cercle, une âme **révèle** sa personnalité. Le choix de l'âme n'est pas tiré au sort : c'est la mieux classée de cette course parmi celles qui n'en ont pas — la révélation se lit donc comme une conséquence de la course que le joueur vient de jouer. La personnalité, elle, est tirée au hasard. La boutique vend en plus un objet par personnalité, qui la pose sur l'âme choisie par le joueur — en remplacement si elle en portait déjà une — et un objet qui en retire une. Une personnalité attribuée tient jusqu'à la fin du run.

Les archétypes peuvent être combinés à des effets de cercle, de boss, de cartes ou d'artefacts, mais leur comportement de base doit rester identifiable.

---

## 7. Modification du circuit

La modification du circuit est débloquée progressivement par la progression et le coaching. Elle transforme le plateau en outil de préparation stratégique, sans donner au joueur une commande directe des âmes.

Options à débloquer ou à acheter :

- ajouter des cases ;
- supprimer des cases ;
- placer des pièges ;
- choisir l'ordre des zones ;
- déplacer la ligne d'arrivée ;
- augmenter la valeur de certaines cases.

Ces modifications doivent être visibles avant les paris initiaux. Une modification peut créer une opportunité pour un archétype, mais aussi augmenter le risque d'un pari. Les limites de nombre, le coût, la durée et la possibilité de revenir en arrière sont à définir par le POC.

---

## 8. Post-jeu

### 8.1 Cercles infernaux 10+

Après le neuvième cercle, le joueur peut continuer en tant que démon et affronter des cercles supplémentaires : 10, 11, 12, etc. Ces cercles sont infernaux, mais ne suivent pas nécessairement une cosmologie fixe. Ils servent de contenu de maîtrise et de rejouabilité.

**Dans le proto** : les cercles 10 à 15 sont écrits à la main, pas générés — une montée qui quitte l'enfer (fonds marins, falaise, ville, montagne, ciel, paradis), chacun avec son décor, son boss, son portrait, ses terrains et ses dialogues. Au-delà du quinzième, le jeu rejoue le paradis sans fin, avec un prix de sortie multiplié par `run.beyondPriceGrowth` à chaque tour : le run s'arrête quand le joueur ne peut plus payer, et non à un cercle fixé. Les pouvoirs de boss sont appliqués en course (§5.1) et, au-delà des cercles écrits, **assemblés** : 2 à 4 effets tirés sur la graine du cercle, sans couple incompatible. Le tirage étant déterministe, la carte annonce exactement ce qui sera joué.

Les boss post-9 sont générés procéduralement en assemblant **2 à 4 effets** tirés parmi une liste de tags/effets. Chaque effet doit être suffisamment indépendant pour pouvoir se combiner avec les deux autres sans produire de règle illisible.

Exemples de familles de tags à prototyper :

- modification des dés Distance ;
- modification des dés Âme ou des identités ;
- verrouillage ou déplacement des zones de pari ;
- collision inversée ou renforcée ;
- cases dangereuses supplémentaires ;
- manipulation des gains ;
- comportement d'âme imposé ;
- résolution de tour prolongée ou contrainte.

Cette liste décrit des familles de génération, pas une liste finale d'effets ni un contenu verrouillé.

### 8.2 Déblocages progressifs de contenu

Au-delà du neuvième cercle, de nouvelles catégories de récompenses deviennent progressivement achetables. Il s'agit de déblocages de contenu : nouvelles cartes, dés, faces, artefacts, options de coaching ou effets de circuit peuvent être ajoutés par paliers.

**Il n'y a pas de système de draft prévu pour ces déblocages.** Le joueur acquiert progressivement l'accès à des catégories et peut ensuite les acheter selon les règles de la boutique.

---

## 9. Points ouverts / à définir plus tard

### 9.1 Valeurs à placer dans la configuration du POC

Les paramètres suivants doivent vivre dans un fichier de configuration et être ajustés pendant le POC, plutôt que d'être considérés comme des décisions de design finales :

- valeurs exactes des dés Distance et des dés Âme ;
- nombre de dés Âme par cercle ;
- nombre d'âmes en course par cercle, et nombre de couloirs (âmes − 4 par défaut) ;
- nombre de cases, cases après l'arrivée, cases bloquées et seuils visuels ;
- prix du cercle, capital initial, gains et pertes de paris ;
- coefficients de rentabilité des dix types de paris ;
- fréquence, coût et contenu de la boutique ;
- limites de forge et puissance des dés spéciaux ;
- nombre d'artefacts équipables ;
- amplitude des bonus et malus de coaching ;
- fréquence et valeur des cases spéciales ;
- paramètres de génération des boss post-9.

### 9.2 Contenu non tranché

- thèmes, noms, règles et boss précis des cercles 1 à 8 ;
- détails précis du boss administratif suprême ;
- forme exacte de la rencontre de boss et de sa récompense dans chaque cercle ;
- récit et conditions de la fin du jeu après le neuvième cercle ;
- nom et détails du boss archange évoqué comme piste ouverte ;
- liste définitive des tags de génération procédurale et règles de compatibilité entre trois effets ;
- inventaire final des cartes, dés, faces, artefacts et modifications de circuit ;
- interface, présentation visuelle des paris et ergonomie de la résolution ;
- règles exactes de cumul des récompenses et de conservation des achats entre cercles.

### 9.3 Principes non négociables pour les prochaines itérations

1. Le joueur parie sur l'issue d'une course et ne contrôle pas directement les âmes.
2. Le joueur peut réordonner les combinaisons Âme + Distance et manipuler le lancer avec ses outils.
3. Le classement est définitif seulement après la résolution complète du tour d'arrivée.
4. Les paris supplémentaires sont interdits sur une âme ayant dépassé 60 % du parcours.
5. Une course perdue n'interrompt pas à elle seule le run.
6. La condition de fin de run est l'impossibilité de payer le prix du cercle à la fin des trois courses et de la rencontre avec le boss.
7. Les chiffres de prototype restent configurables jusqu'à validation par le POC.
8. Aucun objet ne fait franchir la ligne d'arrivée : seuls les dés font gagner. Un déplacement induit par un artefact, une borne ou une face qui atteindrait l'arrivée s'arrête sur la dernière colonne avant elle (règle empruntée à *Long Shot: The Dice Game*).
