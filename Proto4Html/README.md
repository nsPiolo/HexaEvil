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

- Écrans (interface.md) : logo animé 5 s (un clic abrège), menu principal
  (Continuer grisé sans run, Nouvelle évasion, Statistiques, Option), intro en
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
- Sauvegarde : l'état (argent, dés, artefacts, prochaine course) est écrit à la
  fin de chaque course et au changement de cercle ; « Continuer » reprend au début
  de la rencontre suivante. Quitter en pleine course rejoue cette rencontre.
- Écran de jeu : table vue du parieur, fil d'Ariane courbé Pari · Boutique ·
  Course · Gains (étape faite en gras, étape en cours avec halo), cercle et course
  en haut à gauche, pièces et nombre d'artefacts en haut à droite (clic = popup
  des artefacts actifs), emplacement de l'adversaire en haut de la table et du
  joueur en bas. Paris dans un panneau coulissant depuis le bas, boutique dans un
  panneau depuis le haut (accessible seulement en préparation, après un premier
  pari) ; on passe librement de l'un à l'autre. Plus de journal : une seule ligne
  sous le plateau rappelle le dernier événement.

- Plateau : une seule ligne de `columns` cases, ligne d'arrivée, cases après
  l'arrivée, zone des 60 % marquée en couleur (simple repère pour l'instant).
  Les âmes qui partagent une case (départ, dernière case) s'empilent visuellement.
- Lancer du joueur : 2 dés Distance (`-1, 1, 2, 3`) + 3 dés Âme. Le joueur associe
  chaque dé Distance à un dé Âme **dans l'ordre de son choix** ; cet ordre est
  l'ordre de résolution, et le dé Âme restant est ignoré. Deux distances sur la
  même âme → cumulées en un seul déplacement.
- Collisions (§2.6) : avancer sur une case occupée → saute devant (en cascade si
  la case suivante est occupée aussi) ; reculer sur une case occupée → échange de
  place ; pas de recul depuis la ligne de départ.
- Tour de l'adversaire : une ou plusieurs paires (dé Âme + dé Distance) résolues
  séparément après les combinaisons du joueur.
- Fin de course : dès qu'une âme a franchi l'arrivée, le tour se termine quand même
  (combinaisons restantes + adversaire), puis classement par position, ex æquo
  départagés par ordre de franchissement.
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
- Boutique (GDD §6.1), dans l'ordre du cycle macro révisé : **paris initiaux
  d'abord, boutique ensuite, course enfin**. Il faut au moins un pari pour ouvrir
  la boutique, pour que le joueur ne puisse pas tout dépenser sans enjeu. Vitrine
  de 4 objets tirés au sort par rareté, renouvelable contre 10 pièces, prix qui
  grandissent de 25 % par cercle. Catalogue et prix dans
  [`config/shop.json`](config/shop.json), effets dans le code indexés par id.
  - 8 artefacts (5 emplacements) : Œil du parieur, Sablier de Charon, Boussole des
    Limbes, Clepsydre fêlée, Fer à cheval rouillé, Bourse percée, Livre des
    comptes, Filet du pêcheur.
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

## Choix d'interprétation à valider

- **Une case par colonne** pour l'instant : pas de couloirs. Les couloirs
  multiples et les rétrécissements du GDD viendront ensuite.
- La ligne de départ et la dernière case après l'arrivée se partagent sans collision.
- Les paires de l'adversaire ne se cumulent pas entre elles (chaque paire est une
  résolution).
- Le seuil de pari est **global** : dès qu'une âme l'atteint, plus aucun pari sur
  la course. Les paris exacts (podium, classement complet) échouent en cas
  d'ex æquo sur les places concernées.

## Configuration

Tout ce qui est chiffré vit dans [`config/race.json`](config/race.json) : nombre
d'âmes et noms, longueur du plateau, faces des dés, nombre de dés, paires de
l'adversaire, durées d'animation. Une valeur invalide est signalée au chargement
avec le nom du champ fautif.

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
src/presentation/texts.ts  tous les textes (intro, boss, transitions des 9 cercles, fin), prêts à traduire
src/presentation/storage.ts localStorage : sauvegarde, statistiques, options
src/presentation           React : useRace (machine à états d'une rencontre), GameScreen, PlaySlots, BetPanel, ShopPanel, Inventory, Board, Ranking, Dialogue, Screens
```
