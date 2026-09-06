# ProtoHtml — prototype de gameplay (React + TypeScript)

Implémentation jouable de la Rencontre « l'Escalier », pour **régler les
recettes hors Unity** : itérer en quelques secondes (hot reload, tests en
200 ms) au lieu de quelques minutes.

Ce n'est pas le jeu : pas de 3D, pas de caméra orbitale, pas d'art. Une vue de
dessus en SVG qui répond à une seule question — *cette économie est-elle
intéressante à régler et à jouer ?*

**Source de vérité : [`../docs/proto/GDD.md`](../docs/proto/GDD.md).** Chaque
règle y porte un identifiant (`D16`, `P6`, `R5`…) que le code cite en
commentaire. Si le code et le GDD divergent, c'est le GDD qui a raison.

## Démarrage

```bash
cd ProtoHtml
npm install
npm run dev      # http://localhost:5180
npm test         # 51 tests : mécaniques + trace de référence + parties complètes
npm run build    # typecheck + build de prod
```

## Régler le gameplay

**Tout** le gameplay vit dans [`config/gameplay.json`](config/gameplay.json) —
recettes, durées, budgets d'Âmes et de Sbires, cible de l'Escalier, capacité de
portage, disposition du Plateau, catalogue posable. Aucune de ces valeurs n'est
écrite en dur dans le code (`G3`) : une valeur en dur dans une règle est un bug.

Le panneau « Configuration » de l'interface permet de coller un JSON modifié et
de relancer la Rencontre **sans recompiler** (`G4`). Une configuration
incohérente est refusée avec un message explicite plutôt que de produire une
simulation silencieusement fausse.

## Comment on joue

1. **Phase de pose** : choisir un type de Tuile au catalogue, régler ses Sorties
   (boutons `E`, `NE`, …), cliquer un Espace libre. Une Tuile par Manche (`C1`),
   sans coût (`T6`). Les Sorties de n'importe quelle Tuile du joueur restent
   reconfigurables pendant n'importe quelle phase de pose (`T5`).
2. **Dérouler** : `1 Tick` pour le pas-à-pas (`U5`), ou `Manche` pour les 5 Ticks
   d'un coup.
3. **Observer** : cliquer une Tuile ouvre son détail — Recettes, entités
   présentes avec l'avancement de leur production ou la raison de leur
   inactivité, réserves d'entrée et de sortie, Sorties et position du tourniquet.

L'indicateur central est **Progression / Âme** : les Âmes sont la ressource
épuisable de la Rencontre (100 pour toute la partie), et chaque livraison en
coûte une.

## Structure — miroir de l'ADR-0003 (Core / Presentation / Data)

```
config/gameplay.json     Tout le gameplay réglable (G1-G4)
src/
  core/                  Logique pure. Aucun import de React. Testable seule.
    config/load.ts        Parsing + validation de la configuration, refus explicites
    hex/
      hexCoord.ts         HexCoord axial (q,r), 6 Accès, voisinage, distance     [ADR-0001]
      layout.ts           axial -> pixel + marqueurs de Sortie (affichage seul)
    rules/
      types.ts            Vocabulaire : Side, TileState, EntityState, GameState  [LEXIQUE]
      board.ts            Espaces, Accès, destination d'une Sortie (D1-D5, B8-B10)
      storage.ts          Réserves d'entrée / de sortie (R3, R4)
      recipes.ts          Choix de Recette, tri de l'Escalier (R1, R5)
      tick.ts             Les 6 phases d'un Tick (C2, C3) : apparition, production, déplacement
      encounter.ts        Frontière publique pure : createGame, placeTile, runTick, runRound
      commands.ts         GameCommand + replay                                   [ADR-0002]
    __tests__/            Mécaniques, trace de référence (§14), parties complètes
  presentation/          React uniquement. Ne décide jamais d'une règle.
    useGame.ts            Historique d'états (annulation), sélection, rechargement de config
    BoardView.tsx         Plateau SVG, Sorties, compteurs d'Âmes et de Sbires    [U1]
    TileInspector.tsx     Détail d'une Tuile                                     [U2, U3]
    MetricsPanel.tsx      Métriques du proto                                     [K1-K5]
    Controls.tsx          Catalogue, pas-à-pas, éditeur de configuration         [U5, G4]
  App.tsx  main.tsx  index.css
```

Règles de dépendance (les mêmes que côté Unity) :

- `core/` n'importe **jamais** `react` — c'est ce qui rend les règles testables
  en 200 ms et transposables en C# sans réécriture de logique ;
- `presentation/` affiche l'état du Core et lui envoie des commandes, sans
  jamais décider si un coup est valide : tous les refus viennent du Core
  (`placementRefusal`, `exitChangeRefusal`) ;
- le JSON de configuration décrit, il ne décide pas.

## Tests

```
config.test.ts        Validation de la configuration, refus de terrain croisé (B8)
spawn.test.ts         Apparition, réserve, budget de partie (C4, C5, C5b, X1)
production.test.ts    P1-P8, dont le remboursement sur destruction (P8)
movement.test.ts      D4-D18 : Sorties face à face, tourniquet, dépôt/ramassage, retour en arrière
stairway.test.ts      Tri des Recettes, plancher à 0, consommation du Sbire (R5, R6, R8, X3)
outcome.test.ts       Victoire, défaite, terminaison garantie (E1, E2, E3, E7)
trace.test.ts         Test d'acceptation : la trace de référence du GDD §14
integration.test.ts   Parties complètes avec la configuration livrée
hexCoord.test.ts      Coordonnées axiales / cubiques
render.test.tsx       Rendu de fumée de l'interface
```

## Ce que le proto mesure aujourd'hui

Parties complètes, configuration livrée, chaîne posée en ligne droite du Puits à
l'Escalier :

| Voie jouée | Livraisons | Brut | Ponction du démon | Final |
| --- | --- | --- | --- | --- |
| `Basalte brut` | 96 | 96 | −96 | **0 / 200** |
| `Basalte dégrossi` | 96 | 288 | −96 | **192 / 200** |

La voie brute est *exactement* annulée par le démon (+1 par Âme à 1 Âme/Tick
contre −1/Tick). La voie dégrossie échoue à 8 points de la cible. Le réglage se
fera sur ces nombres (`E9` du GDD) — d'où l'éditeur de configuration.

## Ce que le proto ne cherche pas à valider

Caméra orbitale, mise en scène 3D, lisibilité des tuiles vues de profil,
performances, IA du démon (`X5` : sa disposition est décrite en configuration).
Ces questions se testent dans Unity, pas ici.
