# Sinner's Bet — Recommandations d'ergonomie des écrans principaux

> Analyse ergonomique des trois écrans clés du proto 4 : **Boutique**, **Phase de paris**, **Phase de course**.
> Basée sur `GDD.md`, `interface.md`, `boutique-README.md`, `cartes.md`, `des.md`, `personnalites.md`.
> Angle : actions utilisateur, priorisation de l'information, lisibilité et classement de l'information dans un contexte de jeu vidéo.

---

## 1. Cadre d'analyse

### 1.1 Ce que le joueur fait vraiment

La promesse du jeu est « *Comment influencer la course pour que mes paris soient gagnants ?* ». Ergonomiquement, cela se traduit par trois activités mentales distinctes, qui correspondent exactement aux trois écrans :

| Écran | Activité mentale dominante | Question du joueur | Rythme |
|---|---|---|---|
| Phase de paris | **Évaluation de risque** | « Sur quoi je m'engage, pour combien ? » | Lent, réfléchi |
| Boutique | **Arbitrage économique** | « Cette pièce vaut-elle plus en mise, en achat, ou en réserve pour le prix du cercle ? » | Lent, comparatif |
| Course | **Décision tactique séquentielle** | « Dans quel ordre je résous mes combinaisons ? » | Cadencé, tour par tour |

Chaque écran doit donc être optimisé pour **une** décision principale, et reléguer tout le reste en information de support. C'est le principe directeur de toutes les recommandations qui suivent.

### 1.2 La particularité économique : une pièce, trois usages

L'argent sert à parier, acheter et payer le prix du cercle. C'est le cœur de la tension voulue (inspi §3), mais c'est aussi le principal risque ergonomique : le joueur doit pouvoir faire cet arbitrage **sans calcul mental**. Recommandation transversale n°1 :

> **La « jauge des trois usages » doit être visible sur les trois écrans** : solde actuel, total déjà misé, et prix du cercle restant à payer — présentés ensemble, au même endroit, dans le même format. Idéalement une barre segmentée : `[ Prix du cercle | Marge de jeu ]` avec le solde qui se remplit/vide dessus. Un joueur qui descend sous le prix du cercle doit le voir passer en avertissement (ambre) sans qu'on l'empêche de jouer (le risque est le jeu, pas une erreur).

### 1.3 Hiérarchie visuelle en trois niveaux

Pour chaque écran, l'information est classée en trois niveaux, et ce classement pilote taille, contraste et position :

- **Niveau 1 — Décision** : ce sur quoi le joueur agit maintenant (centre de l'écran, plus gros, plus contrasté).
- **Niveau 2 — Contexte de décision** : ce qu'il faut connaître pour décider (périphérie proche, lisible sans effort, jamais en popup).
- **Niveau 3 — État général** : ce qu'on consulte à la demande (HUD discret, tooltips, popups — cercle en cours, liste d'artefacts, statistiques).

Erreur classique à éviter : faire remonter du niveau 3 vers le niveau 1 (ex. gros compteur de pièces animé qui attire l'œil pendant l'association des dés).

### 1.4 Contraintes de lisibilité propres à la DA

La direction artistique (speed painting, brume, chiaroscuro, contrastes chaud/froid) est magnifique mais **hostile à la lisibilité** : fonds texturés, valeurs de luminosité très variables. Règles de protection :

