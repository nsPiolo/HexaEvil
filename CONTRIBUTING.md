# Contribuer / travailler sur ce projet

Ce projet est développé de façon itérative, en s'appuyant massivement sur des
outils IA (Gemini, Tripo3D, Claude). Les règles ci-dessous existent pour que
ce mode de production reste cohérent d'une session à l'autre — humaine ou IA.

## 1. Installation des hooks (une seule fois par clone)

```powershell
git config core.hooksPath .githooks
```

Les hooks sont de simples scripts appelés par Git (via Git Bash), qui
exécutent des scripts Node (`tools/hooks/*.mjs`). Aucune installation `npm`
n'est nécessaire : seul Node.js doit être présent sur la machine (`node
--version`).

Pour contourner un hook ponctuellement (à utiliser avec discernement) :

```powershell
git commit --no-verify
```

ou définir la variable d'environnement `SKIP_LEXICON_CHECK=1` pour la commande
courante uniquement.

## 2. Convention de commits

Les messages de commit suivent un format inspiré de *Conventional Commits*,
vérifié par le hook `commit-msg` :

```
<type>(<scope>): <description>
```

Types autorisés : `feat`, `fix`, `docs`, `design`, `art`, `lexique`, `refactor`,
`chore`, `test`, `build`, `ci`.

- `design` : décision de règles du jeu de société (GDD), sans forcément de code.
- `art` : ajout/mise à jour d'assets (concept art, modèles 3D, fichiers Blender).
- `lexique` : ajout/mise à jour d'entrées dans `docs/LEXIQUE.md`.

Exemples :

```
feat(combat): ajoute la résolution d'une tuile hexagonale de type Brasier
lexique: ajoute Circle, HexTile, Encounter au glossaire
design(gdd): fige la taille du plateau à 19 tuiles (rayon 2)
```

## 3. Le lexique (`docs/LEXIQUE.md`)

Chaque concept de jeu de société qui devient un type dans le code (classe,
struct, enum, interface C#, ou ScriptableObject) doit avoir une ligne dans
`docs/LEXIQUE.md` **avant ou en même temps** que le commit qui l'introduit.

Le hook `pre-commit` détecte automatiquement les nouveaux
`class`/`struct`/`enum`/`interface` ajoutés dans
`UnityProject/Assets/_Project/Scripts/**/*.cs` et bloque le commit si leur nom
n'apparaît pas dans `docs/LEXIQUE.md`. Il suffit d'ajouter la ligne
correspondante dans le lexique et de la stager (`git add docs/LEXIQUE.md`).

## 4. Les décisions d'architecture (ADR)

Toute décision technique ou de design qui engage la suite du projet
(structure de données, choix d'algorithme, choix d'outil, convention) doit
faire l'objet d'un ADR dans `docs/decisions/`, à partir de
`docs/decisions/template.md`. Numérotation séquentielle (`0001-`, `0002-`, …).

But : quand une IA (ou vous, six mois plus tard) reprend le projet, elle lit
les ADR au lieu de redécouvrir — ou de recontredire — une décision déjà prise.

## 5. Branches

- `main` : toujours stable / buildable.
- `feature/<sujet-court>` : une itération de travail.
- Les fichiers binaires volumineux (art, `.blend`, exports Tripo3D, textures)
  passent par Git LFS (voir `.gitattributes`), jamais commités bruts.

## 6. Unity — réglages de contrôle de version (à faire une fois, par machine)

Dans Unity : `Edit > Project Settings > Editor` :
- **Version Control > Mode** : `Visible Meta Files`
- **Asset Serialization > Mode** : `Force Text`

Cela garantit que les `.meta`, scènes et prefabs restent diffables et
mergeables (voir `docs/ARCHITECTURE.md`).

Merge des scènes/prefabs en conflit : configurer `UnityYAMLMerge` comme
merge-driver (chemin dépendant de l'installation Unity locale) :

```powershell
git config --global merge.tool unityyamlmerge
git config --global mergetool.unityyamlmerge.trustExitCode false
git config --global mergetool.unityyamlmerge.cmd '"<CHEMIN_VERS>\Unity\Editor\Data\Tools\UnityYAMLMerge.exe" merge -p "$BASE" "$REMOTE" "$LOCAL" "$MERGED"'
```

## 7. Où documenter quoi

| Question | Réponse dans |
|---|---|
| Quelle est la règle du jeu ? | `docs/GDD.md` |
| Pourquoi cette architecture / cet algo ? | `docs/decisions/*.md` |
| Comment traduire ce concept en code ? | `docs/LEXIQUE.md` |
| Comment un asset passe de Gemini/Tripo3D à Unity ? | `docs/PIPELINE_ART.md` |
| Qu'est-ce qui est fait / prévu ? | `docs/ROADMAP.md` |
