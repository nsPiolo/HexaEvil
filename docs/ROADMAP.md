# Roadmap / suivi des itérations

Ce projet avance pas à pas. Chaque itération a un objectif court, vérifiable,
qui fait avancer soit les règles (GDD), soit l'architecture, soit la
production d'assets — rarement plusieurs à la fois.

## Itération 0 — Fondations du dépôt (en cours)

- [x] Structure de dossiers (docs, hooks, squelette Unity/Blender/Art).
- [x] Lexique initial (`docs/LEXIQUE.md`) avec les premiers concepts du pitch.
- [x] Hooks Git (lexique à jour, format des commits).
- [x] ADR fondateurs (coordonnées hex, pattern Command, séparation Core/Presentation/Data).
- [ ] Créer le projet Unity 6 vide dans `UnityProject/` et vérifier que
      `.gitignore`/`.gitattributes` fonctionnent comme prévu (premier commit
      propre, sans `Library/`).
- [ ] Initialiser Git LFS sur le dépôt distant (GitHub) et vérifier un
      premier asset binaire de test.

## Itération 1 — Prototype de plateau hexagonal (à venir)

- [ ] Implémenter `Core/Hex/HexCoord` + tests unitaires (voisinage, distance).
- [ ] Générer un plateau minimal (ex. rayon 2, 19 tuiles) affiché en 3D très
      simple (cylindres/placeholders), sans effet de tuile encore.
- [ ] Premier jet de `TableOrbitCamera`.
- [ ] Décider et documenter (ADR) l'orientation pointy-top vs flat-top.

## Itération 2 — Premier prototype de règles jouable (à venir)

- [ ] Choisir et valider dans `docs/GDD.md` : condition de victoire d'une
      Rencontre, qui pose les tuiles, effet d'une tuile sur ses voisines.
- [ ] `GameCommand` minimal (`PlaceTileCommand`) + IA démon la plus simple
      possible (coup légal aléatoire) pour valider la boucle complète.

## Itération 3 — Premier pipeline art de bout en bout (à venir)

- [ ] Un aller-retour complet Gemini → Tripo3D → Blender → Unity sur un seul
      asset (ex. une tuile hexagonale) pour valider `docs/PIPELINE_ART.md`.

## Backlog non ordonné (idées à ne pas perdre)

- Boucle meta entre Rencontres (progression, persistance).
- CI GitHub Actions (GameCI) activée une fois `UnityProject/` stable.
- Déclaration Steamworks AI Content (voir `docs/STEAM_AI_DISCLOSURE.md`).

---

_Mettre à jour ce fichier à chaque itération plutôt qu'en fin de projet : il
doit refléter l'état réel, pas un plan figé d'avance._
