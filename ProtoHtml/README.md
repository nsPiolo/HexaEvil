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
npm test         # 162 tests : mécaniques, trace de référence, parties complètes, affichage
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
simulation silencieusement fausse — y compris au démarrage, où l'erreur
s'affiche dans un écran corrigeable au lieu de laisser une page blanche.

Les tests ne s'asservissent pas à ta disposition : un seul test vérifie que le
fichier livré est **valide**, tous les autres utilisent la disposition de
référence du GDD (`B7b`). Régler le terrain ne fait donc pas rougir la suite ;
changer une recette, si — et c'est le signal attendu.

⚠️ Les six directions sont celles d'un hexagone *pointy-top* (`B7`) : `E`, `NE`,
`NW`, `W`, `SW`, `SE`. Il n'y a **pas** de face `N` ni `S`.

## Comment on joue

1. **Une action par Manche** (`A1`) : poser une Tuile de sa main, piocher,
   déplacer une Tuile posée, ou passer. Une Tuile est piochée **automatiquement**
   à chaque tour tant que la main n'est pas pleine (`A7`) — sans coûter l'action.
   Le tirage est aléatoire mais **germé** (`A8`) : la germe est affichée, et la
   recopier dans `seed` rejoue exactement la même partie.
   Réorganiser les Sorties reste gratuit et illimité (`A6`).
