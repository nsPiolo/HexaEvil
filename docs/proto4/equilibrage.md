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

> **Périmé — voir « 18 septembre 2026 : les cotes étaient fausses » plus bas.** Ce « ×1,26 à
> ×1,45 » est le retour d'un **run entier**, tickets perdants compris, pas celui d'un ticket
> joué. Mesuré ticket par ticket (`npm run odds`), le « Vainqueur pur » à ×3,5 rendait **×2,15**,
> et neuf paris sur dix étaient gagnants à long terme. La cote est passée à ×2,2.

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

## 18 septembre 2026 — les cotes étaient fausses, et c'est ce qui cassait la fin de partie

Symptôme rapporté en jouant : **plus de 2000 pièces au quatrième cercle**, et tous les cercles
suivants sans enjeu. Le tableau « levier de jeu » plus haut disait pourtant que les cotes étaient
bien placées. Il mesurait la mauvaise chose : le retour moyen d'un run entier, tous tickets
confondus, et non **ce que rapporte un ticket que le joueur joue vraiment**.

### L'outil qui manquait : `npm run odds`

`sim/odds.ts` mesure, type de pari par type de pari et cercle par cercle, la probabilité qu'un
ticket passe **quand le joueur joue toute la course pour lui** : il pousse les âmes qu'il a
désignées, il freine celles qui les gênent. C'est le joueur réel, pas un modèle prudent.

```
npm run odds                          # le tableau complet, cercle par cercle
npm run odds -- --suggest=130         # les cotes qui donneraient un retour de ×1,30
npm run odds -- --races=20000         # moins de bruit sur les paris rares
```

Ce qu'il a montré (4000 courses par cercle et par type) :

| Pari | p (cercle 4) | Cote équitable | Cote d'alors | Retour par pièce misée |
|---|---:|---:|---:|---:|
| Vainqueur pur | 61 % | ×1,6 | ×3,5 | **2,15** |
| Dernière place | 79 % | ×1,3 | ×3,5 | **2,76** |
| Pas dans le top 3 | 97 % | ×1,0 | ×2 | **1,94** |
| Duel | 98 % | ×1,0 | ×1,8 | **1,76** |
| Top 3 | 88 % | ×1,1 | ×1,5 | 1,32 |
| Deux âmes dans le top 3 | 68 % | ×1,5 | ×2,5 | 1,71 |
| Top 3 dans le désordre | 43 % | ×2,3 | ×7 | **3,02** |
| Podium exact | 9 % | ×11 | ×40 | **3,59** |
| Vainqueur + dernier | 44 % | ×2,3 | ×14 | **6,17** |
| Classement complet exact | 0,3 % | ×364 | ×80 | 0,22 |

**Neuf paris sur dix rapportaient plus qu'ils ne coûtaient.** La cause est structurelle : le
joueur lance 2 dés Distance et 3 dés Âme par tour quand l'adversaire n'en lance qu'une paire, et
il choisit qui avance. Il désigne le vainqueur **52 à 62 %** du temps selon le cercle (contre
20 % au hasard à cinq âmes), et il place une âme dernière **76 à 80 %** du temps — couler une âme
est encore plus facile que d'en porter une. Une cote calculée sur 1/N paie une quasi-certitude.

### Ce qui a été fait : les dix cotes recalibrées sur la mesure

Cible retenue : un retour de **×1,30** par pièce misée pour le joueur qui joue pour son ticket.
Pas ×1 — il faut que parier fasse gagner, sinon rien ne finance des prix qui montent ; pas ×2 —
c'était le trou par lequel la bourse fuyait.

| Pari | Avant | Après |
|---|---:|---:|
| Vainqueur pur | ×3,5 | **×2,2** |
| Top 3 | ×1,5 | ×1,5 |
| Pas dans le top 3 | ×2 | **×1,35** |
| Dernière place | ×3,5 | **×1,65** |
| Top 3 dans le désordre | ×7 | **×3,4** |
| Deux âmes dans le top 3 | ×2,5 | **×2,05** |
| Duel | ×1,8 | **×1,35** |
| Podium exact | ×40 | **×22** |
| Classement complet exact | ×80 | ×80 *(voir ci-dessous)* |
| Vainqueur + dernier | ×14 | **×3,15** |