- Tout texte fonctionnel (cotes, prix, distances) repose sur une **plaque de fond unie ou quasi-unie** (cartouche sombre semi-opaque), jamais directement sur la peinture.
- Réserver le **chaud (feu, orange)** aux éléments interactifs et aux gains, le **froid (bleu glacé)** au décor et aux informations neutres, le **rouge saturé** aux pertes et dangers uniquement. La DA fournit déjà cette dualité chaud/froid : en faire un code fonctionnel.
- Les chiffres critiques (cotes, distances de dés, positions) en **typographie tabulaire**, taille minimale ~24 px équivalent 1080p, testée à 3 m d'un écran TV (norme « 10-foot UI » si le jeu vise un usage manette/canapé).
- Ne jamais coder une information **uniquement par la couleur** (daltonisme) : toujours doubler par une forme, une icône ou un motif (ex. ⚠ pour les objets dangereux, déjà prévu dans les listes — le conserver à l'écran).

---

## 2. Écran « Phase de paris »

### 2.1 Actions de l'utilisateur

1. Consulter le plateau et les âmes (personnalités, positions si paris en course).
2. Choisir un **type de pari** (parmi ceux débloqués par le rang du stagiaire, 5 à 10 types).
3. Sélectionner la ou les **âmes** concernées (1 à N selon le type).
4. Fixer la **mise**.
5. Valider le ticket ; répéter éventuellement (paris multiples actifs).
6. Clore la phase (« Lancer la course ») ou ouvrir la boutique.

### 2.2 Structure recommandée : le ticket de pari

Le panneau de paris monte du bas de l'écran (choix validé dans `interface.md` : le plateau reste visible au-dessus — c'est essentiel, ne jamais masquer les âmes pendant qu'on parie dessus). À l'intérieur, adopter la métaphore du **ticket de guichet**, cohérente avec la fiction (le stagiaire « prend les paris ») :

```
┌─────────────────────────────────────────────────────────┐
│  TYPES DE PARIS          │  TICKET EN COURS             │
│  ┌──────┐┌──────┐┌─────┐ │  Vainqueur pur               │
│  │Simple││Combiné││Élite│ │  Âme : Didon                │
│  └──────┘└──────┘└─────┘ │  Mise : [10] [20] [50] [X]   │
│  ○ Vainqueur      ×3     │  ──────────────────────      │
│  ○ Top 3          ×1.5   │  Gain potentiel : 30 pièces  │
│  ○ Pas top 3      ×1.4   │  Solde après mise : 72       │
│  ○ Dernier        ×4     │  [   PARIER   ]              │
│  🔒 Podium exact  ×25    │                              │
│     (Contremaître requis)│  PARIS ACTIFS (2) ────────── │
└─────────────────────────────────────────────────────────┘
```

Recommandations détaillées :

- **Classer les types de paris par les trois familles du GDD** (simples / intermédiaires / avancés), renommées côté joueur en termes de risque : par exemple `Sûrs`, `Combinés`, `Gros tickets`. Le GDD classe déjà l'information ainsi — l'interface doit refléter ce classement, c'est le meilleur candidat d'onglets ou de sections.
- **Un type de pari = une ligne = trois informations maximum** : nom, condition en une phrase courte, multiplicateur. Le détail (pénalités, exemples) passe en tooltip/appui long. Le multiplicateur est l'information de comparaison principale : l'aligner en colonne à droite, en tabulaire.
- **Les paris verrouillés par rang restent visibles, grisés, avec la condition de déblocage** (« Podium exact — se débloque au rang Contremaître »). C'est de la motivation de progression gratuite ; les masquer priverait le joueur de l'anticipation. Un cadenas + libellé du rang suffit, pas de tooltip obligatoire.
- **Le gain potentiel et le solde après mise sont calculés en direct** sur le ticket, avant validation. Le GDD l'exige (« chaque pari indique avant validation : coût, multiplicateur, conditions, pénalités ») ; ergonomiquement c'est la suppression du calcul mental — la règle d'or de tout jeu de pari.
- **Mises par préréglages** (10 / 20 / 50 / mise libre) plutôt qu'un champ nu : plus rapide, moins d'erreurs, compatible manette.
- **Sélection de l'âme sur le plateau lui-même** : quand le ticket attend une âme, les âmes deviennent les cibles cliquables (surbrillance douce + curseur). Le panneau et le plateau se répondent : sélectionner dans l'un met en évidence dans l'autre. Éviter une liste d'âmes dupliquée dans le panneau (double représentation = double vérification).
- **Fiche d'âme au survol** : personnalité (icône + nom), effet en une phrase, historique court (« 2e puis 4e sur ce cercle »). L'archétype doit être identifiable d'un coup d'œil sur le plateau (icône distinctive au-dessus du pion), car c'est la matière première de la décision de pari.
- **Paris actifs** : liste compacte sous le ticket (âme, type, mise → gain). Chaque pari actif reste visible **pendant la course** (voir §4). Prévoir dès cet écran l'état visuel des trois issues : en cours (neutre), gagnant probable (vert/or), compromis (rouge) — les mêmes états seront réutilisés en course.
- **Pari en cours de course** : même panneau, mêmes gestes. Les âmes au-delà du seuil de 60 % sont non sélectionnables avec un motif explicite (« hors zone de pari »), et la zone de seuil est marquée sur le plateau en permanence (déjà prévu : zones de couleur — ajouter un libellé au premier franchissement).

### 2.3 Priorisation de l'information

| Niveau | Contenu |
|---|---|
| 1 — Décision | Ticket en cours : type, âme(s), mise, **gain potentiel**, bouton Parier |
| 2 — Contexte | Multiplicateurs de la liste, personnalités des âmes, solde/jauge trois usages, paris déjà actifs |
| 3 — À la demande | Détail des conditions de pari, historique des âmes, artefacts influençant les cotes |

### 2.4 Pièges à éviter

- Ne pas ouvrir la phase de paris sur une liste des dix types : au cercle 1, seuls 5 types existent. **L'interface doit paraître simple au début et grandir avec le rang** — le déblocage progressif est votre meilleur outil d'apprentissage (le GDD des cartes fait pareil avec les moments de jeu).
- Pas de confirmation modale après « Parier » : le ticket qui glisse dans la liste des paris actifs **est** le feedback. En revanche, autoriser l'annulation d'un pari initial tant que la course n'est pas lancée (avant le premier lancer, l'engagement n'a pas de valeur ludique ; après, l'annulation devient une carte — « Retrait »).
- Attention au vocabulaire : « Top 3 dans le désordre » vs « Deux âmes dans le top 3 » sont proches. Les distinguer par une **mini-iconographie de podium** (3 silhouettes pleines vs 2 pleines + 1 vide) plutôt que par le texte seul.

