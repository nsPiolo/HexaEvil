# Contribuer / travailler sur ce projet

Ce projet est développé de façon itérative, en s'appuyant massivement sur des
outils IA (Gemini, Tripo3D, Claude). Les règles ci-dessous existent pour que
ce mode de production reste cohérent d'une session à l'autre — humaine ou IA.


## Le lexique (`docs/LEXIQUE.md`)

Chaque concept de jeu de société qui devient un type dans le code (classe,
struct, enum, interface C#, ou ScriptableObject) doit avoir une ligne dans
`docs/LEXIQUE.md` **avant ou en même temps** que le commit qui l'introduit.

## Les décisions d'architecture (ADR)

Toute décision technique ou de design qui engage la suite du projet
(structure de données, choix d'algorithme, choix d'outil, convention) doit
faire l'objet d'un ADR dans `docs/decisions/`, à partir de
`docs/decisions/template.md`. Numérotation séquentielle (`0001-`, `0002-`, …).

But : quand une IA (ou vous, six mois plus tard) reprend le projet, elle lit
les ADR au lieu de redécouvrir — ou de recontredire — une décision déjà prise.

## Branches

- `main` : toujours stable / buildable.
- `feature/<sujet-court>` : une itération de travail.
- Les fichiers binaires volumineux (art, `.blend`, exports Tripo3D, textures)
  passent par Git LFS (voir `.gitattributes`), jamais commités bruts.

## Où documenter quoi

| Question | Réponse dans |
|---|---|
| Quelle est la règle du jeu ? | `docs/GDD.md` |
| Pourquoi cette architecture / cet algo ? | `docs/decisions/*.md` |
| Comment traduire ce concept en code ? | `docs/LEXIQUE.md` |
| Qu'est-ce qui est fait / prévu ? | `docs/ROADMAP.md` |
