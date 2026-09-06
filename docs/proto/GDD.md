# GDD du prototype — Rencontre « l'Escalier »

Ce document est la **source de vérité du prototype** (`ProtoHtml/`). Il est la
mise au propre de la note de conception [`gameplay.md`](gameplay.md), qui reste
le brouillon d'origine.

Périmètre : il décrit **une seule Rencontre**, jouable en HTML, dont l'objet est
de répondre à une question précise — *l'économie de production est-elle
intéressante à régler et à jouer ?* Il ne décrit ni la boucle méta, ni les
Cercles, ni la 3D : ça reste [`../GDD.md`](../GDD.md).

## Convention de lecture

| Marque | Sens |
| --- | --- |
| ✅ | **Validé** : vient du brouillon, ou tranché en revue (voir §17). |
| 🧪 | **Proposition** comblant un trou du brouillon — à valider ou corriger en revue. |
| ❓ | **Trou bloquant** — plus aucune règle n'en porte : les 12 questions de conception sont tranchées (§15). |

Les règles sont numérotées pour que la revue et le code puissent les citer
(`// règle D4`) : `B` plateau, `T` tuiles, `R` ressources et recettes,
`C` cycle, `D` déplacement, `P` production, `X` démon, `E` fin de partie,
`K` métriques, `U` interface, `G` paramétrage.

## 1. Pitch de la Rencontre ✅

Le joueur affronte un **Démon**. Il doit **faire progresser la construction de
l'Escalier** — c'est lui que le pitch appelle « la tour » — en y acheminant des
pierres, produites par une chaîne de bâtiments qu'il installe tuile par tuile. Le démon, lui, œuvre à détruire cette
progression de façon régulière. Le joueur gagne s'il produit plus vite, ou s'il
livre des pierres de meilleure qualité.

Tension centrale visée : *acheminer vite du matériau brut* contre *investir des
tours dans une chaîne de raffinage plus rentable*.

## 2. Vocabulaire (concept ↔ code)

À reporter dans [`../LEXIQUE.md`](../LEXIQUE.md) **après validation de ce
document** (les noms peuvent encore changer en revue).

### Structure

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Plateau de jeu | `Board` | Ensemble des Espaces de la Rencontre. |
| Espace hexagonal (case du plateau) | `HexSpace` | 🧪 Emplacement, vide ou occupé par une Tuile. Distinct de la Tuile elle-même. |
| Tuile hexagonale | `HexTile` | Ce que le joueur pose sur un Espace. |
| Coordonnée axiale (q, r) | `HexCoord` | Existant, voir ADR-0001. |
| Type de tuile (donnée) | `TileDefinition` | Data, pas de logique (ADR-0003). |
| Bâtiment | `Building` | 🧪 Fonction spéciale portée par une Tuile. |

### Entités et flux

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Âme | `Soul` | Travailleur/transporteur du joueur. |
| Sbire | `Minion` | Équivalent du démon. |
| Camp | `Side` | `player` \| `demon`. |
| Ressource | `Resource` | Consommée/produite par un Bâtiment, portée par une Âme. |
| Recette | `Recipe` | IN → OUT en N Ticks, attachée à un type de Bâtiment. |
| Stockage d'entrée / de sortie | `inputStorage` / `outputStorage` | 🧪 Deux réserves distinctes par Bâtiment (§6). |
| Accès (un des 6 côtés) | `Access` | |
| Sortie / Entrée | `Exit` / `Entrance` | 🧪 Un Accès est l'un ou l'autre, jamais les deux (D3). |
| Progression de l'Escalier | `StairwayProgress` | Compteur de victoire. |
| Réserve d'âmes (budget de la Rencontre) | `soulBudget` | Nombre total d'Âmes que le `Puits` fera apparaître sur toute la partie (§11). |
| Âme dépensée | `soulsSpent` | Âme apparue puis détruite. Ne revient jamais. |
| Chemin parcouru par une entité | `visitedSpaces` | Espaces déjà traversés ; y revenir détruit l'entité (`D16`). |

### Temps

Le mot « tour » est employé dans le brouillon pour deux choses différentes ; le
proto les distingue :

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Manche : 1 pose de tuile + N Ticks | `Round` | 🧪 Nommage à valider. |
| Tick de simulation | `Tick` | 🧪 L'unité dans laquelle sont exprimées les durées de recettes. |

### Bâtiments

| Concept (FR) | Terme code (EN) | Camp |
| --- | --- | --- |
| Puits des âmes | `SoulWell` | Joueur |
| Gouffre | `Chasm` | Démon |
| Carrière | `Quarry` | Joueur |
| Tailleur de pierre | `Stonecutter` | Joueur |
| Atelier | `Workshop` | Joueur |
| Sculpteur | `Sculptor` | Joueur |
| Escalier | `Stairway` | Neutre (cible des deux camps) |
| Aiguillage (« Split ») | `Splitter` | 🧪 Neutre, sans bâtiment |
| Vide | `Empty` | Neutre, sans bâtiment |

### Ressources

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Basalte brut | `RawBasalt` | |
| Basalte dégrossi | `CutBasalt` | |
| Outil en basalte | `BasaltTool` | |
| Pavé en basalte | `BasaltBlock` | |

Il n'existe **pas** de Ressource « Démon » : `Démon` nomme l'adversaire, et le
matériau que le démon livre à l'`Escalier` est **le Sbire lui-même** (`X3`).

## 3. Plateau

- `B1` ✅ Le Plateau est un ensemble d'**Espaces hexagonaux**, en coordonnées
  axiales `(q, r)` (ADR-0001).
