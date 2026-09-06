# ADR-0002 : pattern Command pour les actions de jeu

- **Date** : 2026-09-06
- **Statut** : accepté

## Contexte

Les Rencontres sont un jeu de société au tour par tour avec un ou plusieurs
adversaires gérés par le jeu (IA). Il faut pouvoir : proposer une
confirmation/annulation de coup au joueur, faire évaluer des coups par l'IA
sans passer par l'affichage, et déboguer/reproduire une partie.

## Décision

Toute action jouable (poser une tuile, activer un effet, passer un tour) est
encapsulée dans une `GameCommand` (`Execute`, `Undo` si applicable), plutôt
que d'être un appel de méthode direct sur l'état du jeu. Référence : *Game
Programming Patterns*, chapitre Command.

## Alternatives envisagées

- **Appels directs sur le `Board`/`Encounter`** — plus simple au départ,
  mais rend l'undo, le replay et l'évaluation de coups par l'IA beaucoup
  plus coûteux à ajouter après coup.
- **Event sourcing complet** — plus lourd que nécessaire pour un plateau de
  taille modeste ; le pattern Command couvre les besoins identifiés
  aujourd'hui sans cette complexité.

## Conséquences

- `Core/Rules/GameCommand` (et sous-types, ex. `PlaceTileCommand`) vivent
  dans `Core`, sans dépendance Unity.
- L'IA des démons (`Core/AI`) génère/évalue des `GameCommand` candidates.
- Le lexique documente `GameCommand`.
