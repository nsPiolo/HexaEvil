# GDD du prototype 2 — Duel « Soustraction »

Ce document est la **source de vérité du prototype 2** (`Proto2Html/`). Il met au
propre la note de conception [`gameplay.md`](gameplay.md), qui reste le brouillon
d'origine.

Il décrit une mécanique **entièrement distincte** de celle du prototype 1
([`../proto/GDD.md`](../proto/GDD.md)) : aucune règle, aucun terme et aucun
fichier de configuration n'est partagé entre les deux. Le seul héritage est
technique (coordonnées axiales, séparation Core/Presentation/Data — ADR-0001 et
ADR-0003).

## Objet : la question à laquelle ce proto doit répondre

Le brouillon décrit un duel de pose de Tuiles où **le choix de l'Espace fait deux
choses à la fois** : il place une Tuile là où elle attaque, et il **impose à
l'adversaire la couleur qu'il devra jouer au tour suivant** (la couleur de
l'Espace occupé). Tout le reste — forces, boucliers, effets — est le barème de
cette décision.

Trois questions, dans cet ordre :

1. **La contrainte de couleur produit-elle une décision intéressante ?** C'est-à-dire :
   arrive-t-il souvent que la meilleure case pour attaquer soit aussi celle qui
   donne à l'adversaire sa meilleure couleur ? Si les deux objectifs ne se
   contredisent jamais, la mécanique est plate.
2. **Le combat par soustraction produit-il des positions lisibles et non
   dégénérées ?** ✅ **Oui, après correction.** Le premier réglage (soin de 2
   appliqué au Roi) donnait 0 % de Rois tués et une majorité de matchs nuls. En
   excluant le Roi du soin et en ramenant le soin à 1, on obtient **50 % de Rois
   tués, 3 % de nuls, 29 tours de médiane**, avec les trois voies de fin vivantes.
   Voir §14.
3. **Le ravitaillement fait-il exister le plateau ?** Le soin ne s'applique qu'aux
   Tuiles reliées à leur Roi par une chaîne alliée (`F14`) : une position avancée
   ne se régénère pas, et couper un maillon assèche toute une branche. C'est ce qui
   donne un sens à la géographie, que `A4` (on pose où l'on veut) lui refusait.
   🕐 **Encore à mesurer** : `M6` est instrumenté, mais le taux de ravitaillement
   reste à ~100 % des deux côtés dans les parties observées — l'IA ne coupe pas
   encore les chaînes. À reprendre en relevant `enemySupplyCut` (`I5b`).

## Convention de lecture

| Marque | Sens |
| --- | --- |
| ✅ | **Validé** : écrit tel quel dans le brouillon, ou tranché en revue (voir §17). |
| 🧪 | **Proposition** comblant un trou du brouillon — à valider ou corriger en revue. |
| ❓ | **Trou bloquant** — plus aucune règle n'en porte : les 17 questions de conception sont tranchées ou reportées (§15). |

Les règles sont numérotées pour que la revue et le code puissent les citer
(`// règle F3`) : `B` plateau et Espaces, `C` couleurs et contrainte de couleur,
`T` Tuiles et catalogue, `D` Decks et main, `A` tour de jeu, `F` forces,
boucliers, soin et résolution, `E` effets, `W` fin de partie, `I` IA de
l'adversaire, `U` interface, `M` métriques, `G` paramétrage.

**Les questions ouvertes sont rassemblées au §15.** Trois revues les ont toutes
tranchées : il ne reste que `Q13`, volontairement reportée à la mécanique de
retour en main. **Le corps de règles est complet et implémentable en l'état.**

## 1. Vocabulaire (concept ↔ code)

À reporter dans [`../LEXIQUE.md`](../LEXIQUE.md) **après validation** de ce
document.

### Structure

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Plateau | `Board` | Ensemble des Espaces du duel. |
| Espace hexagonal | `HexSpace` | Emplacement. Porte une **Couleur** et au plus une Tuile. |
| Coordonnée axiale `(q, r)` | `HexCoord` | Réutilisé de l'existant (ADR-0001). |
| Espace bloqué (relief) | `blocked` | Espace dessiné mais où rien ne se pose. |
| Camp | `Side` | `player` \| `demon` \| `neutral` (`T6`). |
| Relation d'alliance | `isAllyOf(from, other)` | **Asymétrique** (`T7`) : à lire toujours depuis une Tuile donnée. |

### Tuiles

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Type de Tuile (donnée) | `TileDefinition` | Data pure, sans logique (ADR-0003). Identifié par son ID (`R01`…). |
| Tuile posée (instance) | `PlacedTile` | Une `TileDefinition` + un camp + son état accumulé (`F1`). |
| Roi | `King` | Le type `N00`. Sa destruction termine la partie. |
| Tour | `Tower` | Le type `V00`. Deux par camp, autour du Roi (`B5`). |
| Tuile neutre | `neutral` | Pré-posée, hors combat, porteuse d'une aura (`T6`). |
| Force | `force` | Sert **à la fois** de points de vie et de puissance d'attaque (`F2`). |
| Bouclier | `shields` | Réduit les dégâts reçus **en résolution seulement** (`F9`). |
| Tuile ravitaillée | `supplied` | Reliée à son Roi par une chaîne alliée (`F14`) — donc soignée (`F13`). |

### Couleurs

| Concept (FR) | Terme code (EN) | Préfixe d'ID |
| --- | --- | --- |
| Rouge — Attaque | `red` | `R` |
| Bleue — Magie | `blue` | `B` |
| Vert — Défense | `green` | `V` |
| Noir — Nécromancie | `black` | `N` |
| Jaune — Lumière | `yellow` | `J` |

> ⚠️ Les préfixes d'ID sont l'initiale du mot **français** (`V` = vert = `green`,
> `N` = noir = `black`, `J` = jaune = `yellow`). La table ci-dessus est la seule
> autorité sur cette correspondance : elle vit dans la configuration (`G3`), pas
> en dur dans le code, et une confusion `B`(bleue)/`black` est le bug le plus
> probable de ce proto.

Cette table liste les 5 Couleurs **possibles**. Celles qui sont **en jeu** dans
une partie donnée sont un sous-ensemble déclaré en configuration (`C1`).

### Déroulement

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Tour de jeu | `Turn` | Entretien, une pose, effets et résolution (`A3`). |
| Manche | `Round` | Un tour de chaque camp. Unité de tous les calculs du §14. |
| Couleur imposée | `imposedColor` | Couleur que le camp actif **doit** jouer ce tour. |
| Couleur active | `activeColors` | Les Couleurs en jeu dans cette partie (`C1`). |
| Deck de couleur | `ColorDeck` | Une pile par Couleur active et par camp (`D1`). |
| Main | `Hand` | Les Tuiles visibles et jouables ce tour (`D3`). |
| Entretien | `upkeep` | Phase de soin en ouverture de tour (`F13`). |
| Effet à la pose | `OnPlaceEffect` | Déclenché à la pose (`E1`). |
| Effet permanent (aura) | `Aura` | Recalculé en continu depuis le Plateau (`E4`). |
| Résolution | `resolveCombat` | Les 3 étapes du §6. |

## 2. Plateau et Espaces

- `B1` ✅ Le Plateau est défini par un **rayon** et une **liste d'Espaces
  bloqués**. Coordonnées axiales `(q, r)` (ADR-0001). Le rayon par défaut est
  **2** → 19 Espaces (`B11`) ; le rayon 4 (61 Espaces) reste ce que décrivent
  `B9` et `B10`, et ce sur quoi le montage de la trace §13 est épinglé.
- `B2` ✅ Un Espace bloqué est dessiné mais **rien ne s'y pose jamais**.
- `B3` ✅ Un Espace porte **au plus une Tuile**, et une Tuile détruite **libère
  son Espace** : celui-ci redevient posable, avec sa Couleur inchangée (`C6`).
  C'est la différence structurelle avec le proto 1, où une pose était définitive.
- `B4` ✅ Chaque camp a un **Roi** (`N00`) posé au montage, à l'opposé du Plateau,
  aux Espaces indiqués dans la configuration.
- `B5` ✅ **Deux Tours (`V00`) sont posées autour de chaque Roi** au montage —
  décision de la revue sur `Q1`. Ce n'est plus optionnel dans la configuration par
  défaut, même si le format le permet toujours. Elles occupent les deux voisins du
  Roi **tournés vers le centre**, ce qui laisse deux créneaux d'attaque sur le
  pourtour (`B11`).
- `B6` ✅ Les Tuiles pré-posées appartiennent au camp de leur Roi (`side` dans la
  configuration), sauf les Tuiles neutres (`T6`). Elles ne sortent d'aucun Deck.
- `B7` ✅ Le chargement **refuse** une configuration où un Roi est sur un Espace
  bloqué ou hors Plateau, où deux Tuiles pré-posées se superposent, ou où un camp
  n'a pas exactement un Roi.
- `B7b` ✅ Le chargement **refuse aussi** une configuration où un Roi n'a
  **aucun Espace libre adjacent** — il serait inatteignable et la partie ne
  pourrait se terminer que par `W2`/`W3`. Cette validation est née d'un cas réel :
  voir `B11`.
- `B8` ✅ Orientation *pointy-top* à l'affichage, comme le proto 1. Purement
  visuel, n'affecte aucune règle.

### Relief

- `B9` ✅ Le brouillon propose rayon 4 et 8 Espaces bloqués. **Vérifié** : 53
  Espaces libres, tous connexes. Le relief dessine un mur qui coupe le Plateau en
  deux lobes reliés par les seuls Espaces `(0,0)` et `(1,0)`.
- `B10` ✅ **L'asymétrie du relief n'est pas un problème** et n'a pas à être
  corrigée par principe. Constat conservé pour mémoire : le relief de `B9` n'a
  aucun Espace bloqué dont l'image par rotation de 180° soit bloquée, et avec des
  Rois en `(-4,0)` / `(4,0)` les territoires font **38 contre 14**. C'est un
  déséquilibre acceptable, à condition d'en être averti (`B12`) et de ne pas
  l'utiliser comme relief par défaut d'une mesure d'équilibrage (`M4`).
- `B11` ✅ **Plateau par défaut : rayon 2, 2 Espaces bloqués.** Le relief n'est là
  que pour que la mécanique d'Espace bloqué (`B2`) existe et soit testée, pas pour
  dessiner une stratégie.

  ```json
  "board": {
    "radius": 2,
    "blocked": [{ "q": 0, "r": 1 }, { "q": 0, "r": -1 }]
  }
  ```

  **Vérifié** : 19 Espaces dont **17 libres**, tous connexes, relief centralement
  symétrique. Rois en `(-2,1)` et `(2,-1)` — 4 voisins chacun, **territoires
  7/7**, distance 4. Les 2 Tours prennent les deux voisins tournés vers le centre,
  laissant **2 créneaux d'attaque** par Roi sur le pourtour, et **chaque créneau
  touche le Roi *et* une Tour** : un attaquant y frappe les deux pour une seule
  riposte (`F8`). C'est le même dessin qu'aux rayons 3 et 4, resserré au maximum.

  ```
     -2       ..   B01n   ..           # bloqué · K Roi · T Tour · n neutre
     -1    ..   ##    Td    Kd         19 Espaces, 17 libres, 9 posables
      0  ..   Tj   ..   Td   ..        territoires 7/7, distance entre Rois 4
      1    Kj   Tj   ##    ..
      2       ..  B01n   ..
  ```

  Les deux Espaces bloqués sont sur la colonne `q = 0`, qui reste **percée en
  trois endroits** — `(0,0)`, `(0,2)` et `(0,-2)`. C'est délibéré : fermer la
  colonne (en y mettant les neutres, par exemple) créerait un goulot unique en
  `(0,0)`, ce qui rendrait le relief structurant — l'inverse de l'intention.

  ⚠️ **Le montage occupe 8 des 17 Espaces libres : il ne reste que 9 places
  posables.** Deux conséquences mesurées :
    - `W3` (Plateau plein) **se déclenche enfin** — 3 à 17 % des parties selon le
      réglage, contre 0 à 3 % au rayon 3.
    - Une Couleur rare devient presque morte : à 13 % de noir sur 17 Espaces, le
      Plateau n'a que **2 Espaces noirs**. Le Deck noir (5 Tuiles) ne sera donc
      quasiment jamais appelé, et la famine de noir (`C10`) n'est plus jouable. Le
      rapport `C4` / `D6` mérite d'être révisé si l'on garde ce rayon.

  ⚠️ **Historique — le relief « deux bouchons devant chaque Roi »**
  (au rayon 4) était **incompatible avec les 2 Tours de `B5`** : il ne laissait
  que 2 Espaces libres au contact de chaque Roi, que les Tours occupaient tous les
  deux, et le **Roi devenait inatteignable**. C'est ce cas qui a produit la
  validation `B7b`.

- `B12` ✅ Le chargement **avertit sans refuser** si le relief n'est pas
  centralement symétrique ou si les territoires des deux Rois diffèrent de plus de
  10 %. C'est une information, pas un jugement (`B10`) : elle sert à ne pas
  interpréter par erreur un résultat de `M4` obtenu sur un plateau déséquilibré.

## 3. Couleurs des Espaces et contrainte de couleur

C'est le cœur de la mécanique : **on choisit ce qu'on donne à l'adversaire en
choisissant où l'on pose.**

- `C1` ✅ **Les Couleurs en jeu sont déclarées en configuration.** Une partie peut
  n'utiliser qu'une partie des 5 Couleurs, et **les Decks en dépendent**.
  Mise en œuvre :
    - Les **Couleurs actives** sont exactement les clés de
      `board.colorDistribution` dont le pourcentage est `> 0`. Un seul endroit à
      éditer pour passer une partie de 5 à 3 Couleurs.
    - Seules les Couleurs actives sont tirées sur les Espaces (`C3`), donc seules
      elles peuvent être imposées (`C7`).
    - Le Deck de chaque camp est **filtré aux Couleurs actives** au chargement, et
      le journal indique combien de Tuiles ont été retirées et lesquelles (`G2`).
      Filtrer plutôt que refuser, pour qu'un essai à 3 Couleurs ne demande pas de
      réécrire le Deck.
    - Les Tuiles **pré-posées** échappent au filtre : `N00` (Roi), `V00` (Tour) et
      les neutres (`T6`) restent légales même si leur Couleur n'est pas active,
      puisque la Couleur d'une Tuile pré-posée est décorative (`C8`). Sans cette
      clause, désactiver le noir supprimerait les Rois.
- `C2` ✅ Chaque Espace porte une **Couleur**, et la configuration donne une
  **répartition en pourcentage** par Couleur ; les Couleurs sont tirées
  **aléatoirement** sur les Espaces en respectant ces pourcentages.
- `C3` ✅ Mise en œuvre exacte : les pourcentages des Couleurs actives doivent
  sommer à 100 ; le nombre d'Espaces par Couleur est
  `round(pct × nbEspacesLibres)`, le reste étant attribué aux Couleurs de plus
  fort reste ; puis la liste est mélangée avec la `seed` (`G4`). Les **Espaces
  bloqués sont exclus** du tirage — ils n'ont pas de Couleur. Les Espaces sous les
  Tuiles pré-posées, eux, **en reçoivent une** : la Tuile peut mourir et l'Espace
  redevenir posable (`B3`, `C6`).
- `C4` ✅ Répartition par défaut, calée sur la composition du Deck (`D6`) :
  `red 27`, `blue 22`, `green 22`, `black 13`, `yellow 16`. Une Couleur rare dans
  le Deck et fréquente sur le Plateau se transforme en famine (`C10`) ; l'aligner
  est le réglage neutre de départ.
- `C5` ✅ Option `symmetricColors: true` : la carte des Couleurs est **miroir par
  rotation de 180°** autour du centre. Les deux camps jouent alors une position
  strictement équivalente — indispensable pour comparer deux réglages d'IA sans
  que le tirage ne décide (`M4`).
- `C6` ✅ La Couleur d'un Espace **n'est pas consommée** : elle reste quand une
  Tuile s'y pose, et reste quand cette Tuile meurt.
- `C7` ✅ Quand un camp pose une Tuile, **la Couleur de l'Espace occupé devient la
  Couleur imposée à l'adversaire** pour son tour.
- `C8` ✅ La Couleur d'une **Tuile** ne sert qu'à deux choses : la ranger dans son
  Deck (`D1`) et être comparée à la Couleur imposée (`A3`). Elle n'a **aucun** rôle
  en résolution. Corollaire : les Couleurs de `N00`, `V00` et des neutres sont
  décoratives, puisque ces Tuiles ne sont jamais posées depuis une main.
- `C9` ✅ **La toute première pose de la partie n'est pas contrainte.** La
  configuration peut fixer `startingColor` pour la contraindre malgré tout ;
  `null` = libre.
- `C10` ✅ **Quand la Couleur imposée n'est pas jouable — Deck de cette Couleur
  épuisé — le camp passe son tour** (`W2`). Ce n'est pas un cas limite mais **un
  plan de jeu** : le Deck noir ne contient que 5 Tuiles, le bleu 8 (`D6`).
  Répéter une Couleur pour assécher l'adversaire est une voie de victoire à part
  entière, puisque deux passes consécutives terminent la partie (`W2`) et que le
  départage se fait sur la force du Roi (`W4`). Voir §14.
- `C11` ✅ `B02` change la Couleur des Espaces adjacents en rouge. Précisions : ça
  s'applique aux Espaces adjacents **libres comme occupés** (la Couleur survit sous
  la Tuile, `C6`) et **jamais aux Espaces bloqués** (ils n'ont pas de Couleur).
  Si le rouge n'est pas une Couleur active (`C1`), l'effet est sans objet — mais
  `B02` a alors déjà été retiré du Deck par le filtre.
- `C12` ✅ **La Couleur imposée persiste à travers une passe** : elle est imposée
  au camp suivant. Si le noir est imposé et que l'adversaire passe faute de noir,
  le camp suivant doit *aussi* jouer noir (`Q15` tranchée). Deux conséquences
  voulues :
    - Affamer une Couleur est un **pari** : on s'enferme dans la Couleur qu'on
      impose, ce qui donne un coût à la stratégie de `C10`.
    - `W2` (deux passes consécutives) devient réellement atteignable — c'est le cas
      « les deux camps sont à sec de la même Couleur », et c'est une fin de partie
      légitime même s'il reste des Tuiles dans les autres Decks.

  La Couleur ne se libère donc **jamais** en cours de partie : seul le premier tour
  est libre (`C9`).

## 4. Tuiles et catalogue

- `T1` ✅ Un type de Tuile a un **ID** (initiale de la Couleur + 2 chiffres), une
  **force** de base, et zéro ou un **effet**.
- `T2` 🧪 Convention `00` : les IDs se terminant par `00` sont des Tuiles
  **pré-posées uniquement** (`N00` Roi, `V00` Tour). Elles n'entrent dans aucun
  Deck ; le chargement refuse un Deck qui en contient une.
- `T3` ✅ Catalogue du brouillon, repris tel quel :

| ID | Force | Effet |
| --- | --- | --- |
| `R01` | 7 | — |
| `R02` | 6 | — |
| `R03` | 4 | — |
| `R04` | 3 | À la pose : gagne 1 bouclier. |
| `R05` | 2 | À la pose : −2 force aux Tuiles **adverses** adjacentes. |
| `B01` | 2 | Permanent : +1 bouclier aux Tuiles **alliées** adjacentes. |
| `B02` | 4 | À la pose : les Espaces adjacents passent en rouge (`C11`). |
| `B03` | 1 | — |
| `V00` | 10 | — (Tour, pré-posée) |
| `V01` | 3 | À la pose : gagne 2 boucliers. |
| `V02` | 2 | À la pose : gagne 3 boucliers. |
| `V03` | 1 | À la pose : gagne 3 boucliers. |
| `V04` | 4 | — |
| `N00` | 20 | ✅ **2 boucliers** (`Q1`). (Roi, pré-posée) |
| `N01` | 1 | Permanent : annule l'effet de **toutes** les Tuiles adjacentes, alliées comprises, et **est immunisée à l'annulation** (`E7`). |
| `N02` | 2 | — |
| `N03` | 3 | À la pose : −2 force aux Tuiles adjacentes, **alliées comprises** (`E6`). |
| `J01` | 1 | Permanent : −2 boucliers aux Tuiles adverses **adjacentes** (`E8`). |
| `J02` | 1 | Permanent : +2 force aux Tuiles alliées adjacentes. |
| `J03` | 3 | — |

- `T4` ✅ Le catalogue vit **entièrement dans la configuration** : forces, boucliers
  et effets sont des données, la seule chose écrite en code est le **répertoire des
  types d'effets** (`onPlace.gainShields`, `aura.allyForce`, …) que la
  configuration câble. Ajouter une Tuile qui combine deux effets connus ne doit pas
  demander de code.
- `T5` ✅ Une Tuile posée n'est **jamais déplacée ni reprise** dans ce proto. Le
  brouillon mentionne un redéclenchement d'effet « si la tuile est déplacée » :
  c'est une amorce pour des mécaniques ultérieures qui **renverront une Tuile dans
  la main d'un joueur**. Ce jour-là, sa repose redéclenchera ses effets `onPlace`
  (`E1`) et son `placementBonus` sera recalculé ; le sort de ses `damage` et
  `grantedShields` reste à trancher (`Q13`, « on verra plus tard »).
- `T6` ✅ **Tuiles neutres pré-posées.** La configuration pose **2 `B01` neutres**
  (`side: "neutral"`). Elles concrétisent le vocabulaire du brouillon
  (« Tuile neutre : n'appartenant à personne, ni allié ni adverse ») que rien ne
  produisait jusqu'ici. Règles :
    - ✅ **Hors combat**, et ce n'est pas une règle à part : ça découle de `T7`.
      Une Tuile neutre n'est l'adverse de personne, donc elle n'est **jamais
      attaquée** (`F5` étape 2) et **ne riposte jamais** (`F5` étape 3). Elle n'est
      non plus l'alliée de personne, donc elle ne compte **pas** pour le bonus de
      pose (`F3`) et **coupe la chaîne de ravitaillement** (`F14`) : c'est un
      obstacle logistique. Elle ne déclenche elle-même aucune résolution, puisqu'on
      ne la pose jamais en cours de partie.
    - 🧪 Seuls les **dégâts d'effet** peuvent la tuer (`N03`, `E6`) : un `B01`
      neutre (2 force) meurt à un `N03` adjacent. Le format autorise toujours une
      `N01` neutre, mais elle serait **indestructible** — elle annulerait l'effet
      du `N03` qui viendrait la tuer (`E7`) — et sa zone de silence de 7 Espaces
      est disproportionnée sur un Plateau de 17. Les 2 `N01` neutres du montage
      précédent ont été **retirées** pour cette raison (révision de `Q14`).
    - ✅ **Un `B01` neutre donne son bouclier à tout le monde.** Pour une Tuile
      neutre, toute autre Tuile est alliée (`T7`) : les 6 Espaces autour d'un `B01`
      neutre forment un **sanctuaire disputé** où la Tuile de n'importe quel camp
      gagne +1 bouclier (`Q17` tranchée). La relation n'étant pas réciproque, le
      `B01` neutre ne profite en revanche d'aucune aura de personne.
    - 🧪 Positions par défaut au rayon 2, symétriques par rotation de 180° :
      `B01` en `(-1,2)` et `(1,-2)`, hors de la colonne bloquée pour ne pas la
      refermer (`B11`).
- `T7` ✅ **Relation d'alliance : elle est asymétrique.** « Allié » et « adverse »
  se lisent toujours *depuis* une Tuile donnée, jamais comme une propriété du
  couple :

| Depuis une Tuile… | …l'autre Tuile est | Alliée ? | Adverse ? |
| --- | --- | --- | --- |
| d'un camp | du **même** camp | oui | non |
| d'un camp | du camp **opposé** | non | **oui** |
| d'un camp | **neutre** | **non** | **non** |
| **neutre** | de n'importe quel camp, ou neutre | **oui** | non |

  Une Tuile neutre considère donc **tout le monde** comme allié, alors que
  personne ne la considère comme alliée. Pour une Tuile de camp, une Tuile neutre
  est dans un **troisième état** — ni alliée, ni adverse — exactement comme le dit
  le brouillon.

  Cette table est la seule autorité pour les quatre règles qui lisent la relation :
  le bonus de pose (`F3`), les cibles des auras (`E4`), l'attaque et la riposte
  (`F5`), et la chaîne de ravitaillement (`F14`). Tout le comportement des Tuiles
  neutres (`T6`) s'en déduit, il n'y a aucune règle spéciale à écrire pour elles.

## 5. Decks et main

- `D1` ✅ Chaque camp a **un Deck par Couleur active** (`C1`) : la liste de Tuiles
  configurée est partitionnée par le préfixe d'ID, après filtrage aux Couleurs
  actives.
- `D2` ✅ Chaque Deck est **mélangé au montage** avec la `seed` (`G4`), pour que
  deux parties soient reproductibles et comparables.
- `D3` ✅ **Modèle de main.** À l'ouverture d'un tour, la Couleur imposée est
  connue : la **main** est constituée des `handSize` premières Tuiles du Deck de
  cette Couleur, **révélées face visible**. Le camp en joue une ; les autres
  restent au sommet du Deck, dans le même ordre. `handSize: 3`.

  C'est le seul modèle cohérent avec les deux phrases du brouillon (« un deck par
  couleur » et « les tuiles qu'il a en main à ce moment ») : une main persistante
  multicolore serait le plus souvent injouable, puisque la Couleur est imposée. Il
  a en plus la bonne propriété de jeu : le choix reste entier (quelle Tuile, quel
  Espace) alors que la Couleur, elle, est subie.
- `D4` ✅ Un Deck **ne se réalimente pas** : pas de défausse remélangée. Les Tuiles
  détruites sur le Plateau ne reviennent pas en Deck.
- `D5` ✅ Un Deck épuisé rend sa Couleur **non jouable** pour son propriétaire : si
  cette Couleur est imposée, le camp passe (`C10`).
- `D6` ✅ Deck de départ du brouillon, identique pour les deux camps — **37 Tuiles**
  réparties ainsi :

| Couleur | Nb | Tuiles |
| --- | --- | --- |
| Rouge | 10 | `R01` ×1, `R02` ×2, `R03` ×3, `R04` ×2, `R05` ×2 |
| Bleue | 8 | `B01` ×2, `B02` ×2, `B03` ×4 |
| Vert | 8 | `V01` ×2, `V02` ×2, `V03` ×2, `V04` ×2 |
| Noir | 5 | `N01` ×1, `N02` ×3, `N03` ×1 |
| Jaune | 6 | `J01` ×2, `J02` ×1, `J03` ×3 |

- `D7` 🧪 Les deux camps reçoivent le **même** Deck par défaut, mais la
  configuration permet d'en donner un différent à chacun (`decks.player`,
  `decks.demon`) — c'est le levier pour tester des archétypes asymétriques.

## 6. Tour de jeu, soin et résolution

- `A1` ✅ Les camps jouent **en alternance**, une pose par tour. Un tour de chaque
  camp forme une **manche**.
- `A2` ✅ Le camp qui ouvre est configuré (`firstPlayer`), `player` par défaut.
- `A3` ✅ Séquence d'un tour, dans cet ordre strict :

  1. **Entretien** — les Tuiles ravitaillées du camp actif se soignent de 2
     (`F13`). Aucun contrôle de destruction : le soin ne peut que réduire les
     dégâts.
  2. **Ouverture** — la Couleur imposée est celle produite par la pose précédente
     (`C7`), reportée si le tour précédent était une passe (`C12`), ou libre au
     premier tour (`C9`). La main est révélée (`D3`).
  3. **Pose** — le camp choisit un Espace **libre, non bloqué** et une Tuile de la
     main. Aucune contrainte d'adjacence : *toute* case vide est posable (`A4`).
     S'il ne peut pas, il passe (`A5`).
  4. **Bonus de pose** — la Tuile gagne **+1 force par Tuile alliée adjacente**
     (`F3`).
  5. **Effets à la pose** — les effets `onPlace` de la Tuile posée s'appliquent
     (`E1`). Contrôle de destruction (`F10`).
  6. **Résolution** — les 3 étapes de `F5`. Contrôle de destruction (`F10`).
  7. **Clôture** — la Couleur de l'Espace occupé devient la Couleur imposée à
     l'adversaire (`C7`). Contrôle de fin de partie (`W1`, `W2`, `W3`).

- `A4` ✅ **Aucune contrainte d'adjacence à la pose.** Toute case vide du Plateau
  est jouable — y compris à l'autre bout, y compris au contact du Roi adverse dès
  le premier tour. Le soin (`F13`) ne l'interdit pas mais le **décourage** : une
  Tuile isolée ne se régénère pas.
- `A5` ✅ Un camp qui ne peut pas poser **passe** — soit parce que le Deck de la
  Couleur imposée est épuisé (`C10`), soit parce qu'aucun Espace n'est libre
  (`W3`). **Deux passes consécutives** terminent la partie (`W2`). L'entretien
  (`F13`) a lieu **même sur un tour passé** : le tour a bien commencé.

### État d'une Tuile posée

- `F1` ✅ **Modèle d'état.** Une Tuile posée stocke quatre valeurs, et **rien
  d'autre** :

  | Champ | Sens | Évolution |
  | --- | --- | --- |
  | `baseForce` | force du type (`T3`) | fixe |
  | `placementBonus` | +1 par allié adjacent **à l'instant de la pose** | **figé à la pose** |
  | `damage` | dégâts cumulés, **borné à `[0, +∞[`** | croît au combat, décroît au soin (`F13`) |
  | `grantedShields` | boucliers du type + ceux gagnés par ses effets `onPlace` | croît |

  Et deux valeurs **dérivées**, recalculées à chaque lecture depuis le Plateau :

  | Dérivée | Formule |
  | --- | --- |
  | `force` | `baseForce + placementBonus + auraForce − damage` |
  | `shields` | `max(0, grantedShields + auraShields)` |

  où `auraForce` et `auraShields` sont la somme des auras actives qui la visent
  (`E4`).

  Cette séparation **état stocké / valeur dérivée** est le choix d'architecture
  central du proto, et il est **imposé par le brouillon** : « si une tuile alliée
  adjacente est détruite on ne met pas à jour la force des autres tuiles, le +1 ne
  s'applique qu'au moment de la pose ». Le bonus de pose est donc figé, alors qu'un
  effet permanent est vivant. Confondre les deux dans un unique compteur `force`
  mutable rend l'un des deux comportements impossible à écrire — et rend le soin
  (`F13`) impossible à borner correctement.

- `F2` ✅ La force est **à la fois** les points de vie et la puissance d'attaque.
- `F3` ✅ Le bonus de pose (`+1` par allié adjacent) s'applique **avant** les
  effets, et **ne bouge plus jamais** ensuite. « Allié » se lit depuis la Tuile
  posée (`T7`) : les Tuiles neutres n'y comptent donc pas.
- `F4` ✅ Le Roi et les Tours **comptent comme Tuiles alliées** pour le bonus de
  pose. Ce sont des Tuiles ordinaires en résolution, les seules règles propres au
  Roi étant `W1` et ses 2 boucliers (`T3`).

### Soin et ravitaillement

- `F13` ✅ **Soin d'entretien.** À l'ouverture du tour d'un camp, chacune de ses
  Tuiles **ravitaillées** (`F14`) voit ses dégâts réduits de `upkeepHeal`, soit
  **1** : `damage = max(0, damage − 1)`. Précisions :
    - Le plancher à 0 fait qu'une Tuile ne dépasse **jamais** sa force nominale.
      C'est `F1` qui le garantit : on soigne le compteur de dégâts, pas la force.
    - ✅ **Le Roi est EXCLU du soin.** Il est pourtant trivialement ravitaillé
      (chemin de longueur 0), mais il ne récupère rien. C'est la décision qui rend
      le duel concluable : tant que le Roi se soignait, il n'était jamais tué et la
      majorité des parties finissaient nulles (§14). Ses Tours et ses relais, eux,
      se soignent normalement.
    - Le soin **n'est pas un effet de Tuile** : `N01` ne l'annule pas (`E7`).
    - Aucun contrôle de destruction ne suit l'entretien : le soin ne peut pas faire
      tomber une force.
    - ✅ Le soin s'applique aux Tuiles du **camp actif seulement**, à l'ouverture
      de son tour : **un soin par camp et par manche** (`Q16` tranchée). Les Tuiles
      du camp qui ne joue pas ne se soignent pas pendant ce tour.
- `F14` ✅ **Chaîne de ravitaillement.** Une Tuile du camp `S` est **ravitaillée**
  s'il existe un chemin de Tuiles **du camp `S`**, adjacentes deux à deux, qui la
  relie au Roi de `S`. Le Roi lui-même est ravitaillé (chemin de longueur 0). Les
  Espaces vides, les Tuiles adverses et les Tuiles neutres (`T6`) **ne
  transmettent pas** le ravitaillement.

  Conséquences, et c'est là tout l'intérêt de la règle :
    - Une Tuile posée seule au contact du Roi adverse est à ~8 Espaces de son
      propre Roi : elle **n'est pas ravitaillée** et ne se soigne jamais. Une
      position avancée est donc structurellement fragile.
    - Une position **construite depuis chez soi** se régénère. Le jeu récompense
      l'avancée en chaîne plutôt que le parachutage, sans qu'aucune règle
      n'interdise le parachutage (`A4`).
    - **Couper un maillon assèche toute la branche** : tuer une Tuile de liaison
      prive du soin tout ce qui pendait derrière. C'est une nouvelle façon de
      gagner un échange, qui ne passe pas par les dégâts.

### Résolution du combat

- `F5` ✅ La résolution se fait en 3 étapes, `A` étant la Tuile posée :

  1. **Instantané** — on mémorise la `force` et les `shields` de **toutes** les
     Tuiles du Plateau.
  2. **Attaque** — pour chaque Tuile **adverse** `B` adjacente à `A` :
     `damage(B) += max(0, force(A) − shields(B))`.
  3. **Riposte** — on prend la force **maximale** parmi les Tuiles adverses
     adjacentes à `A`, **lue dans l'instantané** (donc *avant* l'étape 2) :
     `damage(A) += max(0, forceMaxAdverse − shields(A))`.

  ✅ **L'attaque et la riposte ne visent que les Tuiles adverses** — c'est-à-dire
  du camp opposé, au sens de `T7`. Les Tuiles alliées ne sont donc jamais touchées
  en résolution (seuls les effets le peuvent, `E9`), et les Tuiles neutres ne le
  sont **jamais** : elles ne sont l'adverse de personne.

- `F6` ✅ **Toute l'étape `F5` lit l'instantané et n'écrit que des `damage`, tous
  appliqués simultanément.** La destruction n'est contrôlée qu'**une fois**, à la
  fin (`F10`). Conséquence voulue et explicite dans le brouillon : **une Tuile
  détruite à l'étape 2 riposte quand même** à l'étape 3. Formulée ainsi, la
  résolution est indépendante de l'ordre de parcours des voisins — donc
  déterministe et testable.
- `F7` ✅ **L'étape 3 ne considère que les Tuiles adverses.** Le brouillon dit « les
  tuiles adjacentes » sans qualifier, mais l'étape 2 dit « adverse » : lire
  l'étape 3 comme incluant les alliés rendrait toute pose à côté de sa propre Tour
  `V00` (10 force) suicidaire.
- `F8` ✅ **La riposte est plafonnée, l'attaque est en aire.** `A` frappe *tous* ses
  voisins adverses mais ne subit que *le plus fort*. C'est le moteur de la
  mécanique : poser au contact de 3 Tuiles adverses fait 3 fois les dégâts pour un
  seul retour. Toute la valeur d'un placement se lit dans ce déséquilibre — et
  c'est le seul endroit du jeu où le nombre de voisins paie.
- `F9` ✅ **Les boucliers ne se consomment pas** : ce sont une réduction permanente
  des dégâts reçus en résolution. Sans quoi l'aura de `J01` (« −2 boucliers
  adverses ») viserait une valeur qui n'existe plus. Ils **ne réduisent pas** les
  dégâts d'effet (`E6`) : le brouillon rattache explicitement le bouclier au
  « calcul de mise à jour de la force ». Conséquence importante depuis `Q1` :
  `R05` et `N03` **passent outre les 2 boucliers du Roi**.