- `B2` ✅ Le Plateau peut être **troué / non convexe** : la règle `D5` suppose
  qu'un Espace peut ne pas exister en face d'une Sortie.
- `B3` ✅ Le Plateau est **fixe** pendant la Rencontre : sa liste d'Espaces vient
  de la configuration (§13), le joueur ne l'agrandit pas.
- `B4` ✅ Un Espace porte **au plus une Tuile**. Une Tuile posée n'est ni
  déplacée ni retirée.
- `B5` ✅ Certaines Tuiles sont **pré-posées au montage** (configuration) : le
  `Puits des âmes` et l'`Escalier` du joueur, le `Gouffre` du démon.
- `B6` ✅ **La forme du Plateau et la position des Tuiles de départ viennent
  entièrement de la configuration** (`G2`) : aucune disposition n'est écrite en
  dur, c'est une variable de réglage comme les recettes.
- `B7b` 🧪 Disposition par défaut proposée, à valider : Plateau hexagonal de
  **rayon 3** (37 Espaces), et le réseau du démon réduit au minimum demandé
  (`Gouffre` + deux Tuiles vides + `Escalier`) :

| Espace `(q,r)` | Tuile pré-posée | Sortie | Camp |
| --- | --- | --- | --- |
| `(0,0)` | `Escalier` | aucune | neutre |
| `(3,0)` | `Gouffre` | vers `(2,0)` | démon |
| `(2,0)` | `Vide` | vers `(1,0)` | démon |
| `(1,0)` | `Vide` | vers `(0,0)` | démon |
| `(-3,0)` | `Puits des âmes` | au choix du joueur | joueur |

  Le Sbire met donc 3 Ticks à rejoindre l'`Escalier`, et le joueur dispose de
  32 Espaces libres pour ~20 poses (`E4`), en évitant les 3 Espaces du démon
  (`B8`). La distance `Puits` → `Escalier` (3 Espaces à vol d'oiseau) est le
  levier le plus direct pour rendre le transport plus ou moins coûteux.
- `B8` ✅ **Contrainte de disposition : les deux réseaux ne se croisent jamais.**
  La configuration du terrain doit garantir qu'un chemin praticable par les Âmes
  ne traverse aucune Tuile du démon, et réciproquement. Le seul Espace commun
  aux deux camps est l'`Escalier`, destination des deux réseaux.
- `B9` 🧪 Corollaire technique : le chargement de la configuration **refuse** un
  terrain qui viole `B8` (validation `G1`), plutôt que de laisser le moteur
  arbitrer un cas de croisement qui n'a aucune règle.

## 4. Orientation des hexagones

- `B7` ✅ Orientation *pointy-top*, les 6 Accès étant les 6 côtés. Purement
  visuel : n'affecte aucune règle (le proto permet déjà de basculer
  pointy/flat pour trancher l'ADR à venir).

## 5. Tuiles et bâtiments

- `T1` ✅ Une Tuile porte **zéro ou un Bâtiment**. Chaque Bâtiment a une
  fonction spéciale.
- `T2` ✅ Un Bâtiment appartient à un camp : une Âme ne travaille que dans un
  Bâtiment du joueur, un Sbire que dans un Bâtiment du démon. **Seul
  l'`Escalier` est neutre** : il porte des Recettes propres à chaque camp
  (`R5`, `X3`) et accueille les entités des deux camps (`B8`).
- `T3` ✅ Le nombre de Sorties possibles **dépend du type de Tuile**.
- `T4` ✅ Table des Sorties :

| Type de tuile | Bâtiment | Sorties autorisées | Rôle |
| --- | --- | --- | --- |
| `Empty` | — | 1 | Convoyeur : fait avancer le flux. |
| `Splitter` | — | 2 ou 3 | Répartit le flux entrant (`D8`). Ne se distingue du `Vide` **que** par ce nombre de Sorties (`Q9`) ; la différence deviendra structurante quand le catalogue sera restreint (`T7`). |
| `Quarry` | oui | 1 | Produit du `RawBasalt`. |
| `Stonecutter` | oui | 1 | `RawBasalt` → `CutBasalt`. |
| `Workshop` | oui | 1 | `CutBasalt` → `BasaltTool`. |
| `Sculptor` | oui | 1 | `CutBasalt` + `BasaltTool` → `BasaltBlock`. |
| `SoulWell` | oui | 1 | Fait apparaître les Âmes. |
| `Chasm` | oui | 1 | Fait apparaître les Sbires. |
| `Stairway` | oui, **neutre** | **0** | Consomme les pierres et les entités : sans Sortie, toute Âme ou Sbire qui y a livré est détruit (`D6`). |

- `T5` ✅ C'est le **joueur** qui désigne les Sorties d'une Tuile, au moment de
  la poser, pendant sa phase de pose (`C1`). Il peut les **reconfigurer
  librement pendant n'importe quelle phase de pose ultérieure**, sans coût :
  le proto cherche à explorer des tracés, pas à punir l'erreur de pose.
- `T6` ✅ Le joueur pose une Tuile **au choix dans un catalogue illimité**, sur
  n'importe quel Espace vide, **sans coût en Ressource**. L'économie de pose
  n'est pas l'objet du proto ; si elle doit exister, elle viendra après.
- `T7` 🧪 Le catalogue posable sera **restreint** dans une itération ultérieure
  (liste réduite, voire main de Tuiles). Il vit donc en configuration (`G2`) et
  non en dur, pour que la restriction ne soit qu'un changement de données.

## 6. Ressources, recettes et stockage

- `R1` ✅ Une Recette est attachée à un type de Bâtiment : elle indique les
  Ressources IN, les Ressources OUT et une durée en Ticks.
- `R2` ✅ Table des recettes (valeurs de départ, **l'enjeu de réglage du
  proto** — donc en configuration, §13) :

| Bâtiment | Ressources IN | Ressources OUT | Ticks |
| --- | --- | --- | --- |
| `Quarry` | — | 2 × `RawBasalt` | 1 |
| `Stonecutter` | 1 × `RawBasalt` | 2 × `CutBasalt` | 2 |
| `Workshop` | 1 × `CutBasalt` | 1 × `BasaltTool` | 1 |
| `Sculptor` | 1 × `CutBasalt` + 1 × `BasaltTool` | 1 × `BasaltBlock` | 1 |
| `Stairway` | 1 × `RawBasalt` | +1 progression | 1 |
| `Stairway` | 1 × `CutBasalt` | +3 progression | 2 |
| `Stairway` | 1 × `BasaltBlock` | +7 progression | 3 |
| `Stairway` (démon) | **le Sbire lui-même** | **−1** progression | 1 |

- `R3` ✅ Un Bâtiment a **deux réserves distinctes** : `inputStorage` (ce que
  les Âmes y déposent, ce que les Recettes consomment) et `outputStorage` (ce
  que les Recettes produisent, ce que les Âmes emportent). Sans cette
  séparation, une Recette dont une Ressource est à la fois IN et OUT devient
  ambiguë.
- `R4` ✅ Les deux réserves sont de **capacité illimitée** dans le proto. Une
  limite de stock est un levier de réglage intéressant, mais elle ajoute une
  règle de blocage (que fait une Âme qui ne peut pas déposer ?) : à ajouter
  seulement si le réglage des recettes seul se révèle trop mou.
- `R5` ✅ L'`Escalier` a **plusieurs Recettes**. À chaque tentative de
  démarrage, on retient, **parmi les Recettes du camp de l'entité**, celle dont
  les IN sont disponibles et qui rapporte le plus de progression par Tick
  (`BasaltBlock` : 2.33 ; `CutBasalt` : 1.5 ; `RawBasalt` : 1.0). Côté démon
  une seule Recette existe (`X3`), le tri est donc sans objet.
- `R6` ✅ La progression de l'`Escalier` va dans `StairwayProgress`, pas dans
  un `outputStorage` : aucune entité ne peut rien emporter d'un `Escalier`.
- `R8` 🧪 `StairwayProgress` est **borné à 0** : la Recette du démon (`X3`) ne
  peut pas le rendre négatif. Sans cette borne, le démon pourrait creuser une
  dette que le joueur devrait combler avant de commencer à construire.
- `R7` ✅ Une Âme porte **1 Ressource** par défaut. La capacité de portage est
  prévue comme évolutive (extension future), donc paramétrée dès maintenant.

## 7. Cycle de jeu

- `C1` ✅ Une **Manche** = le joueur pose (ou reconfigure) **une** Tuile, puis
  on déroule **N Ticks** de simulation. `N = 5` au départ (configurable).
- `C2` ✅ Un **Tick** déroule 6 phases, dans cet ordre strict :

| # | Phase | Camp |
| --- | --- | --- |
| 1 | Apparition : le `Puits des âmes` fait apparaître 1 Âme | Joueur |
| 2 | Production : chaque Âme dans un Bâtiment du joueur fait progresser sa production de 1 | Joueur |
| 3 | Déplacement : chaque Âme non bloquée par une production tente de se déplacer | Joueur |
| 4 | Apparition : le `Gouffre` fait apparaître 1 Sbire | Démon |
| 5 | Production (idem, côté démon) | Démon |
| 6 | Déplacement (idem, côté démon) | Démon |

  Formulation équivalente ✅ : *Âmes puis Sbires font, dans l'ordre, Apparition
  → Production → Déplacement.*

- `C3` ✅ Chaque Âme / Sbire porte un **ID**. À l'intérieur d'une phase, les
  entités sont traitées **une par une, séquentiellement, par ID croissant**.
  C'est ce qui rend la simulation déterministe et rejouable.
- `C4` ✅ La nouvelle Âme apparaît **sur l'Espace du `Puits des âmes`**, quel
  que soit le nombre d'Âmes déjà présentes : plusieurs entités d'un même camp
  cohabitent librement sur un Espace.
- `C5` ✅ L'Apparition est plafonnée par la **réserve d'âmes** : le `Puits`
  fait apparaître 1 Âme par Tick **tant que `soulsSpawned < soulBudget`**, puis
  s'arrête définitivement. `soulBudget = 100` au départ (configurable, §13).
- `C5b` ✅ Il s'agit d'un **budget total sur la partie**, pas d'un plafond de
  population simultanée : une Âme détruite ne libère pas de place, elle est
  dépensée. Aucune limite ne porte sur le nombre d'Âmes vivantes en même temps
  (au maximum ~100, la cadence d'apparition étant de 1 par Tick).
- `C5c` ✅ Le budget vaut pour **toutes** les disparitions, sans distinction de
  cause : une Âme perdue dans un tracé sans issue coûte autant qu'une livraison
  réussie.
- `C6` ✅ Ordre de résolution d'une phase de pose : la pose et la
  reconfiguration prennent effet **avant** le Tick 1 de la Manche.

## 8. Règles de déplacement

S'appliquent identiquement aux Âmes et aux Sbires. ✅ sauf mention.

- `D1` Une Tuile a 6 Accès, un par côté de l'hexagone.
- `D2` Le joueur convertit certains Accès en **Sorties** (nombre selon `T4`).
- `D3` Tout Accès qui n'est pas une Sortie est une **Entrée**.
- `D4` Une entité qui se déplace emprunte une Sortie de sa Tuile pour rejoindre
  l'Espace adjacent. Un déplacement fait passer d'un Espace au suivant, **1
  Espace par Tick**.
- `D5` Le déplacement n'est possible que si, en face de la Sortie, il y a une
  Tuile **dont l'Accès en regard est une Entrée**. Pas de Tuile en face, ou une
  Sortie en face d'une Sortie : le déplacement échoue.
- `D6` Une entité qui **tente de se déplacer et ne peut pas est détruite**.
  C'est la mécanique de coût de la Rencontre, pas un effet de bord :
  l'`Escalier` n'ayant aucune Sortie (`T4`), **livrer coûte une Âme**. Un tracé
  mal branché en coûte aussi, sans rien livrer.
- `D7` Une entité **en cours de production** ne se déplace pas (`P5`). Une
  entité qui **vient de terminer** sa production au Tick courant se déplace
  normalement dans la phase 3 du même Tick.
- `D8` Quand une Tuile a plusieurs Sorties, un **compteur par Tuile** répartit
  les entités équitablement entre les Sorties (tourniquet). Une règle spéciale
  d'un type de Tuile peut surcharger cette répartition.
- `D9` ✅ Le compteur du tourniquet n'avance **que sur un départ effectif** ; si
  la Sortie désignée est impraticable (`D5`), l'entité est détruite (`D6`) et le
  compteur reste sur cette Sortie. Alternative : essayer les autres Sorties
  avant de détruire — plus permissif, mais rend le tracé moins lisible.
- `D10` **Dépôt.** Quand une entité arrive sur un Bâtiment de son camp en
  portant une Ressource figurant dans les IN de la Recette, elle la dépose dans
  l'`inputStorage`.
- `D11` ✅ Une entité portant une Ressource **absente** des IN de la Recette la
  conserve et continue son chemin.
- `D12` **Ramassage.** Quand une entité quitte un Bâtiment et que
  l'`outputStorage` contient une Ressource, elle en prend autant que sa
  capacité le permet (1 par défaut, `R7`).
- `D13` ✅ Le dépôt (`D10`) a lieu **à l'arrivée** (phase de déplacement du Tick
  T), le ramassage (`D12`) **au départ** (phase de déplacement du Tick T+1). Une
  entité ne fait donc jamais dépôt *et* ramassage dans le même Tick.
- `D14` ✅ **Pas de croisement des camps, garanti par le terrain.** Le moteur ne
  contient aucune règle d'interaction entre Âmes et Sbires : c'est la
  disposition (`B8`) qui garantit que le réseau du joueur et celui du démon
  n'ont aucune Tuile en commun, tous deux menant à l'`Escalier`.
- `D15` ✅ Sur l'`Escalier`, seul Espace partagé, Âmes et Sbires **cohabitent
  sans s'affronter** : chacun suit la Recette de son camp (`R5`, `X3`) et est
  détruit ensuite faute de Sortie (`D6`).
- `D16` ✅ **Pas de retour en arrière.** Chaque entité mémorise les Espaces
  qu'elle a traversés (`visitedSpaces`). Si un déplacement l'amènerait sur un
  Espace déjà visité, **elle est détruite**. Le trajet d'une entité est donc
  toujours un chemin simple.
- `D17` 🧪 Précisions d'application de `D16`, à valider : l'entité est détruite
  **au moment où elle entrerait** sur l'Espace déjà vu — elle n'y entre pas, ne
  dépose donc rien (`D10`) et sa charge est perdue, exactement comme un
  déplacement impossible (`D6`). Rester plusieurs Ticks sur un même Espace
  (production) n'est pas un retour : `D16` ne se déclenche que sur une entrée.
- `D18` 🧪 Conséquences de `D16`, à garder en tête au réglage :
    - une entité ne peut **jamais** repasser deux fois par le même Bâtiment,
      ce qui confirme qu'une Âme ne livre qu'une seule fois (`E6`) ;
    - la durée de vie d'une entité est bornée par le nombre d'Espaces du
      Plateau, donc **la partie se termine toujours** (`E7` réglé) ;
    - un `Aiguillage` mal branché qui renvoie le flux vers l'amont ne crée plus
      une boucle infinie mais **tue les entités** : c'est une erreur de tracé
      qui se paie en Âmes, et qui doit être visible dans les métriques (`K1`).

## 9. Règles de production

- `P1` ✅ Une entité tente de suivre la Recette de sa Tuile si **et seulement
  si** : la Tuile porte un Bâtiment de son camp doté d'une Recette, **et**
  l'entité ne porte rien, **et** elle n'a pas déjà une production en cours pour
  ce Bâtiment.
- `P2` ✅ Le démarrage exige que l'`inputStorage` contienne **toutes** les
  Ressources IN. Si oui : l'entité les **retire du stockage** et compte 1 Tick
  de production. Si non : elle ne démarre pas.
- `P3` ✅ Une Recette de plusieurs Ticks est menée à terme par **l'entité qui l'a
  démarrée** — pas par une autre.
- `P4` ✅ Au Tick où le compteur atteint la durée de la Recette, l'entité place
  les Ressources OUT dans l'`outputStorage` (ou fait varier
  `StairwayProgress`, `R6`). Elle est alors **libérée** : elle se déplace dans
  la phase de déplacement du même Tick (`D7`), en emportant ce qu'elle peut
  (`D12`).
