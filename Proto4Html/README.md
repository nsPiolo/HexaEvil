# Proto 4 — « Damned Race Bet », étape 1 : la course

Prototype jouable de la course décrite dans
[`../docs/proto4/GDD.md`](../docs/proto4/GDD.md) (§2), **sans** paris, boutique,
cartes, artefacts ni archétypes. Le but de cette étape est de regarder ce que
donnent des lancers de dés successifs sur le plateau avant d'ajouter le reste.

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
- Chaque geste est animé : roulement des dés, déplacement du jeton, bulle « +3 »,
  signal de collision, journal détaillé. Vitesse ×0,5 à ×4, mode Auto pour
  enchaîner des courses.

## Choix d'interprétation à valider

- **Une case par colonne** pour l'instant : pas de couloirs. Les couloirs
  multiples et les rétrécissements du GDD viendront ensuite.
- La ligne de départ et la dernière case après l'arrivée se partagent sans collision.
- Les paires de l'adversaire ne se cumulent pas entre elles (chaque paire est une
  résolution).

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
src/core/rules/rng.ts      aléatoire déterministe (graine affichée à l'écran)
src/core/__tests__         tests des règles
src/presentation           React : useRace (machine à états animée), Board, DicePanel, Log, Ranking
```