- `F10` ✅ **Destruction.** Une Tuile dont la `force` dérivée est **≤ 0** est
  retirée du Plateau. Le contrôle se fait **par vagues simultanées** : on retire
  d'un coup toutes les Tuiles à ≤ 0, on recalcule les dérivées, on recommence
  jusqu'à stabilité. Le résultat ne dépend donc pas de l'ordre de retrait.
- `F11` ✅ **Cascade.** Retirer une Tuile peut tuer ses voisines, puisque perdre
  une aura `+2 force` (`J02`) fait baisser leur force dérivée. C'est le seul
  moyen dans le jeu de tuer sans poser au contact, et ça découle directement de
  `F1` — ce n'est pas une règle ajoutée.
- `F12` ✅ Si la Tuile détruite est un **Roi**, la partie est immédiatement gagnée
  par l'autre camp (`W1`).

## 7. Effets

- `E1` ✅ **À la pose** — se déclenche au moment de la pose. Se redéclenchera si la
  Tuile est reposée après un retour en main (`T5`, mécanique ultérieure).
- `E2` ✅ **À l'apparition** — se déclenche la première fois seulement.
  🧪 **Aucune Tuile du catalogue ne l'utilise** : le type d'effet est déclaré et
  non implémenté dans ce proto (`Q13`). Il n'aura de sens observable qu'avec la
  mécanique de retour en main de `T5` — c'est précisément ce qui distinguera
  « à la pose » de « à l'apparition ».