- `P5` ✅ Une Recette de durée 1 Tick **démarre et se termine dans la même
  phase de production** : les IN sont consommés et les OUT produits au même
  Tick.
- `P6` ✅ **Une production est portée par une entité, pas par un Bâtiment.**
  Deux Âmes dans la même `Carrière` mènent deux productions indépendantes,
  chacune puisant dans l'`inputStorage` commun : le débit d'un Bâtiment est
  **proportionnel au nombre d'entités présentes**, et la consommation de
  Ressources IN l'est aussi. Un Bâtiment n'a donc pas de débit propre — c'est
  le nombre d'Âmes qu'on lui envoie qui le détermine.
- `P7` ✅ Une entité qui a échoué à démarrer (`P2`) n'est pas bloquée : elle se
  déplace normalement au même Tick (`D7`).
- `P8` ✅ Une entité détruite (`D6`) en cours de production est **remboursée** :
  les Ressources IN déjà consommées **retournent dans l'`inputStorage`** et la
  progression de la Recette est abandonnée. Le cas ne devrait pas se produire
  avec les règles actuelles (une entité en production ne se déplace pas, `D7`,
  donc ne peut pas être détruite par `D6`) — la règle est là pour que de futures
  règles de destruction ne fassent pas disparaître silencieusement de la
  matière.