---

## 3. Écran « Boutique »

### 3.1 Actions de l'utilisateur

1. Balayer l'offre (vitrine limitée, 3+ objets selon la config).
2. Comparer prix ↔ solde ↔ prix du cercle ↔ paris déjà posés.
3. Consulter le détail d'un objet (effet, impact, contrepartie ⚠, rang requis).
4. Acheter (éventuellement plusieurs fois).
5. Basculer vers les paris (aller-retour explicite dans `interface.md`) ou lancer la course.

### 3.2 Structure recommandée : la vitrine à trois tentations

`boutique-README.md` définit déjà la règle « trois options par vitrine : un objet sûr, un ambitieux, un dangereux ». **C'est une structure d'interface, pas seulement d'équilibrage** : présenter la vitrine en trois emplacements visuellement différenciés, de gauche à droite, du plus sûr au plus dangereux, avec un traitement graphique croissant (cadre sobre → cadre orné → cadre marqué ⚠ aux flammes). Le joueur apprend la grammaire en une visite.

```
┌──────────────────────────────────────────────────────────────┐
│  BOUTIQUE DU STAGIAIRE            Solde : 87   Cercle : 200  │
│  ┌─ Cartes ─┬─ Dés ─┬─ Forge ─┬─ Âmes ─┬─ Artefacts ─┐       │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                     │
│  │  SÛR    │   │AMBITIEUX│   │DANGER ⚠ │                     │
│  │ Relance │   │ Dé Glace│   │Prodigal.│                     │
│  │  6 ¤    │   │  60 ¤   │   │  80 ¤   │                     │
│  │ [détail]│   │ 🔒 rang 2│   │ [détail]│                     │
│  └─────────┘   └─────────┘   └─────────┘                     │
│  Ta réserve : 5 cartes en main · 2 artefacts · 2 dés forgés  │
│  [ ← Retour aux paris ]                [ Lancer la course → ]│
└──────────────────────────────────────────────────────────────┘
```

Recommandations détaillées :

