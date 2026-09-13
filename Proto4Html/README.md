# Proto 4 — « Damned Race Bet », étape 1 : la course

Prototype jouable de la course décrite dans
[`../docs/proto4/GDD.md`](../docs/proto4/GDD.md) (§2) et de ses paris (§3),
**sans** boutique, cartes, artefacts ni archétypes. Le contenu de boutique prévu
est listé dans [`../docs/proto4/boutique-README.md`](../docs/proto4/boutique-README.md).

React + TypeScript, hors Unity. Aucune dépendance au-delà de React.

```bash
npm install
npm run dev        # http://localhost:5183
npm test           # règles de course (noyau pur)
npm run build
```

## Ce qui est implémenté

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
- Artefacts (barre provisoire en attendant la boutique) : **Œil du parieur**,
  qui ouvre une fois par cercle la fenêtre de pari après le lancer, et **Sablier
  de Charon**, qui repousse le seuil à 70 % dès la course suivante. Une notion
  minimale de cercle (3 courses, en config) sert à remettre les charges.
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
config/race.json           paramètres, lisibles et modifiables
src/core/config            schéma + validation
src/core/rules/race.ts     règles pures : plateau, lancer, combinaisons, collisions, classement
src/core/rules/bets.ts     les dix paris : validité, évaluation, règlement, décote
src/core/rules/artefacts.ts artefacts implémentés
src/core/rules/rng.ts      aléatoire déterministe (graine affichée à l'écran)
src/core/__tests__         tests des règles
src/presentation           React : useRace (machine à états animée), ArtefactBar, Board, DicePanel, BetPanel, Log, Ranking
```