## 10. Le démon

Le démon nuit **par le même moteur que le joueur**, mais sans économie : ses
Sbires marchent jusqu'à l'`Escalier` et s'y consument, chacun retirant 1 à la
progression. Aucun Bâtiment de production côté démon dans cette itération.

- `X1` ✅ Le démon dispose d'un `Gouffre` qui fait apparaître 1 Sbire par Tick,
  dans la limite de sa réserve : **`minionBudget = 200`** (configurable, `G2`).
- `X2` ✅ Les Sbires suivent **exactement** les mêmes règles de déplacement
  (§8) et de production (§9) que les Âmes.
- `X3` ✅ **L'`Escalier` porte une Recette propre au démon**, dont le matériau
  est **le Sbire lui-même** : arrivé sur l'`Escalier`, un Sbire exécute au Tick
  suivant une Recette de 1 Tick qui **retire 1 à la progression** (bornée à 0,
  `R8`), puis est détruit faute de Sortie (`D6`). Le Sbire ne transporte rien :
  il *est* la charge.
- `X4` ✅ **Le démon n'a aucune économie** dans cette itération : pas de
  Bâtiment de production, pas de Ressource de sabotage. Son réseau est réduit au
  strict nécessaire — `Gouffre` → deux Tuiles `Vide` → `Escalier` (`B7b`) — soit
  3 Ticks de marche avant la première ponction.
