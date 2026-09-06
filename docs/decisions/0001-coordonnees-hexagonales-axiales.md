# ADR-0001 : coordonnées axiales pour le plateau hexagonal

- **Date** : 2026-09-06
- **Statut** : accepté

## Contexte

Le plateau de jeu sera composé de tuiles hexagonales (`docs/GDD.md` §3). Les
règles précises ne sont pas figées, mais la représentation des positions sur
le plateau est un prérequis technique indépendant des règles elles-mêmes, et
coûteux à changer une fois du contenu (tuiles, sauvegardes) créé autour.

## Décision

On stocke chaque tuile avec des coordonnées **axiales** `(q, r)`, et on
fournit une conversion vers des coordonnées **cubiques** `(x, y, z)` avec
`x + y + z = 0` pour les calculs (distance, voisinage, portée). Référence :
*Hexagonal Grids*, Red Blob Games.

## Alternatives envisagées

- **Coordonnées offset** (décalage ligne/colonne) — plus intuitives à
  afficher dans un éditeur, mais les opérations vectorielles (addition,
  distance) sont plus complexes à écrire et à tester correctement.
- **Cubiques comme stockage principal** — redondant (3 entiers liés par une
  contrainte) pour un gain nul en stockage/sérialisation.

## Conséquences

- `Core/Hex/HexCoord` est un struct `(int Q, int R)` avec `ToCube()`,
  `Neighbors()`, `DistanceTo()`.
- Le lexique (`docs/LEXIQUE.md`) documente `HexCoord`.
- L'orientation visuelle (pointy-top / flat-top) reste ouverte et sera
  tranchée séparément, sans impact sur ce choix de coordonnées.