- `E3` ✅ **N fois** — compteur de déclenchements.
  🧪 **Aucune Tuile du catalogue ne l'utilise** : idem (`Q13`).
- `E4` ✅ **Permanent (aura)** — s'applique en continu : à chaque pose, on
  réévalue quelles Tuiles remplissent la condition. Traduction : une aura n'est
  **jamais** une mutation, c'est un terme de la formule dérivée de `F1`, recalculé
  à chaque lecture.

  ✅ **Une aura est vivante dès l'instant de la pose**, donc **avant** le calcul des
  dégâts : elle est déjà prise en compte par l'instantané de `F5` étape 1. Poser une
  `J01` au contact d'une Tuile adverse réduit ses boucliers de 2 *et* c'est cette
  valeur réduite qui sert à l'attaque du même tour. Ça découle de `F1` — l'aura est
  un terme de la formule, pas un événement — mais c'est assez contre-intuitif pour
  mériter d'être écrit, et c'est verrouillé par un test. Trois auras existent : `B01` (+1 bouclier allié adjacent),
  `J01` (−2 boucliers adverses adjacents), `J02` (+2 force alliée adjacente) — et
  le silence de `N01` (`E7`). Les Tuiles neutres portent des auras comme les
  autres, mais leur ciblage suit la relation asymétrique de `T7` : l'aura d'un
  `B01` neutre atteint **toutes** les Tuiles adjacentes (`T6`).