- `X5` ✅ Le démon **ne pose pas de Tuile** et n'a pas d'IA dans le proto : sa
  disposition est **entièrement décrite dans la configuration** (disposition de
  départ + poses programmées par Manche). Une IA d'adversaire n'apprend rien
  sur le réglage des recettes, et rend les parties non comparables entre deux
  essais de réglage.
- `X6` 🧪 Conséquence : le démon est une **horloge**, pas un adversaire à
  réguler. Sa pression ne dépend que de deux nombres, la cadence du `Gouffre` et
  la distance `Gouffre` → `Escalier`. C'est délibérément le minimum jouable ;
  une vraie économie côté démon réutilisera le même moteur le jour où elle sera
  définie.

## 11. Conditions de fin

La Rencontre est un **problème d'optimisation d'une ressource épuisable** :
combien de progression le joueur arrive-t-il à extraire de 100 Âmes ?

- `E1` ✅ **Victoire** : `StairwayProgress` atteint la cible (`stairwayTarget`).
  La partie s'arrête immédiatement.
- `E2` ✅ **Défaite** : la réserve est épuisée (`soulsSpawned == soulBudget`)
  **et** il ne reste aucune Âme vivante sur le Plateau **et**
  `StairwayProgress < stairwayTarget`.
- `E3` ✅ La défaite se teste **à la fin de chaque Tick**, après la phase 6. Il
  peut donc s'écouler de nombreux Ticks entre la dernière apparition et la
  défaite : les Âmes en transit ou en production continuent de jouer, et une
  livraison de dernière minute peut encore faire gagner.
- `E4` ✅ **Conséquence du budget sur la durée de partie** : à 1 Âme par Tick et
  `ticksPerRound = 5`, la réserve de 100 s'épuise en ~20 Manches, donc le joueur
  pose ~20 Tuiles dans une partie. Le budget fixe donc *aussi* la longueur de la
  partie et la taille du réseau constructible : c'est la cadence d'apparition,
  pas le budget, qu'il faut bouger pour découpler les deux.
- `E5` ✅ **Cible : `stairwayTarget = 200`** (configurable, `G2`). Le
  raisonnement qui a mené à ce nombre est conservé ci-dessous : c'est lui qu'il
  faudra rejouer si les recettes changent — et il doit déjà l'être une fois
  `X3` pris en compte (`E8`).
- `E6` ✅ Raisonnement, à confirmer par la simulation :
  chaque Âme meurt à l'`Escalier` après **une seule** livraison (`D6` + capacité
  de portage 1), donc la progression maximale d'une partie est bornée par
  `100 × (progression de la meilleure pierre livrable)`.

| Pierre livrée | Progression | Plafond théorique sur 100 Âmes |
| --- | --- | --- |
| `RawBasalt` | +1 | ~100 |
| `CutBasalt` | +3 | ~300 |
| `BasaltBlock` | +7 | ~700 |

Une cible **au-dessus de 100** rend donc le `Basalte brut` seul mathématiquement
insuffisant : le joueur *doit* raffiner. 200 laisse la voie `CutBasalt` viable
mais tendue, et récompense franchement la voie `Pavé`. C'est le premier nombre à
régler dès que la simulation tourne.

