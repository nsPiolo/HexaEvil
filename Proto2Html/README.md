# Proto2Html — duel « Soustraction » (React + TypeScript)

Implémentation jouable de la mécanique du **prototype 2**, pour régler le duel
hors Unity : itérer en quelques secondes plutôt qu'en minutes.

Ce n'est pas le jeu : pas de 3D, pas de caméra, pas d'art. Une vue de dessus en
SVG qui répond à trois questions (GDD §Objet) :

1. la contrainte de couleur produit-elle une décision intéressante ?
2. le combat par soustraction produit-il des positions non dégénérées ?
3. le ravitaillement fait-il exister le plateau ?

**Source de vérité : [`../docs/proto2/GDD.md`](../docs/proto2/GDD.md).** Chaque
règle y porte un identifiant (`F13`, `T7`, `C10`…) que le code cite en
commentaire. Si le code et le GDD divergent, c'est le GDD qui a raison.

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5181
npm test           # 120 tests, ~3 s
npm run typecheck
```

## Équilibrage : mesuré, et réglé

Le fichier `config/gameplay.json` applique le réglage **corrigé** : Roi 20 force +
2 boucliers, 2 Tours par camp, soin de **1** par manche aux Tuiles ravitaillées, et
**le Roi exclu du soin**. 30 parties IA contre IA par ligne (`npm run measure`),
plateau de rayon 2 :

| Réglage | Roi tué | Plateau plein | 2 passes | Nuls | Tours (méd.) |
| --- | --- | --- | --- | --- | --- |
| **soin 1, Roi non soigné — LIVRÉ** | **50 %** | 13 % | 37 % | **3 %** | 29 |
| soin 2, Roi non soigné | 47 % | 3 % | 50 % | 3 % | 34 |
| soin 0 | 83 % | 0 % | 17 % | 3 % | 25 |
| soin 1, **Roi soigné** | 0 % | 17 % | 83 % | 23 % | 39 |
| soin 2, **Roi soigné** | 0 % | 3 % | 97 % | **57 %** | 40 |
| livré, Roi **1** bouclier | 73 % | 7 % | 20 % | 0 % | 22 |
| livré, Roi **3** boucliers | 7 % | 20 % | 73 % | 7 % | 41 |

Le réglage livré donne une distribution saine : la moitié des parties se conclut
par la mort du Roi, le reste par la famine de Couleur ou le remplissage, et
**presque plus de matchs nuls**. Les deux lignes « Roi soigné » montrent d'où venait
le problème — c'était le soin du Roi, et lui seul.

**Le réglage fin restant est le bouclier du Roi**, pas le soin : à 1 bouclier on
passe à 73 % de Rois tués et 22 tours, à 3 boucliers on retombe à 7 %.

### Ce qui reste ouvert

- **`Q12` — avantage du premier joueur.** Sur 160 parties, le camp qui ouvre gagne
  **66 %** (66 % / 65 % selon l'orientation : un pur effet de tempo, le moteur est
  symétrique). Contre un seuil de 55 %, c'est le prochain sujet d'équilibrage.
- **Les Couleurs rares au rayon 2.** À 13 % de noir sur 17 Espaces, le Plateau n'a
  que **2 Espaces noirs** : le Deck noir n'est quasiment jamais appelé et la famine
  de noir (`C10`) n'est plus jouable. Le rapport `C4` / `D6` avait été calé pour 57
  Espaces, il demande à être revu.
- **`M6` — ravitaillement.** Le taux reste proche de 100 % des deux côtés : l'IA ne
  coupe pas encore les chaînes, malgré le poids `enemySupplyCut`.

## Organisation (ADR-0003)

```
config/gameplay.json      Tout le réglage (G1). Aucune valeur de gameplay en dur.
src/core/                 Logique pure, sans React ni DOM.
  hex/                    Coordonnées axiales (ADR-0001) et mise en page pointy-top.
  config/                 Schéma et chargement validé (G2).
  rules/
    types.ts              Types du domaine, aucune logique.
    relations.ts          T7 — relation d'alliance asymétrique. Lire en premier.
    derived.ts            F1 — état stocké vs valeurs dérivées, auras, silence.
    supply.ts             F14 — chaîne de ravitaillement, maillons critiques.
    combat.ts             E1..E9, F5..F12 — effets et résolution.
    game.ts               A1..A5, C7..C12, F13, W1..W5 — montage, tour, fin.
    driver.ts             Pilote de partie et lots (M4).
    metrics.ts            M1..M6.
  ai/                     I3..I9 — barème et sélection.