- `E5` ✅ Ordre d'application dans un tour : bonus de pose (`F3`), puis effets
  `onPlace` **dans l'ordre de déclaration** du type, puis contrôle de destruction,
  puis résolution. Aucune Tuile du catalogue ne porte deux effets `onPlace`, donc
  cet ordre n'est pour l'instant jamais observable.
- `E6` ✅ Les dégâts d'effet (`R05`, `N03`) **ignorent les boucliers** (`F9`) et
  peuvent tuer **avant** la résolution : une Tuile tuée à l'étape 5 de `A3` n'est
  plus adjacente à l'étape 6, donc **elle ne riposte pas et n'est pas attaquée**.
  C'est ce qui fait la valeur de `R05` (2 force seulement) : il désarme un voisin
  faible avant que le combat n'ait lieu, et c'est le seul moyen de toucher le Roi
  sans buter sur ses boucliers.
- `E7` ✅ **`N01` (annulation).** Une Tuile est dite **muette** si une `N01` lui est
  adjacente, quel que soit le camp de cette `N01` — y compris neutre (`T6`). Une
  Tuile muette :
    - ne déclenche pas ses effets `onPlace` si elle est posée alors qu'elle est
      déjà muette ;
    - ne projette aucune aura (`E4`) ;
    - **conserve** ses `grantedShields` et son `placementBonus` déjà acquis — ce
      sont de l'état stocké (`F1`), pas des effets ;
    - **continue de se soigner** : le soin est une règle, pas un effet (`F13`).

  ✅ **`N01` est immunisée à l'annulation** : elle ignore l'effet d'une autre
  `N01`. Deux `N01` adjacentes se rendent mutuellement muettes pour tout le reste
  mais continuent toutes deux d'annuler. Sans cette clause la résolution n'a pas
  de point fixe (`Q6` tranchée).

  ✅ **Une `N01` adjacente à une Tuile neutre éteint son aura** : le sanctuaire du
  `B01` neutre (`Q17`) s'arrête, quel que soit le camp de la `N01`. Le silence vise
  « toutes les Tuiles adjacentes, alliées ou non » (`T3`), et une neutre n'y échappe
  pas — seule `N01` est immunisée. C'est le seul moyen de neutraliser un sanctuaire.

  Conséquence assumée : l'ordre de pose compte. Une `V02` posée **puis** voisinée
  d'une `N01` garde ses 3 boucliers ; posée **à côté** d'une `N01` déjà là, elle
  n'en gagne aucun.
- `E8` ✅ **`J01` ne vise que les Tuiles adverses adjacentes**, comme `B01` et
  `J02`. La formulation du brouillon (« diminue de 2 les boucliers adverses », sans
  « adjacentes ») est levée : ce n'est pas une aura de plateau.
- `E9` ✅ `N03` frappe « les Tuiles adjacentes, alliées comprises » : il peut donc
  **achever son propre Roi** s'il est posé à son contact. Le moteur ne l'interdit
  pas, l'IA doit l'éviter (`I6`), et l'interface doit prévenir le joueur (`U7`).

## 8. Fin de partie

- `W1` ✅ **Roi détruit → victoire immédiate** de l'autre camp.
- `W2` ✅ **Deux passes consécutives terminent la partie.** Une passe survient
  quand le Deck de la Couleur imposée est épuisé (`C10`) ou qu'aucun Espace n'est
  libre (`W3`).
- `W3` ✅ **La partie se termine aussi dès qu'il n'y a plus d'Espace libre sur le
  Plateau.** C'est constatable immédiatement, sans attendre deux passes.
  Au rayon 2 : 17 Espaces libres moins les 8 Tuiles pré-posées (2 Rois, 4 Tours,
  2 neutres) = **9 places** pour 74 Tuiles de Deck (`D6`). 🧪 **Mesuré : cette fin
  se déclenche dans 3 à 17 % des parties** selon le réglage — c'est le rayon 2 qui
  l'a rendue atteignable (elle était à 0-3 % au rayon 3). `W2` (famine de Couleur)
  reste néanmoins la conclusion la plus fréquente.
- `W3b` ✅ **Aucune limite de tours n'est nécessaire** : la terminaison est
  garantie par la finitude des Decks. Chaque tour consomme une Tuile de Deck ou
  est une passe, les Decks totalisent 74 Tuiles, et deux passes consécutives
  arrêtent la partie (`W2`) — donc aucune partie ne peut être infinie. C'est
  l'équivalent ici de ce que `D16` faisait au proto 1, et ça évite un `maxTurns`
  arbitraire.
- `W4` ✅ **Départage** quand la partie s'arrête sans Roi mort (`W2`, `W3`) : le
  camp dont le Roi a la **plus grande force restante** gagne ; à égalité, **match
  nul**. Depuis le soin (`F13`), c'est probablement la fin la plus fréquente —
  voir §14, c'est ce que `M4` doit mesurer en premier.
- `W5` ✅ **Deux Rois détruits dans la même résolution** : le **camp actif gagne**
  (il a payé le tour). C'est atteignable — `N03` peut achever son propre Roi
  (`E9`) dans le tour où il tue l'autre, et une cascade (`F11`) peut faire tomber
  les deux.

## 9. IA de l'adversaire

- `I1` ✅ L'IA a un **profil** et un **niveau**, tous deux configurés.
- `I2` ✅ Profils : `bourrin` (attaque), `defensif` (prudent), `neutre`.
- `I3` ✅ Niveaux et sélection dans le classement décroissant. Le 3ᵉ niveau
  s'appelle **`passable`** et non `neutre`, pour ne pas collider avec le profil du
  même nom (`Q9` tranchée) :

| Niveau | Choix |
| --- | --- |
| `expert` | au hasard dans le **top 2** |
| `moyen` | au hasard dans le **top 5** |
| `passable` | au hasard dans le **top 8** |
| `mauvais` | au hasard dans le top 8 **en excluant les 2 meilleurs** → rangs 3 à 8 |

  🧪 Si moins de coups sont disponibles que la fenêtre, on prend ce qu'il y a ; si
  `mauvais` ne laisse rien après exclusion, on prend le moins bon disponible.
- `I4` ✅ À chaque tour, l'IA **simule toutes les poses possibles** : chaque Tuile
  de sa main × chaque Espace libre. Avec `handSize 3` et 9 Espaces posables au
  rayon 2, ~27 simulations complètes par tour — négligeable.
- `I5` ✅ **Barème.** Chaque simulation est comparée à l'état d'avant la pose. Le
  critère « dégâts sur les Tuiles adverses » a été **retiré** : il faisait doublon
  avec le delta de force adverse, qui est plus complet (il inclut les Tuiles mortes
  et les auras perdues) — `Q10` tranchée.

  | Score de défense | Score d'attaque |
  | --- | --- |
  | `−` Tuiles alliées détruites | `+` dégâts sur le Roi adverse |
  | `−` dégâts subis par son Roi | `+` Tuiles adverses détruites |
  | `+` boucliers gagnés | `−` delta de force adverse |
  | `+` delta de force alliée | `−` Tuiles adverses **ravitaillées** (`I5b`) |
  | `+` la Tuile posée est **ravitaillée** (`I5b`) | |

  Puis `score = wAttaque × scoreAttaque + wDéfense × scoreDéfense`, avec
  `bourrin {attaque 1.5, défense 0.5}`, `defensif {attaque 0.5, défense 1.5}`,
  `neutre {1, 1}`. **Tous les poids vivent dans la configuration** (`G3`) : un
  barème d'IA est un réglage, pas du code.