Chaque cote est calibrée sur la **moyenne** de ses probabilités aux cercles où son guichet est
ouvert, pas sur le premier : calibrée sur son cercle d'ouverture, une cote serait juste à ses
débuts et ruineuse ensuite, puisque les âmes se multiplient.

**`fullRankingExact` est un cas à part, et il n'est pas réglé.** Il s'ouvre au cercle 8, à neuf
âmes, où il passe **une fois sur 20 000** (mesuré sur 40 000 courses) : aucune cote ne le rend
défendable, ×80 est un billet perdant et ×5000 serait illisible. Aux cercles 1 à 3, il passe 1 à
2 % du temps — c'est là qu'il aurait un sens. À trancher : l'ouvrir plus tôt (niveau 2 au lieu
de 4), ou le faire porter sur les cinq premières places seulement.

### Et la courbe des prix passe à +35 % par cercle

Les prix étaient **150 · 210 · 260 · 320 · 400 · 460 · 530 · 610 · 700** (~15 % par cercle) ; ils
deviennent **150 · 200 · 275 · 370 · 500 · 675 · 910 · 1230 · 1650**, et `beyondPriceGrowth`
passe de 1,2 à 1,35 pour que la suite garde la même pente.

La raison est arithmétique : à ×1,30 de retour et 50 % du solde misé, la bourse d'un joueur
affûté croît d'environ 35 % par cercle. Une courbe de prix qui monte du même pas garde chaque
cercle tendu ; une courbe plus plate le laisse redevenir une formalité dès que la bourse a pris
de l'avance — exactement ce qui était rapporté.

### Le profil « affûté », celui qui casse l'économie

Les trois profils existants étalent leurs tickets, donc ne peuvent jouer pour aucun à fond : ils
mesurent la difficulté du jeu, pas la solidité d'une cote. `sim/profiles.ts` en gagne un
quatrième — **affûté** : un seul ticket, celui qu'il sait porter, 50 % du solde misé, toute la
course jouée pour lui. C'est le seul profil dont les chances sont celles de `npm run odds`, et
c'est lui qu'il faut regarder avant de toucher à une cote.

Mesuré après recalibrage (300 runs, prix à +35 %) :

| Profil | c1 | c2 | c3 | c4 | c5 | c6 | c7 | c8 | c9 | Retour sur mise |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `débutant` | 20 % | 0 % | — | — | — | — | — | — | — | ×0,90 |
| `appliqué` | 52 % | 31 % | 15 % | 14 % | 0 % | — | — | — | — | ×1,17 |
| `joueur` | 32 % | 53 % | 6 % | 67 % | 0 % | — | — | — | — | ×0,85 |
| **`affûté`** | **57 %** | **58 %** | **66 %** | **37 %** | **42 %** | **40 %** | **75 %** | **33 %** | **100 %** | **×1,28** |

L'affûté traverse les neuf cercles avec une marge qui reste **serrée** (+15, +41, +85, −46, −39,
−173, +50, −577, +1637 au fil des cercles) : c'est ce qu'on cherchait — plus de bourse à 2000
pièces au quatrième cercle, plus de cercle sans enjeu.

Le revers est que `appliqué` bute désormais au troisième ou quatrième cercle, là où l'ancienne
économie le portait jusqu'au neuvième — mais il y était porté par des cotes fausses. Deux
molettes pour le rattraper, mesurées :

| Courbe des prix | `appliqué` | `affûté` | Évasion `affûté` |
|---|---|---|---:|
| **+35 %** (retenue) | s'arrête au c3–c4 | c1→c9, marges serrées | 0,3 % |
| +25 % | c1→c6 à ~50 % | c1→c9, marges qui enflent (+1245 au c9) | 3 % |

La seconde molette est `economy.allowanceGrowthPerCircle` (1,0 aujourd'hui, l'avance vaut 20 × N
au cercle N) : la monter aide `appliqué` sans rien donner à `affûté`, qui vit de ses paris.

### La boutique : les objets puissants coûtent plus cher

Les objets d'impact `extreme` passent à +50 % (Miroir de Narcisse 180 → 270, Dette infernale
150 → 225) et ceux d'impact `fort` à 90 pièces et au-dessus à +30 % (Troisième dé 100 → 130, Œil
de Charon et Bât de chameau 95 → 125, Quatrième tête · Ticket première heure · Fouet du
contremaître · Dé de Fraude 90 → 115). Les paliers en dessous n'ont pas bougé : le Verrou de
Minos à 85 est figé dans la graine de référence `SHOP_SEED` (e2e/04-boutique), et le toucher
obligerait à re-chercher la graine pour un gain d'équilibrage nul.

