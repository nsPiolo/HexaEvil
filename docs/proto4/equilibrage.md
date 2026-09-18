# Équilibrage — mesurer avant de régler

`npm run balance` (dans `Proto4Html/`) joue des centaines de runs sans écran et imprime ce que
les montants de `config/race.json` produisent vraiment : qui franchit quel cercle, où l'argent
entre et où il sort. C'est l'outil pour régler les prix, l'avance et les cotes sans jouer
trois heures à la main.

```
npm run balance                      # 400 runs par profil
npm run balance -- --runs=1000       # plus de runs, moins de bruit
npm run balance -- --circles=9       # s'arrêter au neuvième cercle dans le tableau
```

Les graines sont fixes : deux exécutions de suite donnent le même tableau. Changer un montant
dans `config/race.json` change les chiffres, jamais le hasard — la comparaison avant/après est
donc honnête.

## Ce que le simulateur joue

`sim/run.ts` rejoue la boucle de `src/presentation/useRace.ts` dans le même ordre : avance,
paris, boutique, lancer, appariement, résolution, adversaire, fin de tour, règlement, prix du
cercle. **Aucune règle n'y est réécrite** — tout vient du noyau (`src/core/`) ou de `useRace`,
sans quoi les chiffres mentiraient dès la première divergence. Ce que le simulateur ajoute, ce
sont les décisions du joueur.

`sim/simulate.test.ts` garde l'outil honnête : déterminisme à graine égale, runs complets, et
surtout un appariement soigné qui gagne réellement plus que le hasard.

### Les trois profils

Un profil fixe les quatre décisions qui pèsent (`sim/profiles.ts`), pour qu'on compare des
montants à jeu constant :

| Profil | Appariement | Paris | Pari en course | Boutique | Part du solde misée |
|---|---|---|---|---|---:|
| `débutant` | au hasard | un ticket simple | non | jamais | 15 % |
| `appliqué` | soigné | trois tickets simples | oui | prudente | 30 % |
| `joueur` | soigné | la plus grosse cote ouverte | oui | prudente | 70 % |

Ce sont des modèles, pas des joueurs. Ce qu'ils **ne** font pas, et qui rend leurs chiffres
pessimistes : retirer un pari, choisir l'âme d'après le plateau, se servir de l'Œil du parieur.
Un joueur humain attentif fait mieux que le profil `joueur`.

## Ce que le rapport mesure

1. **Le levier** — les chances réelles de l'âme pariée selon l'appariement, et la cote équitable
   qui en découle. C'est le premier tableau, et c'est lui qui commande les cotes.
2. **Le passage par cercle** — combien de runs s'y présentent, combien réunissent le prix, avec
   quelle marge médiane.
3. **La courbe de mortalité** — où les runs s'arrêtent.
4. **Le flux d'argent** — avance, misé, rendu, dépensé en boutique, et le **retour sur mise**
   (rendu ÷ misé). Au-dessus de ×1, le joueur s'enrichit ; en dessous, il coule.

## État au 18 septembre 2026

Mesuré sur 200 runs par profil, avec les montants actuels.

### Le levier de jeu fonctionne très bien

L'ordre des combinaisons est gratuit et c'est le cœur du jeu. Il paie :

| Cercle | Vainqueur au hasard | Vainqueur en appariant bien |
|---|---:|---:|
| 1 — Limbes | 20 % | 61 % |
| 5 — Colère | 19 % | 69 % |
| 9 — Trahison | 8 % | 68 % |

Conséquence directe sur les cotes : à ×3,5 le pari « Vainqueur pur » rend **×0,90** au joueur
qui apparie au hasard et **×1,26 à ×1,45** à celui qui apparie bien. La cote est donc bien
placée — elle punit la négligence et récompense le geste de jeu. **Ne pas y toucher** sans
refaire cette mesure.

### Le run n'est pas franchissable

| Profil | Passe le cercle 1 | Passe le cercle 2 | Évasion (cercle 9) |
|---|---:|---:|---:|
| `débutant` | 0 % | — | 0 % |
| `appliqué` | 20 % | 0 % | 0 % |
| `joueur` | 61 % | 10 % | 0 % |