- `I5b` 🧪 **Deux critères ajoutés par le soin** (`F13`) : une IA qui ignore le
  ravitaillement parachute des Tuiles qui ne se soignent jamais, et ne pense pas à
  couper les chaînes adverses. Sans ces deux termes, elle ne joue pas la règle
  `F14` du tout — c'est exactement l'erreur que `I7` corrigeait pour la Couleur.
- `I6` ✅ **Garde-fous absolus**, avant tout barème : une pose qui tue le Roi
  adverse vaut `+∞` ; une pose qui tue son **propre** Roi (`E9`) vaut `−∞`.
- `I7` ✅ **Neuvième terme : la Couleur offerte.** Le barème du brouillon note
  l'effet de la pose sur le Plateau mais **pas** la Couleur imposée qui en découle
  (`C7`) — l'IA ne jouerait donc pas la moitié de la mécanique que ce proto veut
  tester. La Couleur offerte est notée par la **meilleure réponse adverse**
  qu'elle autorise (un demi-coup de recherche supplémentaire, ~140 × 3
  simulations), pondérée par `wCouleur`.

  Avec la décision `C10`, ce terme doit aussi voir qu'**offrir une Couleur dont
  l'adversaire n'a plus de Tuile lui fait passer son tour** — c'est le coup le
  plus fort du jeu et une IA qui l'ignore est aveugle. À `wCouleur: 0` on retrouve
  l'IA du brouillon, ce qui permet de mesurer directement l'apport du terme
  (`M3`).
- `I8` ✅ Les égalités de score sont départagées par un mélange **germé** (`G4`) :
  deux parties de même `seed` sont identiques au coup près.
- `I9` ✅ Le joueur humain peut être remplacé par une IA (`sides.player.ai`), ce
  qui donne le mode **IA contre IA** nécessaire à l'équilibrage par lots (`M4`).

## 10. Interface

Le proto sert à *lire* la mécanique, pas à être joli.

- `U1` ✅ Chaque Espace affiche sa **Couleur** en fond. 🧪 Elle est peinte en
  semi-transparent **sur un fond clair**, ce qui la délave vers le pastel : la
  Couleur reste lisible sans concurrencer les Tuiles. Réduire l'opacité
  directement sur le fond sombre de la page aurait *assombri* les Couleurs au lieu
  de les éclaircir.
- `U1b` 🧪 **Une Tuile posée est texturée et ombrée, un Espace vide ne l'est pas.**
  Hachures dans le sens du camp pour `player` et `demon`, pointillés pour les
  neutres, hachures sombres pour les Espaces bloqués. On doit distinguer une Tuile
  d'un Espace vide **sans lire les chiffres** — c'est ce qui rend le Plateau
  lisible d'un coup d'œil.
- `U2` ✅ Chaque Tuile affiche son **ID**, sa **force dérivée** et ses
  **boucliers**. Une force modifiée par une aura est marquée (ex. `5 (+2)`) pour
  distinguer le dérivé du stocké (`F1`).
- `U3` ✅ La **Couleur imposée** du tour en cours est affichée en grand, et les
  Espaces posables sont surlignés.
- `U4` ✅ **Survol d'un Espace = aperçu complet de la résolution** avant de poser :
  dégâts infligés à chaque voisin, riposte encaissée, destructions probables,
  **la Couleur qu'on donnera à l'adversaire** — avec un signal fort si cette
  Couleur va le faire passer son tour (`C10`) — et **si la Tuile sera ravitaillée**
  (`F14`). C'est l'exigence d'interface la plus importante du proto : sans elle on
  ne peut pas juger si la décision de `C7` est intéressante.
- `U5` ✅ **Journal de résolution** détaillant les étapes de `F5` (instantané,
  attaque voisin par voisin, riposte, destructions, cascades) et l'entretien
  (`F13` : quelles Tuiles ont été soignées, de combien) — c'est le seul moyen de
  déboguer une règle de combat.
- `U6` ✅ Panneau de détail d'une Tuile sélectionnée : `baseForce`,
  `placementBonus`, `damage`, `grantedShields`, auras subies, statut muet (`E7`),
  statut ravitaillé (`F14`).
- `U7` ✅ Avertissement explicite quand une pose endommage son propre camp (`N03`,
  `E9`).
- `U8` ✅ Décomposition des Decks visible en permanence : combien de Tuiles restent
  par Couleur, pour les deux camps. C'est l'information qui rend la famine de
  Couleur (`C10`) jouable — sans elle, une des deux voies de victoire est cachée.
- `U9` ✅ Pas-à-pas et rejeu à partir d'une `seed`.
- `U17` 🧪 **Un fantôme sur l'Espace survolé annonce la Tuile telle qu'elle sera
  posée.** Il porte son ID, sa **force à la pose** — bonus d'alliés compris, marqué
  `(+2)` — ses **boucliers**, et deux signaux : `✕` si elle ne survivra pas à la
  riposte, `⛌` si elle survivra mais **hors ravitaillement** (`F14`), donc sans
  jamais se soigner. Il est en pointillés translucides, pour ne pas se confondre
  avec une Tuile réellement posée (`U1b`).
    - Les valeurs annoncées sont **lues dans la trace du moteur** (`U16`), sur la
      dernière étape avant l'attaque : ce sont donc exactement celles que la
      résolution appliquera. Les recalculer dans l'affichage serait une
      duplication de règles (ADR-0003) — et une erreur : un premier essai qui
      construisait une Tuile hypothétique à la main annonçait 0 bouclier pour une
      `V02`, en oubliant les 3 qu'elle gagne par son effet à la pose (`E1`), et
      ignorait le silence d'une `N01` voisine (`E7`).
    - Aucun fantôme sur une pose illégale : c'est le panneau qui dit pourquoi
      (`U4`).
- `U16` 🧪 **La résolution est rejouée étape par étape, animée.** Poser une Tuile
  ne saute pas à l'état final : le moteur émet une **trace d'étapes** (pose →
  effets → attaque → riposte → destructions, une étape par vague de cascade) et
  l'affichage la rejoue dans le temps.
    - Les **variations de force sont interpolées** sur la durée de l'étape, avec
      une étiquette flottante « −5 » / « +2 » et un tremblement sur la Tuile
      touchée. Une Tuile détruite **se contracte et s'efface** au lieu de
      disparaître d'un coup.
    - Une **bannière nomme la règle appliquée** à chaque étape (« Attaque en aire :
      R04 frappe 2 Tuiles adverses avec 3 de force (F8) »). C'est elle qui rend
      l'animation *compréhensible* plutôt que seulement jolie : c'est l'objet de
      la règle.
    - La vitesse est réglable (×0,25 à ×4) et l'animation peut être coupée. Les
      entrées sont **verrouillées** pendant la lecture, puisque le Plateau affiché
      n'est pas l'état réel.
    - L'entretien (`F13`) est animé lui aussi, mais **après** la résolution du tour
      précédent : l'ouverture du tour suivant est différée jusqu'à la fin de la
      lecture.
    - L'enchaînement rapide (« Jusqu'à la fin », lots `M4`) **ne trace pas** : on
      n'animera jamais 400 tours.
    - Contrainte d'architecture : la trace est un **flux d'événements émis par le
      moteur**, comme au proto 1. L'affichage ne recalcule rien — si l'animation
      devait dériver une force elle-même, ce serait un bug (ADR-0003). La trace
      n'est produite **que sur demande** (`playMove(..., { trace: true })`) : l'IA
      simule des milliers de poses par partie et ne doit pas payer la construction
      des instantanés.
- `U10` 🧪 **La chaîne de ravitaillement est dessinée** : les Tuiles reliées à leur
  Roi sont visuellement distinctes des Tuiles coupées, et l'interface montre les
  **maillons critiques** (les Tuiles dont la mort couperait une branche). `F14`
  est une règle topologique : invisible, elle est injouable.

## 11. Métriques

- `M1` ✅ Force restante des deux Rois, tour par tour, **et soin cumulé reçu par
  chacun** : c'est la courbe qui dira si le Roi est encore tuable (§14).
- `M2` ✅ Tuiles posées et Tuiles détruites par tour, par camp, et **durée de vie
  moyenne par ID** — c'est ce qui dira si les Tuiles à 1 force (`J01`, `J02`,
  `N01`) existent vraiment (§14).
- `M3` ✅ **Histogramme des Couleurs imposées**, nombre de passes par camp, et
  nombre de tours où la Couleur imposée n'offrait qu'un seul coup : la mesure
  directe de la question 1 du §Objet et de l'importance de `C10`.
- `M4` ✅ Mode **lot** : N parties IA contre IA sur des `seed` successives, avec
  taux de victoire par camp, **répartition des causes de fin (`W1` / `W2` / `W3`)**,
  durée médiane en manches, et fréquence des matchs nuls. Si `W1` (Roi tué) devient
  rare, le soin est trop fort — c'est la mesure décisive du §14.
