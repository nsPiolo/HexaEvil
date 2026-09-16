# Proto 4 — « Sinner's Bet »

Prototype jouable de la course décrite dans
[`../docs/proto4/GDD.md`](../docs/proto4/GDD.md) (§2), de ses paris (§3), d'une
première boutique (§6 : artefacts, dés spéciaux, forge) et de la structure de run
en neuf cercles avec prix à payer (§4), habillée selon
[`../docs/proto4/interface.md`](../docs/proto4/interface.md). Pas encore de cartes
action, de personnalités ni de règles spéciales de boss. Le catalogue complet
prévu est listé dans [`../docs/proto4/boutique-README.md`](../docs/proto4/boutique-README.md).

React + TypeScript, hors Unity. Aucune dépendance au-delà de React.

```bash
npm install
npm run dev        # http://localhost:5183
npm test           # règles de course (noyau pur)
npm run build
```

## Ce qui est implémenté

- Écrans (interface.md) : écran de chargement 5 s avec le logo peint
  (`public/menu/splash.jpg`, un clic abrège), menu principal
  (Continuer grisé sans run, Nouvelle évasion, Statistiques, Option) habillé selon
  `docs/proto4/illus_menu.jpeg` avec six images de `public/menu/` (fond peint
  `bg.jpeg`, titre, trois variantes de dalle de pierre, dalle de lave ; les dalles
  sont des sprites à deux rangées, repos et survol), générées avec Gemini d'après
  `docs/proto4/prompts-menu.md`. Pas de cadre autour de l'écran. Les libellés
  restent du texte HTML sur les dalles ; intro en
  bulles avec le démon stagiaire (« Suite », espace, « Passer l'introduction »),
  statistiques et options en localStorage. Volume et Langue sont grisés (pas de
  musique, seul le français existe) ; la vitesse des animations (×0,5 à ×4) est
  prise en compte immédiatement.
- Run en 9 cercles × 3 courses (la 3e est la rencontre avec le boss, sans règle
  spéciale pour l'instant). Après la 2e course, le stagiaire annonce le boss et le
  prix. À la fin du cercle, si l'argent couvre le prix, il est débité et un
  dialogue annonce ce qui change (âmes en course, prix suivant) ; sinon fin de run.
  Après le 9e cercle payé : évasion. Prix et nombre d'âmes par cercle dans
  `config/race.json`, textes dans `src/presentation/texts.ts`.
- Hiérarchie du stagiaire (GDD §5.2, boutique-README) : le démon monte en grade
  quand le boss des cercles 1, 3, 5 et 7 est battu et le prix payé (Assistant,
  Tourmenteur, Contremaître, Sous-directeur), puis devient le boss du neuvième
  après le cercle 8. À chaque promotion, un dialogue propre (démon et joueur)
  s'insère dans la transition de cercle, juste avant l'annonce du cercle suivant,
  et le nom du démon change dans les bulles (« Démon assistant »…) comme dans le
  HUD (« Coach : Assistant »). Le grade se déduit du cercle, rien n'est sauvegardé
  en plus. Il conditionne les types de paris ouverts (ci-dessus). **Pas encore
  d'effet sur la boutique** : le déblocage par rang des objets viendra avec les
  personnalités. Grades et lignes dans `texts.ts`
  (`DEMON_RANKS`), assemblage dans `src/presentation/demon.ts`.
- Carte des neuf cercles entre deux courses : anneaux concentriques, le premier au
  centre, trois points par cercle reliés par une spirale (le troisième est le
  boss). Courses jouées en braise, prochaine course en or avec halo, à venir en
  gris. Cliquer sur la prochaine course la lance ; cliquer sur un anneau affiche
  le cercle : boss, pouvoir (décrit dans la config, **pas encore appliqué en
  course**), prix visible pour le cercle en cours et les cercles traversés
  seulement. Pas de carte avant la toute première course, l'intro suffit. Les
  points flottent dans leur tiers de tour (bruit déterministe) pour casser
  l'alignement.
- Sauvegarde : l'état (argent, dés, artefacts, prochaine course) est écrit à la
  fin de chaque course et au changement de cercle ; « Continuer » reprend au début
  de la rencontre suivante. Quitter en pleine course rejoue cette rencontre.
- Écran de jeu : table vue du parieur, fil d'Ariane courbé Pari · Boutique ·
  Course · Gains (étape faite en gras, étape en cours avec halo), cercle et course
  en haut à gauche, pièces et nombre d'artefacts en haut à droite (clic = popup
  des artefacts actifs), emplacement de l'adversaire en haut de la table et du
  joueur en bas. Paris dans un panneau coulissant depuis la droite (le départ de
  la piste reste visible pendant qu'on parie ; titre en
  petites capitales, sections I à IV : type par palier avec fourchette de cotes,
  âmes, mise, paris posés ; pied fixe avec l'état, « Poser le pari », « Boutique »
  et le lancement), boutique dans un panneau depuis la gauche (accessible
  seulement en préparation, après un premier pari) ; les deux peuvent rester
  ouverts ; le HUD du côté d'un panneau ouvert se décale pour rester visible. Le
  panneau de paris ne se rouvre jamais tout seul après le départ de la course. Plus de journal : une seule ligne sous le plateau rappelle le dernier
  événement. En fin de course, le classement et le bilan des paris s'affichent
  dans une **modale** au-dessus de la table (après une courte respiration pour
  voir le dernier déplacement) ; « Voir la table » la referme, l'onglet « Gains »
  à droite la rouvre, « Continuer » enchaîne.

- Plateau : `columns` colonnes × `lanes` couloirs (GDD §2.2 : 1 couloir au
  cercle 1, un de plus à chaque âme ajoutée, `lanes` et `blocked` par cercle dans
  `config/race.json`), ligne d'arrivée, cases après l'arrivée, zone des 60 %
  marquée en couleur. Le couloir 1 (prioritaire) est dessiné en bas, au plus près
  du joueur ; les cases bloquées sont hachurées (cercle 3 : colonnes 4, 5, 8, 9 sur
  le couloir du haut). Les âmes qui partagent une case (départ, dernière case)
  s'empilent visuellement.
- Lancer du joueur : 2 dés Distance (`-1, 1, 2, 3`) + 3 dés Âme. Le joueur associe
  chaque dé Distance à un dé Âme **dans l'ordre de son choix** ; cet ordre est
  l'ordre de résolution, et le dé Âme restant est ignoré. Deux distances sur la
  même âme → cumulées en un seul déplacement.
- Couloirs (§2.6) : une âme atterrit en priorité dans son couloir ; si sa case est
  bloquée ou occupée, dans la case vide la plus en bas de la colonne ; si la
  colonne est pleine, collision (dans son couloir, ou le plus bas si le sien est
  bloqué). Le journal signale les décalages (« se décale sur le couloir 1 »).
- Collisions (§2.6) : avancer sur une colonne pleine → saute devant, en
  rechoisissant sa case dans la colonne suivante (en cascade si elle est pleine
  aussi) ; reculer sur une colonne pleine → échange de place ; pas de recul depuis
  la ligne de départ.
- Tour de l'adversaire : une ou plusieurs paires (dé Âme + dé Distance) résolues
  séparément après les combinaisons du joueur.
- Fin de course : dès qu'une âme a franchi l'arrivée, le tour se termine quand même
  (combinaisons restantes + adversaire), puis classement par colonne, puis par
  couloir (le plus bas devant, §2.7), puis ordre de franchissement pour les âmes
  empilées sur la dernière case.
- Argent et paris (GDD §3) : capital de départ conservé de course en course
  (« Recommencer » le remet à zéro). Phase de paris initiaux avant la course, **au
  moins un pari obligatoire** pour lancer la course, puis paris en course
  **uniquement avant de lancer ses dés** (une fois lancés, il faut attendre le tour
  suivant), tant qu'il reste de l'argent et qu'**aucune** âme n'a atteint le seuil
  60 %. Un même pari (type + âmes) ne peut pas être posé deux fois. Les dix
  types de paris du GDD sont disponibles, avec leur multiplicateur en config ; la
  mise est débitée au moment du pari, un pari gagné rend mise × cote. La **cote est
  figée au moment du pari** et décroît avec l'avancement de la course (position de
  l'âme de tête vers le seuil 60 %), jusqu'à un plancher : un pari tardif rapporte
  moins qu'un pari initial. Exposant et plancher sont dans la config.
  Règlement sur le classement définitif uniquement, bilan affiché et journalisé.
  **Les types de paris s'ouvrent avec le grade du stagiaire** (`economy.betUnlockLevel`
  dans la config) : au départ les quatre paris simples et le duel ; Assistant
  ajoute « Deux âmes dans le top 3 » et « Top 3 dans le désordre » ; Tourmenteur
  « Vainqueur + dernier » ; Contremaître « Podium exact » ; Sous-directeur
  « Classement complet exact ». Sans cela, un ×80 gagné au premier cercle rendrait
  le reste de la partie inutile. Les types verrouillés restent visibles, grisés,
  avec le grade requis ; le stagiaire annonce chaque déblocage (cotes tirées de la
  config) dans son dialogue de promotion, et prévient dès l'intro qu'il ne prend
  que les paris simples.
