# Game Design Document — vivant

Ce document décrit les règles du jeu **au fur et à mesure qu'elles se
stabilisent**. Tant qu'une section est marquée 🧪, elle est un brouillon de
travail, pas une règle figée. Chaque évolution significative doit être
accompagnée d'une entrée dans `docs/ROADMAP.md` et, si elle a des
conséquences techniques, d'un ADR (`docs/decisions/`).

## 1. Pitch

On est mort, on arrive aux Enfers. Pour s'en sortir, il faut traverser les
cercles infernaux en affrontant un ou plusieurs démons. Chaque affrontement
se joue comme un jeu de société sur une table, face à un ou plusieurs
adversaires gérés par le jeu. Le joueur peut tourner autour de la table pour
observer le plateau sous tous les angles (inspiration *Little Big Workshop*
pour la caméra et la mise en scène).

## 2. Boucle de jeu (méta) — 🧪

- Progression à travers plusieurs **Cercles** (niveaux thématiques des Enfers).
- Chaque Cercle propose une ou plusieurs **Rencontres** (combats de plateau).
- Statut : le nombre de Cercles, la structure entre Rencontres (linéaire ?
  choix de chemin ?), et ce qui persiste entre deux Rencontres (ressources,
  cartes, dégâts ?) restent à définir.

## 3. Le jeu de société (cœur de gameplay) — 🧪

Piste de départ retenue pour explorer les mécaniques : un plateau composé de
**tuiles hexagonales**, posées par les joueurs (le personnage et le ou les
démons), avec des effets qui se propagent aux tuiles voisines.

Questions ouvertes à trancher dans les prochaines itérations :
- Combien de tuiles au plateau ? Plateau fixe ou qui grandit pendant la partie ?
- Qui pose les tuiles : uniquement le joueur, ou aussi les démons ?
- Une tuile posée a-t-elle un effet immédiat, différé, ou permanent sur ses
  voisines (buff/debuff, dégâts de zone, terrain) ?
- Condition de victoire d'une Rencontre : éliminer le/les démons ? Survivre N
  tours ? Atteindre une case ?
- Y a-t-il une notion de « main » de tuiles (pioche, défausse) comme dans un
  jeu de cartes, ou un pool commun ?
- Asymétrie joueur/démon : les démons suivent-ils les mêmes règles de pose
  que le joueur, ou une IA à budget/comportement dédié ?

**Décision provisoire de représentation technique** (voir
`docs/ARCHITECTURE.md` et l'ADR `0001`) : le plateau utilise des coordonnées
**axiales** `(q, r)` pour le stockage et peut se convertir en coordonnées
**cubiques** `(x, y, z)` pour les calculs de distance/voisinage/portée. Ce
choix est indépendant des règles finales et peut être posé dès maintenant.

## 4. Présentation / caméra — 🧪

- Vue de type « table de jeu de société », caméra orbitale contrôlée par le
  joueur (rotation autour de la table, zoom), sans mouvement libre façon FPS.
- Référence directe : *Little Big Workshop*.
- Statut : angle min/max, contraintes de zoom, mise en scène des tuiles
  posées (animations, feedback des effets) à définir avec les premiers
  prototypes de plateau.

## 5. Ce qui n'est délibérément pas encore décidé

- Nombre de démons simultanés par Rencontre.
- Système de progression du joueur entre les Rencontres (équipement, cartes,
  compétences).
- Fin de partie / boucle meta (permadeath ? checkpoints par Cercle ?).

## 6. Historique des décisions de règles

| Date | Décision | Portée |
|---|---|---|
| — | Pitch initial (Enfers, cercles, démons, plateau hexagonal) | Fondatrice |

_Ajoute une ligne à chaque fois qu'une règle passe de 🧪 à validée, avec un
lien vers l'ADR correspondant si pertinent._
