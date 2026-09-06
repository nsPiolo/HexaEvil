# Architecture technique proposée

## 1. Principe directeur : séparer la logique de jeu du moteur

Les règles du jeu de société ne sont pas encore figées et vont beaucoup
bouger dans les premières itérations. Pour pouvoir itérer vite (y compris en
tests automatisés, sans lancer Unity, et sans dépendre du rendu 3D) :

```
UnityProject/
  Assets/
    _Project/
      Scripts/
        Core/            <- Logique de jeu en C# "pur" (aucune dépendance UnityEngine)
          Hex/            HexCoord, conversions axial/cube, voisinage, distance
          Rules/          Board, Encounter, GameCommand, résolution des tuiles
          AI/             Comportement des démons (choix de commandes)
        Presentation/     <- Tout ce qui dépend d'UnityEngine
          Camera/         TableOrbitCamera
          Board/          BoardView, HexTileView (MonoBehaviour <-> Core.Board)
          VFX/            Feedback visuel des effets de tuiles
        Data/             <- ScriptableObjects (données, pas de logique)
          Tiles/          TileDefinition, TileEffectDefinition
          Demons/         DemonDefinition
          Circles/        CircleDefinition, EncounterDefinition
        Bootstrap/        Point d'entrée de scène, câblage Core <-> Presentation
      Scenes/
      Prefabs/
      Art/                Assets importés (modèles, textures, matériaux)
        Characters/
        Environment/
        Tiles/
      Audio/
    Tests/
      EditMode/           Tests unitaires sur Core (NUnit, sans dépendance scène)
      PlayMode/           Tests d'intégration (scène, prefabs)
```

Pourquoi cette séparation prime sur toute autre considération ici :

- **Le Core ne référence jamais `UnityEngine`.** Les règles du jeu de plateau
  (placement de tuiles, résolution des effets, tour de jeu, IA des démons)
  s'écrivent et se testent comme du C# ordinaire, exécutable par `dotnet
  test` sans ouvrir l'éditeur Unity. C'est la partie qui va changer le plus
  souvent pendant que les règles se stabilisent : elle doit être la moins
  coûteuse à itérer et la plus facile à faire réviser par une IA (petits
  fichiers, pas de setup de scène à décrire).
- **La Presentation ne contient pas de règles.** Un `HexTileView` (MonoBehaviour)
  affiche l'état d'une tuile issue du Core, mais ne décide jamais si un
  placement est valide.
- **Les Data (ScriptableObjects) décrivent, elles ne décident pas.** Une
  `TileDefinition` liste des valeurs (coût, type d'effet, visuel associé),
  la logique d'application de l'effet vit dans `Core/Rules`.

## 2. Représentation du plateau hexagonal

Référence : *Hexagonal Grids*, Amit Patel, Red Blob Games
(https://www.redblobgames.com/grids/hexagons/).

- **Stockage** : coordonnées **axiales** `(q, r)` — deux entiers par tuile,
  simple à sérialiser dans un ScriptableObject ou une sauvegarde.
- **Calculs** (distance, voisinage, portée, ligne de vue) : conversion à la
  volée en coordonnées **cubiques** `(x, y, z)` avec `x + y + z = 0`, qui
  permettent d'utiliser des opérations vectorielles standard (addition,
  distance de Manhattan cubique / 2).
- Orientation retenue à trancher avec le premier prototype visuel : *pointy-top*
  ou *flat-top* (impact sur l'orbite caméra et la lisibilité du plateau vu de
  profil). À documenter dans un ADR une fois choisi.

`HexCoord` (Core/Hex) est donc un struct `readonly` immuable
`{ int Q; int R; }` avec des méthodes `Neighbors()`, `DistanceTo(HexCoord)`,
`ToCube()` — sans aucune dépendance à Unity, testable unitairement.

## 3. Boucle de Rencontre et pattern Command

Référence : *Game Programming Patterns*, chapitre *Command*
(https://gameprogrammingpatterns.com/command.html).

Chaque action jouable pendant une Rencontre (poser une tuile, activer un
effet, passer son tour) est encapsulée en `GameCommand` (`Execute`, et
`Undo` quand c'est pertinent). Bénéfices directs pour ce projet :

- **Undo / confirmation de coup** : utile en jeu de société où l'on veut
  souvent laisser le joueur reconsidérer un placement avant de valider son
  tour.
- **IA des démons** : un démon choisit une `GameCommand` parmi les coups
  légaux plutôt que de manipuler l'état directement — ça permet de tester
  l'IA en lui faisant évaluer des commandes sans passer par l'affichage.
- **Replay / debug** : un historique de `GameCommand` exécutées permet de
  rejouer une Rencontre pour la déboguer, ou de l'enregistrer pour analyse.

## 4. Données de jeu : ScriptableObjects

Unity 6 : les définitions de tuiles, démons et Cercles vivent en
`ScriptableObject` (`Data/`), édités depuis l'inspecteur, référencés par les
`Core` via des identifiants ou des interfaces légères plutôt que par
référence directe à `UnityEngine.Object` quand c'est possible — pour garder
`Core` testable sans dépendance Unity (un `TileDefinition` peut être
« projeté » vers un DTO pur C# consommé par `Core`).

## 5. Contrôle de version pour Unity

- **Asset Serialization Mode : Force Text** et **Version Control Mode :
  Visible Meta Files** (`Edit > Project Settings > Editor`) — indispensable
  pour que scènes/prefabs/`.meta` restent lisibles en diff et mergeables.
- **Merge driver `UnityYAMLMerge`** configuré en local (voir
  `CONTRIBUTING.md` §6) pour les conflits sur `.unity`/`.prefab`.
- **Git LFS** pour tous les binaires (art, modèles 3D, audio) — voir
  `.gitattributes`. Ne jamais committer un asset brut de plusieurs Mo hors LFS.
- Convention : une scène de travail par Rencontre-type pendant le
  prototypage (`Scenes/Prototype_Encounter.unity`), pour limiter les
  conflits de fusion sur une scène unique partagée par plusieurs
  contributeurs (humains ou IA en parallèle).

## 6. Intégration continue (proposée, pas encore activée)

`game-ci/unity-builder` (GitHub Actions) pour builder/tester le projet à
chaque push — voir `.github/workflows/unity-ci.yml` (désactivé tant que
`UnityProject/` n'existe pas encore, car il ferait échouer la CI pour rien).
Prérequis : secrets `UNITY_LICENSE`/`UNITY_EMAIL`/`UNITY_PASSWORD` (ou
licence Personal via un serial) dans les secrets du dépôt GitHub.

## 7. Pipeline assets (résumé, détail dans `docs/PIPELINE_ART.md`)

```
Gemini (concept art 2D) ─┐
                          ├─> Tripo3D (mesh 3D brut) ─> Blender 5.2 (retopo, UV, rig, LOD) ─> export .glb/.fbx ─> UnityProject/Assets/_Project/Art/
Idée / brief écrit ──────┘
```

## 8. Décisions déjà actées

Voir `docs/decisions/`. En particulier :
- `0001-coordonnees-hexagonales-axiales.md`
- `0002-pattern-command-pour-les-actions-de-jeu.md`
- `0003-separation-core-presentation-data.md`