Aucun profil ne dépasse le quatrième cercle, et aucun ne s'évade. Le mur est au deuxième.

### Pourquoi : les revenus ne montent pas, les prix si

Le prix d'un cercle croît d'environ **40 % par cercle** (200, 280, 380, 500…), et le payer
**vide la bourse** : chaque cercle repart de zéro. Or les revenus, eux, ne montent pas :

- l'avance du stagiaire est **fixe** (20 par course, soit 60 par cercle) — négligeable dès le
  troisième cercle ;
- la mise est plafonnée par l'échelle `economy.stakes`, dont la plus grosse valeur est **50** ;
- le retour sur mise plafonne vers ×1,3.

Un joueur appliqué gagne donc de l'ordre de 100 à 200 pièces par cercle, quel que soit son
avancement, contre un prix qui double tous les deux cercles.

**Ce qui a été mesuré et ne suffit pas**, chacun testé seul avec l'outil :

| Réglage essayé | Effet |
|---|---|
| Échelle des mises fixe jusqu'à 250, puis 600 | aucun : sans bourse, pas de gros jeton — d'où l'échelle qui grandit avec le cercle, ci-dessous |
| Croissance des prix ramenée à ×1,25, ×1,18, ×1,12 | aucun : le cercle 1 reste infranchissable pour `appliqué` |
| Capital 100 et avance 40 | le cercle 1 passe à ~68 % pour tous, mais toujours 0 % d'évasion |
| Capital 120 et avance 60 | le cercle 1 passe à ~100 %, toujours 0 % d'évasion |

Autrement dit : régler l'avance et le capital corrige **l'entrée** du jeu, et rien d'autre.

### Ce qui a été fait : l'échelle des mises grandit avec le cercle

Décision prise le 18 septembre : `economy.stakeGrowthPerCircle` (0,5). Les jetons du cercle 1
restent 5 · 10 · 20 · 50 ; ceux du cercle N valent l'échelle du cercle 1 × (1 + 0,5 × (N − 1)),
arrondis à 5 (`src/core/rules/stakes.ts`, même règle que les prix de la boutique). Le plus petit
jeton est plafonné à `raceAllowance` : l'avance seule permet toujours le pari minimum. Le noyau
n'en sait rien — il accepte toute mise positive —, l'échelle est l'offre faite à l'écran, et le
simulateur lit la même.

Mesuré (200 runs par profil) :

| Croissance | `joueur` : cercle le plus loin atteint | Évasion |
|---|---|---|
| 0 (avant) | 4 | 0 % |
| 0,25 | 4 | 0 % |
| **0,5** | **9** — un run compose 204 → 2041 → 3317 pièces | 0 % (1 run à la porte) |
| 1,0 | 4 | 0 % |

Le levier fait ce qu'on lui demande **une fois le joueur riche** : une bourse qui a pris de
l'avance compose enfin, là où avant elle plafonnait à 150 de mise. Il ne touche pas au goulot.

### Le goulot est à l'entrée, et il reste

Après avoir payé les 200 du premier cercle, le joueur repart au deuxième avec ~10 pièces et
20 d'avance. Aucun jeton, grand ou petit, ne sert à qui n'a rien à poser. Deux mesures
supplémentaires, l'échelle à 0,5 :

| Réglage | Cercle 1 | Cercle 2 | Plus loin (`joueur`) | Évasion |
|---|---:|---:|---:|---:|
| Capital 80, avance 20 (état actuel) | 0 / 20 / 61 % | — / 0 / 7 % | 9 | 0 % |
| Capital 100, avance 40 (mesure seulement) | 67 / 71 / 80 % | 0 / 10 / 19 % | 7 | 0 % |

(les trois valeurs sont `débutant` / `appliqué` / `joueur`.)

