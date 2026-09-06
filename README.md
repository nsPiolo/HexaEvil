# Enfers — jeu de plateau hexagonal en 3D (nom de code à définir)

Le joueur est mort et arrive aux Enfers. Pour s'en sortir, il doit traverser les
cercles infernaux en affrontant un ou plusieurs démons dans des duels façon
**jeu de société sur table** (plateau à tuiles hexagonales, caméra orbitale
façon *Little Big Workshop*).

> Statut : les règles du jeu de société ne sont **pas encore figées**. C'est
> l'objet de l'itération en cours — voir `docs/GDD.md` et `docs/ROADMAP.md`.

## Stack technique

| Domaine                        | Outil                                            |
| ------------------------------ | ------------------------------------------------- |
| Illustration / concept art     | Gemini                                            |
| Modélisation 3D                | Tripo3D → retouche/rig dans Blender 5.2           |
| Moteur de jeu                  | Unity 6 (6000.x LTS)                              |
| Code                           | C#, assisté par Claude (Claude Code / "mamouth")  |
| Éditeur                        | VS Code                                           |
| Versioning                     | Git + GitHub, Git LFS pour les binaires           |

## Pourquoi ce dépôt a besoin de règles dès le premier jour

Le code, l'art et la 3D sont produits en grande partie par des IA différentes,
potentiellement dans des sessions sans mémoire de la précédente. Sans
garde-fous, ce mode de production dérive vite : le même concept ("cercle des
Enfers") devient tour à tour `Level`, `Circle`, `Ring`, `Stage` selon la
session, et les décisions d'architecture se prennent puis s'oublient. Ce
dépôt met donc en place, dès la structure de base :

1. Un **lexique unique** (`docs/LEXIQUE.md`) : le pont entre le vocabulaire du
   concepteur (français, jeu de société) et celui du code (anglais, C#/Unity).
2. Des **hooks Git** (`.githooks/`) qui vérifient que ce lexique reste à jour
   dès qu'un nouveau type gameplay apparaît dans le code.
3. Des **ADR** (`docs/decisions/`) qui tracent le *pourquoi* de chaque
   décision d'architecture — la mémoire longue du projet.
4. Un **GDD vivant** (`docs/GDD.md`) qui documente les règles au fur et à
   mesure qu'elles se stabilisent, au lieu d'un document figé écrit d'avance.

## Structure du dépôt

```
docs/                 Documentation (GDD, architecture, lexique, ADR, pipeline art)
UnityProject/         Projet Unity (créé à l'étape suivante de l'itération)
Blender/              Fichiers sources .blend (organisés par cercle / entité)
Art/                  Concept art (Gemini) et exports bruts Tripo3D avant intégration
tools/hooks/          Scripts Node utilisés par les hooks Git
.githooks/            Hooks Git versionnés (pre-commit, commit-msg)
.github/workflows/    CI (GitHub Actions, GameCI pour Unity — désactivée par défaut)
```

## Démarrage

```powershell
git clone <repo>
cd <repo>
git config core.hooksPath .githooks
```

Voir `CONTRIBUTING.md` pour le détail du workflow (branches, commits,
lexique, ADR, hooks).

## Documentation

- `docs/GDD.md` — Game Design Document (règles du jeu de société, vivant)
- `docs/ARCHITECTURE.md` — architecture technique proposée (Unity + logique pure)
- `docs/LEXIQUE.md` — glossaire concept ↔ code
- `docs/PIPELINE_ART.md` — pipeline Gemini → Tripo3D → Blender → Unity
- `docs/decisions/` — Architecture Decision Records
- `docs/STEAM_AI_DISCLOSURE.md` — contraintes Steam liées à l'usage massif d'IA
- `docs/ROADMAP.md` — suivi des itérations
