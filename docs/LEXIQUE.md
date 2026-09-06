# Lexique — concept de jeu ↔ terme de code

But : un seul mot par concept, utilisé partout (conversation, GDD, code,
assets). Ce fichier est le pont entre le langage du concepteur (colonne
« Concept (FR) ») et celui du code (colonne « Terme code (EN) »).

**Règle de maintenance :** toute nouvelle classe/struct/enum/interface C#
sous `UnityProject/Assets/_Project/Scripts/` doit apparaître ci-dessous. Le
hook `pre-commit` (`tools/hooks/check-lexicon.mjs`) le vérifie automatiquement.
Trie les entrées par ordre alphabétique du terme code au sein de chaque
section.

## Statut des entrées

- ✅ Validé — utilisé tel quel dans le code et le GDD.
- 🧪 Provisoire — encore en discussion, peut changer de nom.

## Structure du jeu / monde

| Concept (FR)                  | Terme code (EN)   | Statut | Notes |
| ------------------------------ | ------------------ | ------ | ----- |
| Cercle de l'Enfer (niveau)      | `Circle`           | 🧪     | Un "monde" du jeu ; contient une ou plusieurs Rencontres. |
| Rencontre / combat contre un ou plusieurs démons | `Encounter` | 🧪 | Une partie du jeu de société, sur un plateau donné. |
| Plateau de jeu                 | `Board`            | 🧪     | Ensemble de tuiles hexagonales pour une Rencontre. |
| Tuile hexagonale                | `HexTile`          | 🧪     | Unité de base posée sur le Plateau. |
| Coordonnée de tuile (axiale)     | `HexCoord`         | 🧪     | Coordonnées axiales (q, r) — voir `docs/ARCHITECTURE.md`. |
| Démon (adversaire)              | `Demon`            | 🧪     | Adversaire géré par l'IA du jeu. |
| Âme (le joueur, mort)           | `SoulActor` / `Player` | 🧪 | À trancher : le joueur est-il un "acteur" parmi d'autres ? |

## Mécanique de jeu de société

| Concept (FR)                  | Terme code (EN)   | Statut | Notes |
| ------------------------------ | ------------------ | ------ | ----- |
| Action jouable (poser une tuile, etc.) | `GameCommand` | 🧪 | Voir ADR sur le pattern Command (`docs/decisions/0002-*.md`). |
| Tour de jeu                     | `Turn`             | 🧪     | |
| Effet d'une tuile sur ses voisines | `TileEffect`   | 🧪     | |

## Caméra / présentation 3D

| Concept (FR)                  | Terme code (EN)   | Statut | Notes |
| ------------------------------ | ------------------ | ------ | ----- |
| Caméra orbitale autour de la table | `TableOrbitCamera` | 🧪 | Inspiration Little Big Workshop. |

---

_Dernière relecture : à faire à chaque itération majeure de règles (voir
`docs/ROADMAP.md`)._
