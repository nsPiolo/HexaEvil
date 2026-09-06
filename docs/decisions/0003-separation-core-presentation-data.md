# ADR-0003 : séparation Core / Presentation / Data

- **Date** : 2026-09-06
- **Statut** : accepté

## Contexte

Les règles du jeu vont beaucoup changer pendant les premières itérations
(voir `docs/GDD.md`), produites en partie via des assistants IA sans mémoire
d'une session à l'autre. Il faut limiter le risque que la logique de jeu et
le code de rendu/Unity s'entremêlent, ce qui rendrait chaque changement de
règle coûteux et difficile à faire réviser par une IA sur un petit contexte.

## Décision

Trois zones de code strictement séparées dans
`UnityProject/Assets/_Project/Scripts/` : `Core` (logique pure C#, sans
`UnityEngine`), `Presentation` (MonoBehaviour, caméra, affichage),
`Data` (ScriptableObjects, pas de logique). Détail dans
`docs/ARCHITECTURE.md` §1.

## Alternatives envisagées

- **Tout dans des MonoBehaviour** (approche Unity "par défaut") — plus rapide
  à démarrer, mais rend les règles de jeu impossibles à tester sans lancer
  l'éditeur, et couple fortement gameplay et rendu.
- **Architecture ECS (DOTS)** — pertinente pour de très grandes quantités
  d'entités simulées ; disproportionnée pour un jeu de plateau à quelques
  dizaines de tuiles/entités par Rencontre.

## Conséquences

- Toute règle de jeu s'écrit et se teste dans `Core` en premier lieu.
- Les tests unitaires (`Tests/EditMode`) ciblent `Core` sans dépendance de
  scène.
- Un changement de règle ne doit normalement pas nécessiter de toucher à
  `Presentation`.