- **Classement primaire par catégorie d'objet** (cartes / dés / forge / personnalités / artefacts) en onglets, car les catégories répondent à des questions différentes (« que jouer pendant la course » vs « comment changer mon lancer pour tout le run »). Classement secondaire **à l'intérieur** d'une catégorie par la triade sûr/ambitieux/dangereux.
- **La carte-objet est standardisée**, quel que soit le type : nom, icône de catégorie, effet en ≤ 2 lignes, prix, étiquette d'impact (Faible/Moyen/Fort/Extrême — déjà dans les données), et le cas échéant ⚠ contrepartie ou 🔒 rang requis. Une seule anatomie de carte = un seul apprentissage.
- **Le moment de jeu des cartes actions (AC, AL, AA, EC, TA, FC) doit être traduit en langage joueur** avec une icône d'horloge de phase : « avant la course », « après le lancer », « entre deux coups »… C'est l'information la plus importante après l'effet, car acheter une carte qu'on ne saura pas quand jouer est la frustration type. Recommander une **frise miniature du tour** sur la carte avec le moment surligné.
- **Affichage permanent du reste-à-payer du cercle** dans l'en-tête (jauge des trois usages, §1.2). Chaque achat met à jour la jauge avec une animation courte : le joueur voit sa marge fondre. C'est la boutique « choix douloureux » voulue par le design — l'interface doit rendre la douleur *visible* mais jamais *cachée*.
- **États d'achat sans ambiguïté** : achetable (prix en blanc), trop cher (prix en rouge, carte légèrement désaturée mais lisible — on doit pouvoir lire ce qu'on ne peut pas s'offrir, c'est de la motivation), verrouillé par rang (cadenas + nom du grade, jamais un simple grisé anonyme).
- **Confirmation d'achat proportionnelle au prix** : achat ≤ 20 en un clic (les cartes communes s'achètent à la volée) ; objets Fort/Extrême ou ⚠ avec un second clic de confirmation sur la carte elle-même (le bouton devient « Confirmer 160 ¤ » pendant 3 s) — pas de modale.
- **La réserve du joueur visible en pied de panneau** : main de cartes (x/5), artefacts, dés équipés. L'achat d'un dé qui *remplace* doit montrer **lequel il remplace** (mini-slot de lancer : 2 Distance + 3 Âme, avec le slot ciblé en surbrillance et un comparatif de faces avant/après). C'est le seul achat destructif de la boutique : lui réserver le seul écran de comparaison bloquant.
- **L'aller-retour paris ↔ boutique** (panneau haut / panneau bas) : garder les deux boutons d'accès mutuels toujours au même endroit, et afficher un rappel de l'autre panneau (« 2 paris posés · 30 ¤ misées » sur le bouton paris). L'utilisateur fait des allers-retours pour arbitrer : réduire le coût de navigation à un clic constant.

### 3.3 Priorisation de l'information

| Niveau | Contenu |
|---|---|
| 1 — Décision | Les 3 objets de la vitrine : nom, effet court, **prix**, étiquette danger |
| 2 — Contexte | Solde + reste-à-payer du cercle, onglets de catégories, réserve actuelle (main, artefacts, dés) |
| 3 — À la demande | Texte d'effet complet, synergies (« se combine avec… »), rang requis des objets futurs |

### 3.4 Pièges à éviter

- **Ne pas montrer 60 cartes** : la vitrine est un tirage, pas un catalogue. Si un onglet est vide ce cercle-ci, l'afficher avec « rien en rayon aujourd'hui » plutôt que de le masquer (stabilité de la navigation).
- Le vocabulaire mécanique (« percuter », « échanger », « zone de fin », « combinaison ») est défini dans le README : **l'utiliser partout à l'identique**, et le rendre cliquable vers un glossaire en jeu. Un même concept, un même mot, une même icône.
- Ne pas cacher la boutique derrière la fin des paris : le proto ouvre la boutique **après au moins un pari initial** — dans ce cas, l'expliciter par un état vide du panneau boutique (« Pose d'abord un pari, le stagiaire n'ouvre pas la caisse aux indécis ») plutôt qu'un bouton inerte.

---

## 4. Écran « Phase de course »

C'est l'écran le plus dense et le plus critique : il mêle observation (plateau), décision (association et ordre des combinaisons), et suivi (paris, tour adverse). La règle absolue : **le plateau est roi**, tout le reste est périphérique.

### 4.1 Actions de l'utilisateur, par sous-phase

Le tour de course est une séquence rythmée. L'interface doit rendre la sous-phase courante évidente, car les cartes actions dépendent du moment (AL, AA, EC, TA) :

| Sous-phase | Action du joueur | Élément d'interface actif |
|---|---|---|
| **1. Avant le lancer** (AL) | jouer des cartes de préparation, poser un pari en course | main de cartes, panneau paris |
| **2. Lancer** | déclencher le lancer (bouton unique) | bouton « Lancer les dés » |
| **3. Association** (AA) | associer chaque dé Âme à un dé Distance, **choisir l'ordre** | zone de dés / file de combinaisons |
| **4. Résolution** (EC) | regarder ; éventuellement 1 carte entre deux combinaisons | plateau + fenêtre de pause courte |
| **5. Tour adverse** (TA) | regarder la paire révélée ; éventuellement carte TA | zone adverse en haut |
| **6. Fin de tour** | constater les positions, retour en 1 | plateau |