### Ce que le recalibrage a coûté ailleurs

`RACE_SEED_EXPECT` dépend de la cote « Vainqueur pur » : le pari auto de la graine de référence
rapporte 11 au lieu de 18, donc 106 pièces au lieu de 113 et « encore 44 ¤ » au lieu de 37
(e2e/seeds.ts, 06-B). Les graines elles-mêmes n'ont pas bougé — une cote n'entre pas dans le
hasard. Les deux cotes affichées dans `03-paris` ont suivi.

## Au-delà du quinzième cercle : les jetons composent, et un All-in apparaît

Jusqu'ici, deux courbes de nature différente se faisaient face. Les prix de sortie composent
(`beyondPriceGrowth` = 1,35, à l'infini) ; l'échelle des mises, elle, était une **droite**
(`stakeGrowthPerCircle` = 0,5, soit +50 % de l'échelle du cercle 1 à chaque cercle, jamais
composé). Une droite ne rattrape pas une exponentielle : le plus gros jeton valait le tiers du
prix de sortie au cercle 1, le vingt-cinquième au quinzième, le trois-centième au vingt-cinquième.
La bourse pouvait grossir, elle ne pouvait plus être engagée, et le raisonnement qui justifie
+35 % (« 50 % du solde misé ») cessait de tenir dès que le solde dépassait deux fois le gros jeton.

**Deux corrections, toutes deux réservées aux cercles au-delà des écrits.**

`economy.beyondStakeGrowth` (1,35) : au-delà du dernier cercle écrit, l'échelle quitte la droite
et compose, exactement au pas du prix de sortie (`src/core/rules/stakes.ts`). Les deux taux étant
égaux, le rapport entre le gros jeton et le prix **se fige sur celui du quinzième cercle** au lieu
de s'effondrer. Le plafond du plus petit jeton sur l'avance continue de s'appliquer, et il mord
désormais : l'avance reste linéaire, donc au vingt-cinquième cercle le premier jeton vaut
l'avance (500) et le deuxième 1 610. C'est voulu — après avoir payé un cercle, l'avance seule
doit encore permettre de parier.

| Cercle | 15 | 16 | 18 | 20 |
|---|---:|---:|---:|---:|
| Gros jeton (échelle du 20 septembre) | 130 | 175 | 320 | 585 |
| Prix de sortie | 10 020 | 13 550 | 24 650 | 44 950 |
| **Prix / gros jeton** | **77** | **77** | **77** | **77** |

(Le rapport valait 25 quand l'échelle était trois fois plus grosse ; ce qui compte ici est qu'il
ne bouge plus, pas sa valeur. Au-delà du quinzième, c'est l'All-in qui porte les grosses mises.)

**Le jeton « All-in »**, cinquième jeton du plateau, n'apparaît lui aussi qu'au-delà des cercles
écrits. Les quatre paliers suivent maintenant la courbe des prix, mais ils restent une offre
fixe : ils ne savent rien de la bourse du joueur. L'All-in est la seule mise qui la suit. Sa
valeur n'est pas le solde brut mais `maxStake` (`presentation/useRace.ts`), c'est-à-dire ce que
le guichet accepte vraiment : sous le pouvoir de Ploutos (`costlyLateBets`), où un pari en course
coûte deux fois sa mise, l'All-in vaut la moitié de la bourse. Un bouton qui promet une mise
refusée serait un bouton qui ment.

Pourquoi pas avant le quinzième : jusque-là l'échelle suffit, et un All-in au premier cercle
n'est pas un pari, c'est un jet de dé sur toute la partie.

## L'échelle divisée par trois, et trois jetons aux premiers cercles

**Le constat, rapporté en jeu le 20 septembre 2026** : en misant toujours le plus gros jeton sur
« Vainqueur pur », on atteint le quatrième cercle sans avoir jamais ouvert un autre guichet. Le
jeu n'incite pas à poser plusieurs paris, alors que c'est ce qu'il vend.

La cause est un rapport. Le plus gros jeton valait **le tiers du prix de sortie** au premier
cercle (50 contre 150) et le sixième au neuvième : deux tickets gagnants suffisaient à payer un
cercle, donc un seul type de pari suffisait. Ce n'est pas une affaire de cotes, c'est une affaire
de plafond : tant qu'un ticket peut porter un cercle, rien n'oblige à en poser deux.

**Deux changements dans `economy`.**

`stakes` passe de `5 · 10 · 20 · 50` à `5 · 10 · 15 · 20`, et `stakeGrowthPerCircle` de 0,5 à
**0,4**. Le plus gros jeton vaut désormais `20 × (1 + 0,4 × (N − 1))` : environ **le tiers** de ce
qu'il valait, à tous les cercles. Le rapport au prix de sortie passe de 3 à 8 au premier cercle.

`stakeUnlockCircle` (`1 · 1 · 4 · 1`) est nouveau : il dit à partir de quel cercle chaque jeton
est offert. Le troisième palier (15) n'ouvre qu'au **quatrième cercle**. Entre 5 et 20, un
quatrième palier ne se choisit pas, il se subit ; il s'insère quand l'échelle s'est assez écartée.
Le premier jeton doit rester ouvert dès le cercle 1, le chargeur le vérifie : c'est celui que
l'avance garantit.

| Cercle | 1 | 2 | 3 | 4 | 5 | 9 | 15 |
|---|---|---|---|---|---|---|---|
| Avant | 5·10·20·50 | 10·15·30·75 | 10·20·40·100 | 15·25·50·125 | 15·30·60·150 | 25·50·100·250 | 40·80·160·400 |
| **Après** | **5·10·20** | **5·15·30** | **10·20·35** | **10·20·35·45** | **15·25·40·50** | **20·40·65·85** | **35·65·100·130** |

**Mesuré** (`npm run balance -- --runs=200`, avant / après) :

| Profil | Plus loin atteint | Cercle médian | Retour sur mise |
|---|---|---|---|
| `débutant` (1 ticket) | 1 → 1 | 0 → 0 | ×0,86 → ×0,87 |
| `appliqué` (3 tickets étalés) | 3 → 3 | 1 → **1** | ×1,15 → ×1,14 |
| `joueur` (8 tickets gourmands) | 4 → 0 | 0 → 0 | ×0,87 → ×0,60 |
| `affûté` (1 ticket, 50 % du solde) | **8 → 5** | 1 → 0 | ×1,25 → ×1,36 |

C'est le renversement cherché : `affûté`, le profil qui joue un seul ticket — exactement le jeu
rapporté —, perd trois cercles de portée, et `appliqué`, celui qui étale ses tickets, devient le
profil qui va le plus loin (46 % franchissent le premier cercle contre 37 % avant). Le retour sur
mise d'`affûté` ne baisse pas, il monte : ses paris sont toujours aussi bons, il ne peut
simplement plus engager assez pour composer.

**Ce que la mesure ne dit pas.** Les profils du simulateur posent un nombre de tickets **fixe**
(`TICKETS`, sim/profiles.ts) et misent un pourcentage fixe du solde. Ils ne réagissent donc pas
comme un joueur, qui posera plus de tickets maintenant que chacun coûte moins. Essai fait en
triplant `TICKETS` : `appliqué` ne bouge pas (son budget le plafonnait déjà) et les profils
focalisés **baissent**, parce qu'ils s'étalent sur des types à faible probabilité plutôt que sur
plusieurs âmes du même type. Autrement dit le simulateur mesure la borne basse du changement.

**Le jeu est plus dur qu'avant**, et ça se voit. Si c'est trop, le levier est
`stakeGrowthPerCircle` : le remonter vers 0,5 rapproche de l'ancienne échelle sans toucher au
reste. Baisser la courbe des prix (`run.circles[].price`, +35 % par cercle) est l'autre levier,
plus lourd : ces prix sont figés dans des assertions e2e.

## Régler quelque chose

1. Modifier `Proto4Html/config/race.json` (`economy`, `run.circles[].price`).
2. `npm run balance -- --runs=500` et comparer les trois profils au tableau ci-dessus.
3. Viser : `débutant` qui s'arrête tôt, `appliqué` qui progresse régulièrement et s'évade
   parfois, `joueur` qui s'évade souvent — pas l'inverse.
4. Attention : `economy.raceAllowance` et `economy.startingMoney` sont figés dans les graines de
   référence des tests e2e (`e2e/seeds.ts`). Les changer demande de re-chercher ces graines. Le
   prix du cercle 1, lui, n'entre pas dans le hasard : le changer ne demande que de recalculer
   les valeurs « manquantes » des assertions.