src/presentation/         React + SVG. Aucune règle ici.
```

### Les deux points d'architecture à connaître

**`T7` — la relation d'alliance est asymétrique.** « Allié » et « adverse » se
lisent toujours *depuis* une Tuile. Une Tuile neutre considère tout le monde
comme allié ; personne ne la considère comme alliée. Tout le comportement des
Tuiles neutres en découle (hors combat, coupe-chaîne, sanctuaire du `B01`) : il
n'y a aucune règle spéciale pour elles dans le code.

**`F1` — état stocké contre valeur dérivée.** Une Tuile stocke `baseForce`,
`placementBonus`, `damage`, `grantedShields`, et rien d'autre. `force` et
`shields` sont recalculés depuis le Plateau à chaque lecture. C'est ce qui
permet au bonus de pose d'être *figé* alors qu'une aura est *vivante* — deux
comportements impossibles à tenir dans un seul compteur `force` mutable.

## Tests

```bash
npm test                                                  # tout
npx vitest run src/core/__tests__/combat.test.ts          # trace de référence §13
npx vitest run src/core/__tests__/measure.manual.test.ts  # mesure d'équilibrage
```

`combat.test.ts` est le **test d'acceptation** : il rejoue les trois cas chiffrés
du GDD §13. Si ces nombres changent, une règle a bougé.

`aura-timing.test.ts` verrouille deux comportements contre-intuitifs mais voulus :
une **aura est vivante dès la pose**, donc déjà comptée dans l'instantané de `F5`
avant le calcul des dégâts ; et une **`N01` éteint l'aura d'une Tuile neutre
adjacente**, seul moyen de neutraliser le sanctuaire d'un `B01` neutre.

`ai.test.ts` contient une non-régression sur un bug réel trouvé au premier lot de
mesures : le tri stable laissait l'ordre d'énumération des Espaces (`q`
croissant) trancher toutes les égalités de score, et le camp dont le Roi est en
`q` positif jouait systématiquement loin de son Roi. `player` gagnait 19 parties
sur 24 sur une position strictement symétrique. Corrigé par le mélange germé
qu'exige `I8`.

Les fichiers `*.manual.test.ts` impriment des chiffres et n'assertent rien : ce
sont des instruments de mesure, pas des tests de régression.

## Interface

### Lecture du Plateau

- **Hexagone texturé = Tuile posée** ; fond pastel uni = Espace vide, et sa
  Couleur (`U1`, `U1b`). Hachures dans le sens du camp, pointillés pour les
  neutres, hachures sombres pour les Espaces bloqués. On distingue une Tuile d'un
  Espace vide sans lire les chiffres.
- Les Couleurs d'Espace sont peintes **sur un fond clair**, ce qui les délave :
  réduire l'opacité sur le fond sombre de la page les aurait assombries.
- Sur la Tuile : ID, **force dérivée** avec l'apport d'aura entre parenthèses,
  boucliers en `◈` (`U2`).
- Contour **plein** = Tuile ravitaillée ; **pointillé** = coupée de son Roi, elle
  ne se soigne pas ; liseré **ambre** = maillon critique (`U10`).
- **Survol d'un Espace** = aperçu complet de la résolution avant de poser
  (`U4`) : force d'attaque, dégâts voisin par voisin, destructions, survie,
  ravitaillement, et **la Couleur qu'on donne à l'adversaire** — avec un signal
  quand elle le fera passer son tour (`C10`).
- Le **journal** détaille chaque étape de `F5` et l'entretien de `F13` (`U5`).
- La configuration se **recharge depuis l'interface** sans recompiler (`G5`).

### Fantôme de pose (`U17`)

Survoler un Espace y affiche la Tuile **telle qu'elle sera posée** : son ID, sa
force avec le bonus d'alliés marqué `(+2)`, ses boucliers, et deux signaux —
`✕` elle ne survivra pas à la riposte, `⛌` elle survivra mais hors
ravitaillement, donc sans jamais se soigner (`F14`).

Les valeurs sont **lues dans la trace du moteur** (`U16`), sur la dernière étape
avant l'attaque : ce sont exactement celles que la résolution appliquera. Les
recalculer dans l'affichage dupliquerait des règles — et se tromperait : un
premier essai annonçait 0 bouclier pour une `V02`, oubliant les 3 gagnés par son
effet à la pose. `preview.test.ts` verrouille l'équivalence.

### Résolution animée (`U16`)

Poser une Tuile ne saute pas à l'état final. Le moteur émet une **trace
d'étapes** — pose → effets → attaque → riposte → destructions, une étape par
vague de cascade — et l'affichage la rejoue :

- les **forces sont interpolées** sur la durée de l'étape, avec une étiquette
  flottante « −5 » et un tremblement sur la Tuile touchée ;
- une Tuile détruite **se contracte et s'efface** ;
- une **bannière nomme la règle appliquée** à chaque étape (« Attaque en aire :
  R04 frappe 2 Tuiles adverses avec 3 de force (F8) »). C'est elle qui rend
  l'animation compréhensible plutôt que seulement jolie ;
- vitesse réglable ×0,25 à ×4, animation coupable, entrées verrouillées pendant
  la lecture.

**Contrainte d'architecture** : la trace est un flux d'événements *émis par le
moteur*. L'affichage ne recalcule rien — si l'animation devait dériver une force
elle-même, ce serait un bug (ADR-0003). Elle n'est produite **que sur demande**
(`playMove(..., { trace: true })`) : l'IA simule des milliers de poses par partie
et ne doit pas la payer. L'enchaînement rapide et les lots `M4` ne tracent pas.
`trace.test.ts` vérifie que la trace ne change pas l'état final du jeu.

L'enchaînement automatique demande une IA des deux côtés : mettre
`ai.player` dans la configuration (`I9`).