- Avance de course : au début de chaque course, avant les paris initiaux, le stagiaire verse
  automatiquement `economy.raceAllowance` pièces (20) au joueur ; la ligne de journal le dit
  sous le plateau, et l'intro l'annonce. Le capital de départ (`startingMoney`) est de 80,
  si bien que la première course commence à 100. L'artefact **Tirelire du stagiaire** (commun, 45) augmente cette avance de
  son paramètre `bonus` (10) pour le reste du run. Règle pure dans `src/core/rules/allowance.ts`.
- Boutique (GDD §6.1), dans l'ordre du cycle macro révisé : **paris initiaux
  d'abord, boutique ensuite, course enfin**. Il faut au moins un pari pour ouvrir
  la boutique, pour que le joueur ne puisse pas tout dépenser sans enjeu. Vitrine
  de 4 objets tirés au sort par rareté, renouvelable contre 10 pièces, prix qui
  grandissent de 25 % par cercle. Catalogue et prix dans
  [`config/shop.json`](config/shop.json), effets dans le code indexés par id.
  - 8 artefacts (5 emplacements) : Œil du parieur, Sablier de Charon, Boussole des
    Limbes, Clepsydre fêlée, Fer à cheval rouillé, Bourse percée, Livre des
    comptes, Tirelire du stagiaire. Règles alignées sur `docs/proto4/artefacts.md` : la Clepsydre passe
    les négatifs en valeur absolue au tour 1, la Boussole fait avancer l'âme de
    chaque dé Âme inutilisé, le Livre rembourse un pari perdu tiré au sort. Le
    Filet du pêcheur a été retiré (pas d'ex æquo à départager).
  - 4 dés spéciaux qui remplacent un dé Distance : Limbes, Colère, Glace,
    Prodigalité (payant à l'usage).
  - 4 altérations de forge, une face à la fois : Limée, Dorée, Retournée (avec sa
    contrepartie sur l'adversaire), Sceau du parieur.
  L'inventaire (artefacts, dés face par face) reste visible pendant la course.
  Une notion minimale de cercle (3 courses, en config) sert aux charges « une fois
  par cercle » et à la croissance des prix.
- Chaque geste est animé : roulement des dés, déplacement du jeton, bulle « +3 »,
  signal de collision, journal détaillé. Vitesse ×0,5 à ×4, mode Auto pour
  enchaîner des courses.
- Passe d'ergonomie (`docs/proto4/specs/`, écrite en delta) :
  - **Disposition** (spec 08) : rangée haute réservée au HUD (cercle · fil d'Ariane · pièces
    et jauge), puis la table en trois zones pleine largeur : boutique en haut (en préparation,
    à la place de la zone adverse), plateau, paris en bas (à la place des dés). Les panneaux
    sont dans le flux, rien ne recouvre jamais le plateau ; les deux restent ouverts ensemble
    tant que le plateau garde ~45 px par couloir (`config.layout`), sinon l'un replie l'autre.
    Une carte de combinaison par âme (dés constitutifs en miniature), confirmation « Pari
    posé : … » et compteur en en-tête, zone adverse fine hors de son tour, ordre d'arrivée
    raconté seulement quand il diffère du rang.
  - **Jauge des trois usages** (`MoneyGauge`) : solde / prix du cercle, même
    composant dans le HUD, le panneau de paris, la boutique et la modale de fin de
    course ; avertissement « encore N ¤ à trouver (en n courses) » sous le prix,
    marge de jeu au-delà d'un séparateur sinon. Jamais bloquante.
  - **Paris** : gain potentiel et solde après mise affichés quand le ticket est
    prêt ; les âmes se choisissent aussi en cliquant les jetons ou la légende du
    plateau (survol croisé chip ↔ jeton) ; un pari se retire en préparation
    (« Retirer », remboursement intégral, `cancelBet` dans le noyau). Le motif
    « verrouillé » (cadenas + grade) est un composant `LockBadge`.
  - **Navigation** : poignées repliées résumées (« Paris (2) · 30 ¤ misés »,
    « Boutique · 4 objets »), boutique toujours cliquable en préparation avec un
    état vide narratif sans pari, bascule exclusive sous 1100 px, raccourcis
    clavier P et B.
  - **Boutique** : chaque objet porte `impact` et éventuellement `warning` dans
    `shop.json` ; bandeau SÛR / AMBITIEUX / DANGER ⚠ (contrepartie en rouge),
    étiquette d'impact, vitrine triée du plus sûr au plus dangereux ; achat ≥
    `confirmThreshold` ou marqué DANGER en deux clics (« Confirmer N ¤ ») ;
    remplacement de dé avec comparaison faces actuelles → nouvelles faces.
  - **Course** : file de combinaisons manipulable au glisser-déposer natif (dé Âme
    déposé sur un dé Distance, carte déposée dans la file) comme au clic (← → ×,
    clavier compris), carte de cumul « +4 (+3 +1) » quand deux dés visent la même âme,
    paris posés à l'état vivant pendant la course (« en bonne voie / compromis ·
    provisoire ») et marqués sur les jetons, tête de colonne « plus de pari » une fois
    le seuil franchi, récapitulatif « ↺ dernier tour », colonne surlignée au départage,
    prévisualisation du prochain déplacement par un jeton fantôme avec ses glyphes
    (`previewMove`, pur, testé contre le déplacement réel), frise de sous-phases,
    survol d'un dé Âme qui allume le jeton, « Résoudre » qui pulse après
    `idlePulseMs` d'inactivité.
  - **Fin de course** : tickets révélés un à un (`betRevealMs`, clic = tout
    révéler, pas de rejeu à la réouverture) avec compteur de net, départage énoncé
    entre deux âmes de la même colonne, jauge avec les courses restantes.

## Tests de bout en bout (Playwright)

`npm run test:e2e` (ou `test:e2e:ui`) joue les scénarios de `e2e/` dans Chromium :
un fichier par spec d'ergonomie (`docs/proto4/specs/01` à `06`), chaque test cite en
commentaire le critère d'acceptation qu'il vérifie (`NN/ACk`). Ils vérifient ce que le
joueur voit, lit et manipule — sélection par rôle et libellé, assertions textuelles,
aucun `waitForTimeout` — et non les règles de course (Vitest). `playwright.config.ts`
lance `npm run dev` sur le port 5183 (ou réutilise un serveur existant) et se sert du
Chromium déjà présent (`PLAYWRIGHT_BROWSERS_PATH`, cache Playwright, ou Chrome installé
via `channel`) : aucun téléchargement n'est exigé. Deux paramètres d'URL n'existent que
pour ces tests (`src/presentation/urlParams.ts`) : `?seed=NNN` fixe la graine (course N
→ seed + N, tout devient déterministe) et `?e2e=1` démarre un run directement sur la
table à vitesse ×4 (avec `&money=`, `&race=` et `&speed=` pour le solde, la course de départ et la vitesse).
Les graines de référence sont figées et documentées dans `e2e/seeds.ts`.

## Menu développeur

Un bouton « dev » presque invisible en bas à droite (ou **Ctrl+Maj+D**, Cmd+Maj+D
sur Mac) ouvre une popup pour fixer le solde de pièces et sauter à une course
d'un cercle au choix (course 1, 2 ou boss). L'inventaire est conservé, la course
en cours est abandonnée, la sauvegarde est écrasée ; on repart de la carte (ou
directement en course pour la toute première). Code dans
`src/presentation/DevMenu.tsx`, branché dans `App.tsx`.

## Choix d'interprétation à valider

- Couloirs : au départ, les âmes se répartissent sur les couloirs en commençant par
  le bas (âme 1 couloir 1, âme 2 couloir 2, …). Le couloir d'une âme est celui de
  la case où elle se trouve ; il change quand elle se décale. Les cases bloquées ne
  concernent que les colonnes de parcours (jamais le départ ni l'après-arrivée).
- La ligne de départ et la dernière case après l'arrivée se partagent sans collision ;
  ce sont les seuls endroits où deux âmes peuvent encore être à égalité (départagées
  par l'ordre de franchissement sur la dernière case).
- Les paires de l'adversaire ne se cumulent pas entre elles (chaque paire est une
  résolution).
- Le seuil de pari est **global** : dès qu'une âme l'atteint, plus aucun pari sur
  la course. Les paris exacts (podium, classement complet) échouent en cas
  d'ex æquo sur les places concernées.

## Configuration

Tout ce qui est chiffré vit dans [`config/race.json`](config/race.json) : nombre
d'âmes et noms, longueur du plateau, faces des dés, nombre de dés, paires de
l'adversaire, durées d'animation (dont `betRevealMs`, `idlePulseMs`, `gaugeMs`,
toutes divisées par la vitesse choisie). Côté boutique,
[`config/shop.json`](config/shop.json) porte `confirmThreshold` et
`confirmResetMs`, et chaque objet ses champs `impact` et `warning`. Une valeur
invalide est signalée au chargement avec le nom du champ fautif.

## Arborescence

```
config/race.json           paramètres de course, paris, animation
config/shop.json           catalogue de la boutique : noms, textes, prix, raretés
src/core/config            schéma + validation
src/core/rules/race.ts     règles pures : plateau, lancer, combinaisons, collisions, classement
src/core/rules/bets.ts     les dix paris : validité, évaluation, règlement, décote
src/core/rules/dice.ts     dés Distance du joueur, face par face
src/core/shop/             catalogue (types, chargement de shop.json), vitrine, achats, forge
src/core/rules/rng.ts      aléatoire déterministe (graine affichée à l'écran)
src/core/__tests__         tests des règles
src/presentation/App.tsx   routeur d'écrans et orchestration du run (cercles, prix, sauvegarde, stats)
src/presentation/texts.ts  tous les textes (intro, boss, transitions des 9 cercles, grades du démon, fin), prêts à traduire
src/presentation/demon.ts  grade du démon selon le cercle, assemblage des dialogues de transition et de promotion
src/presentation/DevMenu.tsx menu développeur : solde et saut à un cercle
src/presentation/storage.ts localStorage : sauvegarde, statistiques, options
src/presentation/HelpPanel.tsx page d'aide (bouton « Aide » du HUD) : index des sections à gauche, règles à droite ; contenu dans texts.ts (HELP)
src/presentation           React : useRace (machine à états d'une rencontre), MapScreen, GameScreen, PlaySlots, BetPanel, ShopPanel, Inventory, Board, Ranking, Dialogue, Screens
```