Corriger l'entrée fait franchir le premier cercle à tout le monde, et déplace le mur d'un cran.
La raison est arithmétique : un prix qui grimpe de 40 % par cercle **et** qui vide la bourse
exige que la marge conservée après paiement grimpe de 40 % aussi — or elle est de l'ordre de
20 à 50 pièces, quoi qu'on fasse aux jetons.

### Ce qui a été fait ensuite : le début de la courbe des prix adouci

Décision prise le 18 septembre : les prix passent de 200 · 280 · 380 · 500 · 640 · 800 · 1000 ·
1250 · 1500 à **150 · 210 · 260 · 320 · 400 · 510 · 660 · 860 · 1150** (puis 1500 → 5600 pour
les cercles 10 à 15). Le premier cercle coûte 150 au lieu de 200 : c'est le seul prix dont la
baisse a un effet mesurable, parce que c'est lui qui décide de ce qu'il **reste** au joueur pour
attaquer le deuxième.

Ce que le balayage a montré avant de choisir (200 runs par profil, échelle des mises à 0,5) :

| Courbe testée | Cercle 1 (`appliqué`) | Cercle 2 (`joueur`) | Évasion |
|---|---:|---:|---:|
| 200 · 280 · 380… (avant) | 20 % | 7 % | 0 % |
| 200 · 240 · 300 · 380… | 20 % | 10 % | 0 % |
| 200 · 230 · 270 · 330… | 20 % | 11 % | 0 % |
| 200 · 220 · 250 · 300… (très plate) | 20 % | 14 % | 0 % |
| 170 · 230 · 270… | 42 % | 18 % | 0 % |
| **150 · 210 · 260…** (retenue) | **55 %** | **22 %** | 0 % |
| 130 · 190 · 250… | (`débutant` passe à 67 % : trop facile) | | |

Adoucir les cercles 2 et suivants ne change presque rien : même à 220, le deuxième cercle
reste fermé à qui arrive avec 10 pièces. Baisser le premier à 150 laisse une marge (+8 en
médiane pour `appliqué`, contre −44 avant) et fait passer le cercle 1 à 21 / 55 / 64 % pour les
trois profils — le débutant y échoue encore quatre fois sur cinq, ce qui est la bonne pente pour
un premier cercle.

Coût : le « 200 » était figé dans cinq assertions e2e (`01-jauge`, `06-gains`, `08-corrections`)
et dans `RACE_SEED_EXPECT.missing` ; toutes dérivent du prix et ont été recalculées (150 − 113 =
37, etc.). Les graines elles-mêmes n'ont pas bougé : le prix n'entre pas dans le hasard.

### Ce qui a été fait enfin : l'avance grandit avec le cercle