- `E7` ✅ **La partie se termine toujours.** `D16` borne la durée de vie d'une
  entité par le nombre d'Espaces du Plateau, et la réserve d'Âmes est finie : ni
  boucle infinie, ni besoin d'une limite de Ticks de sécurité.
- `E8` 🧪 **La ponction du démon est en grande partie absorbée par le plancher à
  0.** Le premier Sbire frappe au Tick 4 (`B7b`), puis 1 par Tick — soit ~111
  ponctions sur une partie de ~115 Ticks. Mais `R8` borne la progression à 0 :
  **toute ponction subie pendant que la progression vaut 0 est perdue pour le
  démon**. Or le joueur passe le début de partie à construire (1 Tuile par
  Manche, 5 Ticks), progression à 0. La perte réelle vaut donc à peu près *le
  nombre de Ticks pendant lesquels la progression est > 0* — bien moins que 111.
  Effet de bord à noter : la réserve de 200 Sbires **ne mord jamais** au rythme
  actuel (le démon n'en dépense que ~115 avant la fin de partie) ; c'est la
  cadence du `Gouffre`, pas sa réserve, qui règle la pression.
- `E9` ✅ **Aucune valeur de recette n'est modifiée maintenant : le réglage se
  fera sur le proto en marche.** L'analyse ci-dessous est donc une *hypothèse à
  vérifier par le jeu*, pas une correction à appliquer. Elle est consignée pour
  savoir quoi regarder en premier, et `K3` est l'instrument qui la confirmera ou
  l'infirmera.

  **Le classement des voies semble inversé par rapport à l'intention.**
  Puisqu'une Âme porte 1 Ressource et ne livre qu'une fois (`D16`, `E6`), la
  valeur d'une voie est *la progression de la pierre divisée par le nombre
  d'Âmes nécessaires pour la produire et la livrer* :

| Voie | Âmes nécessaires par livraison | Progression | **Par Âme** | Plafond brut sur 100 Âmes |
| --- | --- | --- | --- | --- |
| `Basalte brut` | 1 | +1 | **1,0** | ~100 |
| `Basalte dégrossi` | 1 (l'Âme s'auto-approvisionne) | +3 | **3,0** | ~300 |
| `Pavé en basalte` | ~3 (une apporte le dégrossi, une l'outil, une sculpte et livre) | +7 | **~2,3** | ~230 |

  Une seule Âme suffit pour la voie `Dégrossi` : elle produit son `Basalte brut`
  à la `Carrière`, le porte au `Tailleur`, y produit 2 `Dégrossi`, en emporte 1
  et le livre. Le `Sculpteur`, lui, exige **deux** Ressources différentes dans sa
  réserve alors qu'une Âme n'en porte qu'une : il faut donc au moins trois Âmes
  par `Pavé`. Pire, l'`Atelier` consomme un `Dégrossi` qui valait déjà +3 pour
  fabriquer un outil : le `Pavé` coûte ~6 de valeur en pierres pour rapporter 7.
  Si le proto le confirme, raffiner jusqu'au `Pavé` est une mauvaise affaire, et
  trois leviers rétablissent la hiérarchie : monter le `Pavé` au-delà de +9,
  augmenter la capacité de portage (`R7`) pour qu'une Âme puisse approvisionner
  seule le `Sculpteur`, ou baisser le rendement des pierres brutes à
  l'`Escalier`. Tous les trois sont dans le fichier de configuration (`G2`) :
  aucun ne demande de toucher au code.

## 12. Métriques et interface

Le proto n'existe pas pour être gagné mais pour **comparer deux réglages de
recettes**. Il doit donc rendre lisible *pourquoi* un réseau produit ce qu'il
produit, en cours de partie et pas seulement à la fin.

### Métriques permanentes

- `K1` Âmes restantes en réserve, vivantes, dépensées — et les dépenses
  **ventilées par cause** : livrées à l'`Escalier`, perdues sur déplacement
  impossible (`D6`), perdues sur retour en arrière (`D16`). La ventilation est
  ce qui distingue un réseau lent d'un réseau qui fuit.
- `K2` `StairwayProgress` / cible, et la ponction cumulée du démon (`X3`), dont
  la part **absorbée par le plancher à 0** (`E8`).
- `K3` **Progression par Âme dépensée** — l'indicateur central : c'est lui qui
  dit si une chaîne de raffinage vaut son coût en Âmes (`E9`).
- `K4` Tick et Manche courants ; Ticks écoulés depuis la dernière livraison.
- `K5` Sbires restants en réserve et vivants.

### Affichage du Plateau ✅

- `U1` Chaque Tuile affiche **le nombre d'Âmes et de Sbires** qui s'y trouvent,
  distinctement par camp, lisible sans clic.
- `U2` Une Tuile est **sélectionnable**. Le panneau de détail montre alors :
    - la **Recette** du Bâtiment (IN, OUT, durée) — toutes ses Recettes si elle
      en a plusieurs, comme l'`Escalier` (`R5`, `X3`) ;
    - la liste des **Âmes et Sbires présents**, chacun avec son ID (`C3`), ce
      qu'il porte, et **l'avancement de sa production** (Tick courant / durée de
      la Recette, ou « inactif » avec la raison : porte une Ressource, réserve
      insuffisante `P2`, déjà produit ici `P1`) ;
    - le contenu des deux **réserves**, `inputStorage` et `outputStorage`
      (`R3`).
- `U3` 🧪 Le détail affiche aussi les **Sorties désignées** de la Tuile et l'état
  du compteur de tourniquet (`D8`, `D9`) : sans ça, un tracé qui répartit mal
  est indébuggable.
- `U4` 🧪 La sélection est **persistante d'un Tick au suivant** : on choisit une
  Tuile, on déroule les Ticks, et on regarde ce qui s'y passe sans re-cliquer.
  C'est le mode d'observation attendu pour régler des recettes.
- `U5` 🧪 Les Ticks se déroulent **un par un, à la demande** (bouton), en plus du
  déroulé automatique des N Ticks d'une Manche (`C1`) : une chaîne de production
  ne se comprend qu'en pas-à-pas.

## 13. Paramétrage ✅ (exigence forte du brouillon)

Tout ce qui est réglable vit dans **un seul fichier lisible et éditable à la
main**, hors du code :

- `G1` ✅ `ProtoHtml/config/gameplay.json` — un seul fichier JSON, validé au
  chargement, avec un message d'erreur explicite si une valeur est incohérente.
- `G2` ✅ Contenu : `ticksPerRound` (5), `soulBudget` (100), `minionBudget`
  (200), `stairwayTarget` (200), `soulCarryCapacity` (1), cadences
  d'apparition, liste des Ressources, liste des Bâtiments (avec Sorties
  autorisées), liste des Recettes, **liste des Espaces du Plateau et Tuiles
  pré-posées avec leurs Sorties** (`B6`, `B7b`), catalogue des Tuiles posables
  (`T7`). Aucune limite de Ticks de sécurité n'est nécessaire : `D16` garantit
  la terminaison (`E7`).
- `G3` ✅ Aucune de ces valeurs n'est écrite en dur dans le code : le code lit
  la configuration. Une valeur en dur dans une règle est un bug.
- `G4` ✅ L'interface permet de **recharger la configuration sans recompiler**
  (coller/importer le JSON, relancer la Rencontre), pour comparer deux réglages
  à la suite.

## 14. Trace de référence 🧪

Cette trace n'est pas une règle : c'est le **test d'acceptation** du moteur. Si
le proto ne produit pas exactement ça, une règle est mal implémentée.

Disposition **propre à la trace** (ce n'est pas la disposition par défaut
`B7b`) : `SoulWell(0,0)` Sortie E → `Quarry(1,0)` Sortie E → `Stairway(2,0)`
sans Sortie. Démon absent. Aucune Âme ne revient sur ses pas, `D16` ne se
déclenche donc jamais ici.

| Tick | Apparition | Production | Déplacement | État en fin de Tick |
| --- | --- | --- | --- | --- |
| 1 | Âme#1 sur `SoulWell` | rien (`SoulWell` sans Recette) | Âme#1 → `Quarry` | Âme#1 sur `Quarry`, mains vides |
| 2 | Âme#2 sur `SoulWell` | Âme#1 démarre *et finit* la Recette `Quarry` (`P5`) → 2 `RawBasalt` en sortie | Âme#1 ramasse 1 `RawBasalt` (`D12`) → `Stairway`, y dépose (`D10`). Âme#2 → `Quarry` | `Quarry` : 1 `RawBasalt` en sortie. `Stairway` : 1 `RawBasalt` en entrée |
| 3 | Âme#3 | Âme#1 démarre *et finit* la Recette `Stairway` 1 Tick → **progression 1**. Âme#2 démarre *et finit* `Quarry` → sortie à 3 | Âme#1 quitte le `Stairway` : aucune Sortie → **détruite** (`D6`). Âme#2 ramasse → `Stairway`. Âme#3 → `Quarry` | Progression 1, une Âme perdue |
| 4 | Âme#4 | Âme#3 produit dans `Quarry` | Âme#2 dépose et sera détruite au Tick 5 | Le régime permanent coûte **1 Âme par livraison** |

Ce que la trace rend visible : le régime permanent consomme **une Âme par
livraison** (`D6` + `T4`), et cette trace ne rapporte que **+1 progression par
Âme** — la voie la plus coûteuse. Avec `soulBudget = 100`, ce tracé plafonne à
~100 progression : sous une cible de 200 (`E6`), il perd la partie. C'est le
comportement attendu, et la démonstration que le raffinage est obligatoire.

## 15. Journal des questions de revue

**Les 12 questions de conception sont tranchées.** Le tableau est conservé comme
trace des décisions et de leur raison.

| # | Question | Décision |
| --- | --- | --- |
| ~~`Q1`~~ | Chaîne de production du démon. | ✅ **Aucune économie** : `Gouffre` relié à l'`Escalier` par deux Tuiles `Vide` (`X4`, `B7b`). Le démon est une horloge (`X6`). |
| ~~`Q2`~~ | Une production appartient-elle à l'entité ou au Bâtiment ? | ✅ À l'**entité** : le débit d'un Bâtiment est proportionnel au nombre d'entités présentes (`P6`). |
| ~~`Q3`~~ | L'`Escalier` a-t-il une Sortie ? | ✅ **Aucune** : livrer coûte une Âme, c'est la mécanique de coût de la Rencontre (`T4`, `D6`). |
| ~~`Q4`~~ | Croisement des camps ? | ✅ **Impossible par construction du terrain** (`B8`, `D14`). Seul l'`Escalier` est partagé, sans affrontement (`D15`). |
| ~~`Q5`~~ | Forme du Plateau et positions de départ. | ✅ **Entièrement en configuration** (`B6`, `G2`) ; disposition par défaut proposée en `B7b`. |
| ~~`Q6`~~ | Plafond de population ? | ✅ Pas de plafond simultané, mais une **réserve de 100 Âmes** sur la partie (`C5`, `C5b`). |
| ~~`Q7`~~ | Cible de progression. | ✅ `stairwayTarget = 200` (`E5`) — au-dessus du plafond ~100 de la voie brute, le raffinage est obligatoire. À revérifier par simulation (`E8`, `E9`). |
| ~~`Q8`~~ | Vocabulaire « tour » / « Démon ». | ✅ **`Démon` = l'adversaire**, **`Escalier` = la tour du pitch**. Aucune Ressource ne s'appelle « Démon » : le matériau du démon est le Sbire lui-même (`X3`). |
| ~~`Q9`~~ | L'`Aiguillage` a-t-il une règle propre ? | ✅ **Non** : seulement un nombre de Sorties autorisé (`T4`). La distinction deviendra structurante quand le catalogue de Tuiles sera restreint (`T7`). |
| ~~`Q10`~~ | Partie sans fin par boucle de Tuiles. | ✅ **Mémoire de chemin** : une entité qui reviendrait sur un Espace déjà visité est détruite (`D16`). La terminaison est garantie, aucune limite de Ticks nécessaire (`E7`). |
| ~~`Q11`~~ | Réserve de Sbires ? | ✅ Oui, **`minionBudget = 200`** (`X1`). Elle ne mord pas au rythme actuel : le démon n'en dépense que ~115 avant la fin de partie (`E8`). |
| ~~`Q12`~~ | Que consomme la Recette du démon ? | ✅ **Le Sbire lui-même** : il ne transporte rien, il *est* la charge (`X3`). |

### Propositions encore marquées 🧪

Rien ne bloque l'implémentation, mais ces points sont des choix de ma part, pas
des décisions prises :

| Règle | Objet |
| --- | --- |
| `B7b` | Disposition par défaut du Plateau (rayon 3, `Gouffre` en `(3,0)`, `Puits` en `(-3,0)`). |
| `B9` | Le chargement refuse un terrain violant `B8`. |
| `R8` | `StairwayProgress` borné à 0. |
| `T7` | Catalogue des Tuiles posables en configuration. |
| `D17` | Une entité détruite par `D16` n'entre pas et perd sa charge. |
| `D18` | Conséquences de `D16` (une seule livraison par Âme, terminaison, tracé fautif payé en Âmes). |
| `X6` | Le démon est une horloge, pas un adversaire à réguler. |
| `E8` | La ponction du démon est en partie absorbée par le plancher à 0. |
| `U3`-`U5` | Sorties et tourniquet dans le détail, sélection persistante, pas-à-pas. |
| §2 | Noms de code proposés (`HexSpace`, `Round`, `Tick`, `Splitter`…). |
| §14 | Trace de référence comme test d'acceptation. |

## 16. Hors périmètre du proto

Caméra orbitale et mise en scène 3D, art, Cercles et progression méta, économie
de pose des Tuiles, capacité de portage évolutive des Âmes, limites de stockage,
IA du démon. Ces sujets se traitent dans Unity ou dans une itération suivante,
et sont volontairement absents ici.

## 17. Historique

| Date | Évolution |
| --- | --- |
| 2026-09-06 | Mise au propre de `gameplay.md` : numérotation des règles, séparation Manche/Tick, table des Sorties, trace de référence, 9 points à trancher. |
| 2026-09-06 | Réserve de 100 Âmes (`C5`) et défaite à réserve épuisée (`E2`) : les Âmes deviennent la ressource épuisable de la Rencontre. `Q3` et `Q6` tranchées, `Q7` réduite à la valeur de la cible, `Q10`/`Q11` ouvertes. Ajout des métriques (§12). |
| 2026-09-06 | Ajout `E8` : la Recette du démon (`X3`) ponctionne ~100 progression par partie, ce qui remet la cible de 200 en question. |
| 2026-09-06 | `E9` acté : les valeurs de recettes restent en place, le réglage se fera sur le proto en marche ; l'analyse devient une hypothèse à vérifier via `K3`. |
| 2026-09-06 | Deuxième revue : `Q1`, `Q5`, `Q8`-`Q12` tranchées — **les 12 questions sont closes**. Le démon perd toute économie (`X4` : `Gouffre` + 2 Tuiles vides, `minionBudget = 200`), son matériau est le Sbire lui-même (`X3`). Nouvelle règle `D16` : mémoire de chemin, une entité qui revient sur un Espace visité est détruite — la terminaison est garantie (`E7`). Disposition du Plateau en configuration (`B6`, `B7b`). Exigences d'interface ajoutées (`U1`-`U5` : compteurs par Tuile, panneau de détail). Analyse `E9` : au barème actuel le `Pavé` rapporte moins par Âme que le `Dégrossi`. |
| 2026-09-06 | Première revue : validation de `B3`-`B5`, `B7`, `T4`-`T6`, `R3`-`R6`, `C4`, `C5b`, `C5c`, `C6`, `D9`, `D11`, `D13`, `P4`, `P6`, `P7`, `X5`, `E3`, `E4`, `E6`, `G1`-`G4`. Modifications : `P8` inversé (les Ressources IN sont **remboursées**), `D14` tranché par la disposition du terrain (réseaux disjoints, `B8`/`B9`/`D15`), `X3` défini (Recette du démon à l'`Escalier`, −1 progression). `Q2`, `Q4`, `Q7` tranchées ; `Q1` recentrée sur la chaîne du démon ; `Q12` ouverte sur la nature de « 1 démon ». Ajouts : `R8` (progression bornée à 0), `T7` (catalogue restreint plus tard). |