Recommandation : un **indicateur de phase discret mais permanent** (le fil d'ariane du tour, distinct du fil d'ariane macro Pari/Boutique/Course/Gains déjà prévu sur la table). Par exemple le pourtour de la zone de dés qui change d'état, ou une petite frise `préparer → lancer → ordonner → résoudre → adversaire`. Les cartes de la main s'allument/s'éteignent selon cette frise (déjà prévu : « jouée hors moment, elle est grisée » — le lien visuel entre la frise et la main rend la règle auto-explicative).

### 4.2 L'association des dés : le cœur ergonomique du jeu

C'est LA mécanique signature (« Décider avec les dés ») et le moment de plus forte charge cognitive. Structure recommandée :

- **Une file de combinaisons ordonnée, physique, manipulable** : le joueur glisse un dé Âme sur un dé Distance pour former une combinaison ; les combinaisons formées s'empilent dans une file horizontale numérotée ①②③ qui se lit de gauche à droite = ordre de résolution. Réordonner = glisser une combinaison dans la file. Le geste porte le sens : associer et ordonner sont le même mouvement.
- **Prévisualisation systématique au survol** : survoler une combinaison (ou une position dans la file) projette sur le plateau un **fantôme** de l'âme à sa case d'arrivée, avec l'icône de conséquence : saut par-dessus (percute), échange (recul), case spéciale déclenchée. Le système est déterministe après le lancer (principe GDD) : l'interface peut et doit donc montrer l'exact résultat du prochain déplacement. En revanche, **ne prévisualiser que la combinaison suivante**, pas toute la chaîne : la projection complète tuerait la lecture du plateau et l'intérêt du séquencement (et deviendrait fausse dès qu'une case à effet s'en mêle).
- **Cumul sur une même âme** : quand deux dés désignent la même âme, la file fusionne visuellement les deux dés en une seule carte de combinaison « Didon +4 (3+1) ». La règle du cumul devient visible au lieu d'être sue.
- **Bouton « Résoudre » unique** qui lance la file, avec résolution pas-à-pas : chaque combinaison s'anime, puis une **micro-pause** (fenêtre EC) où la main de cartes s'allume si une carte est jouable ; un appui n'importe où poursuit. La vitesse des animations est déjà une option (x0.5 à x4) — la pause EC doit rester un temps d'arrêt explicite même à x4, sinon la fenêtre de jeu disparaît de fait.

### 4.3 Lisibilité du plateau