- `M5` ✅ **Avantage du premier joueur**, mesuré par `M4` : au-delà de ~55 % il
  faut une compensation (`Q12` : rien en v1, on mesure d'abord).
- `M6` 🧪 **Taux de ravitaillement** : part des Tuiles de chaque camp reliées à
  leur Roi, manche par manche, et nombre de coupures de chaîne. C'est la mesure de
  la question 3 du §Objet — si ce taux reste à ~100 % ou à ~0 %, la règle `F14` ne
  produit aucune décision.

## 12. Paramétrage

- `G1` ✅ **Exigence forte du brouillon** : tout ce qui est réglable vit dans un
  **fichier unique et lisible à la main**, hors du code.
- `G2` ✅ `Proto2Html/config/gameplay.json`, validé au chargement avec un message
  d'erreur explicite désignant le champ fautif, et un journal des filtrages
  silencieux (`C1`).
- `G3` ✅ Aucune valeur de gameplay en dur dans le code : forces, boucliers, effets,
  Decks, Couleurs actives, répartition des Couleurs, montant du soin, poids de
  l'IA, relief, positions des Rois, des Tours et des neutres. Une valeur en dur est
  un bug. Le code ne contient que le **répertoire des types d'effets** (`T4`).
- `G3b` ✅ Distinction à tenir : une **valeur** de gameplay va en configuration
  (une force, un pourcentage, un montant de soin, un poids d'IA) ; une **règle**
  tranchée s'écrit en code (« la Couleur persiste à travers une passe », « le soin
  ne touche que le camp actif », « l'attaque ne vise que l'adverse »). Les
  bascules de comportement des règles tranchées ont donc été **retirées** de la
  configuration : elles n'ont plus à être variables.
- `G4` ✅ `seed` unique pour tous les tirages (Couleurs des Espaces, mélange des
  Decks, choix de l'IA). Même `seed` → même partie.
- `G5` ✅ L'interface **recharge la configuration sans recompiler** (coller /
  importer le JSON, relancer), pour comparer deux réglages à la suite.

### Squelette proposé

```json
{
  "_lecture": "Réglage unique du proto 2 (GDD proto2 §12). Toute valeur de gameplay vit ici.",
  "seed": 1,
  "firstPlayer": "player",
  "handSize": 3,
  "startingColor": null,

  "_upkeepHeal": "F13 : dégâts retirés à chaque Tuile ravitaillée, à l'ouverture du tour de son camp. Levier d'équilibrage du §14.",
  "upkeepHeal": 1,
  "_upkeepHealsKing": "F13 : le Roi est EXCLU du soin (règle tranchée). Le drapeau reste exposé parce que le §14 en a fait le levier à re-mesurer.",
  "upkeepHealsKing": false,

  "colors": [
    { "id": "red",    "prefix": "R", "label": "Rouge — Attaque",     "hex": "#c0392b" },
    { "id": "blue",   "prefix": "B", "label": "Bleue — Magie",       "hex": "#2980b9" },
    { "id": "green",  "prefix": "V", "label": "Vert — Défense",      "hex": "#27ae60" },
    { "id": "black",  "prefix": "N", "label": "Noir — Nécromancie",  "hex": "#2c3e50" },
    { "id": "yellow", "prefix": "J", "label": "Jaune — Lumière",     "hex": "#f1c40f" }
  ],

  "board": {
    "radius": 2,
    "_blocked": "B11 : 2 Espaces au centre. 17 Espaces libres, 9 posables, territoires 7/7.",
    "blocked": [
      { "q": 0, "r": 1 },
      { "q": 0, "r": -1 }
    ],
    "_colorDistribution": "C1 : les Couleurs actives sont les clés à pourcentage > 0. Mettre une Couleur à 0 la retire du jeu et filtre les Decks.",
    "colorDistribution": { "red": 27, "blue": 22, "green": 22, "black": 13, "yellow": 16 },
    "symmetricColors": true
  },

  "_setup": "B4/B5/T6 : Rois, 2 Tours par camp, 2 Tuiles neutres. Tout est symétrique par rotation de 180°. Les Tours regardent le centre.",
  "setup": [
    { "side": "player",  "type": "N00", "q": -2, "r":  1 },
    { "side": "player",  "type": "V00", "q": -1, "r":  1 },
    { "side": "player",  "type": "V00", "q": -1, "r":  0 },
    { "side": "demon",   "type": "N00", "q":  2, "r": -1 },
    { "side": "demon",   "type": "V00", "q":  1, "r": -1 },
    { "side": "demon",   "type": "V00", "q":  1, "r":  0 },
    { "side": "neutral", "type": "B01", "q": -1, "r":  2 },
    { "side": "neutral", "type": "B01", "q":  1, "r": -2 }
  ],

  "tileTypes": [
    { "id": "R01", "force": 7 },
    { "id": "R04", "force": 3, "onPlace": [{ "kind": "gainShields", "amount": 1 }] },
    { "id": "R05", "force": 2, "onPlace": [{ "kind": "damage", "target": "enemyAdjacent", "amount": 2 }] },
    { "id": "B01", "force": 2, "aura": [{ "kind": "shields", "target": "allyAdjacent", "amount": 1 }] },
    { "id": "B02", "force": 4, "onPlace": [{ "kind": "recolorSpaces", "target": "adjacent", "color": "red" }] },
    { "id": "N00", "force": 20, "shields": 2, "role": "king" },
    { "id": "N01", "force": 1, "aura": [{ "kind": "silence", "target": "anyAdjacent" }], "immuneToSilence": true },
    { "id": "N03", "force": 3, "onPlace": [{ "kind": "damage", "target": "anyAdjacent", "amount": 2 }] },
    { "id": "V00", "force": 10, "role": "tower" },
    { "id": "J01", "force": 1, "aura": [{ "kind": "shields", "target": "enemyAdjacent", "amount": -2 }] },
    { "id": "J02", "force": 1, "aura": [{ "kind": "force", "target": "allyAdjacent", "amount": 2 }] }
  ],

  "decks": {
    "player": ["R01","R02","R03","R04","R05","R02","R03","R04","R05","R03",
               "B01","B02","B03","B01","B02","B03","B03","B03",
               "V01","V02","V03","V04","V01","V02","V03","V04",
               "N01","N02","N03","N02","N02",
               "J01","J01","J02","J03","J03","J03"],
    "demon": "sameAsPlayer"
  },

  "ai": {
    "demon": { "profile": "neutre", "level": "expert" },
    "player": null,
    "profiles": {
      "bourrin":  { "attack": 1.5, "defense": 0.5 },
      "defensif": { "attack": 0.5, "defense": 1.5 },
      "neutre":   { "attack": 1.0, "defense": 1.0 }
    },
    "levels": {
      "expert":   { "topN": 2 },
      "moyen":    { "topN": 5 },
      "passable": { "topN": 8 },
      "mauvais":  { "topN": 8, "skipBest": 2 }
    },
    "weights": {
      "enemyKingDamage": 10, "enemyForceDelta": 1, "enemyTilesKilled": 2,
      "enemySupplyCut": 2,
      "ownKingDamage": 12, "ownTilesLost": 3, "shieldsGained": 1, "ownForceDelta": 1,
      "ownTileSupplied": 2,
      "offeredColor": 0
    }
  }
}
```

  🧪 `tileTypes` est abrégé ci-dessus (types sans effet ni bouclier omis) ; le
  fichier réel contient les 20 types de `T3`.

## 13. Trace de référence

Ce n'est pas une règle, c'est le **test d'acceptation** du moteur. À vérifier dans
`Proto2Html/src/core/__tests__/combat.test.ts`.

Montage **propre à la trace**, ce n'est pas la configuration par défaut : rayon 4
**épinglé** (le Plateau par défaut est au rayon 2, `B11` — un test de combat ne
doit pas casser quand le Plateau change de taille),
`blocked: []`, `upkeepHeal: 0` (le soin est neutralisé pour isoler le combat), Roi
`demon` `N00` en `(4,-2)` (20 force, **2 boucliers**), Tour `demon` `V00` en
`(4,-1)` (10 force, 0 bouclier), aucune aura en jeu, la Couleur des Espaces
n'intervient pas. Le camp `player` joue.

### Cas 1 — attaque en aire, riposte plafonnée, boucliers du Roi

`player` pose `R01` (7) en `(3,-1)`, adjacent au Roi **et** à la Tour.

| Étape | Calcul | Résultat |
| --- | --- | --- |
| Bonus de pose | 0 allié adjacent | `R01` force 7 |
| Effets | `R01` n'en a pas | — |
| Instantané | — | `R01` 7/0 · Roi 20/**2** · Tour 10/0 |
| Attaque | Roi `+= max(0, 7−2) = 5` · Tour `+= max(0, 7−0) = 7` | Roi 15 · Tour 3 |
| Riposte | max adverse adjacent = **20** (instantané) → `R01 += 20−0` | `R01` = −13 |
| Destruction | `R01` ≤ 0 | `R01` retirée |

Une Tuile à 7 force a infligé 12 dégâts et est morte. Les 2 boucliers du Roi
absorbent 2 des 7 — et le soin, désactivé ici, en reprendrait 2 de plus par manche
en partie réelle (§14).

### Cas 2 — boucliers, dégâts d'effet, riposte maximale

Depuis le même montage, Roi et Tour intacts. `demon` pose `V03` (1 force, +3
boucliers) en `(3,-1)`.

| Étape | Calcul | Résultat |
| --- | --- | --- |
| Bonus de pose | 2 alliés adjacents (Roi, Tour) | `V03` force 3 |
| Effets | `gainShields 3` | `V03` 3/3 |
| Résolution | aucun adverse adjacent | rien |

Puis `player` pose `R05` (2 force, −2 aux adverses adjacents) en `(3,-2)`,
adjacent à `V03` et au Roi mais **pas** à la Tour.

| Étape | Calcul | Résultat |
| --- | --- | --- |
| Bonus de pose | 0 allié adjacent | `R05` force 2 |
| Effet `onPlace` | −2 aux adverses adjacents, **boucliers ignorés** (`E6`) | `V03` → 1/3 · Roi → **18**/2 |
| Destruction | aucune à ≤ 0 | — |
| Instantané | — | `R05` 2/0 · `V03` 1/3 · Roi 18/2 |
| Attaque | `V03 += max(0, 2−3) = 0` · Roi `+= max(0, 2−2) = 0` | `V03` 1/3 · Roi 18 |
| Riposte | max adverse adjacent = **18** (le Roi) → `R05 += 18−0` | `R05` = −16 |
| Destruction | `R05` ≤ 0 | `R05` retirée |

Ce cas discrimine quatre règles d'un coup : les boucliers annulent l'attaque de
résolution mais **pas** les dégâts d'effet (`F9`, `E6`) — c'est le seul moyen de
faire mal au Roi malgré ses 2 boucliers — et la riposte prend le **maximum** et
non la somme (`F8`). Si le moteur ne produit pas exactement ces nombres, l'une des
quatre est mal implémentée.

### Cas 3 — soin, ravitaillement et exclusion du Roi (`F13`, `F14`)

Montage : `upkeepHeal: 2` et `upkeepHealsKing: false` **épinglés** (le réglage
livré est à 1, on prend 2 ici pour que les nombres se lisent d'un coup). Roi
`player` en `(-4,2)` blessé de 6, une Tuile `player` `V04` (4 force) en `(-3,2)`
— adjacente au Roi, donc ravitaillée — et une Tuile `player` `V04` en `(0,0)`,
isolée. Les deux `V04` ont **3 dégâts**.

| Tour | `V04` en `(-3,2)` ravitaillée | `V04` en `(0,0)` isolée | Roi `(-4,2)` |
| --- | --- | --- | --- |
| avant | 1/4 (`damage` 3) | 1/4 (`damage` 3) | 14/20 (`damage` 6) |
| entretien du tour `player` | `damage` → 1, force **3** | inchangée, force **1** | inchangé, force **14** |
| entretien du tour suivant | `damage` → 0, force **4** | inchangée, force **1** | inchangé, force **14** |

Ce cas verrouille les trois points de `F13`/`F14` d'un coup : le plancher à 0 (la
Tuile ne monte pas au-dessus de 4), **le Roi ne récupère rien** alors qu'il est
ravitaillé, et **la Tuile isolée ne se soigne jamais**. Si `(0,0)` guérit, la chaîne
de ravitaillement est mal implémentée — c'est l'erreur la plus coûteuse du proto,
puisque `F14` est ce qui donne un sens à la géographie. Si le Roi guérit, c'est
tout l'équilibrage du §14 qui repart à zéro.

## 14. Analyse d'équilibrage — **mesurée**

✅ **Le problème d'équilibrage du Roi est résolu.** Il l'est par la conjonction de
deux décisions : le **Roi est exclu du soin** (`F13`) et le soin passe de 2 à
**1**. 30 parties IA contre IA par ligne (`npm run measure`), profil
`neutre`/`expert` des deux côtés, **plateau de rayon 2** (`B11`) :

| Réglage | Roi tué | Plateau plein | 2 passes | Nuls | Tours (méd.) | Rois en fin |
| --- | --- | --- | --- | --- | --- | --- |
| **soin 1, Roi non soigné — LIVRÉ** | **50 %** | 13 % | 37 % | **3 %** | 29 | 9,1 / 5,6 |
| soin 2, Roi non soigné | 47 % | 3 % | 50 % | 3 % | 34 | 9,6 / 6,8 |
| soin 0 (aucun soin) | 83 % | 0 % | 17 % | 3 % | 25 | 5,9 / 3,3 |
| soin 1, **Roi soigné** | 0 % | 17 % | 83 % | 23 % | 39 | 16,8 / 17,4 |
| soin 2, **Roi soigné** | 0 % | 3 % | 97 % | **57 %** | 40 | 20,1 / 19,9 |
| livré, Roi **1** bouclier | 73 % | 7 % | 20 % | 0 % | 22 | 5,1 / 3,6 |
| livré, Roi **3** boucliers | 7 % | 20 % | 73 % | 7 % | 41 | 12,8 / 11,7 |

**Ce que la mesure dit.** Le réglage livré donne une distribution saine : la moitié
des parties se conclut par la mort du Roi (`W1`), le reste par la famine de Couleur
(`W2`) ou le remplissage (`W3`), et **presque plus de matchs nuls** (3 %). Les
**trois voies de fin sont vivantes**, ce qui est mieux qu'un réglage où l'une
domine.

Les deux lignes « Roi soigné » montrent d'où venait le problème : c'était bien le
soin du Roi, et lui seul — à soin égal, l'exclure fait passer les Rois tués de 0 %
à 50 %. Les deux dernières lignes montrent où se trouve le réglage fin restant :
**les 2 boucliers du Roi sont maintenant le frein principal**. À 1 bouclier on
monte à 73 % de Rois tués et 22 tours ; à 3 boucliers on retombe à 7 %. Si le
rythme actuel paraît lent, c'est le bouclier qu'il faut toucher, pas le soin.

**`M5` / `Q12` — l'avantage du premier joueur est mesuré et net.** Sur **160
parties** (80 par orientation), le camp qui ouvre gagne **66 %** — 66 % quand c'est
`player`, 65 % quand c'est `demon`. La symétrie des deux mesures confirme que le
moteur ne favorise aucun camp ; l'avantage est purement de tempo. À 66 % contre le
seuil de ~55 % que `M5` s'était donné, **`Q12` est rouverte** : c'est le prochain
sujet d'équilibrage, maintenant que le Roi est réglé.

Suit l'analyse *a priori* du barème, conservée parce que son raisonnement — le
seuil de force efficace — reste l'outil de réglage. Ses chiffres supposent un soin
de 2 appliqué au Roi ; ils décrivent donc le problème d'origine, pas le réglage
actuel.

Suit l'analyse *a priori* qui avait annoncé ce résultat, conservée parce que son
raisonnement — le seuil de force efficace — reste l'outil de réglage.

### Le Roi est passé de « trop fragile » à intuable

Avant la revue, un Roi à 20 force nue mourait en 3 poses sacrificielles. Les trois
décisions de `Q1` — **2 boucliers**, **2 Tours**, **soin de 2 par manche** — se
cumulent, et le résultat est brutal :

Une attaque sur le Roi reste un échange fixe (l'attaquant meurt toujours à la
riposte de 20). Ce qu'elle rapporte, net d'une manche :

| Attaquant | Force efficace | Dégâts au Roi (−2 boucliers) | Net par manche (−2 soin) |
| --- | --- | --- | --- |
| `R01` + 2 alliés | 9 | 7 | **+5** |
| `R01` nue | 7 | 5 | **+3** |
| `R02` nue | 6 | 4 | **+2** |
| `R03` + 1 allié | 5 | 3 | **+1** |
| `R03` nue | 4 | 2 | **0 — aucun progrès** |
| `R04` nue | 3 | 1 | **−1** |
| `R05` (effet, ignore les boucliers) | 2 | 2 + 0 | **0** |
| `N03` (effet + combat) | 3 | 2 + 1 = 3 | **+1** |

D'où un seuil net et facile à retenir : **seule une Tuile de force efficace ≥ 5
fait reculer le Roi.** Dans le Deck rouge nu, ça ne laisse que `R01` (×1) et `R02`
(×2) — **3 Tuiles sur 37**.

Le chiffre le plus parlant : le Deck rouge entier, joué nu et au contact,
inflige **25** dégâts au Roi — `5,4,4,2,2,2,1,1` pour les huit Tuiles de combat
(force moins 2 boucliers) plus `2,2` pour les deux `R05`, dont l'effet traverse les
boucliers (`E6`). Sur les ~10 manches qu'il faut pour le jouer, le soin en rend
20 : **le Deck rouge complet fait donc environ 5 points de dégât net, sur les 20
du Roi.** Le Roi ne tombe qu'avec des attaques *soutenues* (bonus de pose `F3`,
aura `J02`), donc avec une position construite.