Décision prise le 18 septembre : `economy.allowanceGrowthPerCircle` (1,0). L'avance vaut 20 au
cercle 1, puis 20 × (1 + 1,0 × (N − 1)) : 40 au deuxième, 60 au troisième, 180 au neuvième, 300 au
quinzième (`src/core/rules/allowance.ts`, même règle d'arrondi que les jetons et la boutique).
Le plafond du plus petit jeton suit l'avance du cercle. La Tirelire du stagiaire s'ajoute
toujours par-dessus.

Mesuré (`appliqué`, 120 à 200 runs) :

| Croissance de l'avance | Cercle 2 | Cercle 3 | Cercle 4 | Cercle 5 | Plus loin | Évasion |
|---|---:|---:|---:|---:|---:|---:|
| 0 (avant) | 7 % | 0 % | — | — | 2 | 0 % |
| 0,25 | 12 % | 0 % | — | — | 2 | 0 % |
| 0,5 | 18 % | 10 % | 0 % | — | 3 | 0 % |
| **1,0** | **36 %** | **38 %** | **78 %** | **71 %** | **6** | 0 % |

(`joueur` à 1,0 : 34 / 40 / 60 / 50 / 67 % jusqu'au cercle 6, puis 0 % au septième.)

C'est le levier qui agit là où les deux autres ne pouvaient pas : une fois le cercle 2 franchi,
la bourse compose et les cercles 3 à 5 passent à plus d'un coup sur deux. Le débutant, lui, ne
bouge pas (18 % au premier, 0 % au deuxième) : l'avance ne récompense pas la négligence.

Au passage, la mesure a révélé un défaut du simulateur, pas du jeu : son acheteur forgeait la
dernière face positive d'un dé, ce que le noyau refuse en levant une exception ; plus d'argent,
plus d'achats, et le rapport s'arrêtait net au deuxième profil. Corrigé (`sim/run.ts`, l'achat
refusé devient « pas d'achat »).

### Ce qui a été fait ensuite : la fin de la courbe des prix lissée

Décision prise le 18 septembre : les cercles 6 à 9 passent de 510 · 660 · 860 · 1150 à
**460 · 530 · 610 · 700**, et les cercles 10 à 15 de 1500 → 5600 à **800 · 920 · 1060 · 1220 ·
1400 · 1600**. La courbe grimpe toujours, de ~15 % par cercle, et garde un prix égal à ~1,3 fois
l'avance des trois courses du cercle — la pression du cinquième cercle, prolongée, au lieu d'un
mur au septième (l'ancienne courbe montait à 2,1 fois au neuvième).

Pour mesurer une fin de courbe, il faut des runs qui y arrivent : partis du cercle 1, trois sur
cent atteignent le sixième, et leurs taux de passage ne veulent rien dire. D'où l'option
`--from=N --money=M` du rapport, qui fait partir chaque run du cercle N avec M pièces. Mesuré
avec `--from=6 --money=40` (la marge typique après le cinquième), 300 runs, profil `appliqué` :

| Queue de courbe (c6 → c9) | c6 | c7 | c8 | c9 | Évasion |
|---|---:|---:|---:|---:|---:|
| 510 · 660 · 860 · 1150 (avant) | 25 % | 11 % | 25 % | 0 % | 0 % |
| 480 · 580 · 700 · 850 | 33 % | 28 % | 7 % | 0 % | 0 % |
| 470 · 550 · 640 · 750 | 35 % | 33 % | 29 % | 20 % | 1 % |
| **460 · 530 · 610 · 700** (retenue) | **41 %** | **38 %** | **37 %** | **35 %** | **2 %** |

`joueur` s'effondre au sixième (6 %) quelle que soit la courbe : parti avec 40 pièces, il en mise
70 % sur les cotes à ×40 ouvertes par son grade, qu'il ne tient pas. C'est le profil qui est
mal calibré pour la fin de run, pas le prix — à corriger dans le simulateur, pas dans le jeu.

### État des lieux

Les quatre réglages sont en place — jetons ×0,5, avance ×1,0, prix adoucis au départ (150) et
lissés à la fin (×1,15). Le run est **progressif** : un joueur appliqué franchit chaque cercle
un peu plus d'une fois sur trois, du deuxième au neuvième, sans mur. L'évasion existe mais reste
rare ; c'est la conséquence arithmétique d'une chaîne de huit passages à ~35–40 % chacun.

Ce qu'il reste à trancher n'est plus une valeur mais une **intention** : veut-on qu'un joueur
appliqué s'évade une fois sur cinquante (état actuel) ou une fois sur cinq ? Dans le second cas,
chaque passage doit monter vers 80 %, ce qui se règle en descendant les prix de 15 à 20 % sur
toute la courbe — l'outil le mesure en un nombre.

## Régler quelque chose

1. Modifier `Proto4Html/config/race.json` (`economy`, `run.circles[].price`).
2. `npm run balance -- --runs=500` et comparer les trois profils au tableau ci-dessus.
3. Viser : `débutant` qui s'arrête tôt, `appliqué` qui progresse régulièrement et s'évade
   parfois, `joueur` qui s'évade souvent — pas l'inverse.
4. Attention : `economy.raceAllowance` et `economy.startingMoney` sont figés dans les graines de
   référence des tests e2e (`e2e/seeds.ts`). Les changer demande de re-chercher ces graines. Le
   prix du cercle 1, lui, n'entre pas dans le hasard : le changer ne demande que de recalculer
   les valeurs « manquantes » des assertions.