- **Identité d'âme = triple codage** : couleur + silhouette/portrait + icône de personnalité. Sur des couloirs multiples (jusqu'à 6 au cercle 9) avec 10 âmes, la couleur seule ne suffira jamais.
- **La colonne prime sur le couloir** (règle du jeu : la position est la colonne). Marquer les colonnes visuellement (numérotation discrète tous les 5, ou graduations sur le bord de la piste), et lors des départages, surligner brièvement la colonne entière pour montrer « même colonne, le plus bas devant ».
- **Cases bloquées et rétrécissements** : texture univoque (éboulis, chaînes) + hachures — visibles avant même le premier déplacement, car ils sont matière à stratégie de pari.
- **Zone de fin (seuil 60 %)** : rupture de teinte du sol de piste + liseré vertical, avec libellé au premier passage (« plus de paris au-delà »). Après le seuil, les tickets de pari des âmes concernées passent en état « verrouillé » dans le panneau.
- **Ligne d'arrivée et cases post-arrivée** : représenter les cases après l'arrivée comme un vrai prolongement de piste (elles classent !), légèrement désaturées, plutôt qu'un hors-champ.
- **Événements de résolution** : chaque collision produit une lecture instantanée — flèche courbe de saut par-dessus, double flèche d'échange, étoile d'impact + libellé flottant court (« Percute → saute devant »). Les libellés flottants utilisent le vocabulaire canon (§3.4).
- **Rappel des paris sur le plateau** : chaque âme pariée porte un jeton de pari discret à sa base (l'icône du type). Le panneau de paris repliés en bordure affiche l'état vivant : pari « en bonne voie » / « compromis » selon la position actuelle — avec la prudence d'étiquette (« provisoire ») puisque le classement n'est définitif qu'après résolution complète.

### 4.4 Le tour adverse

Le tour adverse est révélé puis résolu après une pause (nécessaire aux cartes TA). Recommandations :

- La zone adverse (en haut, déjà prévue) reste **minimale hors de son tour** : un emplacement de paire de dés vide.
- À son tour : la paire adverse se révèle avec une animation distincte (couleur froide, pour l'opposer au chaud du joueur), un temps de lecture (~1,5 s ou appui pour passer), fenêtre TA où la main s'allume, puis résolution avec les mêmes codes visuels que le joueur. **Aucune information adverse n'est cachée** : c'est un lancer public, le jeu est une lecture de probabilités, pas de bluff.

### 4.5 Fin de course et gains

La modale de classement (prévue dans `interface.md`) doit raconter **deux histoires dans l'ordre** : d'abord le classement (podium par colonne atteinte, avec le départage visible), puis les paris un par un — ticket par ticket, gagné/perdu, avec le compte qui s'incrémente. C'est le paiement émotionnel de tout l'écran : le rythme (révélation séquentielle, ~0,5 s par ticket, cliquable pour accélérer) importe plus que la densité. Le solde final s'affiche **avec le reste-à-payer du cercle** en regard — la vraie question du joueur après chaque course.

### 4.6 Priorisation de l'information

| Niveau | Contenu |
|---|---|
| 1 — Décision | Dés lancés, file de combinaisons ordonnée, prévisualisation du déplacement, bouton Résoudre |
| 2 — Contexte | Plateau (positions, colonnes, cases spéciales, seuil), paris actifs avec état, main de cartes jouables, indicateur de sous-phase |
| 3 — À la demande | HUD cercle/course, pièces + jauge, artefacts (popup existante), fiche détaillée d'une âme, glossaire |

### 4.7 Pièges à éviter

- **Ne pas superposer la fenêtre de pari en course au plateau au mauvais moment** : la fenêtre de pari en course s'ouvre à l'initiative du joueur (bouton/panneau bas), jamais automatiquement entre deux combinaisons.
- **Ne pas laisser un état muet** : si le joueur ne peut plus rien faire qu'ordonner (phase AA), le bouton « Résoudre » pulse doucement après ~5 s d'inactivité. Jamais de blocage sans indication de l'action attendue.
- **Le journal a été retiré** (choix `interface.md`) : le remplacer par la lisibilité des animations est le bon pari, mais garder un **récapitulatif du dernier tour accessible** (appui long sur le plateau ou petite icône « ↺ dernier tour ») pour les cas de doute (« pourquoi Didon a reculé ? »). Un roguelike de décision doit toujours permettre de reconstituer la cause d'un état.

---

## 5. Recommandations transversales

1. **Un vocabulaire, une icône, partout.** Percuter, échanger, zone de fin, combinaison, charge : le lexique du README devient un système d'icônes réutilisé sur les cartes, les tooltips, les libellés flottants et le glossaire.
2. **Le rang du stagiaire est le fil de progression de l'interface.** Paris, objets, personnalités se débloquent par grade : afficher le grade courant dans le HUD (« Coach : Assistant », déjà prévu) et faire de chaque déblocage un moment d'interface (nouvel onglet qui s'illumine à la première visite après promotion).
3. **Trois usages de l'argent, une seule jauge** (§1.2), identique sur les trois écrans, toujours au même endroit.
4. **Divulgation progressive.** Cercle 1 : 5 types de paris, 1 couloir, pas de personnalités. L'interface complète n'existe qu'au cercle 9. Concevoir chaque panneau pour sa version minimale d'abord, et vérifier que chaque ajout (couloir, âme, type de pari, moment de carte) s'insère sans réagencement.
5. **Déterminisme = prévisualisation.** Partout où le résultat d'une action est certain (déplacement, collision, gain d'un pari si le classement se figeait là), l'interface peut le montrer avant le geste. Réserver l'incertitude aux dés — c'est le contrat du jeu.
6. **Accessibilité** : triple codage couleur/forme/texte ; textes fonctionnels ≥ 24 px éq. 1080p sur plaque unie ; option de réduction des effets (brume/particules) distincte de la vitesse d'animation ; navigation complète possible au clavier/manette (cibles séquentielles : types de pari → âmes → mise → valider).
7. **Le feedback est le tutoriel.** Pas d'écran de règles : la première collision montre son libellé, le premier franchissement du seuil montre le sien, la première carte grisée montre son moment de jeu au survol. Chaque règle du GDD doit avoir son moment d'auto-explication à la première occurrence.

---

## 6. Synthèse par écran (une ligne chacun)

- **Paris** : un guichet à tickets sous le plateau — trois familles de risque, gain potentiel calculé en direct, âmes sélectionnées sur le plateau, paris verrouillés visibles.
- **Boutique** : une vitrine à trois tentations par catégorie — carte-objet standardisée, jauge des trois usages toujours visible, comparaison bloquante réservée au remplacement de dé.
- **Course** : le plateau est roi — file de combinaisons ordonnée et manipulable, prévisualisation du prochain déplacement, sous-phases explicites qui allument la main de cartes, gains révélés ticket par ticket.

---

## 7. Interactions détaillées (complément)

### 7.1 Navigation Pari ↔ Boutique

Le modèle : **deux poignées persistantes, un seul panneau ouvert à la fois, le plateau jamais masqué.**

- La poignée Paris vit en bas de l'écran, la poignée Boutique en haut — toujours au même endroit, dans tous les états. Le panneau ouvert se replie vers sa poignée pendant que l'autre se déploie : **une seule animation (~250 ms), un seul clic**, symétrique et réversible (glissement vertical, molette, ou gâchettes L/R à la manette).
- La poignée repliée **résume son contenu** : « Paris · 2 posés · 30 ¤ » d'un côté, « Boutique · 3 objets » de l'autre. L'arbitrage miser/acheter se fait ainsi sans naviguer — le coût d'un aller-retour est nul.
- Le **ticket de pari en cours est conservé en brouillon** pendant la bascule : consulter la boutique ne fait jamais perdre une saisie.
- Avant le premier pari initial (règle du proto : la boutique ouvre après au moins un pari), la poignée Boutique existe mais ouvre un **état vide expliqué** (« Pose d'abord un pari… »), pas un bouton inerte.
- Au lancement de la course, la poignée Boutique disparaît ; la poignée Paris reste active pour les paris en course, jusqu'au seuil de 60 %.

### 7.2 Sélection des combinaisons (association des dés)

Quatre temps : **lancer → associer → ordonner → résoudre.**

1. **Lancer** : un bouton unique. Les dés atterrissent dans un « bac » : 2 dés Distance (carrés), 3 dés Âme (ronds). Survoler un dé Âme allume l'âme correspondante sur le plateau.
2. **Associer** : glisser un dé Âme sur un dé Distance crée une **carte de combinaison** qui rejoint la file. Alternative sans glisser, pour tactile et manette : clic sur le dé Âme puis clic sur le dé Distance. Dissocier = clic sur la carte, les dés reviennent au bac. Le dé Âme inutilisé reste visible au bac, grisé.
3. **Ordonner** : la file numérotée se lit de gauche à droite = ordre de résolution ; réordonner = glisser une carte dans la file (manette : sélection + gauche/droite). Deux dés désignant la même âme fusionnent en une seule carte « +4 (3+1) » — la règle du cumul devient visible. Le survol d'une carte projette le fantôme de l'âme sur sa case d'arrivée avec la conséquence (percute, échange, case spéciale).
4. **Résoudre** : bouton actif seulement quand les deux dés Distance sont associés (sinon grisé, avec la raison en libellé). C'est le **seul point de non-retour** du tour : tout est réversible avant (dissocier, réordonner, jouer une carte AA). La résolution est pas-à-pas, avec micro-pause EC entre deux combinaisons ; après ~5 s d'inactivité en phase d'association, Résoudre pulse doucement.

Principe : associer et ordonner sont **le même geste** (manipuler des cartes de combinaison) — le geste porte la règle « l'ordre de résolution est une décision ».

### 7.3 Modale de résultats et gains

Deux histoires, dans cet ordre : d'abord le **classement** (avec le départage montré : « même colonne, le plus bas devant » sur les lignes concernées), puis les **paris révélés un par un** — ticket par ticket (~0,5 s, clic pour accélérer), condition + mise + résultat net, mêmes codes vert/rouge que pendant la course, total qui s'incrémente. Le solde final s'affiche **en regard du prix du cercle** (« encore 63 ¤ à trouver en 2 courses ») : c'est la même jauge des trois usages. « Voir la table » referme la modale sans rien perdre, l'onglet « Gains » du fil d'ariane la rouvre, « Continuer » enchaîne. Pas de statistiques parasites dans cette modale.