C'est peut-être exactement l'intention : le jeu devient un siège, et `F14` (le
ravitaillement) dit comment on construit ce siège. Mais le risque symétrique
était réel, et **c'est celui qui s'est réalisé** : `W1` ne se déclenche jamais,
toutes les parties se terminent par `W4` au départage. Ordre de correction, celui
qu'a confirmé la mesure :

1. **`upkeepHeal` à 1.** Le seuil de force efficace passe de 5 à **4** :
   `R03`, `V04` et `B02` redeviennent des menaces, et le Deck rouge nu passe de
   ~5 à **~15** dégâts nets.
2. **Retirer le soin au Roi** (le Roi n'est plus trivialement ravitaillé). Ça
   garde tout l'intérêt de `F14` pour les autres Tuiles et rend le Roi mortel.
   **C'est le seul levier qui fonctionne** (mesuré : 57 % de Rois tués), et
   combiné au point 1 c'est le meilleur réglage relevé (73 % de Rois tués, aucun
   nul). C'est celui que je recommande.
3. **Ramener `N00` à 1 bouclier** — mesuré **inefficace seul** : 0 % de Rois tués,
   le soin absorbe tout.

### Ce que le soin apporte, indépendamment de l'équilibrage

Le vrai gain de `F13`/`F14` n'est pas le nombre de points de vie : c'est que
**la géographie existe enfin**. Avant, `A4` (on pose où l'on veut) rendait le
plateau indifférent — une Tuile lâchée au contact du Roi adverse valait autant
qu'une Tuile posée chez soi. Maintenant :

- une position **avancée** ne se régénère pas : elle est jetable, et on le sait ;
- une position **construite en chaîne** se régénère : elle est un investissement ;
- **couper un maillon** assèche une branche entière — un nouveau type d'échange
  gagnant qui ne passe pas par les dégâts ;
- les Tuiles neutres (`T6`) **coupent la chaîne**, ce qui leur donne un rôle de
  terrain en plus de leur aura.

C'est la question 3 du §Objet, et `M6` la mesure.

### La famine de Couleur est une seconde voie de victoire

Conséquence de `C10` : un camp dont le Deck d'une Couleur est vide **passe** son
tour quand cette Couleur lui est imposée. Deux passes consécutives arrêtent la
partie (`W2`), et le départage se fait sur la force du Roi (`W4`). Donc :

- **Prendre l'avantage sur le Roi puis assécher l'adversaire est un plan complet**,
  qui n'exige jamais de tuer le Roi — et il devient *plus* attirant maintenant que
  tuer le Roi est difficile.
- Le Deck noir (5 Tuiles) et le Deck jaune (6) sont les cibles naturelles : après
  5 poses noires imposées, le noir de l'adversaire est mort.
- La répartition `C4` (13 % de noir) offre ~7 Espaces noirs sur 57 : assez pour
  exécuter le plan, pas assez pour qu'il soit automatique. Le rapport entre `C4` et
  `D6` est le **réglage le plus sensible du jeu**, et `M3` le mesure.
- `C12`/`Q15` décide du coût de ce plan : à `keep`, affamer l'adversaire vous
  enferme dans la même Couleur ; à `free`, la famine est gratuite et probablement
  dominante.

### Ce qui risque d'être inerte

- **`J01`, `J02`, `N01` ont 1 force** : n'importe quelle pose au contact les tue en
  échange d'une Tuile. Le soin ne les sauve pas (2 de soin ne ressuscite rien).
  Leurs auras n'existeront que posées à l'abri, en retrait — ce que `F14` encourage
  justement. C'est peut-être le soin qui les rend enfin jouables ; `M2` (durée de
  vie moyenne par ID) le dira.
- **`B03` (1 force, aucun effet)** est présente 4 fois dans le Deck bleu sur 8 :
  la moitié du bleu est du remplissage. C'est peut-être voulu (une Couleur qu'on
  subit), c'est peut-être un trou de contenu. Elle a maintenant un usage : maillon
  de chaîne bon marché (`F14`).
- **Les Couleurs rares sont devenues presque mortes au rayon 2** : à 13 % de noir
  sur 17 Espaces, le Plateau n'a que **2 Espaces noirs** (vérifié à l'écran), donc
  le Deck noir — 5 Tuiles, dont `N01` et `N03` — n'est quasiment jamais appelé, et
  la famine de noir n'est plus un plan de jeu. Le rapport entre `C4` et `D6` avait
  été calé sur un Plateau de 57 Espaces : il demande à être revu pour 17. C'est ce
  que `M3` mesure, et c'est le premier réglage à reprendre après `Q1`.
- **Le `B01` neutre, à l'inverse, est le seul élément de terrain *attractif*** du
  plateau : ses 6 Espaces donnent +1 bouclier à qui les occupe (`T7`, `Q17`).
  C'est le seul endroit du jeu qui récompense d'aller *quelque part* plutôt que
  d'aller *contre quelque chose* — à surveiller par `M6`, parce que si les deux
  camps s'y installent sans jamais s'y affronter, la Tuile ne crée pas de tension.

## 15. Questions de revue

Trois revues ont clos **16 des 17 questions**. Seule `Q13` reste ouverte, et elle
est volontairement reportée : elle ne concerne qu'une mécanique hors périmètre.
**Le corps de règles est complet — rien ne bloque l'implémentation.**

