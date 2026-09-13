# Analyse comparative de tes jeux de référence

Ta sélection est assez cohérente : ces jeux partent tous d’une **mécanique connue, lisible et presque “jouable immédiatement”**, puis la transforment en système de roguelite/deckbuilder basé sur :

- la construction de synergies ;
- la prise de risque ;
- l’optimisation de probabilités ;
- la progression par petites décisions ;
- la possibilité de créer une combinaison beaucoup plus puissante que prévu ;
- des parties courtes, recommençables et progressivement maîtrisées.

Le point commun le plus important est probablement celui-ci :

> **Le joueur ne cherche pas seulement à gagner. Il cherche à comprendre le système, à le manipuler, puis à le casser.**

---

## 1. BLACK JACKET

*Black Jacket* transforme le blackjack en roguelite deckbuilder : le joueur affronte des âmes en enfer, cherche à atteindre ou dépasser certains totaux, modifie son deck et utilise des effets permettant de perturber la main adverse ou de tricher. Le jeu propose notamment plusieurs familles de cartes et des effets liés aux couleurs/signes des cartes. ([videogamelegacy.com](https://www.videogamelegacy.com/news/press-release-121-black-jacket?utm_source=openai))

### Mécaniques principales

- Blackjack comme système de résolution.
- Construction et épuration d’un deck.
- Cartes avec effets spéciaux.
- Gestion du risque : tirer une carte supplémentaire ou s’arrêter.
- Manipulation de la main adverse.
- Familles de cartes orientées vers des styles de jeu différents.
- Progression roguelite et déblocages.
- Adversaires qui modifient les règles habituelles.
- Monnaie de run et amélioration progressive.

### Forces

#### Une règle de base immédiatement compréhensible

Le blackjack est beaucoup plus simple à lire que certaines formes de deckbuilding complexes :

> atteindre une valeur cible sans la dépasser.

Cela permet de comprendre rapidement l’objectif de chaque tour. La profondeur vient ensuite des cartes spéciales et des choix de construction.

#### Une excellente tension entre sécurité et ambition

Chaque carte tirée pose une question intéressante :

- Est-ce que je m’arrête maintenant ?
- Est-ce que je tente une carte supplémentaire ?
- Est-ce que je peux modifier la valeur d’une carte ?
- Est-ce que je peux empêcher l’adversaire de progresser ?
- Est-ce que je peux me permettre de dépasser la limite ?

Ce système crée naturellement des moments de tension.

#### La chance peut être progressivement contrôlée

Le jeu ne supprime pas l’aléatoire, mais il donne des outils pour le réduire :

- filtrer le deck ;
- augmenter la fréquence de certaines cartes ;
- manipuler les valeurs ;
- prévoir certaines pioches ;
- déstabiliser l’adversaire.

C’est très important pour un jeu addictif : le hasard doit être présent, mais le joueur doit avoir le sentiment qu’il peut apprendre à le dompter.

### Faiblesses

- Le blackjack offre moins de variété combinatoire que le poker ou qu’un système entièrement original.
- Les premiers tours peuvent parfois dépendre excessivement de la pioche.
- Certaines stratégies peuvent devenir dominantes, en particulier quand une construction très simple permet de résoudre la majorité des rencontres.
- Le design risque de devenir répétitif si les adversaires ne changent pas suffisamment les règles.
- Les effets spéciaux peuvent rendre les règles moins intuitives que le jeu de base.

### Ce qu’il faut retenir

**Très bon modèle pour :**

- un jeu fondé sur une règle connue ;
- une tension “je tente encore ou je sécurise ?” ;
- une manipulation de probabilités ;
- des cartes qui changent les règles plutôt que d’ajouter uniquement des dégâts.

**Leçon à éviter :**

> Ne pas construire toute la profondeur sur une seule décision numérique.

Il faut ajouter d’autres axes : position, tempo, ressources, ordre des actions, objectifs secondaires ou conséquences à long terme.

---

## 2. DICE LEGENDS

Je pars du principe que tu parles bien de **Dice Legends**, développé par Big Bite Games et associé à Ad Luna. Le jeu repose sur un roguelite de stratégie combinant dés, équipement et cartes, avec une recherche de combinaisons particulièrement puissantes. ([store.steampowered.com](https://store.steampowered.com/app/3112170/Dice_Legends/?l=french&utm_source=openai))

### Mécaniques principales

- Lancers de dés.
- Dés utilisés pour activer des équipements ou des cartes.
- Construction d’un ensemble d’équipements.
- Combinaisons entre résultats de dés et effets.
- Progression à travers une aventure roguelite.
- Recherche d’un “build” qui finit par dépasser les attentes normales du système.
- Combat au tour par tour.

### Forces

#### Le dé produit immédiatement de l’incertitude

Le dé est plus volatile qu’une carte :

- il génère une valeur ;
- il peut être relancé ;
- il peut être modifié ;
- il peut être réparti entre plusieurs équipements ;
- il crée des résultats partiellement favorables.

Cette incertitude rend chaque tour intéressant.

#### Le résultat brut devient une ressource

Un mauvais résultat n’est pas nécessairement inutile. Il peut parfois être :

- stocké ;
- transformé ;
- additionné ;
- sacrifié ;
- utilisé sur une capacité secondaire.

C’est une excellente direction de design, car elle réduit la frustration du hasard.

#### Les équipements créent des petits puzzles

Le joueur ne se demande pas seulement “quel objet est le plus fort ?”, mais :

- dans quel ordre les activer ?
- quel dé réserver ?
- quelle valeur doit être améliorée ?
- est-ce que je construis autour des petits résultats ou des gros résultats ?
- est-ce que je veux de la régularité ou des pics de puissance ?

### Faiblesses possibles

- Le hasard peut prendre trop de place si les outils de contrôle sont insuffisants.
- Une combinaison très forte peut réduire les décisions à une routine.
- Les règles peuvent devenir difficiles à lire si plusieurs équipements réagissent simultanément.
- La puissance d’un objet peut dépendre excessivement de la chance de trouver les bons éléments.
- Le joueur peut avoir l’impression de perdre à cause d’un jet plutôt qu’à cause d’une décision.

### Ce qu’il faut retenir

**À porter dans ton projet :**

- des jets de dés mais avec plusieurs façons de les exploiter ;
- une capacité à transformer un mauvais résultat en opportunité ;
- des équipements qui ont des fonctions différentes ;
- des combinaisons visibles et compréhensibles ;
- un système où la question n’est pas simplement “quel résultat ai-je obtenu ?”, mais :

> **“Que puis-je faire avec ce résultat ?”**

---

## 3. GAMBONANZA

*Gambonanza* transforme les échecs en roguelike tactique. Le joueur déploie un nombre limité de pièces sur un petit plateau et doit capturer les pièces adverses. Les pièces conservent leurs mouvements traditionnels, tandis que les “gambits” modifient les règles et ajoutent des effets de synergie. ([youtube.com](https://www.youtube.com/watch?v=V3ey2xaMGKQ&utm_source=openai))

### Mécaniques principales

- Plateau réduit.
- Pièces d’échecs avec déplacements traditionnels.
- Affrontements ressemblant à des puzzles tactiques.
- Déploiement limité de pièces.
- Capture de toutes les unités adverses.
- Gambits qui modifient les règles.
- Progression roguelite.
- Récompenses et choix de route.
- Déblocage progressif de nouvelles possibilités.

### Forces

#### Une profondeur énorme à partir de règles simples

Le déplacement d’un cavalier, d’un fou ou d’une tour est connu. Pourtant, sur un petit plateau avec peu de pièces, chaque case compte.

C’est une qualité extrêmement intéressante :

> Le jeu n’a pas besoin de centaines de règles pour produire des situations complexes.

#### Une vraie importance du positionnement

Contrairement à un deckbuilder classique, la puissance ne vient pas uniquement des cartes obtenues. Elle vient aussi :

- de la géométrie du plateau ;
- des cases menacées ;
- de l’ordre des captures ;
- des lignes ouvertes ;
- des sacrifices ;
- de la prévision du mouvement adverse.

Cela donne une forme de stratégie plus “spatiale”.

#### Les gambits tordent une base connue

Le meilleur aspect conceptuel est probablement la modification des règles :

- une pièce peut se déplacer d’une manière inhabituelle ;
- une capture peut déclencher un effet ;
- certaines cases peuvent être interdites ;
- certaines pièces gagnent des capacités conditionnelles ;
- le joueur peut exploiter une exception aux règles normales.

C’est une très bonne manière de créer des builds sans abandonner le langage original des échecs.

### Faiblesses

- Le jeu exige une familiarité minimale avec les échecs.
- La difficulté peut paraître brutale pour les joueurs qui ne visualisent pas les menaces.
- La réflexion peut devenir lente si chaque tour exige trop de calcul.
- La lisibilité des effets est essentielle : une règle mal expliquée peut rendre une défaite injuste.
- Les joueurs qui cherchent un jeu plus “chaotique” peuvent trouver le système trop cérébral.

### Ce qu’il faut retenir

**À porter absolument :**

- un espace de jeu limité ;
- peu d’éléments actifs ;
- des règles de déplacement ou de fonctionnement très lisibles ;
- des situations qui deviennent complexes par interaction ;
- des modifications de règles qui créent des stratégies inédites.

**Leçon majeure :**

> La profondeur ne vient pas forcément du nombre de contenus, mais du nombre d’interactions entre quelques éléments.

---

## 4. CLOVERPIT

*CloverPit* est un roguelite centré sur une machine à sous. Le joueur doit rembourser une dette croissante dans un nombre limité de manches, tout en utilisant des objets et des bonus pour améliorer les probabilités et transformer la machine. Le jeu ajoute une ambiance de huis clos horrifique et de piège psychologique. ([en.wikipedia.org](https://en.wikipedia.org/wiki/CloverPit?utm_source=openai))

### Mécaniques principales

- Machine à sous.
- Objectif financier à atteindre.
- Dette ou seuil qui augmente.
- Nombre de tours limité.
- Objets modifiant les symboles ou les probabilités.
- Ressources séparées : argent, tickets, objets.
- Boutique ou amélioration entre les manches.
- Progression par tentatives.
- Ambiance horrifique et narrative.
- Découverte progressive des règles.

### Forces

#### Une boucle extrêmement lisible

Le fonctionnement est presque instantanément compréhensible :

1. faire tourner la machine ;
2. gagner de l’argent ;
3. atteindre le montant demandé ;
4. acheter des améliorations ;
5. recommencer avec un objectif plus élevé.

Cette lisibilité est une grande force.

#### Le hasard est rendu manipulable

Une machine à sous classique est presque entièrement passive. *CloverPit* la transforme en système stratégique grâce à :

- des objets ;
- des probabilités modifiées ;
- des symboles spécialisés ;
- des effets persistants ;
- des choix entre rendement immédiat et amélioration future.

Le plaisir vient du passage de :

> “Je subis le hasard”

à :

> “Je construis une machine qui produit le hasard dont j’ai besoin.”

#### Le cadre renforce la boucle

La cellule, la dette et le danger donnent du sens au système. Le joueur n’est pas simplement en train de faire des scores : il est prisonnier d’un mécanisme qui devient progressivement plus oppressant.

### Faiblesses

- La répétition des rotations peut devenir monotone.
- Le hasard initial peut donner une impression d’impuissance.
- L’opacité des règles peut être intéressante narrativement mais frustrante mécaniquement.
- Une stratégie optimale peut être trouvée assez vite.
- L’ambiance peut parfois porter une mécanique moins profonde que celle de *Balatro*.
- La présentation en plusieurs éléments séparés peut nuire à la lisibilité.

### Ce qu’il faut retenir

**Très intéressant pour ton futur jeu :**

- une machine ou un système qui se transforme au fil de la partie ;
- une économie à plusieurs ressources ;
- une pression croissante ;
- des améliorations qui changent les probabilités ;
- une ambiance qui justifie les mécaniques ;
- un objectif simple avec un coût d’échec très clair.

**Leçon majeure :**

> Le hasard devient satisfaisant lorsqu’il est possible de construire progressivement une machine qui le produit, le déforme ou le prédit.

---

## 5. WILDFROST

*Wildfrost* est un roguelike deckbuilder tactique avec des combats sur plusieurs lignes. Les unités disposent notamment de compteurs indiquant quand elles agiront, et le joueur manipule le placement, les attaques, les effets temporisés, les compagnons et les objets. Le jeu s’appuie fortement sur les synergies entre unités et sur les effets de charme. ([en.wikipedia.org](https://en.wikipedia.org/wiki/Wildfrost?utm_source=openai))

### Mécaniques principales

- Deckbuilding.
- Combat au tour par tour.
- Plusieurs lignes ou positions.
- Compteurs d’initiative visibles.
- Unités alliées persistantes pendant le combat.
- Attaques, buffs, debuffs et statuts.
- Effets différés.
- Compagnons avec capacités uniques.
- Objets consommables.
- Charms qui personnalisent les unités.
- Carte de progression roguelite.
- Combats pouvant être planifiés plusieurs tours à l’avance.

### Forces

#### Une forte dimension tactique

Le joueur doit réfléchir à :

- qui agit en premier ;
- quelle cible doit être attaquée ;
- où positionner une unité ;
- quel effet déclencher maintenant ;
- quelle attaque préparer pour dans deux tours ;
- quelle unité protéger ;
- quel compteur modifier.

Cela crée une stratégie plus riche que “jouer la carte qui inflige le plus de dégâts”.

#### Les combats sont lisibles mais profonds

Les compteurs visibles permettent de comprendre la menace à venir. Le joueur peut donc planifier sans avoir besoin de deviner complètement ce que fera l’ennemi.

C’est un équilibre intéressant entre :

- information ;
- anticipation ;
- réaction ;
- optimisation.

#### Les unités ont une véritable identité

Un bon compagnon n’est pas seulement une carte avec “10 dégâts”. Il peut :

- appliquer un statut ;
- profiter d’un certain placement ;
- déclencher un effet quand il est blessé ;
- bénéficier d’un certain rythme d’attaque ;
- interagir avec une tribu ou un type d’unité.

Cela favorise les constructions thématiques.

### Faiblesses

- La courbe d’apprentissage est assez importante.
- Certaines interactions sont difficiles à prévoir sans connaître le jeu.
- Les combats peuvent être très punitifs après une longue progression.
- Les erreurs de positionnement peuvent coûter très cher.
- Certaines synergies semblent faibles tant que le joueur ne connaît pas déjà les bons assemblages.
- Le jeu demande davantage d’investissement mental que *Balatro* ou *CloverPit*.

### Ce qu’il faut retenir

**À porter dans ton projet :**

- un espace ou une structure où la position compte ;
- des actions différées et visibles ;
- des effets dont la valeur dépend du timing ;
- des unités ou éléments qui se spécialisent ;
- des personnalisations qui transforment un élément de base ;
- des décisions où le meilleur choix n’est pas toujours le plus puissant immédiatement.

**Leçon majeure :**

> Le timing est une ressource aussi importante que l’argent, les cartes ou les dés.

---

## 6. BALATRO

*Balatro* combine poker, deckbuilding et progression roguelite. Le joueur forme des mains de poker pour atteindre des scores croissants, tandis que les jokers, cartes améliorées, planètes, tarots et effets de boss transforment progressivement les règles du jeu. ([fr.wikipedia.org](https://fr.wikipedia.org/wiki/Balatro?utm_source=openai))

### Mécaniques principales

- Combinaisons de poker.
- Deckbuilding et épuration du paquet.
- Jokers persistants.
- Multiplication entre jetons et multiplicateurs.
- Cartes améliorées.
- Modification des couleurs, valeurs et familles.
- Boutique après les manches.
- Économie simple.
- Blindes et blindes boss.
- Défis de plus en plus élevés.
- Scores qui peuvent exploser de manière spectaculaire.
- Déblocages et défis à long terme.

### Forces

#### Une boucle de progression parfaite

Chaque manche alterne :

1. jouer une main ;
2. observer son score ;
3. gagner de l’argent ;
4. visiter la boutique ;
5. renforcer ou réorienter sa construction ;
6. affronter un palier plus difficile.

Cette alternance est particulièrement efficace parce qu’elle offre une récompense ou une décision très régulièrement.

#### La relation entre jetons et multiplicateurs

Le fait de séparer la puissance en deux axes — une valeur de base et un multiplicateur — crée une tension de construction :

- augmenter le score brut ;
- améliorer le multiplicateur ;
- obtenir les deux ;
- spécialiser l’un au détriment de l’autre ;
- trouver un joker qui exploite une faiblesse de la construction.

C’est un modèle très puissant pour créer des synergies.

#### Les jokers changent le comportement du joueur

Un bon joker n’ajoute pas seulement “+10 dégâts”. Il pousse à jouer différemment :

- construire une main particulière ;
- conserver certaines cartes ;
- jouer moins de cartes ;
- abandonner une combinaison traditionnelle ;
- prendre des risques ;
- modifier son économie.

C’est l’une des grandes forces de *Balatro*.

#### Le plaisir de “casser” le jeu

Le joueur veut atteindre un score supérieur, mais surtout créer une machine absurde :

- une carte déclenche plusieurs fois un effet ;
- un bonus augmente exponentiellement ;
- une main improbable devient la stratégie principale ;
- une mécanique apparemment secondaire devient le centre du build.

C’est ce sentiment qui génère énormément de rejouabilité.

### Faiblesses

- Certaines parties peuvent sembler décidées très tôt par la boutique.
- La puissance de certaines combinaisons peut rendre d’autres choix moins intéressants.
- Le jeu peut devenir très calculatoire à haut niveau.
- La lisibilité baisse lorsque plusieurs effets se déclenchent simultanément.
- Les joueurs peuvent parfois avoir l’impression qu’il faut connaître les synergies cachées pour progresser.
- La progression méta est volontairement limitée, ce qui ne convient pas à tous les joueurs.

### Ce qu’il faut retenir

**À porter absolument :**

- une base immédiatement connue ;
- une boutique simple ;
- plusieurs couches de synergies ;
- des modifications qui changent le comportement du joueur ;
- deux ou plusieurs axes de puissance ;
- des builds capables de devenir très forts ;
- une économie où chaque achat compte ;
- des paliers de difficulté clairs ;
- la possibilité de produire des résultats spectaculaires.

**Leçon majeure :**

> L’addiction vient souvent de la combinaison entre une décision fréquente, une récompense immédiate et la promesse d’une synergie encore plus puissante à découvrir.

---

# Comparaison synthétique

| Jeu | Base mécanique | Plaisir principal | Risque principal |
|---|---|---|---|
| **Black Jacket** | Blackjack | Décider quand s’arrêter et manipuler les valeurs | Design trop dépendant d’une seule règle numérique |
| **Dice Legends** | Dés + équipement | Transformer des résultats aléatoires en actions utiles | Frustration liée aux mauvais jets |
| **Gambonanza** | Échecs | Résoudre des puzzles de positionnement | Difficulté et exigence cognitive |
| **CloverPit** | Machine à sous | Construire une machine qui contrôle le hasard | Répétition et manque de profondeur à long terme |
| **Wildfrost** | Combat tactique | Maîtriser le timing, le placement et les statuts | Courbe d’apprentissage élevée |
| **Balatro** | Poker | Créer une machine à score qui dégénère | Synergies dominantes et variance de la boutique |

---

# Les mécaniques importantes à reprendre

## 1. Une base connue, mais profondément détournée

Tes références ne commencent pas par une mécanique entièrement nouvelle :

- blackjack ;
- dés ;
- échecs ;
- machine à sous ;
- poker ;
- combat tactique.

La bonne approche pour ton jeu serait donc probablement :

> Choisir une activité compréhensible en quelques secondes, puis la transformer progressivement en système stratégique.

Quelques bases possibles :

- bataille navale ;
- dominos ;
- mahjong ;
- pêche ;
- cuisine ;
- courses hippiques ;
- tir à l’arc ;
- alchimie ;
- enchères ;
- jeu de billes ;
- morpion ;
- casse-tête de tuiles ;
- tirage de cartes ;
- machines à combinaisons.

L’important est que la base possède déjà une **grammaire de jeu** : valeurs, positions, couleurs, familles, trajectoires, ordre, combinaison ou risque.

---

## 2. Un hasard que le joueur peut influencer

Dans les six jeux, l’aléatoire est fondamental. Mais les meilleurs moments apparaissent lorsque le joueur peut agir sur lui.

Il faut donc prévoir plusieurs degrés de contrôle :

### Contrôle faible

- relancer une fois ;
- tirer une carte supplémentaire ;
- choisir entre deux récompenses ;
- modifier une valeur.

### Contrôle moyen

- filtrer les éléments disponibles ;
- mettre une carte de côté ;
- manipuler l’ordre ;
- choisir quelles récompenses apparaissent ;
- augmenter la fréquence d’un type d’élément.

### Contrôle fort

- transformer une catégorie en une autre ;
- créer des résultats garantis ;
- déclencher des effets en chaîne ;
- contourner une règle fondamentale.

La progression idéale serait :

> hasard subi au début → hasard influencé au milieu → hasard exploité et presque fabriqué à la fin.

---

## 3. Des ressources qui ont plusieurs usages

Pour créer des décisions intéressantes, une ressource ne devrait pas avoir une seule fonction.

Par exemple, l’argent pourrait servir à :

- acheter une amélioration ;
- supprimer un élément ;
- relancer une récompense ;
- payer un risque ;
- influencer la carte du monde ;
- sauver une unité ;
- débloquer une information.

Ainsi, le joueur ne choisit pas simplement “la meilleure récompense”, mais :

> “Quelle utilisation de cette ressource est la plus importante maintenant ?”

Je recommande au minimum :

- une ressource de progression de run ;
- une ressource de score ou de survie ;
- éventuellement une ressource rare liée aux choix risqués.

Il faut toutefois éviter d’en mettre trop. *Balatro* fonctionne notamment parce que son économie reste relativement lisible.

---

## 4. Un système de construction en plusieurs couches

Un seul type d’amélioration ne suffira probablement pas.

Tu peux envisager trois couches :

### Couche 1 : les éléments de base

Exemples :

- cartes ;
- dés ;
- pièces ;
- tuiles ;
- unités ;
- symboles.

### Couche 2 : les améliorations persistantes pendant la partie

Exemples :

- jokers ;
- équipements ;
- charms ;
- artefacts ;
- pouvoirs passifs.

### Couche 3 : les modifications de règles

Exemples :

- une couleur devient une valeur ;
- une pièce peut se déplacer deux fois ;
- un dé impair compte comme deux dés ;
- les échecs produisent une récompense ;
- une combinaison normalement impossible devient valide.

La troisième couche est probablement la plus importante pour différencier ton jeu d’un simple clone de deckbuilder.

---

## 5. Des synergies qui changent le comportement

Une synergie réussie doit encourager une nouvelle manière de jouer.

Évite les effets purement numériques du type :

- +5 % de dégâts ;
- +2 points ;
- +10 % de chance.

Ils peuvent exister, mais ils ne doivent pas être le cœur du système.

Privilégie des effets comme :

- “La première fois que tu échoues, transforme l’échec en réussite partielle.”
- “Les petits résultats deviennent plus intéressants que les grands.”
- “Tu peux conserver une action non utilisée pour le tour suivant.”
- “Les cases adjacentes à une pièce détruite deviennent dangereuses.”
- “Une combinaison faible répétée plusieurs fois devient une combinaison spéciale.”
- “Tu peux volontairement ajouter une contrainte pour doubler la récompense.”

Un bon pouvoir doit faire dire :

> “D’accord, cette partie, je vais jouer complètement autrement.”

---

## 6. Une tension entre score et sécurité

C’est un élément central de *Black Jacket*, *CloverPit* et *Balatro*.

Le joueur doit régulièrement choisir entre :

- sécuriser un résultat acceptable ;
- continuer pour obtenir beaucoup plus ;
- dépenser une ressource pour se protéger ;
- prendre un risque qui peut améliorer tout le build ;
- accepter une contrainte volontaire en échange d’une meilleure récompense.

Cette tension est probablement indispensable à ton jeu.

Une bonne structure serait :

### Option prudente

- récompense faible mais garantie ;
- progression régulière ;
- peu de risque.

### Option ambitieuse

- récompense élevée ;
- possibilité d’échec ;
- potentiel de synergie plus important.

### Option dangereuse

- impose une contrainte ;
- peut ruiner la manche ;
- offre une amélioration rare ou une accélération forte.

---

## 7. Des rencontres qui modifient les règles

Les boss de *Balatro*, les adversaires de *Black Jacket*, les ennemis de *Wildfrost* et les règles spéciales de *Gambonanza* montrent l’importance de faire varier le problème, pas seulement sa difficulté.

Un bon boss devrait poser une question différente :

- Peux-tu jouer sans utiliser une certaine catégorie ?
- Peux-tu atteindre l’objectif avec moins d’actions ?
- Peux-tu réussir sans ton meilleur élément ?
- Peux-tu exploiter un handicap ?
- Peux-tu faire fonctionner une stratégie normalement faible ?
- Peux-tu battre l’ennemi avant un compte à rebours ?
- Peux-tu accepter une contrainte sans perdre ton identité de build ?

Évite les boss qui font seulement :

- plus de points de vie ;
- plus de dégâts ;
- plus de difficulté numérique.

---

# Ce que je te conseillerais de mettre au cœur de ton jeu

À partir de ta sélection, je verrais un jeu basé sur le modèle suivant :

## Concept de structure

### Une activité centrale très simple

Par exemple :

- former des combinaisons ;
- placer quelques éléments ;
- lancer et répartir des dés ;
- construire une séquence ;
- prendre des décisions autour d’un risque.

### Un plateau ou espace limité

À la manière de *Gambonanza* et *Wildfrost*, la position devrait compter.

Cela peut être :

- une grille ;
- une ligne ;
- plusieurs emplacements ;
- un tableau de symboles ;
- une piste circulaire ;
- une zone où les éléments s’influencent entre eux.

### Une résolution par manches courtes

Chaque manche devrait durer environ :

- quelques secondes pour une action simple ;
- quelques minutes pour une rencontre ;
- une trentaine de minutes pour une partie complète.

### Une boutique fréquente

Après chaque ou deux rencontres :

- achat ;
- suppression ;
- amélioration ;
- transformation ;
- choix entre plusieurs chemins.

### Des artefacts qui changent les règles

Inspirés des jokers, charms, équipements et gambits :

- 3 à 5 artefacts actifs ;
- effets très différents ;
- possibilités de boucles ;
- limitations afin d’éviter une combinaison unique dominante.

### Un seuil croissant

À chaque étape :

- score à atteindre ;
- dette à rembourser ;
- boss à vaincre ;
- territoire à conquérir ;
- rituel à compléter ;
- temps à respecter.

### Une fin de partie explosive

Le joueur doit sentir qu’il passe de :

> “J’essaie de survivre”

à :

> “Mon système fonctionne enfin”

puis éventuellement à :

> “Je produis une combinaison complètement absurde.”

---

# Les erreurs à éviter

## 1. Copier uniquement l’habillage

Faire “Balatro avec des dés” ou “Balatro avec des échecs” ne suffit pas.

Il faut identifier la propriété unique de ta base :

- les échecs ont la position ;
- le blackjack a le dépassement ;
- les dés ont la variance ;
- la machine à sous a les probabilités ;
- le poker a les combinaisons ;
- *Wildfrost* a le timing et le placement.

Ton jeu doit avoir **une tension que les autres n’ont pas**.

## 2. Ajouter trop d’effets avant de stabiliser la base

Il vaut mieux avoir :

- 20 objets très distincts ;
- 4 archétypes clairement identifiables ;
- 5 boss intéressants ;

que :

- 200 objets légèrement différents ;
- 15 monnaies ;
- des effets difficiles à comprendre.

## 3. Laisser l’aléatoire décider entièrement

Le joueur doit toujours disposer d’au moins une décision intéressante.

Même dans une mauvaise situation, il devrait pouvoir :

- réduire le risque ;
- changer d’objectif ;
- sacrifier une ressource ;
- modifier le tirage ;
- jouer une ligne moins rentable mais plus sûre.

## 4. Rendre l’information inutilement obscure

L’ambiance peut être mystérieuse, mais les règles essentielles doivent être claires :

- pourquoi ai-je perdu ?
- que va faire l’ennemi ?
- quelle est la probabilité approximative ?
- pourquoi cette synergie fonctionne-t-elle ?
- quelle ressource dois-je économiser ?

*Wildfrost* peut être complexe, mais ses compteurs donnent une information importante. *Balatro* affiche très clairement le calcul du score. C’est une bonne direction à suivre.

## 5. Créer une seule stratégie dominante

C’est un problème potentiel relevé dans certaines critiques de *Black Jacket* et de *CloverPit* : une fois qu’une construction optimale est comprise, une partie de la découverte disparaît. ([game-atlas.de](https://game-atlas.de/en/reviews/black-jacket/?utm_source=openai))

Pour l’éviter :

- faire varier les objectifs ;
- créer des boss qui ciblent certaines stratégies ;
- permettre des constructions fortes mais incompatibles ;
- introduire des compromis ;
- rendre les builds puissants dans certaines situations et mauvais dans d’autres.

---

# Bilan final : les ingrédients essentiels pour ton jeu

Si je devais résumer les éléments à conserver de ta sélection, je retiendrais ces **dix piliers** :

1. **Une règle de départ compréhensible en moins d’une minute.**
2. **Un hasard réel, mais progressivement contrôlable.**
3. **Des décisions fréquentes et significatives.**
4. **Une économie simple avec plusieurs usages possibles.**
5. **Une construction de build visible dès le milieu de la partie.**
6. **Des améliorations qui modifient le comportement du joueur.**
7. **Un espace, un ordre ou un timing qui ajoutent une dimension tactique.**
8. **Des boss qui changent les règles plutôt que de seulement augmenter les chiffres.**
9. **Des possibilités de synergies spectaculaires et de boucles.**
10. **Une fin de partie où le joueur a l’impression d’avoir fabriqué une machine unique.**

## La formule qui semble le plus te correspondre

> **Une mécanique traditionnelle + une structure roguelite + des règles que le joueur peut tordre + une forte tension de risque + des synergies capables de dégénérer intelligemment.**

Le point le plus important pour ton projet serait donc de trouver **la mécanique centrale qui remplace le poker, le blackjack, les dés ou les échecs**.

Elle doit avoir :

- des résultats lisibles ;
- des choix de risque ;
- plusieurs façons de manipuler le résultat ;
- une structure combinatoire ;
- des éléments que l’on peut transformer ;
- suffisamment de limites pour créer de vraies décisions.

C’est cette base, plus que l’univers ou le nombre d’objets, qui déterminera si ton jeu possède une vraie identité.