2. **Poser, en deux clics** (`U9`) : choisir une Tuile de la main, puis
   cliquer un Espace **posable** — libre, hors relief, et voisin d'une chaîne
   reliée au Puits des âmes (`B11`, `B12`) — pour y poser la Tuile — elle arrive **sans aucune
   Sortie**, sélectionnée, et ses six voisins deviennent cliquables. Cliquer l'un
   d'eux oriente sa Sortie vers lui. Une Tuile par Manche (`C1`), sans coût
   (`T6`).
   Pour réorienter une Tuile déjà posée : la sélectionner, cliquer **« Éditer »**
   dans son détail (`U12`), puis cliquer le voisin visé (`T5`). Sur une Tuile à
   Sortie unique, une autre direction fait **basculer** la Sortie ; sur un
   Aiguillage, les clics s'accumulent jusqu'à son maximum puis remplacent la plus
   ancienne. Cliquer une Sortie déjà désignée la **conserve** et referme le mode
   (`U13`). Le mode reste ouvert jusqu'au compte de Sorties du type
   (`exitsToDesignate` : 1 par défaut, **2 pour l'Aiguillage**, `U10`), pour
   désigner les deux branches d'affilée.
   Sélectionner une Tuile ne l'ouvre jamais : la sélection sert à observer.
   Certaines Tuiles ont leurs Sorties **figées par la configuration**
   (`fixedExits`, `T8`) : le Puits des âmes est orienté par le terrain, pas par
   le joueur. Le panneau affiche alors la raison au lieu du bouton.
3. **Dérouler** : `1 Tick` pour le pas-à-pas (`U5`), ou `Manche` pour les Ticks
   de la Manche courante — 1 au départ, puis +1 toutes les 2 Manches jusqu'à 5
   (`C1b`) —
   — joués **en séquence et animés** (`U6`), les âmes glissant d'un hexagone au
   suivant avec leur charge visible. La vitesse est réglable (`lent` à
   `instantané`), et `Fin` déroule la partie entière d'un coup pour la mesurer.
   Chaque mouvement de ressource s'affiche en étiquette temporaire sur la tuile :
   `+x` quand une ressource entre (production, dépôt), `−n` quand elle sort
   (consommation d'une recette, ramassage), et `+7` / `−1` pour la progression de
   l'Escalier (`U7`).
4. **Observer** : l'Escalier porte sa progression (`42/200`) directement sur sa
   tuile (`U11`). Cliquer une Tuile ouvre son détail — Recettes, entités
   présentes avec l'avancement de leur production ou la raison de leur
   inactivité, réserves d'entrée et de sortie, Sorties et position du tourniquet.

La Rencontre est une **horloge** : le joueur a 100 Ticks (`maxTicks`, `E2`) pour
achever l'Escalier, et c'est sa **seule** contrainte — les Âmes comme les Sbires
apparaissent sans limite (`C5`, `X1`). Les Âmes encore en transit à l'échéance ne
livrent jamais. L'indicateur central reste **Progression / Âme** : chaque
livraison coûte une Âme (`D6`), et comme il en naît exactement une par Tick, cet
indicateur vaut aussi « progression par Tick ».

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
                          + TickEvent : ce que le moteur énonce pour l'animation [U8]
      board.ts            Espaces, Accès, destination d'une Sortie (D1-D5, B8-B10)
      storage.ts          Réserves d'entrée / de sortie (R3, R4)
      recipes.ts          Choix de Recette, tri de l'Escalier (R1, R5)
      tick.ts             Les 6 phases d'un Tick (C2, C3) : apparition, production, déplacement
      encounter.ts        Frontière publique pure : createGame, placeTile, runTick, runRound
      commands.ts         GameCommand + replay                                   [ADR-0002]
    __tests__/            Mécaniques, trace de référence (§14), parties complètes
  presentation/          React uniquement. Ne décide jamais d'une règle.
    Game.tsx              L'écran de jeu (monté seulement sur une config valide)
    useGame.ts            Historique d'états (annulation), lecture séquencée, clics du Plateau
    useAnimation.ts       Interpolation des déplacements et étiquettes +x / −n   [U6, U7]
    BoardView.tsx         Plateau SVG, Sorties, compteurs, entités animées       [U1, U6, U7]
    TileInspector.tsx     Détail d'une Tuile                                     [U2, U3]
    MetricsPanel.tsx      Métriques du proto                                     [K1-K5]
    Controls.tsx          Catalogue et Recettes, pas-à-pas, éditeur de config    [U5, U15, G4]
    RecipeList.tsx        Recettes d'un type de Bâtiment (catalogue + détail)     [U15]
  App.tsx               Démarrage : valide la config, ou affiche l'erreur au lieu de planter
  main.tsx  index.css
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
actions.test.ts       Main, pioche, une action par Manche, déplacement (A1-A6)
spawn.test.ts         Apparition, réserve, budget de partie (C4, C5, C5b, X1)
placement.test.ts     Relief, croissance depuis le Puits, cadence des Manches (B11, B12, C1b)
production.test.ts    P1-P8, dont le remboursement sur destruction (P8)
movement.test.ts      D4-D18 : Sorties face à face, tourniquet et Sorties mortes, dépôt/ramassage, retour en arrière
stairway.test.ts      Tri des Recettes, plancher à 0, consommation du Sbire (R5, R6, R8, X3)
outcome.test.ts       Victoire, défaite, terminaison garantie (E1, E2, E3, E7)
events.test.ts        Le moteur énonce apparitions, déplacements, stocks, progression [U8]
trace.test.ts         Test d'acceptation : la trace de référence du GDD §14
integration.test.ts   Parties complètes avec la configuration livrée
hexCoord.test.ts      Coordonnées axiales / cubiques
animation.test.ts     Agrégation des étiquettes « +x » / « −n »             [U7]
exits.test.ts         Interprétation d'un clic, bascule des Sorties          [U9]
render.test.tsx       Rendu de fumée de l'interface, plateau animé à mi-course
```

## Ce que le proto mesure aujourd'hui

Parties complètes, configuration livrée, chaîne posée en ligne droite du Puits à
l'Escalier :

Mesuré sur 100 Ticks, avec le réglage courant du fichier de configuration :

| Voie jouée | Livraisons | Brut | Ponction du démon | Final |
| --- | --- | --- | --- | --- |
| `Basalte brut` | 97 | 97 | −97 | **0 / 200** |
| `Basalte dégrossi` | 95 | 285 | −95 | **190 / 200** |

La voie brute est *exactement* annulée par le démon (+1 par Âme à 1 Âme/Tick
contre −1/Tick) : elle ne décolle jamais de 0. La voie dégrossie s'arrête à 10
points de la cible. Ces nombres bougent à chaque réglage : les tests
d'intégration vérifient des **invariants** du moteur, pas ces valeurs, et ce
tableau est rafraîchi à la demande.

## Ce que le proto ne cherche pas à valider

Caméra orbitale, mise en scène 3D, lisibilité des tuiles vues de profil,
performances, IA du démon (`X5` : sa disposition est décrite en configuration).
Ces questions se testent dans Unity, pas ici.