| # | Question | État |
| --- | --- | --- |
| ~~`Q1`~~ | Équilibrage du Roi : trop fragile à l'origine (3 poses), puis intuable après la première correction. | ✅ **Réglé en deux temps.** D'abord 2 boucliers sur `N00`, 2 Tours par camp et le soin des Tuiles ravitaillées (`T3`, `B5`, `F13`, `F14`) ; puis, la mesure ayant montré **0 % de Rois tués et 57 % de nuls**, le **Roi est exclu du soin** et le soin passe de 2 à **1**. Mesuré : 50 % de Rois tués, 3 % de nuls, 29 tours de médiane. Réglage fin restant : les boucliers du Roi (1 → 73 %, 3 → 7 %). |
| ~~`Q2`~~ | Couleur imposée injouable. | ✅ **Le camp passe son tour** (`C10`). |
| ~~`Q3`~~ | Modèle de main. | ✅ **Les `handSize` Tuiles du sommet du Deck de la Couleur imposée**, `handSize: 3` (`D3`). |
| ~~`Q4`~~ | Étape 3 de la résolution : quels voisins ? | ✅ **Adverses seulement** (`F7`). |
| ~~`Q5`~~ | Une Tuile tuée par un effet riposte-t-elle ? | ✅ **Non** (`E6`). |
| ~~`Q6`~~ | Deux `N01` adjacentes s'annulent-elles ? | ✅ **Non : `N01` est immunisée à l'annulation** (`E7`). |
| ~~`Q7`~~ | Portée de `J01`. | ✅ **Adjacentes** (`E8`). |
| ~~`Q8`~~ | Deux Rois morts dans la même résolution. | ✅ **Le camp actif gagne** (`W5`). |
| ~~`Q9`~~ | Collision de noms `neutre` profil / niveau. | ✅ Le niveau s'appelle **`passable`** (`I3`). |
| ~~`Q10`~~ | Barème IA redondant. | ✅ **On ne garde que le delta de force adverse** (`I5`). |
| ~~`Q11`~~ | Poids de la Couleur offerte. | ✅ Terme acquis (`I7`), `offeredColor: 0` au départ pour mesurer son apport. |
| `Q12` | **Avantage du premier joueur** — **rouverte par la mesure.** Sur 160 parties, le camp qui ouvre gagne **66 %** (66 % / 65 % selon l'orientation), contre un seuil de ~55 %. | 🧪 C'est le prochain sujet d'équilibrage, maintenant que `Q1` est réglée. Pistes : la première pose n'est plus libre (`startingColor` fixé), ou le second joueur ouvre avec une main plus large, ou une Tuile de compensation. À trancher. |
| `Q13` | **Retour d'une Tuile en main** (`T5`) : que deviennent ses `damage` et ses `grantedShields` ? C'est aussi ce qui rendra `E2` (« à l'apparition ») et `E3` (« N fois ») observables. | 🕐 **On verra plus tard** : hors périmètre v1, documenté et non implémenté. |
| ~~`Q14`~~ | Tuiles neutres. | ✅ **2 `B01` neutres pré-posées** (`T6`) — ce qui a ouvert `Q17`. Révisé : les 2 `N01` neutres initialement décidées ont été retirées au passage au rayon 2, leur zone de silence de 7 Espaces étant disproportionnée sur un Plateau de 17. |
| ~~`Q15`~~ | Couleur imposée après une passe. | ✅ **Elle persiste** et est imposée au camp suivant (`C12`). La Couleur ne se libère jamais après le premier tour. |
| ~~`Q16`~~ | Périmètre du soin. | ✅ **Les Tuiles du camp actif seulement** : un soin par camp et par manche (`F13`). |
| ~~`Q17`~~ | À qui un `B01` neutre donne-t-il son bouclier ? | ✅ **À tout le monde.** La relation d'alliance est **asymétrique** (`T7`) : pour une Tuile neutre toute autre Tuile est alliée, mais l'inverse est faux. Le `B01` neutre est un sanctuaire ; il ne profite d'aucune aura en retour. |

## 16. Hors périmètre du prototype

3D, art, caméra, méta-progression, Cercles ; déplacement et retour en main de
Tuiles ; effets « à l'apparition » et « N fois » ; Tuiles neutres posées depuis un
Deck (seules les 4 pré-posées de `T6` existent) ; IA à plus d'un demi-coup de
profondeur ; multijoueur en réseau. Le proto 1 (`../proto/`) n'est pas touché.

## 17. Historique

| Date | Évolution |
| --- | --- |
| 2026-09-07 | Ajout `U17` : un **fantôme** sur l'Espace survolé annonce la Tuile telle qu'elle sera posée — force avec son bonus d'alliés, boucliers, et deux signaux (`✕` elle ne survit pas, `⛌` elle survit hors ravitaillement). Les valeurs sont lues dans la trace du moteur plutôt que recalculées : un premier essai les reconstruisait à la main et annonçait 0 bouclier pour une `V02`, en oubliant les 3 gagnés à la pose. Correction au passage : les 2 `B01` neutres étaient en `(0,±2)` dans la configuration livrée, ce qui refermait la colonne centrale — variante explicitement écartée en `B11`. Replacées en `(-1,2)` / `(1,-2)` comme documenté. |
| 2026-09-07 | **Équilibrage du Roi réglé** (`Q1` close) : le **Roi est exclu du soin** et le soin passe de 2 à **1** (`F13`). Mesuré : **50 % de Rois tués, 3 % de nuls, 29 tours de médiane**, les trois voies de fin vivantes — contre 0 % de Rois tués et 57 % de nuls au réglage précédent. Le frein restant est identifié : les 2 boucliers du Roi (à 1 bouclier, 73 % de Rois tués ; à 3, 7 %). **`Q12` est rouverte** : sur 160 parties, le camp qui ouvre gagne **66 %** (66 % / 65 % selon l'orientation, donc un pur effet de tempo), contre un seuil de 55 % — c'est le prochain sujet. Deux comportements précisés et verrouillés par des tests, tous deux déjà corrects dans le moteur : une **aura est vivante dès la pose**, donc prise en compte avant le calcul des dégâts (`E4`), et une **`N01` éteint l'aura d'une Tuile neutre adjacente** (`E7`), seul moyen de neutraliser le sanctuaire d'un `B01` neutre. |
| 2026-09-07 | **Plateau ramené au rayon 2** (`B1`, `B11`) : 19 Espaces dont 17 libres et **9 posables**. Relief réduit à 2 Espaces bloqués (`(0,±1)`), colonne centrale volontairement percée en trois endroits pour rester non structurante. Rois en `(-2,1)` / `(2,-1)`, Tours tournées vers le centre, territoires 7/7, distance 4, 2 créneaux d'attaque par Roi chacun au contact d'une Tour. **Les 2 `N01` neutres sont retirées** (révision de `Q14`, `T6`) : leur zone de silence de 7 Espaces était disproportionnée sur 17. Mesures refaites : l'ordre des leviers du §14 est inchangé sur les trois rayons testés, mais le rendement du levier 2 baisse (47 % contre 57 % au rayon 3) — un Plateau plus petit rend le Roi *plus dur* à tuer, faute de place pour bâtir une position soutenue. Deux effets nouveaux : `W3` (Plateau plein) devient une vraie fin (3 à 17 %), et **les Couleurs rares deviennent presque mortes** — 2 Espaces noirs seulement, le Deck noir n'est plus appelé et la famine de noir n'est plus jouable. |
| 2026-09-07 | **Résolution animée** (`U16`) et **Plateau relisible** (`U1`, `U1b`). Le moteur émet désormais une trace d'étapes — pose, effets, attaque, riposte, une étape par vague de cascade (`F11`), entretien (`F13`) — que l'affichage rejoue dans le temps : forces interpolées, étiquettes « −5 » flottantes, destruction par contraction, et une bannière qui **nomme la règle appliquée** à chaque étape. La trace est un flux d'événements, produite seulement sur demande pour que l'IA n'en paie pas le coût, et elle n'influence aucun calcul (test dédié). Côté lisibilité : les Couleurs d'Espace sont délavées sur un fond clair, et les Tuiles posées reçoivent une texture par camp plus une ombre portée — on distingue une Tuile d'un Espace vide sans lire les chiffres. Un bug d'animation corrigé au passage : l'ouverture du tour suivant partait avant le premier tick de la lecture, et l'entretien écrasait l'animation du combat, qu'on ne voyait donc jamais. |
| 2026-09-07 | **Plateau ramené au rayon 3** (`B1`, `B11`) : 37 Espaces dont 33 libres et **23 posables**. Les Rois passent en `(-3,1)` / `(3,-1)` — les anciennes positions `(±4, ∓2)` sortaient du Plateau — avec les 2 Tours tournées vers le centre, ce qui conserve 2 créneaux d'attaque par Roi, chacun au contact du Roi *et* d'une Tour. Territoires 16/16, relief symétrique, aucun goulot. Mesures refaites : **l'ordre des leviers du §14 est inchangé**, et `W3` (Plateau plein) ne se déclenche qu'à 0-3 % malgré les 23 places. Bénéfice inattendu : `M5` devient net et parfaitement symétrique — le camp qui ouvre gagne 63 %, dans les deux sens. Les fixtures de test épinglent désormais leur rayon (§13). |
| 2026-09-07 | **Prototype implémenté** dans `Proto2Html/` (React + TypeScript, la trace du §13 servant de test d'acceptation). §14 passe de prédiction à **mesure** : au réglage décidé, 0 % de Rois tués et 77 % de nuls sur 30 parties ; le levier 2 (`upkeepHealsKing: false`, nouvelle valeur de configuration) est le seul à garder les deux voies de victoire (57 % / 43 %). Deux corrections nées de l'implémentation : `B7b` refuse un Roi sans Espace libre adjacent — le relief « bouchons » plus 2 Tours l'enfermait —, et le compte de `W3` passe de 51 à **47 places** posables (57 Espaces moins les 10 Tuiles pré-posées : les 4 neutres avaient été oubliées). Un vrai bug trouvé au premier lot : le tri stable du classement d'IA laissait l'ordre d'énumération des Espaces trancher les égalités de score, et `player` gagnait 19 parties sur 24 sur une position strictement symétrique — corrigé par le mélange germé qu'exigeait déjà `I8`, avec test de non-régression. |
| 2026-09-07 | **Troisième revue — le corps de règles est clos.** `Q15` : la Couleur imposée **persiste à travers une passe** et s'impose au camp suivant (`C12`) ; elle ne se libère donc jamais après le premier tour, et affamer une Couleur est un pari qui vous y enferme aussi. `Q16` : le soin ne touche que les Tuiles du **camp actif**, soit un soin par camp et par manche (`F13`). `Q17` : la **relation d'alliance est asymétrique** — pour une Tuile neutre toute autre Tuile est alliée, mais une Tuile de camp ne considère jamais une neutre comme alliée. Remontée en règle propre `T7`, avec sa table de vérité : tout le comportement des Tuiles neutres (hors combat, coupe-chaîne, sanctuaire du `B01`) s'en déduit au lieu d'être asserté séparément. Confirmation que **l'attaque et la riposte ne visent que les Tuiles adverses** (`F5`). Ajout `G3b` : une valeur va en configuration, une règle tranchée va en code — les bascules `onImposedColorUnavailable`, `imposedColorAfterPass` et `upkeepScope` sont retirées de la configuration, seul `upkeepHeal` reste un levier. |
| 2026-09-07 | **Deuxième revue — les 8 questions restantes tranchées, 2 nouvelles ouvertes.** `Q1` : le Roi reçoit **2 boucliers**, **2 Tours** par camp, et une nouvelle règle de **soin** — les Tuiles reliées à leur Roi par une chaîne alliée récupèrent 2 force par manche (`F13`, `F14`). Cette règle fait exister la géographie que `A4` niait, et ajoute deux critères à l'IA (`I5b`), une exigence d'affichage (`U10`), une métrique (`M6`) et un cas de trace (§13 cas 3). `Q14` : **4 Tuiles neutres pré-posées** (2 `N01`, 2 `B01`), hors combat et coupant la chaîne (`T6`). `Q6` : `N01` est **immunisée à l'annulation**. `Q3`, `Q9`, `Q10`, `Q12`, `Q13` tranchées. **Le relief `B11` a dû changer** : la variante « bouchons » ne laissait que 2 Espaces libres au contact du Roi, que les 2 Tours occupaient entièrement — Roi inatteignable. Remplacée par un mur court au centre (57 Espaces libres, 26/26, 2 créneaux d'attaque par Roi), et validation `B7b` ajoutée pour refuser ce cas. Nouvelles questions `Q16` (périmètre du soin) et `Q17` (aura d'un `B01` neutre). §14 refait : le seuil de force efficace pour menacer le Roi est passé à **5**, et le Deck rouge nu ne fait plus qu'~1 dégât net — le risque a changé de sens. |
| 2026-09-07 | **Première revue.** Validation de `B3`, `B6`-`B8`, `B12`, `C3`-`C6`, `C8`, `C11`, `T4`, `T5`, `D2`-`D5`, `A2`, `A5`, `F1`, `F4`, `F6`-`F11`, `E5`-`E7`, `E9`, `W2`, `W4`, `W5`, `I5`-`I9`, tous les `U`, tous les `M`, `G2`-`G5`. Décisions : `B10` l'asymétrie du relief est acceptée ; `B11` relief réduit à **4 Espaces** ; `C1` les **Couleurs actives sont déclarées en configuration** et les Decks en sont filtrés ; `C10` la Couleur imposée injouable **fait passer le tour** (`Q2`) — ce qui fait de la famine de Couleur une seconde voie de victoire ; `E8` `J01` ne vise que les **adjacentes** (`Q7`) ; `W3` la partie se termine quand le Plateau est **plein**, et `W3b` la finitude des Decks garantit la terminaison — `maxTurns` supprimé ; `T5` amorce le **retour d'une Tuile en main**. Nouvelle question `Q15` (`C12`). |
| 2026-09-07 | Mise au propre de `gameplay.md` : numérotation des règles, modèle d'état stocké / dérivé (`F1`), résolution simultanée sur instantané (`F6`), modèle d'annulation de `N01` (`E7`), trace de référence, 14 questions de revue. Deux constats mesurés : le relief du brouillon donne des territoires 38/14 (`B10`), et le Roi meurt en 3 poses au barème initial (§14, `Q1`). |
