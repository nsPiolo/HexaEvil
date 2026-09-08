# GDD du prototype 3 — « 4-21 des Enfers »

Ce document est la **source de vérité du prototype 3**, implémenté dans
[`../../Proto3Html/`](../../Proto3Html/) (React + TypeScript). Il met au propre
la note de conception [`gameplay.md`](gameplay.md), qui reste le brouillon
d'origine.

Il décrit une mécanique **entièrement distincte** de celles des prototypes 1
([`../proto/GDD.md`](../proto/GDD.md)) et 2
([`../proto2/GDD.md`](../proto2/GDD.md)) : aucune règle, aucun terme et aucun
fichier de configuration n'est partagé. Il n'y a **pas de plateau** ici, donc
ADR-0001 (coordonnées axiales) ne s'applique pas ; le seul héritage est
ADR-0003 (séparation Core / Presentation / Data) et l'exigence de
configuration unique lisible à la main.

C'est aussi le premier proto à porter une **méta-progression** : le run à
travers les 9 Cercles, l'argent, les points de forge, la boutique. Les deux
premiers protos ne jouaient qu'une Rencontre isolée.

## Objet : les questions auxquelles ce proto doit répondre

Le brouillon décrit un 4-21 en duel — à trois dans la dernière partie de chaque
Cercle (`R12`) —, précédé de batailles de cartes, enrobé
d'une progression à la *Balatro* (on améliore son deck et ses dés entre les
parties). Le point remarquable est que **l'argent gagné n'est pas la victoire** :
l'argent, c'est le nombre de jetons qu'on a réussi à *donner* pendant la seconde
phase, tandis que progresser dans les Cercles demande de **ne jamais perdre une
seule partie** (`R6`). Or plus on ramasse de jetons pendant la première phase,
plus on a de quoi en donner — et moins on a de chances de finir premier.
Autrement dit : la seule façon de s'enrichir est de mettre son run en danger.

Quatre questions, dans cet ordre :

1. **Le conflit « cupidité contre survie » produit-il une vraie décision ?**
   Perdre volontairement une manche de la phase de répartition, pour ramasser
   des jetons qui deviendront de l'argent, est un coup *disponible* (`D12`).
   Est-il jamais *bon*, quand une défaite coûte le run entier ? Si l'argent est
   toujours prioritaire, la victoire ne compte plus ; s'il ne l'est jamais, la
   moitié du système est morte. `M3` mesure.
2. **Les batailles de cartes pèsent-elles sur la partie de dés ?** Trois
   batailles donnent trois récompenses tirées parmi quatre (`B2`). Si le
   vainqueur d'une bataille gagne moins qu'un jet de dés chanceux, les cartes
   sont un préambule décoratif — et c'est pourtant là que va la moitié de
   l'économie (`A1`). `M4` mesure l'écart de résultat entre « a gagné 0 bataille »
   et « a gagné 3 batailles ».
3. **La courbe d'amélioration tient-elle sans dégénérer ?** Le run n'est
   franchissable que si le taux de victoire par partie monte d'environ 33 % à
   plus de 90 % (§17). Mais les mêmes leviers permettent, en une vingtaine de
   parties, de **graver trois dés qui font 4-2-1 à tous les coups** (`F7`, §17).
   Où est la frontière ?
4. **Le run est un roguelike sans filet : la boucle d'amélioration a-t-elle le
   temps de tourner ?** Une seule défaite termine le run et renvoie au Cercle 1
   (`R6`). Descendre les 9 Cercles demande donc **59 victoires consécutives**, et
   un run raté ne dure que **2 parties** tant que le joueur n'est pas équipé —
   soit 0 point de forge et de quoi faire 4 achats. C'est un verrouillage
   circulaire, et c'est le sujet d'équilibrage n°1 du proto (§17).

## Convention de lecture

| Marque | Sens |
| --- | --- |
| ✅ | **Validé** : écrit tel quel dans le brouillon. |
| 🧪 | **Proposition** comblant un trou du brouillon — à valider ou corriger en revue. |
| ❓ | **Trou bloquant** — aucune proposition tenable, il faut trancher avant d'implémenter. |

Les règles sont numérotées pour que la revue et le code puissent les citer
(`// règle D7`) : `R` run et Cercles, `S` séquence d'une partie, `C` bataille de
cartes, `K` decks de cartes, `B` récompenses de bataille, `D` partie de dés,
`V` combinaisons et barème, `J` jetons, argent et forge, `A` boutique et
améliorations, `F` faces de dés et montée de dé, `I` IA, `U` interface,
`M` métriques, `G` paramétrage.

**Les questions ouvertes sont rassemblées au §18.** Deux passes de revue ont
tranché **12 des 15 questions**, dont la seule bloquante (`Q1`, le nombre de
participants). L'implémentation a fermé `Q4` par la mesure : il ne reste que
`Q2` (ce qui traverse un run) et `Q7` (valeur de la suite sur les grands dés).
**Le corps de règles est complet et implémenté** dans `Proto3Html`.

Ce qui porte encore 🧪 se concentre dans les sections non revues : IA (§12),
interface (§13), métriques (§14) et paramétrage (§15).

## 1. Vocabulaire (concept ↔ code)

À reporter dans [`../LEXIQUE.md`](../LEXIQUE.md) **après validation** de ce
document.

### Structure du run

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Run | `Run` | Une descente complète, du Cercle 1 au Cercle 9 (`R1`). |
| Cercle | `Circle` | Palier 1 à 9. Fixe le dé, la main de cartes, le pot et la série exigée (`R2`). |
| Partie | `Match` | Une confrontation complète : 3 batailles puis 2 phases de dés (`S1`). |
| Série | `streak` | Victoires consécutives dans le Cercle courant (`R5`). |
| Participant | `Participant` | Le joueur ou un démon. **2 par partie, 3 dans la dernière partie du Cercle** (`R12`). |
| Manche | `Round` | Un tour de dés de chaque participant, une seule résolution (`D6`). |
| Meneur | `leader` | Premier lanceur de la manche ; son nombre de jets plafonne les autres (`D4`). |

### Cartes

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Deck de cartes | `CardDeck` | Propriété d'un participant, persistant sur tout le run (`K1`). |
| Carte | `Card` | Une **valeur** (2…14) et une **couleur** (`suit`). Pas de jokers (`K2`). |
| Couleur de carte | `suit` | `diamonds` \| `hearts` \| `spades` \| `clubs`. À ne jamais confondre avec les Couleurs du proto 2. |
| Main | `Hand` | Les 1 à 5 cartes tirées pour une bataille (`C2`). |
| Changement | `mulligan` | Une des deux passes d'échange de cartes (`C3`). |
| Combinaison | `HandRank` | Catégorie + valeurs de départage (`C6`). |
| Bataille de cartes | `CardDuel` | Une des 3 confrontations de main d'une partie (`C1`). |

### Dés et jetons

| Concept (FR) | Terme code (EN) | Notes |
| --- | --- | --- |
| Dé | `Die` | `faces: number[]` — la **liste des valeurs gravées**, pas un simple `sides` (`F1`). |
| Face gravée | `engravedFace` | Face dont la valeur a été changée en boutique (`F5`). |
| Jet | `throw` | Un lancer de tous ses dés. 1 jet + `maxRerolls` relances par manche (`D3`). |
| Dés retenus | `kept` | Les 3 dés que le jeu garde parmi les N lancés (`D1b`). |
| Combinaison de dés | `DiceCombination` | `421` \| `triple1` \| `pairOfOnes` \| `triple` \| `straight` \| `junk` (`V1`). |
| Valeur en jetons | `chipValue` | Ce que la combinaison transfère (`V2`). |
| Pot | `pot` | Réserve de jetons de la phase de répartition (`J1`). |
| Phase de répartition | `chargePhase` | On vide le pot vers les participants (`D9`). |
| Phase de don | `dischargePhase` | On se débarrasse de ses jetons (`D10`). |
| Argent | `money` | Cumul des jetons **donnés** en phase de don (`J5`). |
| Point de forge | `forgePoint` | Monnaie de gravure des dés (`J7`). |

## 2. Structure du run et des Cercles

- `R1` ✅ Un run traverse **9 Cercles** dans l'ordre. Terminer le Cercle 9 gagne
  le jeu.
- `R2` ✅ Chaque Cercle fixe quatre valeurs : le nombre de cartes tirées par
  bataille, le type des 3 dés, la taille du pot, et le nombre de victoires
  d'affilée exigées pour en sortir.

| Cercle | Cartes / bataille | Dés | Pot | Victoires d'affilée |
| --- | --- | --- | --- | --- |
| 1 | 1 | 3 × D6 | 21 (3×7) | 4 |
| 2 | 2 | 3 × D6 | 21 (3×7) | 4 |
| 3 | 2 | 3 × D8 | 27 (3×9) | 6 |
| 4 | 3 | 3 × D8 | 27 (3×9) | 6 |
| 5 | 3 | 3 × D12 | 39 (3×13) | 8 |
| 6 | 4 | 3 × D12 | 39 (3×13) | 8 |
| 7 | 4 | 3 × D20 | 63 (3×21) | 10 |
| 8 | 5 | 3 × D20 | 63 (3×21) | 10 |
| 9 | 5 | 3 × D100 | 303 (3×101) | 3 |

- `R3` ✅ **Le pot suit une formule** : `pot = 3 × (faces + 1)`, vérifiée sur les
  cinq types de dés (7, 9, 13, 21, 101). Ce n'est donc pas une table arbitraire,
  et le §8 s'appuie dessus pour généraliser le barème des combinaisons.
- `R4` ✅ Les Cercles vont par paires (même série exigée, même dé sur deux
  Cercles décalés d'un cran) : le second Cercle d'une paire est toujours le
  premier où l'on joue un dé qu'on connaît déjà avec une main de cartes plus
  grande, ou l'inverse. Un seul paramètre change à la fois — c'est une propriété
  à préserver si la table `R2` est retouchée.
- `R5` ✅ Sortir d'un Cercle demande `winsRequired` victoires **consécutives**.
- `R6` ✅ **Une défaite termine le run.** Le joueur est félicité d'être arrivé au
  Cercle atteint, et **renvoyé au début**. Il n'y a ni vie, ni seconde chance, ni
  reprise dans le Cercle courant.
- `R6b` ✅ **Corollaire : « d'affilée » est automatique.** Puisque aucune défaite
  n'est survivable, toutes les victoires d'un run sont consécutives par
  construction. `winsRequired` est donc simplement *le nombre de victoires à
  remporter dans le Cercle*, et le mot « d'affilée » du brouillon ne contraint
  plus rien. Le compteur de série (`streak`) reste affiché parce qu'il est
  l'information la plus tendue de l'écran (`U7`), pas parce qu'il peut décroître.
- `R6c` ✅ Descendre les 9 Cercles demande donc **4+4+6+6+8+8+10+10+3 = 59
  victoires consécutives**. C'est le chiffre qui gouverne tout le §17.
- `R7` ✅ Avec trois participants, une partie a trois places : **1ère = victoire**,
  2e et 3e = **fin du run**. Le classement complet est conservé pour `M2`, mais
  finir 2e ou 3e a exactement la même conséquence.
- `R8` ✅ **Ce que le retour au début remet à zéro** : le Cercle, la série,
  l'argent, les points de forge, le deck de cartes et les dés — **tout**. Le
  nouveau run repart du deck de 52 cartes (`K2`) et de trois D6 non gravés
  (`F1`). C'est la lecture roguelike stricte de « on le renvoie au début », et
  c'est le réglage v1 ; voir `Q2`, qui pose la seule question qui reste : est-ce
  qu'*absolument rien* ne traverse un run, alors que la boucle d'amélioration a
  besoin de plusieurs parties pour exister (§17) ?
- `R9` ✅ **À l'intérieur d'un run**, l'argent, les points de forge, le deck et
  les dés persistent d'une partie à l'autre et d'un Cercle à l'autre. Rien n'est
  remis à zéro tant que le run vit.
- `R10` ✅ **Écran de fin de run** : le joueur est félicité, le Cercle atteint est
  mis en avant, avec le bilan du run (`U15`). Un seul bouton : recommencer.
- `R11` ✅ Terminer le Cercle 9 gagne le run **et le jeu** ; c'est le seul autre
  état terminal.
- `R12` ✅ Une partie oppose **2 participants** — le joueur et un démon. **La
  dernière partie de chaque Cercle en oppose 3.** Le nombre est en configuration,
  par défaut et pour la dernière partie séparément.
- `R12b` ✅ **La dernière partie d'un Cercle est connue d'avance** : puisque
  aucune défaite n'est survivable (`R6b`), le joueur joue exactement les parties
  1 à `winsRequired` du Cercle, et la dernière est la `winsRequired`-ième. Elle
  est annoncée dès l'entrée dans le Cercle (`U7`) — c'est le rendez-vous vers
  lequel tout le Cercle se joue, et le seul endroit où l'on peut désigner « un
  adversaire de votre choix » (`B6`, `B7`).
- `R13` 🧪 Passer de 2 à 3 participants change plus que la difficulté : à 2, la
  pire main est **forcément** celle de l'autre, donc chaque manche est un
  transfert direct et symétrique ; à 3, on peut être ni le meilleur ni le pire et
  **ne rien subir**. C'est un jeu différent, pas une version plus dure — d'où
  l'intérêt de le réserver au climax du Cercle. `M2` mesure les deux séparément.

## 3. Séquence d'une partie

- `S1` ✅ Une partie se déroule dans cet ordre, sans exception :

```
 1. Tirage de 4 récompenses                                     (B2)
 2. Batailles de cartes 1, 2, 3 — chaque vainqueur en prend une (C1, B4)
 3. Application des récompenses « avant répartition »           (B6)
 4. PHASE DE RÉPARTITION : manches de dés jusqu'à pot vide      (D9)
 5. Tirage de 3 NOUVELLES récompenses                           (B2, B3b)
 6. Batailles de cartes 4, 5 — chaque vainqueur en prend une
 7. Application des récompenses « avant don » — des DEUX séries (B7)
 8. PHASE DE DON : manches jusqu'à ce qu'un participant soit à 0 (D10)
 9. Décompte : classement, argent, série, point de forge        (J5, J7, R5)
10. Boutique (le joueur seul)                                   (A1)
```

- `S2` ✅ **Il y a deux séries de batailles, une avant chaque phase** : trois
  batailles avant la répartition, **deux** avant le don. Soit **5 batailles et 7
  récompenses tirées par partie**, dont 5 sont prises.
- `S2b` ✅ **Les récompenses de la première série restent actives pendant la
  phase de don** : un `valuePlus1` gagné à la bataille 2 vaut pour les deux
  phases, et un `extraDie` redonne un dé au premier jet de *chaque* phase. Rien
  ne se périme entre les deux séries — sauf ce qui est explicitement « une fois
  par partie » (`B8`).
- `S2c` 🧪 La seconde série est le **rattrapage** : le participant qui a perdu
  les trois premières batailles, et qui vient probablement de ramasser tout le
  pot, a deux chances de revenir avant la phase où tout se joue. C'est une
  correction d'écart volontaire, et `M4` doit la mesurer séparément de la
  première série.
- `S3` ✅ La boutique n'est accessible qu'**entre deux parties**, jamais en
  cours de partie.
- `S4` ✅ Les démons n'achètent rien : leur deck et leurs dés sont ceux de
  départ, pour toute la durée du run. C'est ce qui fait *monter* le taux de
  victoire du joueur au fil du run (question 3 du §Objet).
- `S4b` ✅ **Plus tard** (hors périmètre du proto, §19), chaque démon sera
  personnalisé par un **deck et des dés propres** — un démon dont le deck est
  plein de piques, un démon dont les dés ne portent que des faces paires. La
  structure de données doit le permettre dès maintenant (`K1`, `F1` décrivent
  déjà un deck et des dés par participant) ; seul le contenu manque.
- `S5` ✅ **En revanche leur niveau de jeu monte par Cercle** (`I5`) : `mauvais`
  aux Cercles 1-2, `moyen` aux 3-6, `expert` aux 7-9. C'est le seul levier qui
  rende les premières victoires accessibles à un joueur non équipé — et §17
  montre que sans lui, le run ne démarre jamais. Voir `Q4`.

## 4. Bataille de cartes

- `C1` ✅ Une bataille oppose **tous les participants** simultanément : chacun
  tire sa main dans **son propre deck**, l'améliore, et on compare.
- `C2` ✅ Le nombre de cartes tirées dépend du Cercle (table `R2`) : de 1 au
  Cercle 1 à 5 aux Cercles 8 et 9.
- `C3` ✅ Chaque participant peut ensuite **changer de 0 à toutes ses cartes,
  deux fois**. Deux passes de changement, chacune facultative et de taille libre.
- `C3b` ✅ **Passer clôt ses changements pour toute la bataille.** Qui n'échange
  aucune carte à la première passe n'est plus consulté à la seconde. La décision
  « je garde » devient donc engageante, au lieu d'être une question posée deux
  fois. Vaut pour tout le monde, joueur comme démons.
- `C4` ✅ Les cartes changées sont **défaussées** et remplacées par un tirage
  dans la partie non distribuée du deck : on ne peut pas retirer la même carte.
  Défausse et main reviennent au deck à la fin de la bataille.
- `C5` ✅ **Le deck est remélangé entièrement au début de chaque bataille.** Les
  trois batailles d'une partie sont indépendantes : on ne suit pas l'épuisement
  du deck. C'est ce qui fait que seule la **composition** du deck compte, ce que
  toute la boutique manipule (`A2`).
- `C6` ✅ Les changements sont **simultanés et cachés** : les mains ne sont
  révélées qu'après la seconde passe. Sinon le dernier à jouer a une information
  gratuite, et l'IA devient triviale à écrire *et* à battre.
- `C7` ✅ La meilleure combinaison, **façon poker**, l'emporte.
- `C8` ✅ Les altérations de deck permettent des combinaisons impossibles au
  poker, dont **5 cartes identiques**, qui bat tout.
- `C9` ✅ En cas d'égalité, le joueur **choisit pile ou face**, on lance une
  pièce, le résultat désigne le vainqueur.
- `C10` ✅ À trois participants, `C9` s'applique **entre les seuls ex æquo en
  tête**, et se répète tant qu'il reste plus d'un candidat. Le joueur choisit son
  côté ; si le joueur n'est pas dans les ex æquo, le tirage est simplement aléatoire.

### Barème des combinaisons de cartes

- `C11` ✅ L'échelle est celle du poker, **étendue vers le haut** par `C8`
  (5 identiques), et évaluée sur **la main entière** : une « couleur » est une
  main dont *toutes* les cartes ont la même couleur, une « suite » une main dont
  *toutes* les valeurs se suivent. À 5 cartes, ces définitions redonnent
  exactement le poker.
- `C12` ✅ **Le classement des catégories dépend de la taille de la main.** Deux
  cartes de la même couleur (23,5 % des mains de 2) sont plus faciles qu'une
  paire (5,9 %) : garder l'ordre du poker rendrait la couleur meilleure que la
  paire alors qu'elle est quatre fois plus fréquente. Le classement est donc
  **recalculé par taille de main, par rareté croissante sur un deck neuf de 52
  cartes** (dénombrement exhaustif) :

| Main | Classement, du meilleur au pire — part des mains d'un deck neuf |
| --- | --- |
| 1 carte | carte haute (100 %) |
| 2 cartes | **paire** 5,88 % · **couleur** 23,53 % · carte haute 70,59 % |
| 3 cartes | **quinte flush** 0,199 % · **brelan** 0,235 % · **suite** 2,99 % · **couleur** 4,98 % · **paire** 16,94 % · carte haute 74,66 % |
| 4 cartes | **carré** 0,005 % · **quinte flush** 0,015 % · **brelan** 0,922 % · **suite** 0,931 % · **double paire** 1,037 % · **couleur** 1,042 % · **paire** 30,43 % · carte haute 65,62 % |
| 5 cartes | **5 identiques** (0 %) · **quinte flush** 0,001 % · **carré** 0,024 % · **full** 0,144 % · **couleur** 0,197 % · **suite** 0,353 % · **brelan** 2,11 % · **double paire** 4,75 % · **paire** 42,26 % · carte haute 50,16 % |

  Quatre conséquences, toutes vérifiées par le dénombrement :

  - **à 2 cartes, la paire bat la couleur** — c'est la correction demandée ;
  - **à 3 et 4 cartes, la suite bat la couleur**, l'inverse du poker ;
  - **à 4 cartes, le carré bat la quinte flush** (13 mains contre 40) ;
  - **à 5 cartes, on retrouve exactement l'ordre du poker.** C'est la
    vérification que la méthode est la bonne : le poker *est* le classement par
    rareté d'une main de 5.

- `C12b` ✅ Le classement est **figé sur le deck de départ** (52 cartes,
  `K2`), pas recalculé sur le deck courant. Sinon il changerait à chaque achat en
  boutique et deviendrait illisible — et c'est justement parce qu'il ne bouge pas
  que construire un deck a un intérêt : on fabrique des mains devenues faciles
  *pour soi* alors qu'elles valent encore cher au barème.
- `C12c` ✅ Le classement de chaque taille de main vit **en configuration**
  (`handRankings`), pas en dur. Le moteur ne connaît que la façon de reconnaître
  les catégories.
- `C12d` ✅ **La suite demande au moins 3 cartes** (`straightMinSize: 3`), et
  donc la quinte flush aussi. Une main de 2 n'a que **trois niveaux** — paire,
  couleur, carte haute — et c'est assumé : la seule décision du Cercle 2 est de
  savoir si l'on casse une couleur facile pour tenter une paire rare, ce qui est
  déjà l'inversion que `C12` installe. La suite entre en jeu au Cercle 3, en même
  temps que le D8.
- `C12e` ✅ La quinte flush est le cumul suite + couleur ; c'est la seule
  catégorie qui se cumule, toutes les autres sont exclusives (une main dont
  toutes les cartes sont de la même couleur ne peut pas contenir de paire).

- `C13` ✅ Les valeurs vont de **2 à 14** (As = 14), **bornes dures** : on ne
  peut pas augmenter un As, on ne peut pas diminuer un 2. Aucune carte n'existe
  hors de cet intervalle, à aucun moment du run.
- `C13b` ✅ Conséquence sur `plusOneTwo` (`A2`) : **un As n'est pas
  sélectionnable**. Il apparaît dans les 10 cartes proposées, grisé — le voir est
  une information sur son propre deck. L'option perd donc de la valeur à mesure
  que le deck monte : c'est un rendement décroissant naturel, et il n'y a pas de
  piège tant que l'interface interdit le clic au lieu de le gaspiller.
- `C14` 🧪 La suite se calcule sur les valeurs numériques, y compris au-delà de
  14. L'As **ne boucle pas** en bas (pas de suite `A,2,3`) : une seule règle,
  pas d'exception.

- `C15` ✅ **On ne peut pas choisir de perdre une bataille de cartes.** Il n'y
  a aucune mécanique d'abandon : la seule liberté est de **ne pas échanger de
  cartes** (`C3`, un changement de 0 carte, donc passer). Un participant joue
  toujours la main qu'il a. C'est une différence assumée avec les dés, où
  s'arrêter sur une main faible est un coup légal (`D12`) : aux cartes on subit
  le hasard, aux dés on le choisit.

## 5. Decks de cartes

- `K1` ✅ Chaque participant a **son propre deck**, qui persiste sur tout le run.
- `K2` ✅ Le deck de départ contient les cartes **du 2 à l'As dans les 4
  couleurs** — carreau, cœur, pique, trèfle. Soit **52 cartes**, sans joker.
- `K3` ✅ Le deck est un **multiensemble** : après clonage (`A2`), deux cartes
  identiques (même valeur, même couleur) coexistent. Chaque exemplaire porte un
  identifiant propre pour que la boutique puisse le désigner.
- `K4` ✅ Le deck ne peut pas descendre sous **`minDeckSize` cartes**
  (proposition : 20). Les options de retrait sont grisées en dessous. Sans ce
  garde-fou, la stratégie optimale est de réduire le deck à 5 cartes identiques
  et de gagner toutes les batailles automatiquement (§17).
- `K5` ✅ Le deck doit toujours contenir **au moins autant de cartes que la plus
  grande main du run** (5). `K4` le garantit largement.

## 6. Récompenses de bataille

- `B1` ✅ Le vainqueur d'une bataille choisit **une récompense** dans la liste
  affichée. Une récompense prise n'est plus disponible.
- `B2` ✅ **Avant une série de `n` batailles, on tire `n + 1` récompenses** au
  hasard dans le catalogue et on les affiche. Il en reste donc toujours
  exactement une à la fin de la série : 4 tirées pour les 3 premières batailles,
  3 tirées pour les 2 dernières (`S1`). Ce qui reste sur la table est autant une
  information (ce que l'adversaire n'a pas voulu) qu'un regret.
- `B3` ✅ Le tirage est **sans remise**, et les récompenses d'une série sont
  **visibles de tous dès le début** de la série. C'est ce qui donne un enjeu
  différencié aux batailles : la première vaut le meilleur des quatre choix.
- `B3b` ✅ **Le second tirage repart du catalogue moins les 4 récompenses
  proposées à la première série** — les 3 prises *et* celle restée sur la table.
  Le vivier est donc de **6 entrées pour 3 tirages**, et une récompense vue à la
  première série ne revient jamais dans la même partie : ce qu'on a laissé
  passer est perdu, et le second tirage apporte du nouveau plutôt que du regret.
- `B3c` ✅ **Sans objet** : depuis `B5`, toute récompense s'applique à la
  sélection, donc aucune ne peut être périmée. La règle disparaît, et avec elle
  le seul point resté ouvert de `Q13`.
- `B3d` ✅ **Réglé par l'ajout de `B13` à `B16`** : le catalogue est remonté à
  **11 entrées**, la première série en propose 4, la seconde en tire 3 parmi les
  7 restantes. L'aléa du second tirage est revenu.
- `B3e` ✅ **Une récompense sans effet dans la configuration courante n'est
  jamais proposée.** Aujourd'hui cela ne vise que `splitGive` (`B15b`), inerte en
  duel. C'est la même intention que l'ancien `B3c` : ne jamais offrir un choix
  mort.
- `B4` ✅ Les démons prennent aussi des récompenses quand ils gagnent une
  bataille, selon `I4`.
- `B5` ✅ **Toute récompense s'applique au moment où elle est prise.** Il n'y a
  plus de récompense différée : ce que le vainqueur d'une bataille choisit prend
  effet devant lui, immédiatement. C'est la simplification qui a fait disparaître
  la moitié de la mécanique de récompenses — et avec elle, tout le besoin de
  vérifier qu'un choix n'est pas périmé (`B3c`).
- `B6` ✅ **Donner des jetons** — la seule récompense qui déplace des jetons :

| Récompense | Effet |
| --- | --- |
| `give3` | Un adversaire de son choix reçoit **3 jetons** |
| `give5` | Un adversaire de son choix reçoit **5 jetons** |

  Les jetons viennent **du pot tant qu'il en reste, puis de la réserve du
  donneur**. C'est une seule règle, mais elle produit **deux récompenses
  différentes selon la série où on la gagne** :

  - **première série**, le pot est plein : donner ne coûte rien, ça leste
    l'adversaire et ça raccourcit la phase de répartition. C'est une attaque
    gratuite ;
  - **seconde série**, le pot est vide : les jetons sortent de *sa propre*
    réserve. On se déleste de 5 jetons avant la phase de don — un raccourci vers
    la victoire.

- `B6b` 🧪 **Un don hors de la phase de don ne rapporte pas d'argent** (`J5`).
  Se délester par une récompense accélère la victoire mais renonce à l'argent
  qu'auraient rapporté ces mêmes jetons donnés en phase — c'est exactement l'axe
  « vitesse contre argent » sur lequel tout le jeu est bâti. À confirmer en revue :
  compter cet argent rendrait la récompense sans contrepartie.
- `B7` ✅ Le bonus « Prendre des jetons » **n'existe plus**. Il était le plus
  contre-intuitif du jeu — prendre des jetons aide l'adversaire à finir sa phase
  de don — et le catalogue est plus lisible sans lui.

- `B8` ✅ **Bonus communs** (catalogue commun aux deux moments) :

| Id | Effet | Portée | Usage |
| --- | --- | --- | --- |
| `setRerolls` | Fixe le nombre max de relances à 1, 2 ou 3 (défaut : 2) | **tous les participants** | toute la partie |
| `flipDie` | Retourne un dé après le jet : la valeur devient `faces + 1 − v` | son détenteur | **une fois par partie** |
| `extraDie` | **Un dé en plus** au premier lancer de la phase — 5 pour le joueur, 4 pour un démon | son détenteur | **chaque phase** |
| `set42` | Avant un jet : fixe 2 dés sur 4 et 2, lance les autres. Jet unique et définitif | son détenteur | 🧪 **une fois par partie** |
| `valuePlus1` | +1 à la valeur en jetons de ses combinaisons | son détenteur | toute la partie |
| `reroll421` | Un adversaire qui termine sur un 4-2-1 relance tous ses dés | son détenteur | toute la partie |
| `splitGive` | Donner à un adversaire en donne la moitié à l'autre. **À trois seulement** | son détenteur | toute la partie |
| `takeLess` | Encaisse un jeton de moins, au minimum 1 | son détenteur | toute la partie |
| `nenetteGift` | Une nénette fait circuler un jeton vers chaque adversaire | **tous les participants** | toute la partie |

- `B9` ✅ `setRerolls` est le seul bonus qui touche **tout le monde**, y compris
  celui qui ne l'a pas choisi. Le mettre à 1 est une arme défensive (moins de
  jets = plus de hasard, ce qui favorise le joueur en retard), le mettre à 3 est
  une arme offensive pour un joueur bien équipé.
- `B10` ✅ `flipDie` : la somme de deux faces opposées vaut `faces + 1` (7 sur un
  D6, comme le brouillon ; 101 sur un D100). Sur un dé **gravé** (`F5`), le
  retournement lit la valeur **de la face opposée telle qu'elle est gravée**, pas
  la formule — c'est la seule lecture cohérente une fois qu'on a changé des faces.
  Voir `Q6` : c'est aussi une interaction forte, puisqu'on peut graver le dos
  d'une face pour se garantir un retournement gagnant.
- `B11` ✅ `set42` fixe littéralement les valeurs **4 et 2**, quelle que soit la
  taille du dé. Au D100 c'est presque toujours mauvais (un 4-2-x junk vaut 1),
  sauf pour viser le 4-2-1 lui-même, qui vaut 104. C'est un pari, et c'est
  volontaire.
- `B12` ✅ **Tous les dés partent en même temps** (règle explicite du brouillon).
  `extraDie` se combine donc avec `set42` sans cas particulier — deux dés fixés à
  4 et 2, les autres lancés, meilleurs trois retenus.
- `B12b` ✅ **Le retrait du dé en plus est automatique.** Après le premier jet de
  la phase, le jeu écarte un dé **parmi ceux qu'il n'a pas retenus** — la main du
  jet est donc préservée telle quelle — et les relances repartent au format
  normal. Le joueur n'a rien à choisir, mais il **voit** le dé écarté : c'est une
  étape de la trace à part entière (`U2`). Entre deux candidats équivalents, on
  jette la plus grosse valeur : les petites (1, 2, 4) sont celles qui construisent
  un 4-2-1 ou un 1-1-x aux relances.
- `B13` ✅ **`reroll421` — annuler les 4-2-1.** Un adversaire du détenteur qui
  **termine ses lancers** sur un 4-2-1 relance automatiquement tous ses dés, et
  la main qui sort est définitive. 🧪 Une seule fois par tour : si le second jet
  redonne un 4-2-1, il tient. Sans ce plafond, la règle boucle.
- `B14` ✅ **`takeLess` — encaisser moins.** Quand le détenteur est la pire main
  et encaisse, il prend **un jeton de moins, au minimum 1**. C'est le transfert
  lui-même qui est réduit, pas seulement ce qu'il reçoit : les jetons restent
  conservés (`J2`), le pot en garde un de plus en répartition, le donneur en
  garde un de plus en don. Encore un arbitrage vitesse contre argent — moins de
  jetons à évacuer, mais moins d'argent au bout.
- `B15` ✅ **`splitGive` — donner aux deux.** Quand le détenteur donne des jetons
  à un adversaire, **l'autre adversaire en reçoit la moitié, arrondie à
  l'inférieur**, de la même source. Ça vaut pour le transfert de la phase de don
  **et** pour la récompense `give` (`B6`). Se délester plus vite est un raccourci
  vers la victoire, et ces jetons-là comptent bien comme argent quand ils sont
  donnés pendant la phase de don (`J5`).
- `B15b` ✅ `splitGive` **n'est jamais proposée en duel** (`B3e`) : sans troisième
  participant, elle n'a aucun effet.
- `B16` ✅ **`nenetteGift` — la nénette paie.** Portée **`all`** comme
  `setRerolls` : une fois prise, la règle vaut pour tout le monde. Un participant
  qui termine sur une nénette (2-2-1) fait circuler **un jeton vers chaque
  adversaire** — pris **dans le pot** en phase de répartition, sorti de **sa
  propre réserve** en phase de don — et ce **même s'il perd la manche**. La pire
  main du jeu devient une consolation : en répartition les adversaires se
  chargent à sa place, en don il se déleste.
- `B17` 🧪 `valuePlus1` s'applique **après** le barème (`V2`), donc aussi à la
  combinaison `junk` : un jet raté vaut 2 au lieu de 1. Il ne change **pas** le
  classement des mains (`V4`), seulement le nombre de jetons transférés.

## 7. Partie de dés — le 4-21

- `D1` ✅ Une main est faite de **3 dés**, du type fixé par le Cercle (`R2`).
- `D1b` ✅ **Le joueur en lance 4, les démons 3**, et le jeu retient
  **automatiquement la meilleure combinaison de trois** parmi les dés lancés. Le
  joueur n'a aucun retrait à faire : il voit ses quatre dés, les trois retenus
  ressortent, les autres s'effacent. C'est une asymétrie assumée en faveur du
  joueur, et le levier d'accessibilité le plus fort du jeu — mesuré, il vaut à
  lui seul **+28 points de taux de victoire** (§17), plus que le niveau des
  démons. Les deux nombres sont en configuration.
- `D2` ✅ La partie a **deux phases** : la répartition, puis le don.
- `D3` ✅ Une manche = chaque participant, dans l'ordre, fait **1 jet plus
  jusqu'à `maxRerolls` relances** (`maxRerolls` = 2 par défaut, modifiable par
  `setRerolls`). Entre deux jets, on garde les dés qu'on veut et on relance les
  autres.
- `D4` ✅ **Le meneur plafonne les autres** (règle fondatrice du 4-21) : le
  premier participant de la manche décide combien de jets il utilise, et
  **aucun autre ne peut en faire davantage**. Depuis que `D5` a sauté, c'est la
  **seule** décision structurante de la manche : s'arrêter tôt sur une bonne
  main prive les autres de leurs relances.
- `D5` ✅ **On s'arrête quand on veut, après avoir vu ses dés.** Il n'y a rien à
  annoncer avant de lancer. C'est un écart délibéré avec le 4-21 classique, où
  l'on doit déclarer son dernier jet d'avance : la contrainte rendait le jeu
  inutilement dur, et sa disparition n'enlève rien à `D4`, qui reste la vraie
  décision de la manche — le meneur choisit toujours combien de jets il *utilise*,
  et plafonne les autres. Le bonus `lateStop`, qui n'était que la levée de cette
  contrainte, disparaît avec elle.
- `D6` ✅ **Le meneur tourne à chaque manche**, dans l'ordre des participants.
  Alternative écartée : le meneur est le vainqueur de la manche précédente, ce
  qui accumule l'avantage du meneur sur un seul joueur.
- `D7` ✅ **Le meneur de la première manche d'une phase est le vainqueur de la
  dernière bataille de cartes qui précède cette phase** — la bataille 3 pour la
  répartition, la bataille 5 pour le don (`S1`). Ensuite le meneur tourne (`D6`).
  C'est ce qui relie enfin les cartes aux dés autrement que par les récompenses :
  gagner la dernière bataille donne le contrôle du nombre de jets de la première
  manche (`D4`), qui est la décision la plus lourde du 4-21.
- `D7b` 🧪 L'ordre de rotation est celui des participants, tiré une fois par
  partie et fixe ensuite ; seul le **point de départ** change à chaque phase
  selon `D7`.
- `D8` ✅ À la fin d'une manche, on compare les mains selon `V4`. Il y a une
  meilleure main et une pire main.

### Phase de répartition

- `D9` ✅ On distribue le pot :
  - `D9a` ✅ À chaque manche, **le participant qui a la pire main prend, dans le
    pot, un nombre de jetons égal à la valeur en jetons de la meilleure main**
    — réduite de 1 si celui qui encaisse détient `takeLess` (`B14`).
    C'est la règle classique du 4-21 : on est puni par la réussite d'un autre.
  - `D9b` ✅ Si le pot contient moins que ce montant, on prend ce qui reste.
  - `D9c` ✅ La phase se termine dès que le pot est **vide**.
  - `D9d` ✅ Égalité pour la pire main : les ex æquo se partagent — on résout par
    `C9` (pile ou face) plutôt que par un partage fractionnaire, pour ne jamais
    manipuler de demi-jeton.

### Phase de don

- `D10` ✅ On se débarrasse de ses jetons :
  - `D10a` ✅ À chaque manche, **le participant qui a la pire main reçoit, du
    participant qui a la meilleure main**, un nombre de jetons égal à la valeur
    en jetons de la meilleure main.
  - `D10b` ✅ Plafonné par ce que possède le donneur : on ne donne jamais plus
    qu'on n'a.
  - `D10c` ✅ Un participant tombé à **0 jeton a terminé** : il sort des manches
    suivantes, et les manches continuent entre les autres.
  - `D10d` ✅ **Le premier participant à 0 gagne la partie.** Le classement suit
    l'ordre de sortie ; le dernier à détenir des jetons est dernier.
  - `D10e` ✅ Si les deux derniers participants se bloquent (celui qui a la pire
    main est aussi le seul détenteur, donc personne ne peut lui donner), la
    manche est **nulle et on rejoue**. Un compteur `maxDeadRounds` (proposition :
    20) arrête la partie et classe par nombre de jetons restants, pour que le
    moteur termine toujours.
- `D10f` ✅ **Sortir de la répartition sans aucun jeton, c'est avoir déjà
  terminé la phase de don** (`D10c`) — donc gagner la partie sans la jouer, et
  **sans gagner un centime** (`J5`). Cette règle n'était pas écrite : elle est
  tombée du moteur, un test d'intégration ayant trouvé des parties où personne
  n'atteignait zéro parce que quelqu'un y était déjà. C'est « cupidité contre
  survie » à l'état pur, et c'est la voie de victoire la plus rentable en
  temps — la moins rentable en argent.
- `D10g` ✅ Si **plusieurs** participants sortent de la répartition à zéro, ils
  sont premiers ex æquo et se départagent au pile ou face (`C9`), jamais par
  l'ordre des sièges. Mesuré : le départage par index donnait au joueur 0 une
  victoire à **48 %** dans les parties à trois, contre 33 % attendus.
- `D11` ✅ Un participant peut recevoir des jetons **après** être passé à 0 —
  un `give5` de la seconde série le vise, par exemple. Il rentre alors dans les
  manches, mais `D10d` regarde le **premier passage** à 0, pas l'état final :
  sa victoire lui reste acquise.
- `D12` ✅ **Corollaire central, à ne surtout pas corriger** : rien n'oblige un
  participant à bien jouer. S'arrêter sur une main faible en phase de répartition
  pour ramasser des jetons est un coup légal, et c'est la seule façon d'être riche.
  C'est la question 1 du §Objet, et `M3` la mesure.

## 8. Combinaisons de dés et barème

- `V1` ✅ Les combinaisons, de la meilleure à la pire :

| Rang | Combinaison | Exemple (D6) |
| --- | --- | --- |
| 1 | **4-2-1** | 4,2,1 |
| 2 | **1-1-1** | 1,1,1 |
| 3 | **x-x-x** et **1-1-x**, classés par valeur `x` | 5,5,5 ou 1,1,5 |
| 4 | **Suite** (3 valeurs consécutives) | 3,2,1 · 6,5,4 |
| 5 | **Reste** | tout le reste |
| 6 | **Nénette** — 2-2-1 | la pire main du jeu |

- `V1b` ✅ **À valeur égale, `x-x-x` bat `1-1-x`** : un brelan de 5 l'emporte sur
  un 1-1-5, les deux valant 5 jetons. C'est le seul départage interne du rang 3,
  et il ne change jamais le nombre de jetons transférés.

- `V2` ✅ / 🧪 Valeur en jetons, généralisée à tous les dés :

| Combinaison | Valeur | D6 | D8 | D12 | D20 | D100 |
| --- | --- | --- | --- | --- | --- | --- |
| 4-2-1 | 🧪 `faces + 4` | **10** ✅ | 12 | 16 | 24 | 104 |
| 1-1-1 | 🧪 `faces + 1` | **7** ✅ | 9 | 13 | 21 | 101 |
| 1-1-x / x-x-x | ✅ `x` | 2…6 | 2…8 | 2…12 | 2…20 | 2…100 |
| Suite | ✅ `2` | 2 | 2 | 2 | 2 | 2 |
| Reste | 🧪 `1` | 1 | 1 | 1 | 1 | 1 |

- `V3` ✅ **D'où viennent `faces + 4` et `faces + 1`.** Le brouillon ne donne le
  barème que pour le D6, et le transposer tel quel casse le jeu : au D100, un
  brelan de 100 vaudrait 100 jetons contre 10 pour le 4-2-1, et la combinaison
  qui donne son nom au jeu deviendrait la plus faible du plateau. Les deux
  formules sont les seules qui (a) redonnent exactement 10 et 7 au D6, (b)
  gardent l'ordre `4-2-1 > 1-1-1 > meilleur brelan` sur tous les dés, et (c)
  s'accordent avec la formule du pot déjà présente dans le brouillon
  (`pot = 3 × (faces + 1)`, `R3`) : **le pot vaut exactement trois 1-1-1**. Cette
  cohérence est un argument fort qu'il s'agit de l'intention d'origine. Voir `Q7`.
- `V4` ✅ **Classement des mains** : par rang `V1` d'abord, puis, à rang égal,
  par valeur en jetons, puis par valeurs de dés décroissantes. Le classement est
  donc **indépendant** de `valuePlus1` (`B17`), qui ne touche que le transfert.
- `V5` ✅ **La nénette existe** : le 2-2-1 est la **pire main du jeu**, sous le
  « reste », mais elle vaut **2 jetons** au lieu de 1. C'est l'exception du 4-21
  classique, conservée pour la saveur. Elle ne transfère donc jamais rien tant
  qu'un autre participant a mieux — sa valeur ne sert que dans le cas limite où
  *tout le monde* fait nénette.
- `V5b` 🧪 La nénette reste **littéralement 2-2-1** sur tous les dés, comme le
  4-2-1. Elle devient d'autant plus rare que le dé grandit, ce qui est cohérent :
  c'est une malédiction de dé à 6 faces.
- `V6` ✅ La suite se lit sur 3 valeurs consécutives **quel que soit le dé** :
  au D20, `17,16,15` est une suite. Le brouillon n'en liste que quatre parce
  qu'il n'y en a que quatre au D6.
- `V7` ✅ **Sur un dé gravé, seule la valeur affichée compte.** Un D6 dont trois
  faces portent un 4 fait un 4-2-1 exactement comme un dé normal. C'est ce qui
  rend `F7` dangereux (§17).

## 9. Jetons, argent et points de forge

- `J1` ✅ Le pot de départ vaut `3 × (faces + 1)` (`R3`).
- `J2` ✅ Les jetons sont indivisibles et conservés : `pot + Σ piles` est
  constant pendant la répartition, et `Σ piles` est constant pendant le don.
  C'est une invariante à assertion dans le moteur (`M7`).
- `J3` ✅ Tous les participants commencent la partie à **0 jeton**, hors effet de
  `B6`.
- `J4` ✅ Les jetons ne survivent pas à la partie : ils sont remis au pot au
  début de la suivante. Seul l'argent (`J5`) persiste.
- `J5` ✅ **L'argent gagné dans une partie = le nombre total de jetons que le
  joueur a donnés pendant la phase de don.** Le compteur s'incrémente en direct
  et s'affiche (`U6`).
- `J6` ✅ L'argent d'une partie perdue est **perdu avec le run** (`R8`) : la
  partie perdue est la dernière, et la boutique ne rouvre jamais. Il n'y a donc
  aucun « farm » possible — chaque jeton donné ne vaut que s'il y a une partie
  suivante. C'est ce qui rend le compteur de `U6` réellement tendu : le joueur
  regarde monter un argent qu'il ne touchera que s'il gagne.
- `J7` ✅ **À la fin de chaque partie de rang pair, le joueur gagne 1 point de
  forge.** 🧪 Le compteur est le nombre de parties **jouées depuis le début du
  run**, pas depuis le début du Cercle : 1 point toutes les 2 parties, sans
  discontinuité au changement de Cercle.
- `J8` ✅ Argent et points de forge n'ont **aucun plafond** et ne se convertissent
  pas l'un dans l'autre.

## 10. Boutique : améliorations entre parties

- `A1` ✅ Entre deux parties, le joueur peut dépenser son argent et ses points de
  forge. 🧪 La boutique propose **toutes** les options à chaque fois, chacune
  achetable autant de fois que le joueur peut se le permettre ; il n'y a pas de
  stock ni de rotation d'offre.
- `A2` ✅ Catalogue :

| Id | Option | Coût |
| --- | --- | --- |
| `removeTwo` | Retirer **deux** cartes de son choix parmi 10 tirées au hasard | 10 |
| `plusOneTwo` | Ajouter **+1** à la valeur de deux cartes parmi 10 tirées au hasard | 5 |
| `clone` | **Cloner** une carte choisie parmi 10 tirées au hasard | 5 |
| `removeOne` | **Retirer** une carte choisie parmi 10 tirées au hasard | 5 |
| `recolor` | **Redéfinir la couleur** de 5 cartes tirées au hasard (couleur choisie *après* les avoir vues) | 10 |
| `engraveOne` | Changer la valeur d'**une face d'un** de ses dés | 1 point de forge |
| `engraveAll` | Changer la valeur d'**une face de chacun** de ses 3 dés | 2 points de forge |

- `A3` ✅ Les 10 cartes proposées sont tirées **sans remise dans le deck**, et le
  tirage est refait à chaque achat. Un achat annulé ne consomme rien.
- `A4` ✅ `recolor` : les 5 cartes sont tirées, montrées, puis le joueur choisit
  **une** couleur qui s'applique aux 5. C'est un outil de couleur (`C12`), pas un
  outil de valeur.
- `A5` ✅ `removeTwo` à 10 est **strictement dominé** par deux `removeOne` à 5,
  qui retirent aussi deux cartes pour le même prix avec deux tirages différents,
  donc plus de choix. Soit son coût descend à 6-8, soit son tirage est plus large
  (proposition : 10 → 6), soit elle disparaît. Voir `Q9`.
- `A6` ✅ `engraveOne` / `engraveAll` : le joueur choisit le **dé** et la
  **face**. Il ne choisit plus la valeur : le graveur lui en **propose trois**
  (`F11`).
- `A7` ❌ **Retiré.** Le plafond de faces identiques n'a jamais servi à ce pour
  quoi il avait été posé : ce n'est pas lui qui empêche la dégénérescence, c'est
  `D1b` — la meilleure combinaison de trois parmi quatre récompense la
  polyvalence, donc saturer un dé est **perdant tout seul**. Mesuré : graver des
  valeurs termine **0,5 %** des runs contre 6,5 % en n'y touchant pas (§17). On
  peut donc laisser le joueur saturer ses dés s'il le veut : le jeu le punit
  mieux qu'une règle ne l'interdisait.

## 11. Dés : faces, gravure et montée de dé

- `F1` ✅ Un dé est **la liste ordonnée de ses faces** (`faces: number[]`), pas
  un nombre de côtés. Un D6 de départ est `[1,2,3,4,5,6]`. Cette représentation
  est la seule qui supporte à la fois la gravure et la montée de dé.
- `F2` ✅ Les faces sont **appariées** : la face `i` est opposée à la face
  `faces.length − 1 − i`. Le dé de départ vérifie donc `v + opposé = faces + 1`,
  ce qui donne la règle 7 du brouillon au D6, et ce dont `flipDie` (`B10`) a besoin.
- `F3` ✅ Le jet tire une face **uniformément**, et lit la valeur gravée dessus.
- `F4` ✅ Le type de dé est imposé par le Cercle (`R2`) : le joueur n'a pas le
  choix de la taille.
- `F5` ✅ La gravure (`A6`) **remplace la valeur d'une face**, définitivement.
- `F6` ✅ **Montée de dé** (D6 → D8, D8 → D12, …) : on **ajoute les nouvelles
  faces au dé actuel**, avec leurs valeurs naturelles. Les faces gravées
  auparavant **gardent leur gravure**. Un D6 gravé `[4,4,3,4,5,6]` devient
  `[4,4,3,4,5,6,7,8]`.
- `F7` ✅ **Conséquence à mesurer** : la montée de dé **dilue** les gravures.
  Passer de D20 à D100 ajoute 80 faces neuves à chaque dé et efface presque tout
  l'investissement de gravure. C'est un rééquilibrage automatique très violent —
  qui devrait rendre le Cercle 9 brutalement plus dur que le 8, alors qu'il
  n'exige que 3 victoires d'affilée (`R2`). C'est peut-être exactement
  l'intention : le Cercle 9 est un boss. `M8` le dira. Voir `Q10`.
- `F8` ✅ Les nouvelles faces s'insèrent **par paires opposées** aux extrémités,
  pour préserver `F2`.
- `F10` ✅ **Une face gravée peut porter un effet.** Une face nue n'en a aucun,
  et les dés de départ n'en portent jamais. Six effets :

| Symbole | Effet | Quand |
| --- | --- | --- |
| ↻ | **Relance gratuite** — relancer ce dé sans consommer de jet | dès que la face sort |
| ⊖ | **Encaisse un jeton de moins**, jamais sous 1 | face visible en fin de lancers |
| ✳ | **Vaut sa valeur ou celle de la face opposée** — le jeu prend la meilleure combinaison | à l'évaluation de la main |
| ⇈ | **Un jeton du pot pour chaque participant**, vous compris | à chaque apparition dans un jet |
| ✦ | **+1 d'argent**, et **+10** si *tous* les dés l'affichent | face visible en fin de lancers |
| ⚒ | **+1 point de forge** si **deux** exemplaires sont visibles | face visible en fin de lancers |

- `F10a` ✅ `↻` est une **offre, pas une obligation** : le joueur décide. Un dé
  ne se relance gratuitement qu'une fois par jet, sinon la règle boucle.
- `F10b` ✅ `⇈` puise **dans le pot**, jamais de nulle part : si le pot est vide
  — donc pendant toute la phase de don — l'effet ne produit rien. C'est ce qui
  garde `J2` (les jetons sont conservés) vrai. Effet à double tranchant : il
  charge les adversaires, mais **le détenteur reçoit aussi**, ce qui l'éloigne de
  la victoire tout en lui donnant de quoi gagner de l'argent.
- `F10e` ✅ Le seuil de `⚒` est en configuration (`forgeThreshold`). À **trois**
  symboles il était quasi mort — 12 déclenchements sur 200 runs même en gravant à
  fond, parce qu'il fallait avoir gravé le même effet sur trois dés *et* le sortir
  en même temps. À **deux**, il se déclenche **218 fois** : dix-huit fois plus.
- `F10c` ✅ `✦` et `⚒` rapportent **hors du barème des jetons** : ils s'ajoutent
  directement à l'argent et à la forge du run, partie gagnée ou perdue. Ce sont
  les deux seuls endroits du jeu où l'on gagne quelque chose sans rien donner.
- `F10d` 🧪 `⊖` **se cumule** — avec la récompense `takeLess` (`B14`) et avec les
  autres faces `⊖` visibles. Un dé entièrement gravé en `⊖` réduit donc de 4 ce
  qu'on encaisse, plancher à 1.
- `F11` ✅ **La gravure se propose, et elle agit sur un seul aspect de la face à
  la fois.** Le graveur affiche, pour la face choisie :

| Type d'offre | Combien | Ce qui change | Ce qui reste |
| --- | --- | --- | --- |
| **Effets** | 3 | la face gagne l'effet | **sa valeur ne bouge pas** |
| **Valeurs** | 2 | la face prend la nouvelle valeur | **son effet ne bouge pas** |

- `F11b` ✅ **C'est la séparation valeur/effet qui rend la forge rentable.** Tant
  qu'on ne pouvait obtenir un effet qu'en payant un changement de valeur, la
  gravure était un achat perdant : l'effet était la partie désirable, le
  changement de valeur était l'impôt, et l'impôt coûtait plus cher que l'effet ne
  rapportait. Une fois l'impôt supprimé, graver des effets **dépasse** le
  clonage — 9 à 10,5 % de runs complets contre 6,5 % (§17).
- `F11c` ✅ **Les valeurs restent proposées, et c'est volontaire.** Elles sont
  mesurées comme un mauvais achat (0,5 % de runs complets), mais ce n'est pas une
  raison de les retirer : certains joueurs voudront fabriquer leur dé, et un
  piège lisible — on voit exactement ce qu'on remplace — est un choix de design
  légitime. Ce qu'il ne faut pas, c'est qu'il soit le **seul** chemin.
- `F11d` 🧪 Le choix de la **face** compte maintenant pour lui-même : poser `⊖`
  sur le 1 ou sur le 6 change complètement quand l'effet se déclenche, et `✳`
  n'a d'intérêt que selon ce que porte la face opposée.
- `F9` ✅ Les dés sont affichés avec leurs valeurs réelles, gravures comprises
  (`U9`) : le joueur doit pouvoir lire son dé avant de décider de le relancer.

## 12. IA des adversaires

- `I1` 🧪 Les démons jouent **pour gagner la partie**, jamais pour l'argent : ils
  n'ont pas de boutique (`S4`), donc pas de raison de ramasser des jetons.
  L'asymétrie est volontaire — c'est ce qui laisse au joueur le monopole de la
  décision de la question 1 du §Objet.
- `I2` 🧪 **Dés, phase de répartition** : le démon maximise la valeur de sa main.
  Il relance tout ce qui n'appartient pas à sa meilleure combinaison partielle,
  et s'arrête quand la valeur espérée d'une relance est inférieure à sa main
  courante (calculée exactement — l'espace est de 3 dés, c'est énumérable).
- `I3` 🧪 **Dés, phase de don** : identique, mais un démon à faible pile préfère
  être *pire* que meilleur quand il ne détient plus assez de jetons pour être
  freiné — ce que `I2` ne capte pas. Réglage `dischargeGreed` : probabilité de
  jouer à perdre quand la pile est sous `dischargeGreedThreshold` jetons.
- `I4` 🧪 **Récompenses** : un poids par récompense, plus un bonus contextuel
  (par exemple `setRerolls` vaut plus quand le démon est en tête). Le démon prend
  la mieux notée encore disponible. Table `ai.rewardWeights` en configuration.
- `I5` ✅ **Le niveau (`topN`) porte sur le choix des dés à garder**, pas
  seulement sur les cartes. C'est la correction la plus importante de
  l'implémentation : tant que le niveau ne jouait que sur les mains de cartes,
  il ne changeait **rien** au taux de victoire (52 % contre 52 %). Les parties se
  décident aux dés. Une fois le niveau porté sur la garde, il fait passer le
  taux de victoire de **52 % à 80 %** — `S5` devient enfin le levier que le §17
  lui demandait d'être.
- `I5b` 🧪 **Cartes** : le démon garde sa meilleure combinaison partielle et
  change le reste, à chacune des deux passes, sans modèle des mains adverses.
- `I6` 🧪 Trois profils, comme au proto 2 : `prudent` (joue la série),
  `cupide` (joue l'argent, donc utile pour tester la question 1 en IA contre IA),
  `neutre`.
- `I7` 🧪 Tous les choix d'IA passent par le **mélange germé** de `G4` : deux
  démons dans une position identique ne doivent pas départager par l'ordre
  d'énumération. C'est le bug exact trouvé au proto 2 ; il est déjà connu, il ne
  doit pas se reproduire.

## 13. Interface

- `U1` ✅ **Exigence forte du brouillon : les transitions sont animées**, pour
  que le testeur comprenne ce qui se passe. Ça vise en particulier les
  mouvements de jetons, qui sont la seule chose que le joueur doit suivre.
- `U2` 🧪 Le moteur émet une **trace d'étapes** (jet, garde, relance, comparaison
  des mains, transfert de jetons, sortie d'un participant, application d'une
  récompense) que l'affichage rejoue dans le temps. La trace n'influence aucun
  calcul, elle n'est produite que sur demande, et un test le verrouille — même
  architecture qu'au proto 2.
- `U3` 🧪 Chaque transfert de jetons est animé **avec sa cause nommée** : « pire
  main → prend 6 (brelan de 6 de Belphégor) ».
- `U4` 🧪 Les dés sont animés au jet, et les **dés gardés** entre deux relances
  sont visuellement distincts des dés relancés.
- `U5` 🧪 Écran de partie : le pot au centre, les participants autour avec leur
  pile de jetons, la phase et le numéro de manche, le meneur de la manche
  identifié, et les bonus actifs de chacun sous forme de pastilles.
- `U6` ✅ **Le cumul d'argent de la partie en cours est affiché en permanence**
  pendant la phase de don (exigence du brouillon).
- `U7` 🧪 Bandeau de run permanent : Cercle, série `3 / 6`, argent total, points
  de forge, parties jouées. La série est l'information la plus tendue de l'écran
  (`R6b`) : chaque partie est une élimination directe, et l'affichage doit le
  dire — pas de « défaites : 0 », qui suggérerait qu'on peut en encaisser une.
- `U7b` 🧪 **La dernière partie du Cercle est annoncée dès l'entrée dans le
  Cercle** (`R12b`) et signalée sur le compteur de série : c'est la partie à 3
  participants, elle est visible de loin, et tout le Cercle se prépare pour elle.
- `U15` ✅ **Écran de fin de run** (`R10`) : « Vous êtes arrivé au **Cercle 4** »
  en grand, puis le bilan — parties jouées, victoires, argent total gagné, points
  de forge dépensés, état final du deck et des trois dés, et la partie qui a tué
  le run (phase, main, adversaire). 🧪 Le ton est celui d'une félicitation, pas
  d'un échec : c'est un run terminé, pas une erreur du joueur.
- `U16` 🧪 L'écran de fin de run affiche aussi le **meilleur Cercle atteint** sur
  l'ensemble des runs de la session : c'est la seule progression visible d'un run
  à l'autre en v1 (`R8`), et c'est ce qui donne envie de relancer.
- `U8` 🧪 Écran de bataille de cartes : les mains, la passe de changement en
  cours (1/2), le numéro de la bataille dans sa série (`3 / 3` puis `2 / 2`), et
  les récompenses de la série avec celles déjà prises barrées et le nom de qui
  les a prises.
- `U8c` ✅ **Les récompenses ne sont jamais dessinées deux fois.** Quand le
  joueur remporte une bataille, ce sont les cartes **déjà à l'écran** qui
  deviennent cliquables et se mettent à pulser ; le panneau du bas ne fait que
  dire quoi faire. Redessiner la liste dans le panneau donnait deux rangées
  identiques et faisait perdre de vue laquelle était la vraie.
- `U8d` ✅ **Une fois les batailles finies, les récompenses non prises
  disparaissent de l'écran.** Elles ne joueront plus aucun rôle dans la partie ;
  seules restent les récompenses prises, avec le nom de qui les détient.
- `U8e` ✅ **Le nombre de jets du meneur est affiché** sur son siège dès qu'il
  s'arrête, et rappelé dans le panneau de décision des suivants — « le meneur
  s'est arrêté après 2 jets : c'est votre plafond ». Sans ça, `D4`, qui est la
  seule décision structurante de la manche, est invisible.
- `U18` ✅ **Les effets de face se lisent sur le dé** : une pastille dorée dans
  le coin, avec le symbole de `F10`, sans masquer la valeur qui reste
  l'information principale. L'inspecteur (`U9`) et la boutique montrent les mêmes
  symboles, et l'offre de gravure (`F11`) affiche la règle en toutes lettres —
  personne ne doit avoir à retenir six symboles.
- `U17` ✅ **Pilote automatique** : un interrupteur du bandeau remplace le joueur
  par la machine, qui répond à toutes les questions avec l'IA des démons au
  niveau `expert` et achète entre les parties. Sert à regarder la mécanique
  tourner sans décider, et c'est le même code que le mode lot (`M1`) — donc ce
  qu'on voit à l'écran est exactement ce que la mesure compte. Il ne joue **pas**
  la cupidité (`D12`), qui reste une décision proprement humaine.
- `U8b` 🧪 La main est **nommée avec son rang pour cette taille de main**
  (« couleur — 2ᵉ sur 3 à deux cartes »). Sans ça, `C12` est illisible : personne
  ne retiendra que la paire bat la couleur à 2 cartes mais l'inverse à 3.
- `U9` 🧪 **Inspecteur de dés** : les 3 dés développés face par face, gravures
  mises en évidence, avec la probabilité courante de chaque combinaison. C'est ce
  qui rend `A6` et `F7` lisibles, donc décidables.
- `U10` 🧪 **Inspecteur de deck** : composition par valeur et par couleur,
  taille, cartes clonées et cartes au-dessus de 14 signalées.
- `U11` 🧪 Avant un jet, la main courante est **nommée** (« brelan de 4 — 4
  jetons ») pour que le joueur n'ait jamais à connaître le barème par cœur.
- `U12` 🧪 Le pile ou face de `C9` est joué et **animé longuement** : le choix
  du joueur est demandé explicitement, la pièce tourne, et le résultat tombe seul
  à l'écran. C'est de la mise en scène assumée (`Q12`) — le choix n'a aucune
  influence, la tension si, et c'est le seul moment du jeu où tout se joue en une
  seconde sans qu'on puisse rien faire.
- `U13` 🧪 **Vitesse d'animation réglable, jusqu'à « instantané »** : sans ça,
  personne ne testera 30 parties d'affilée, ce que `M1` exige.
- `U14` 🧪 **Mode lot** (IA contre IA, sans affichage) accessible depuis
  l'interface, pour produire `M1` à `M8`.

## 14. Métriques

- `M1` 🧪 **Mode lot** : N runs IA contre IA sur des `seed` successives —
  **histogramme du Cercle atteint**, nombre de parties par run, taux de
  complétion, et durée médiane d'une partie en manches et en jets. C'est la
  mesure de la question 4 du §Objet, et la plus urgente (§17). Le chiffre à
  regarder en premier est la **part de runs qui meurent au Cercle 1** : au-delà
  de 60 %, la boucle d'amélioration ne démarre jamais.
- `M2` 🧪 Taux de victoire par participant **et par Cercle**, avec le niveau
  d'IA en vigueur (`S5`). C'est ce qui calibre `S5` : le taux de victoire du
  joueur au Cercle 1 doit être nettement au-dessus de 1/3, sans quoi §17 tombe.
- `M2b` 🧪 **Argent et points de forge détenus à la mort du run**, par Cercle
  atteint. Mesure directe du verrouillage circulaire du §17 : si le joueur meurt
  avec 3 d'argent et 0 point de forge, la boutique n'existe pas.
- `M3` 🧪 **Jetons ramassés en phase de répartition ↔ argent gagné ↔ victoire**,
  en nuage de points. C'est la mesure directe de la question 1 du §Objet : si les
  parties gagnées sont aussi les plus rentables, le conflit n'existe pas.
- `M4` 🧪 Résultat d'une partie **en fonction du nombre de batailles de cartes
  gagnées** (0, 1, 2, 3). Question 2 du §Objet. Et par récompense : taux de
  victoire quand on détient `X`, pour classer les six bonus communs.
- `M5` ✅ **Histogramme des combinaisons obtenues**, avec la part de `junk`.
  **Mesuré** : 75 % de `junk` sur un jet nu, mais 57 à 67 % parmi les mains
  *retenues* — les relances font leur travail, la phase de répartition n'est pas
  la longue suite de transferts de 1 jeton qu'on craignait.
- `M6` 🧪 **Argent cumulé au moment d'entrer dans chaque Cercle**, et nombre
  d'achats effectués par run. Si un run médian fait moins de 3 achats, la moitié
  du système décrit ici n'est jamais vue par un testeur (§17).
- `M7` 🧪 **Invariante des jetons** (`J2`) vérifiée à chaque transfert. Une
  violation est un bug bloquant, pas une métrique — mais elle se mesure en lot.
- `M8` 🧪 **Dégénérescence des dés** : pour chaque dé, probabilité courante de
  4-2-1 et de brelan, tracée par partie, avec le nombre de faces gravées. Le
  plafond théorique à `maxSameFace: 4` est **29,6 % au D6** (`A7`) ; la mesure
  utile est le **nombre de parties** qu'il faut pour s'en approcher, et le taux
  de victoire au-dessus de 20 %. Même chose côté deck : probabilité de tirer
  5 cartes identiques, et rang médian de la main obtenue par taille de main.

## 15. Paramétrage

- `G1` ✅ **Exigence forte du brouillon** : tout ce qui est réglable vit dans un
  **fichier unique et lisible à la main**, hors du code.
- `G2` 🧪 `Proto3Html/config/gameplay.json`, validé au chargement, avec un
  message d'erreur explicite désignant le champ fautif.
- `G3` 🧪 Aucune valeur de gameplay en dur : table des Cercles, barème des
  combinaisons, catalogue des récompenses, coûts de boutique, deck de départ,
  faces des dés de départ, poids d'IA, garde-fous (`K4`, `A7`, `D10e`). Une
  valeur en dur est un bug.
- `G3b` 🧪 Distinction à tenir (héritée du proto 2) : une **valeur** va en
  configuration, une **règle tranchée** s'écrit en code. « Le meneur plafonne les
  autres » (`D4`), « la pire main encaisse » (`D9a`) et « le premier à 0 gagne »
  (`D10d`) ne sont pas des bascules de configuration.
- `G4` 🧪 `seed` unique pour tous les tirages : mélange des decks, jets de dés,
  tirage des récompenses, pile ou face, tirages de boutique, choix d'IA. Même
  `seed` → même run.
- `G5` 🧪 L'interface recharge la configuration **sans recompiler**.
- `G6` 🧪 **Démarrage arbitraire** (outil de test, pas une règle de jeu) : la
  configuration peut lancer un run directement au Cercle *n*, avec un argent, des
  points de forge, un deck et des dés donnés. Sans ça, personne ne verra jamais
  le D100 ni les mains de 5 cartes : §17 montre qu'un run médian meurt au
  Cercle 1 ou 2.

### Squelette proposé

```json
{
  "_lecture": "Réglage unique du proto 3 (GDD proto3 §15). Toute valeur de gameplay vit ici.",
  "seed": 1,

  "_participants": "R12 : duel par défaut, 3 dans la dernière partie de chaque Cercle.",
  "participants": { "default": 2, "circleFinal": 3 },

  "_battleSeries": "S1/B2 : n batailles avant chaque phase, n+1 récompenses tirées.",
  "battleSeries": [
    { "phase": "charge",    "duels": 3 },
    { "phase": "discharge", "duels": 2 }
  ],

  "_circles": "R2 : une entrée par Cercle. pot = 3 * (faces + 1), cf. R3.",
  "circles": [
    { "n": 1, "cards": 1, "dieFaces": 6,   "pot": 21,  "winsRequired": 4 },
    { "n": 2, "cards": 2, "dieFaces": 6,   "pot": 21,  "winsRequired": 4 },
    { "n": 3, "cards": 2, "dieFaces": 8,   "pot": 27,  "winsRequired": 6 },
    { "n": 4, "cards": 3, "dieFaces": 8,   "pot": 27,  "winsRequired": 6 },
    { "n": 5, "cards": 3, "dieFaces": 12,  "pot": 39,  "winsRequired": 8 },
    { "n": 6, "cards": 4, "dieFaces": 12,  "pot": 39,  "winsRequired": 8 },
    { "n": 7, "cards": 4, "dieFaces": 20,  "pot": 63,  "winsRequired": 10 },
    { "n": 8, "cards": 5, "dieFaces": 20,  "pot": 63,  "winsRequired": 10 },
    { "n": 9, "cards": 5, "dieFaces": 100, "pot": 303, "winsRequired": 3 }
  ],

  "_diceCombinations": "V1/V2. 'facesPlus' = faces du dé + n. Changer ces 6 lignes change tout l'équilibre.",
  "_rank3": "V1b : rang 3 partagé, départagé par la valeur puis par triple > pairOfOnes.",
  "diceCombinations": {
    "421":        { "rank": 1, "value": { "facesPlus": 4 } },
    "triple1":    { "rank": 2, "value": { "facesPlus": 1 } },
    "triple":     { "rank": 3, "tieBreak": 1, "value": "dieValue" },
    "pairOfOnes": { "rank": 3, "tieBreak": 0, "value": "thirdDie" },
    "straight":   { "rank": 4, "value": 2 },
    "junk":       { "rank": 5, "value": 1 },
    "_nenette":   "V5 : 2-2-1, la pire main du jeu, mais vaut 2.",
    "nenette":    { "rank": 6, "value": 2 }
  },

  "dice": {
    "_startingFaces": "F1 : la liste des valeurs gravées, pas un nombre de côtés.",
    "startingFaces": [1, 2, 3, 4, 5, 6],
    "_counts": "D1b : le joueur lance 4 dés, les démons 3. Le jeu retient les 3 meilleurs.",
    "playerDice": 4,
    "demonDice": 3,
    "_faceEffects": "F11 : la gravure propose des EFFETS (la valeur reste) et des VALEURS (l'effet reste).",
    "faceEffects": {
      "effectOptions": 3,
      "valueOptions": 2,
      "forgeThreshold": 2,
      "catalogue": ["freeReroll", "takeLess", "wild", "payAll", "money", "forge"]
    },
    "defaultMaxRerolls": 2
  },

  "cards": {
    "values": [2,3,4,5,6,7,8,9,10,11,12,13,14],
    "suits": ["diamonds", "hearts", "spades", "clubs"],
    "_minDeckSize": "K4 : plancher de taille de deck.",
    "minDeckSize": 20,
    "_bounds": "C13 : bornes dures. On n'augmente pas un As, on ne diminue pas un 2.",
    "minValue": 2,
    "maxValue": 14,
    "mulligans": 2,
    "flushMinSize": 2,
    "straightMinSize": 3,
    "_handRankings": "C12 : un classement par taille de main, du meilleur au pire. Calculé par rareté sur le deck neuf.",
    "handRankings": {
      "1": ["carteHaute"],
      "2": ["paire", "couleur", "carteHaute"],
      "3": ["quinteFlush", "brelan", "suite", "couleur", "paire", "carteHaute"],
      "4": ["carre", "quinteFlush", "brelan", "suite", "doublePaire", "couleur", "paire", "carteHaute"],
      "5": ["cinqIdentiques", "quinteFlush", "carre", "full", "couleur", "suite",
            "brelan", "doublePaire", "paire", "carteHaute"]
    }
  },

  "_rewards": "B2 : 4 tirées sans remise dans ce catalogue de 10, visibles dès la 1re bataille.",
  "rewards": [
    { "id": "give3",       "amount": 3, "source": "potThenOwner" },
    { "id": "give5",       "amount": 5, "source": "potThenOwner" },
    { "id": "setRerolls",  "scope": "all",   "uses": "match" },
    { "id": "flipDie",     "scope": "owner", "uses": "oncePerMatch" },
    { "id": "extraDie",    "scope": "owner", "uses": "firstThrowOfPhase" },
    { "id": "set42",       "scope": "owner", "uses": "oncePerMatch" },
    { "id": "valuePlus1",  "scope": "owner", "uses": "match" },
    { "id": "reroll421",   "scope": "owner", "uses": "match" },
    { "id": "splitGive",   "scope": "owner", "uses": "match", "needsThree": true },
    { "id": "takeLess",    "scope": "owner", "uses": "match" },
    { "id": "nenetteGift", "scope": "all",   "uses": "match" }
  ],

  "shop": {
    "removeTwo":   { "cost": 10, "currency": "money", "pool": 10 },
    "plusOneTwo":  { "cost": 5,  "currency": "money", "pool": 10 },
    "clone":       { "cost": 5,  "currency": "money", "pool": 10 },
    "removeOne":   { "cost": 5,  "currency": "money", "pool": 10 },
    "recolor":     { "cost": 10, "currency": "money", "pool": 5 },
    "engraveOne":  { "cost": 1,  "currency": "forge" },
    "engraveAll":  { "cost": 2,  "currency": "forge" }
  },

  "_forge": "J7 : 1 point toutes les N parties jouées du run.",
  "forgePointEveryNMatches": 2,

  "rules": {
    "_leaderCapsThrows": "D4 : le meneur plafonne le nombre de jets des autres.",
    "leaderCapsThrows": true,
    "_leaderRotates": "D6 : true = tourne, false = le vainqueur de la manche mène.",
    "leaderRotates": true,
    "_firstLeader": "D7 : qui ouvre la 1re manche d'une phase.",
    "firstLeader": "lastCardDuelWinner",
    "_runEndsOnLoss": "R6 : une défaite termine le run et renvoie au Cercle 1.",
    "runEndsOnLoss": true,
    "_carryOverBetweenRuns": "R8/Q2 : ce qui traverse un run. Tout à 0 = roguelike strict.",
    "carryOverBetweenRuns": { "money": 0, "forgePoints": 0, "deck": false, "dice": false },
    "maxDeadRounds": 20
  },

  "_debugStart": "G6 : outil de test. circle: 1 = run normal.",
  "debugStart": { "circle": 1, "money": 0, "forgePoints": 0 },

  "ai": {
    "demons": [
      { "name": "Belphégor", "profile": "prudent", "level": "expert" },
      { "name": "Mammon",    "profile": "cupide",  "level": "moyen" }
    ],
    "profiles": {
      "prudent": { "dischargeGreed": 0.0, "dischargeGreedThreshold": 0 },
      "cupide":  { "dischargeGreed": 0.6, "dischargeGreedThreshold": 8 },
      "neutre":  { "dischargeGreed": 0.2, "dischargeGreedThreshold": 4 }
    },
    "levels": { "expert": { "topN": 1 }, "moyen": { "topN": 3 }, "mauvais": { "topN": 6 } },
    "_levelByCircle": "S5 : le niveau des démons monte avec le Cercle.",
    "levelByCircle": ["mauvais","mauvais","moyen","moyen","moyen","moyen","expert","expert","expert"],
    "rewardWeights": {
      "give5": 8, "give3": 6,
      "valuePlus1": 7, "extraDie": 8, "set42": 4,
      "flipDie": 5, "setRerolls": 3,
      "reroll421": 6, "splitGive": 7, "takeLess": 5, "nenetteGift": 3
    }
  },

  "ui": { "animationSpeed": 1.0, "batchMode": false }
}
```

## 16. Trace de référence

Ce n'est pas une règle, c'est le **test d'acceptation** du moteur. Il est
implémenté : `Proto3Html/src/core/__tests__/match.test.ts` rejoue la trace émise
et vérifie, manche par manche et sur sept graines, le barème des transferts, la
conservation des jetons (`J2`), le plafond du meneur (`D4`) et le vivier du
second tirage (`B3b`). `hands.test.ts` va plus loin : il **redérive** la table de
`C12` par dénombrement exhaustif et la confronte à la configuration.

Montage propre à la trace : Cercle 1 (3 × D6 non gravés, pot 21), **3
participants** `J` (joueur), `A`, `B`, ordre `J → A → B`, `maxRerolls = 2`,
aucune récompense en jeu. La trace est **épinglée sur une dernière partie de
Cercle** (`R12`) : une partie ordinaire est un duel, mais seuls 3 participants
exercent le cas « ni meilleur ni pire » (`R13`) et les départages de `D9d`. Un
test de barème ne doit pas casser quand le nombre de participants change.

### Cas 1 — barème et sens des transferts en répartition

| Manche | `J` | `A` | `B` | Meilleure | Pire | Effet |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 4,2,1 (**10**) | 5,5,5 (**5**) | 6,3,2 (**1**) | `J` 4-2-1 | `B` | `B` prend **10** au pot → pot 11 |
| 2 | 3,2,1 (**2**) | 1,1,6 (**6**) | 1,1,1 (**7**) | `B` 1-1-1 | `J` | `J` prend **7** au pot → pot 4 |
| 3 | 6,6,6 (**6**) | 2,4,5 (**1**) | 3,3,1 (**1**) | `J` brelan 6 | `A` (départage) | `A` prend **4**, pot vide → fin de phase |

Trois règles verrouillées d'un coup : c'est bien la **pire** main qui encaisse
la valeur de la **meilleure** (`D9a`), un brelan de 6 vaut 6 et non 7 (`V2`), et
le pot plafonne le dernier transfert (`D9b`).

État en fin de phase : `J` 7 · `A` 4 · `B` 10, total 21 = le pot (`J2`).

### Cas 2 — phase de don, sortie et argent

| Manche | `J` | `A` | `B` | Transfert | Piles |
| --- | --- | --- | --- | --- | --- |
| 4 | 1,1,5 (**5**) | 4,4,2 (**1**) | 2,6,3 (**1**) | `J` donne **5** à `A` (départage) | `J` 2 · `A` 9 · `B` 10 |
| 5 | 4,2,1 (**10**) | 6,6,6 (**6**) | 1,2,4 (**10**) | ex æquo en tête → pile ou face, `J` gagne ; donne **2** (plafond `D10b`) à `A` | `J` **0** · `A` 11 · `B` 10 |

`J` sort à 0 : **`J` gagne la partie** (`D10d`), et son argent vaut
**5 + 2 = 7** (`J5`). `A` et `B` continuent entre eux pour le classement.

Ce cas verrouille quatre points : le plafond de don (`D10b`), le pile ou face
sur ex æquo *en tête* (`C10`), le fait que l'argent est ce qu'on **donne** et non
ce qu'on possède (`J5`), et que sortir vite est compatible avec être pauvre.

### Cas 3 — dé gravé et retournement

Dé 1 gravé `[1,2,4,4,5,6]` — une seule gravure (la face à 3 est devenue un 4),
bien en dessous du plafond de `A7`, qui en autorise 4.

| Étape | Calcul | Résultat |
| --- | --- | --- |
| `P(4)` sur le dé 1 | 2 faces sur 6 | 33 % au lieu de 17 % |
| Jet | dé 1 = 4, dé 2 = 2, dé 3 = 3 | 4,2,3 → `junk`, 1 jeton |
| `flipDie` sur le dé 3 (variante A) | face opposée gravée : `7 − 3 = 4`, non gravée | 4,2,4 → toujours `junk` |
| `flipDie` sur le dé 2 (variante B) | `7 − 2 = 5` | 4,5,3 → suite, **2 jetons** |

Les deux dernières lignes sont **deux variantes exclusives** : `flipDie` ne
s'utilise qu'une fois par partie (`B8`). Le retournement lit la face opposée
**telle qu'elle est gravée** (`B10`), et une seule gravure fait passer
`P(4-2-1)` de **2,78 % à 3,70 %** — c'est la courbe que `M8` suit, jusqu'au
plafond de 29,6 % d'un dé saturé (§17).

## 17. Ce que dit le calcul

### Le run demande 59 victoires consécutives, dont 9 à trois

Une défaite termine le run (`R6`), donc traverser les 9 Cercles demande
**59 victoires d'affilée** (`R6c`) — dont **9 dans une partie à 3 participants**,
la dernière de chaque Cercle (`R12`).

Soit `p` le taux de victoire du joueur en duel. Pour la partie à 3, le modèle de
Bradley-Terry donne `p₃ = p / (2 − p)` : il vaut exactement **1/3** quand
`p = 1/2` (aucune compétence, trois joueurs identiques) et **1** quand `p = 1`,
ce qui est la seule interpolation raisonnable entre les deux bornes connues.

| `p` (duel) | `p₃` (dernière partie) | P(run complet) | Runs avant d'en finir un | Parties par run | Cercle atteint (médiane) |
| --- | --- | --- | --- | --- | --- |
| 0,50 | 0,333 | 4,5 × 10⁻²⁰ | — | **2,0** | 1 |
| 0,60 | 0,429 | 3,9 × 10⁻¹⁵ | — | 2,4 | 1 |
| 0,70 | 0,538 | 6,8 × 10⁻¹¹ | 15 milliards | 3,1 | 1 |
| 0,80 | 0,667 | 3,7 × 10⁻⁷ | 2,7 millions | 4,5 | 1 |
| 0,90 | 0,818 | 8,5 × 10⁻⁴ | **1 181** | 8,7 | 2 |
| 0,95 | 0,905 | 0,031 | **32** | 16,8 | 3 |
| 0,99 | 0,980 | 0,505 | 2 | 43,0 | 9 ✅ |

Probabilité de **finir** chaque Cercle :

| `p` | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0,50 | 0,042 | 0,002 | 2 × 10⁻⁵ | 2 × 10⁻⁷ | — | — | — | — | — |
| 0,70 | 0,185 | 0,034 | 0,003 | 3 × 10⁻⁴ | 1 × 10⁻⁵ | — | — | — | — |
| 0,90 | 0,596 | 0,356 | 0,172 | 0,083 | 0,032 | 0,013 | 0,004 | 0,001 | 8 × 10⁻⁴ |
| 0,95 | 0,776 | 0,602 | 0,421 | 0,295 | 0,186 | 0,118 | 0,067 | 0,038 | 0,031 |
| 0,99 | 0,951 | 0,905 | 0,843 | 0,786 | 0,718 | 0,656 | 0,587 | 0,526 | 0,505 |

Trois lectures :

- **Le duel améliore beaucoup la base.** Un run sans aucune amélioration dure
  **2 parties** au lieu de 1,5 à trois joueurs, et 4 % des runs franchissent le
  Cercle 1 au lieu de 1,2 %. Ce n'est pas anecdotique : c'est ce qui fait
  qu'un joueur voit parfois le Cercle 2 sans rien avoir acheté.
- **La partie à 3 coûte cher, et c'est son rôle.** Elle ne représente que 9 des
  59 parties, mais à `p = 0,90` elle **divise par 2,4** la probabilité de finir
  le run (8,5 × 10⁻⁴ contre 2,0 × 10⁻³ si les 59 étaient des duels). C'est un
  vrai péage de fin de Cercle, pas une décoration.
- **Le seuil de franchissement est `p ≈ 0,95`.** En dessous, le Cercle 5 n'est
  jamais vu ; au-dessus, le run devient une affaire de dizaines de tentatives.
  C'est la cible que la boutique doit atteindre.

### Ce que la mesure dit — 600 runs joués

Le proto (`Proto3Html`, `npm run measure`) joue des runs entiers sans affichage.
200 runs par ligne, pilote automatique des deux côtés :

| | victoire au C1 | parties par run | Cercle atteint (max) | runs complets |
| --- | --- | --- | --- | --- |
| joueur au niveau des démons | **86,7 %** | 7,8 | 8 | 0 % |
| joueur expert, sans achats | **89,3 %** | 11,1 | 9 | 0,5 % |
| joueur expert, achats gloutons | 91,5 % → **100 %** | 14,0 | 9 | **6 %** |

L'évolution des trois réglages successifs, sur la même mesure :

| | victoire au C1 | parties par run | runs complets |
| --- | --- | --- | --- |
| règles d'origine | 52 % | 2,1 | 0 % |
| + `D5` ouvert, + 4 dés (`D1b`) | 80,6 % | 5,0 | 0 % |
| + « Prendre » retiré, don immédiat (`B5`, `B7`) | **86,7 %** | **7,8** | **6 %** (avec achats) |

Quatre enseignements :

1. **Le quatrième dé reste le levier le plus fort.** À niveau d'IA identique des
   deux côtés, il a fait passer le taux de victoire de 52 % à 80,6 % — plus que
   tout l'écart de niveau entre un démon `mauvais` et un joueur expert.
2. **Retirer « Prendre » a débloqué le dernier verrou.** Le catalogue ne contient
   plus de récompense qui ralentit son propriétaire, et le don de la seconde
   série (`B6`, prélevé sur sa propre réserve) est un raccourci direct vers la
   victoire. Un run passe de 5,0 à 7,8 parties, et **6 % des runs traversent les
   neuf Cercles** — contre 0 sur 600 deux réglages plus tôt.
3. **Le verrouillage circulaire du §17 est levé.** Avec 14 parties par run, la
   boutique a largement le temps de tourner : elle porte le taux de victoire à
   96-100 % à partir du Cercle 5.
4. **Les parties restent courtes** : 6 à 7 manches et 29 à 32 jets de dés, contre
   8 à 14 manches et 40 à 64 jets aux règles d'origine.

Un point de vigilance : la dernière partie du Cercle, à trois participants, se
gagne à **68,7 %** à la ligne de base et **75,6 %** avec achats, contre 37,5 %
aux règles d'origine. Le climax du Cercle est devenu sa partie la plus facile —
les trois participants restent un changement de nature (`R13`), plus une
difficulté.

### Le verrouillage circulaire de la boutique

C'est **le** problème du proto, et il se lit directement dans la colonne
« parties par run » :

> Pour s'équiper, il faut un run long. Pour avoir un run long, il faut être
> équipé.

Un run à `p = 1/2` dure **2 parties** : il rapporte **1 point de forge** (`J7`
en donne 1 toutes les 2 parties) et une vingtaine d'argent, soit **4 achats à 5**
— puis tout est perdu (`R8`). La boutique, les gravures de dés et les
combinaisons de 5 cartes identiques sont alors du contenu que **le testeur ne
verra jamais**. Il faut donc au moins un de ces trois leviers :

1. **Des démons faibles au départ** (`S5`, validé) : le levier le moins coûteux.
   Si les démons des Cercles 1-2 jouent au niveau `mauvais` et que `p` démarre à
   0,7, un run fait 3 parties ; à 0,8, il en fait 4,5, soit 2 points de forge et
   ~45 d'argent — la boutique commence à exister. **C'est le premier réglage à
   mesurer** (`M2`), et `Q4` porte son calibrage.
2. **Un capital de départ** : commencer chaque run avec de l'argent et des
   points de forge, pour que la première partie soit déjà jouée avec un deck
   choisi. C'est le patron *Slay the Spire*.
3. **Quelque chose qui traverse les runs** (`Q2`) : des points de forge
   conservés, ou un choix de départ débloqué par le meilleur Cercle atteint
   (`U16`). C'est le patron *Hadès*, et c'est ce qui rend le retour au début
   supportable après la vingtième mort au Cercle 1.

Les trois sont compatibles. Ce que la table interdit, c'est de n'en prendre
aucun.

### Une partie doit rester courte

Sur un jet de 3 D6, la distribution exacte des 216 tirages est :

| Combinaison | Cas | Part | Valeur |
| --- | --- | --- | --- |
| 4-2-1 | 6 | 2,8 % | 10 |
| 1-1-1 | 1 | 0,5 % | 7 |
| Brelans (2…6) | 5 | 2,3 % | 2 à 6 |
| 1-1-x | 15 | 6,9 % | 2 à 6 |
| Suites | 24 | 11,1 % | 2 |
| Nénette (2-2-1) | 3 | 1,4 % | 2 |
| Reste | **162** | **75,0 %** | 1 |

Espérance : **1,67 jeton** par jet nu. En duel, la meilleure des deux mains après
deux relances tourne autour de **3,5 à 5** jetons, donc vider un pot de 21 demande
**5 à 6 manches**, et la phase de don autant. Soit **10 à 12 manches × 2
participants × jusqu'à 3 jets ≈ 60 à 70 jets de dés**, plus **5 batailles de
cartes** à deux passes de changement chacune (`S1`).

Le passage au duel a retiré un tiers des jets ; la seconde série de batailles en
a rajouté deux. Une partie tient probablement en **3 minutes** avec `U13`
(vitesse réglable) — mais un run complet en fait alors **plus de 2 heures**
(43 parties à `p = 0,99`), et le proto n'a **aucune sauvegarde** (`Q2b`, §19).
C'est acceptable pour un proto, pas pour le jeu.

Les 75 % de `junk` sont ce qui rend la phase de répartition lente (transferts de
1 jeton). C'est `M5` qui dira si les relances corrigent ça ; sinon le levier est
de monter la valeur de `junk` à 2, ou de retirer 2 jetons du pot par manche morte.

### La gravure des dés : un pic assumé, dilué par la montée de dé

`A7` fixe `maxSameFace: 4`. Un joueur qui grave à fond ses trois D6 — dé 1
saturé de 4, dé 2 de 2, dé 3 de 1 — obtient :

| Dé | `maxSameFace: 2` | `3` | **`4` (retenu)** |
| --- | --- | --- | --- |
| D6 | 3,7 % | 12,5 % | **29,6 %** |
| D8 | 1,6 % | 5,3 % | **12,5 %** |
| D12 | 0,5 % | 1,6 % | **3,7 %** |
| D20 | 0,1 % | 0,3 % | **0,8 %** |
| D100 | 0,00 % | 0,00 % | **0,01 %** |

*(probabilité de 4-2-1 dès le premier jet ; la probabilité naturelle est 2,8 %)*

**29,6 % au premier jet**, c'est un 4-2-1 une manche sur trois avant même de
relancer — un pic de puissance très fort, et c'est assumé : `A7` borne le pic
sans l'interdire.

Ce qui le rend supportable, c'est le coût et la dilution. Saturer un dé qui porte
déjà naturellement un exemplaire de la valeur cible demande **3 gravures**, donc
3 × `engraveAll` = **6 points de forge = 12 parties**. À `p = 0,90` un run n'en
dure que 8,7 : le build est **hors d'atteinte d'un run moyen**, et n'apparaît
qu'à partir de `p ≈ 0,95` (16,8 parties). Puis la montée de dé (`F7`, `Q10`,
voulue) le dilue à chaque Cercle impair — et l'entrée au D100 l'efface presque
entièrement, au Cercle 9 qui n'exige que 3 victoires. Le build qui a porté le run
meurt à la porte du dernier Cercle : c'est le boss du jeu.

`M8` mesure non pas la probabilité seule, mais **le nombre de parties nécessaires
pour l'atteindre** — c'est ce chiffre-là qui dit si le garde-fou est au bon cran.

### La forge est devenue rentable — en séparant l'effet de la valeur

Le §17 a prédit deux fois de suite que graver casserait le jeu, et s'est trompé
deux fois : graver était un **mauvais achat**. La cause, trouvée à la mesure :
tant qu'on ne pouvait obtenir un effet qu'en changeant la valeur d'une face,
l'effet était la partie désirable et le changement de valeur était **l'impôt**.
Or graver un dé lui **retire** des faces — un D6 portant quatre 4 ne peut plus
montrer 1, 2 ni 3, donc il est exclu d'un 1-1-x, d'une suite, et il ne peut plus
fournir le « 1 » ni le « 2 » d'un 4-2-1. `D1b` (meilleure combinaison de trois
parmi quatre) récompense la polyvalence : l'impôt coûtait plus que l'effet ne
rapportait.

Depuis `F11`, poser un effet ne touche plus à la valeur. Résultat, 200 runs par
variante, joueur expert — **toutes les lignes clonent**, celles qui gravent le
font en plus, avec une monnaie séparée :

| Politique d'achat | runs complets | parties par run | forge non dépensée à la mort |
| --- | --- | --- | --- |
| clonage seul | 6,5 % | 13,7 | **5,1** |
| **+ gravure d'EFFETS, 4 faces par dé** | **10,5 %** | **15,9** | 1,7 |
| **+ gravure d'EFFETS, 2 faces par dé** | **9,0 %** | 14,9 | 3,4 |
| + gravure de VALEURS, 2 faces par dé | **0,5 %** | 7,8 | 2,3 |

Trois lectures :

1. **La forge vaut enfin son prix.** Graver des effets fait passer le taux de
   complétion de 6,5 % à 9-10,5 %, et le stock de points de forge inutilisés
   tombe de 5,1 à 1,7. L'économie de la forge tourne.
2. **Le piège n'a pas disparu, il s'est isolé.** Graver des valeurs reste
   catastrophique (0,5 %). C'est assumé (`F11c`) : le joueur voit exactement
   quelle valeur il remplace, et certains voudront fabriquer leur dé. Ce qui
   était fautif, c'était que ce soit le *seul* chemin.
3. **`A7` pouvait donc partir.** On peut maintenant saturer un dé de 4 ; le jeu
   punit ça tout seul, mieux qu'une règle ne l'interdisait.

> Réserve statistique : ce ne sont pas des comparaisons appariées. Dès la
> première gravure les tirages divergent, donc chaque ligne est un échantillon
> indépendant de 200 runs. À ces taux, l'écart-type est de ~2 points : l'écart
> entre clonage seul et gravure d'effets vaut environ 2 écarts-types — solide
> comme indication, pas comme preuve. L'écart avec la gravure de valeurs, lui,
> est massif.

### Deux effets de face sur six font tout le travail

Sur les variantes qui gravent, les effets déclenchés se comptent ainsi — les
effets passifs (`↻`, `⊖`, `✳`) n'émettent rien et ne sont pas comptés ici :

| Effet | à `forgeThreshold: 3` | à **`forgeThreshold: 2`** |
| --- | --- | --- |
| `⇈` un jeton du pot pour tous | 7 372 | 6 396 |
| `✦` +1 d'argent | 5 179 | 4 469 |
| `⚒` +1 point de forge | **12** | **218** |

`⚒` exigeait trois symboles visibles **en même temps**, alors qu'un effet n'est
tiré qu'une fois sur six parmi six : il fallait l'avoir gravé sur trois dés
différents *et* le sortir simultanément. Passé à deux (`F10e`), il se déclenche
dix-huit fois plus. Le taux de complétion, lui, ne bouge pas de façon lisible
(7,5 % contre 10,5 %, soit environ un écart-type) : `⚒` rend la forge plus
vivante sans déséquilibrer le run.

Attention à une lecture piégeuse du taux de `junk` : il monte de 50 % à 76 %
entre la ligne de base et la meilleure ligne, mais ce n'est pas la faute du
clonage — c'est que ces runs vont **beaucoup plus loin**, jusqu'au D100 où
presque tout est du `junk`. La profondeur atteinte confond la mesure.

### Le deck de cartes

Un run rapporte de l'ordre de **10 d'argent par partie** aux Cercles 1-2 (la
moitié du pot en duel). Soit ~20 pour un run de 2 parties (4 achats), ~45 pour un
run de 4,5 (9 achats) et ~87 pour un run de 8,7 (17 achats). C'est assez pour
orienter un deck, pas pour le reconstruire — ce qui est sain.

Le levier le plus fort reste `clone` : cloner la même carte puis retirer autour
rend **5 cartes identiques** (`C8`, qui bat tout) probable. `K4` (plancher à 20
cartes) empêche la version extrême ; 17 achats n'y suffisent pas, 40 oui.

`C13` (bornes 2-14) referme au passage la version « deck de 20 As » : on ne peut
plus empiler les +1, seulement cloner. Et `C12b` (classement figé sur le deck
neuf) fait que le deck construit vaut cher **au barème d'origine** — c'est
exactement le plaisir recherché, et `M8` doit surveiller que ça ne devient pas
automatique.

### Ce qui risque d'être inerte

- **Le Cercle 1** : 1 carte par bataille, donc **une seule catégorie possible**
  (`C12`, carte haute) et aucun changement utile au-delà de « je garde ou je
  retire ». Les 5 batailles y sont un pur tirage aléatoire. C'est acceptable
  comme tutoriel, mais c'est aussi le Cercle où meurent 96 % des runs non
  équipés.
- **`set42`** au-delà du D12 : fixer 4 et 2 sur un D20 ne vise plus qu'un 4-2-1
  à 1/20, quand un brelan naturel vaut jusqu'à 20 jetons. Le bonus se périme.
- **Les suites** : 2 jetons quel que soit le dé, quand un brelan en vaut jusqu'à
  100. À partir du Cercle 5, réussir une suite est une quasi-défaite. Faut-il
  les indexer sur le dé, elles aussi ? Voir `Q7`.
- **`removeTwo`** (`A5`), dominée par deux `removeOne`.
- **« un adversaire de votre choix »** (`B6`) : en duel il n'y a pas de choix,
  l'adversaire est le seul. Le don ne redevient une décision de ciblage que dans
  la dernière partie du Cercle (`R12b`) — soit 9 parties sur 59.
- **Le second tirage de récompenses** (`B3d`), entièrement déterminé depuis que
  le catalogue est tombé à 7 entrées.
- **Les Cercles 5 à 9 en entier** — D12, D20, D100, mains de 5 cartes, pot de
  303 — que la table ci-dessus place hors d'atteinte d'un run médian. Ce n'est
  pas un défaut de conception, c'est un problème de *test* : `G6` (démarrage
  arbitraire) est ce qui permet de les voir, et il n'est pas optionnel.

## 18. Questions de revue

Deux passes de revue ont tranché **12 des 15 questions**, dont la seule
bloquante, et l'implémentation en a fermé une de plus. Il ne reste que `Q2` (ce
qui traverse un run) et `Q7` (valeur de la suite sur les grands dés).
**Le corps de règles est complet et implémenté** (`Proto3Html`).

| # | Question | État |
| --- | --- | --- |
| ~~`Q1`~~ | **Combien de participants ?** | ✅ **2 en temps normal, 3 dans la dernière partie de chaque Cercle** (`R12`), les deux en configuration. Ça donne au Cercle un climax identifié, et ça change la nature du jeu à ce moment-là : à 2 chaque manche est un transfert forcé, à 3 on peut ne rien subir (`R13`). |
| `Q2` | **Que traverse un run ?** La défaite qui termine le run est tranchée (`R6`) ; reste `R8`, le roguelike strict où *rien* n'est conservé. | 🧪 **Largement desserré par la mesure (§17)** : avec `D5` ouvert et le quatrième dé (`D1b`), un run dure 8,7 parties, la boutique tourne, et **un run sur 200 traverse les neuf Cercles**. Le roguelike strict devient donc tenable. Reste à décider si 0,5 % est le bon taux de complétion, ou s'il faut un report entre runs pour le remonter. |
| ~~`Q2b`~~ | **Sauvegarde d'un run en cours ?** | ✅ **Hors périmètre** (§19). Reste bloquant pour le jeu : un run complet dépasse 2 heures. |
| ~~`Q3`~~ | **Combien de séries de batailles ?** | ✅ **3 batailles avant la répartition, 2 avant le don** (`S1`, `S2`), avec `n + 1` récompenses tirées par série (`B2`). Les récompenses de la première série restent actives pendant la seconde phase (`S2b`). |
| ~~`Q4`~~ | **Les démons progressent-ils ?** Non pour l'équipement (`S4`), **oui pour le niveau de jeu** (`S5`, validé). | ✅ **Calibré et mesuré** : `mauvais` aux Cercles 1-2, `moyen` aux 3-6, `expert` aux 7-9 donne 80 % de victoires au Cercle 1 et 4,8 parties par run — assez pour que la boutique existe. Correction indispensable trouvée à l'implémentation : le niveau doit porter sur **le choix des dés à garder** (`I5`), pas seulement sur les cartes, sinon il ne change rien. |
| ~~`Q5`~~ | **Une carte peut-elle dépasser l'As ?** | ✅ **Non.** Bornes dures 2-14 (`C13`) : on n'augmente pas un As, on ne diminue pas un 2. Un As n'est pas sélectionnable par `plusOneTwo` (`C13b`). |
| ~~`Q6`~~ | **`flipDie` sur un dé gravé.** | ✅ **Il lit la face opposée telle qu'elle est gravée** (`B10`). Graver le dos d'une face devient donc un coup à part entière. |
| `Q7` | **Barème des grands dés.** `faces + 4` et `faces + 1` sont validés (`V3`). Reste la **suite**, à 2 jetons du D6 au D100 : à partir du Cercle 5, la réussir est une quasi-défaite. | 🧪 La seule question de barème encore ouverte. |
| ~~`Q8`~~ | **Faut-il la nénette ?** | ✅ **Oui.** Le 2-2-1 est la pire main du jeu et vaut 2 jetons (`V5`). |
| ~~`Q9`~~ | **`removeTwo` est dominée** par deux `removeOne` (`A5`). | ✅ **Les coûts s'ajusteront à la mesure** ; ils sont en configuration (`G3`), donc modifiables sans toucher au code. Le constat `A5` reste vrai au barème actuel. |
| ~~`Q10`~~ | **La montée de dé efface les gravures** (`F7`). | ✅ **Voulu.** C'est le rééquilibrage automatique du run, et l'entrée au D100 fait du Cercle 9 un vrai boss (§17). |
| ~~`Q11`~~ | **Peut-on perdre exprès une bataille de cartes ?** | ✅ **Non** (`C15`) : aucune mécanique d'abandon. La seule liberté est de **ne pas échanger de cartes**, donc de passer. Contraste assumé avec les dés, où s'arrêter sur une main faible est légal (`D12`). |
| ~~`Q12`~~ | **Le pile ou face est-il un vrai choix ?** | ✅ **Non, et c'est assumé** : c'est de la mise en scène, à **animer longuement** pour la tension (`U12`). |
| ~~`Q13`~~ | **Vivier du second tirage de récompenses.** | ✅ **Catalogue moins les 4 récompenses proposées à la première série** (`B3b`). Son corollaire `B3c` est devenu **sans objet** : depuis que toute récompense s'applique à la sélection (`B5`), aucune ne peut être périmée. Reste un point neuf, `B3d` : à 7 récompenses au catalogue, le second tirage n'a plus d'aléa. |
| ~~`Q14`~~ | **La suite existe-t-elle à 2 cartes ?** | ✅ **Non** (`C12d`, `straightMinSize: 3`). Une main de 2 n'a donc que trois niveaux — paire, couleur, carte haute — et la quinte flush n'existe qu'à partir de 3 cartes. |

## 19. Hors périmètre du prototype

3D, art, caméra ; la **personnalisation des démons** par un deck et des dés
propres (`S4b`) ; le lien avec les Cercles décrits dans
[`../GDD.md`](../GDD.md) au-delà de la table `R2` ; le multijoueur ; la
sauvegarde d'un run en cours (`Q2b`) ; toute méta-progression entre runs au-delà
du meilleur Cercle atteint (`U16`, `Q2`) ; l'équilibrage fin des 9 Cercles (le proto doit
répondre aux 4 questions du §Objet, pas livrer une courbe finale) ; les protos 1
et 2 ne sont pas touchés.

## 20. Historique

| Date | Évolution |
| --- | --- |
| 2026-09-08 | **`⚒` passe de trois à deux symboles** (`F10e`, seuil mis en configuration). Il exigeait trois symboles visibles simultanément alors qu'un effet n'est tiré qu'une fois sur six : il fallait l'avoir gravé sur trois dés *et* le sortir en même temps. Mesuré : **12 déclenchements sur 200 runs à trois, 218 à deux** — dix-huit fois plus. Le taux de complétion ne bouge pas de façon lisible (7,5 % contre 10,5 %, environ un écart-type sur 200 runs) : l'effet devient vivant sans déséquilibrer le run. |
| 2026-09-08 | **La forge devient rentable, et `A7` est retiré.** Deux changements liés. `F11` : la gravure **agit sur un seul aspect de la face à la fois** — le graveur propose **3 effets** (la valeur ne bouge pas) et **2 valeurs** (l'effet ne bouge pas). C'est la suppression de l'impôt qui débloque tout : tant qu'un effet ne s'obtenait qu'en changeant une valeur, l'effet était la partie désirable et le changement de valeur la partie coûteuse, parce que graver **retire** des faces à un dé et que `D1b` récompense la polyvalence. `A7` (plafond de faces identiques) est **retiré** : il ne protégeait de rien, c'est `D1b` qui punit la saturation, et bien mieux. Mesuré sur 200 runs par variante : graver des effets **dépasse** le clonage seul — **10,5 %** de runs complets à 4 faces gravées par dé, 9,0 % à 2, contre 6,5 % sans graver — et le stock de points de forge inutilisés à la mort tombe de **5,1 à 1,7**. Graver des **valeurs** reste catastrophique (0,5 %), et c'est assumé (`F11c`) : un piège lisible est un choix de design légitime tant qu'il n'est pas le seul chemin. Confirmation au passage que `⚒` reste du contenu quasi mort : 12 déclenchements sur 200 runs même en gravant à fond. |
| 2026-09-08 | **Mesure de 1 200 runs** (6 variantes × 200) après l'arrivée des effets de face. Le mode lot grave désormais **à travers l'offre** (`F11`) au lieu de graver en direct : il mesurait jusque-là des règles qui n'existaient plus. Résultat principal : **la forge ne vaut toujours pas son prix**. Clonage seul termine **6,5 %** des runs, gravure en visant les effets 2,0-2,5 %, gravure en visant les valeurs 1,0 % ; le joueur meurt avec **5,1 points de forge non dépensés**. Les effets améliorent donc la gravure sans la sauver — la question ouverte n'est plus « comment empêcher la gravure de casser le jeu » mais **« comment rendre la forge attirante »**. Second résultat : **`⚒` est du contenu quasi mort**, 9 déclenchements sur 200 runs même en gravant à fond, parce qu'il exige trois symboles visibles simultanément alors qu'un effet n'est tiré qu'une fois sur six. `⇈` et `✦` font tout le travail (3 618 et 3 012 déclenchements). Piège de lecture noté au passage : le taux de `junk` monte de 50 % à 76 % entre la ligne de base et la meilleure ligne, non pas à cause du clonage mais parce que ces runs atteignent le D100, où presque tout est du `junk`. |
| 2026-09-08 | **Les faces des dés portent des effets** (`F10`) et **la gravure devient une offre** (`F11`). Une face n'est plus un nombre mais un couple valeur + effet ; six effets existent — relance gratuite, encaisse un de moins, vaut aussi sa face opposée, un jeton du pot pour tous, +1 d'argent (+10 si tous les dés l'affichent), +1 forge à trois symboles. À la gravure, le jeu propose **3 valeurs distinctes tirées au sort**, chacune portant un effet avec **30 %** de probabilité : on ne choisit plus la valeur, on choisit dans l'offre. **Conséquence structurante** (`F11b`) : le chemin dégénéré que redoutait le §17 — graver les trois dés en 4, 2 et 1 — n'est plus exécutable par construction, puisque la valeur voulue n'est offerte qu'une fois sur deux. Ce n'est donc plus `A7` qui protège le jeu, et la mesure le confirme : à travers l'offre, graver termine 1 % des runs contre **6,5 % en clonant seulement**. Trois points d'implémentation méritent d'être notés. `⇈` puise **dans le pot** et nulle part ailleurs — sinon `J2` (conservation des jetons) tombait, et l'effet devient donc inerte pendant toute la phase de don. `✦` et `⚒` rapportent **hors du barème**, ce sont les deux seuls endroits du jeu où l'on gagne sans rien donner. `✳` oblige l'évaluation de main à essayer les deux valeurs de chaque dé concerné, ce qui multiplie l'espace de recherche par 2 par dé « wild » — l'IA a un chemin de calcul dédié pour rester sous la milliseconde. |
| 2026-09-08 | **Pilote automatique dans l'interface** (`U17`) : un interrupteur du bandeau remplace le joueur par la machine, qui répond à tout et achète entre les parties — même code que le mode lot, donc ce qu'on regarde est exactement ce que la mesure compte. La politique d'achat sort du fichier de test pour devenir un module partagé, et ce partage a **révélé une erreur de mesure** : l'ancienne version attendait 3 ordres de gravure alors que le joueur a 4 dés depuis `D1b`, donc elle ne gravait **jamais**. La ligne « achats gloutons » du §17 ne mesurait en fait que le clonage. Corrigé, puis mesuré variante par variante : **le clonage seul termine 6,5 % des runs, la gravure saturée 2,5 %, la gravure modérée 0 %**. La prédiction du §17 est donc **renversée** — graver n'est pas la stratégie dégénérée, c'est un mauvais achat. L'explication est mécanique : graver un dé lui **retire** des faces, or « meilleure combinaison de 3 parmi N » (`D1b`) récompense la polyvalence, pas la garantie d'une valeur. `A7` n'est plus le garde-fou anti-dégénérescence : `D1b` l'est déjà. La question ouverte s'inverse — **la gravure vaut-elle son prix ?** |
| 2026-09-08 | **Quatre corrections nées de l'essai à l'écran.** `C3b` — une règle, pas de l'affichage : **passer clôt ses changements** pour toute la bataille, au lieu de reposer la même question à la seconde passe ; « je garde » devient une décision engageante. `U8c` : les récompenses ne sont plus **dessinées deux fois** — ce sont les cartes déjà à l'écran qui deviennent cliquables et pulsent, le panneau du bas ne fait plus que dire quoi faire. `U8d` : une fois les batailles finies, les récompenses **non prises disparaissent** ; elles ne joueront plus aucun rôle. `U8e` : le **nombre de jets du meneur** s'affiche sur son siège et est rappelé aux suivants — sans lui, `D4`, la seule décision structurante de la manche, ne se voyait nulle part. |
| 2026-09-08 | **Quatre récompenses ajoutées**, le catalogue remonte de 7 à **11 entrées** — ce qui referme au passage `B3d` (le second tirage avait perdu tout aléa). `B13` **`reroll421`** : un adversaire qui termine sur un 4-2-1 relance automatiquement tous ses dés, une fois par tour — le premier bonus purement défensif du jeu. `B14` **`takeLess`** : le détenteur encaisse un jeton de moins, au minimum 1 ; c'est le **transfert** qui est réduit, pas seulement ce qu'il reçoit, sinon `J2` (conservation des jetons) tomberait. `B15` **`splitGive`** : donner à un adversaire, c'est en donner la moitié à l'autre — donc se délester deux fois plus vite, et gagner plus d'argent quand c'est en phase de don. Sans effet en duel, elle n'y est jamais proposée (`B3e`, `B15b`). `B16` **`nenetteGift`**, de portée `all` comme `setRerolls` : la nénette 2-2-1, pire main du jeu, fait circuler un jeton vers chaque adversaire — pris au pot en répartition, sorti de sa réserve en don — **même en perdant la manche**. La pire main devient une consolation, et le seul endroit du jeu où perdre rapporte quelque chose. Le pas de résolution expose désormais la **valeur réclamée** (`base`) à côté du montant transféré, pour que les tests d'invariant distinguent un plafonnement d'une réduction. Mesuré : **9 % des runs traversent les neuf Cercles** (contre 6 %), et les parties se rallongent un peu — 8 manches et 36 à 41 jets contre 6-7 et 29-32 — les nouveaux bonus faisant circuler davantage de jetons et `reroll421` annulant les grosses mains. |
| 2026-09-08 | **Catalogue de récompenses simplifié, et `extraDie` recadré.** Le bonus « Prendre des jetons » (`take3`, `take1`) **disparaît** : c'était le plus contre-intuitif du jeu, prendre des jetons aidant l'adversaire à finir sa phase de don. Le catalogue passe de 10 à **7** entrées. « Donner des jetons » s'applique désormais **au moment où il est pris** (`B5`), et les jetons viennent **du pot tant qu'il en reste, puis de la réserve du donneur** (`B6`) — une seule règle qui produit deux récompenses différentes : attaque gratuite à la première série, raccourci vers la victoire à la seconde. Conséquence en cascade : plus aucune récompense n'est différée, donc `applyTimed` disparaît du moteur et `B3c` (ne pas proposer une récompense périmée) devient **sans objet**. Correction signalée à l'essai : `extraDie` valait pour toute la partie alors qu'il ne doit valoir qu'au **premier jet de chaque phase** (`B8`) ; le retrait du dé surnuméraire est désormais **automatique et visible** — le jeu écarte un dé parmi ceux qu'il n'a pas retenus, donc la main du jet est préservée (`B12b`). Mesuré : **6 % des runs traversent les neuf Cercles**, contre 0 sur 600 deux réglages plus tôt, et un run dure 14 parties au lieu de 2,1. Un point neuf à surveiller (`B3d`) : à 7 récompenses au catalogue, le second tirage propose exactement les 3 restantes — il n'a plus d'aléa. |
| 2026-09-08 | **Deux ajustements d'accessibilité, demandés après essai : le jeu était trop dur.** `D5` **saute** : on s'arrête quand on veut, après avoir vu ses dés — il n'y a plus rien à annoncer avant de lancer, et le bonus `lateStop`, qui n'était que la levée de cette contrainte, disparaît avec elle. `D4` (le meneur plafonne les autres) survit et devient **la** décision de la manche. `D1b` : **le joueur lance 4 dés, les démons 3**, et le jeu retient automatiquement la meilleure combinaison de trois — plus aucun retrait manuel, donc `B12` se simplifie. Le bonus `fourthDie` devient **`extraDie`, « un dé en plus »** : 5 dés pour le joueur, 4 pour un démon, sur toute la partie. Mesuré sur 600 runs, l'effet est net et va bien au-delà de ce qu'on cherchait : **le quatrième dé vaut à lui seul +28 points de taux de victoire** (52 % → 80,6 % à niveau d'IA égal), plus que tout l'écart de niveau entre un démon `mauvais` et un joueur expert. Le verrouillage circulaire du §17 est **levé** — un run dure 8,7 parties au lieu de 2,1, la boutique porte le taux de victoire à 95-98 % aux Cercles 5-7, et **un run sur 200 traverse les neuf Cercles**, là où aucun des 600 précédents n'y arrivait. Effet de bord bienvenu : les parties sont **deux fois plus courtes** (5-6 manches, 24-26 jets contre 8-14 et 40-64), un run complet passant sous l'heure. Un point de vigilance ouvert : la dernière partie du Cercle, à trois participants, se gagne désormais à 63-74 % contre 37,5 % avant — le climax du Cercle est devenu sa partie la plus facile. |
| 2026-09-08 | **Prototype implémenté** dans `Proto3Html/` (React + TypeScript, 103 tests). Le moteur est un **générateur** : la séquence `S1` se lit linéairement et chaque décision humaine est un `yield`. Il émet une trace d'étapes que l'affichage rejoue dans le temps, à vitesse réglable (`U1`, `U2`, `U13`). Quatre choses que seule l'implémentation pouvait dire. **`D10f`, une règle tombée du moteur** : un test d'intégration a trouvé des parties où personne n'atteignait zéro — parce que quelqu'un y était déjà. Sortir de la répartition sans jeton, c'est avoir déjà fini la phase de don : on gagne la partie sans la jouer, et sans un centime. **`D10g`, un biais mesuré** : quand plusieurs participants sortent à zéro, les départager par l'ordre des sièges donnait au joueur 0 une victoire à 48 % dans les parties à trois, contre 33 % attendus — c'est un pile ou face. **`I5`, la correction qui débloque `S5`** : tant que le niveau des démons ne portait que sur les mains de cartes, il ne changeait **rien** au taux de victoire (52 % contre 52 %), les parties se décidant aux dés ; porté sur le choix des dés à garder, il le fait passer à **80 %**, et `Q4` se referme. Enfin un **bug d'inspecteur de dés** : repérer les faces gravées exige de rejouer la même échelle de montées (6→8→12→20→100) — un saut direct ne range pas les faces pareil et désigne les mauvaises. §17 passe de prédiction à **mesure sur 600 runs** : le modèle est confirmé au chiffre près (2,1 parties par run à `p = 0,52`, 4,8 à `p = 0,80`), la boutique lève bien le taux de victoire de 80 % à 95 % au fil des Cercles — mais **aucun run ne va au bout**, le meilleur s'arrêtant au Cercle 7. `Q2` devient la dernière vraie question. |
| 2026-09-08 | **Seconde passe — `Q13` et `Q14` tranchées, il ne reste que `Q2`, `Q4` et `Q7`.** `Q13` : le second tirage de récompenses repart du catalogue **moins les 4 proposées à la première série** (`B3b`), prises ou non — 6 entrées pour 3 tirages, et ce qu'on a laissé passer ne revient pas dans la partie. Corollaire ouvert `B3c` : `give3` et `give5` ne peuvent plus s'appliquer une fois la répartition finie, il ne faut donc pas les proposer au second tirage sous peine d'offrir un choix mort. `Q14` : **pas de suite à 2 cartes** (`C12d`, `straightMinSize: 3`), donc pas de quinte flush non plus à cette taille — la table de `C12` passe à **trois niveaux à 2 cartes** : paire 5,88 %, couleur 23,53 %, carte haute 70,59 %. La seule décision du Cercle 2 devient « est-ce que je casse une couleur facile pour tenter une paire rare », qui est exactement l'inversion installée par `C12` ; la suite n'entre en jeu qu'au Cercle 3, avec le D8. |
| 2026-09-08 | **Première revue — 10 questions sur 13 tranchées, 46 règles passées en ✅, 2 questions nouvelles.** `Q1` (bloquante) : une partie est un **duel**, sauf la **dernière de chaque Cercle** qui oppose 3 participants (`R12`) — le Cercle a désormais un climax annoncé (`R12b`, `U7b`), et §17 montre que ces 9 parties absorbent à elles seules un facteur 2,4 sur la probabilité de finir un run. `Q3` : il y a **deux séries de batailles**, 3 avant la répartition et 2 avant le don, avec `n + 1` récompenses tirées par série (`S1`, `B2`) — la seconde série est un rattrapage pour qui vient de ramasser tout le pot (`S2c`). `D7` : le **meneur de la première manche est le vainqueur de la dernière bataille de cartes**, ce qui relie enfin les cartes aux dés autrement que par les récompenses. **`C12` refait par dénombrement exhaustif** : le classement des combinaisons de cartes dépend de la taille de la main, parce qu'à 2 cartes la couleur (19,9 %) est quatre fois plus facile que la paire (5,9 %) — la suite bat la couleur à 3 et 4 cartes, le carré bat la quinte flush à 4, et à 5 cartes on retrouve **exactement** l'ordre du poker, ce qui valide la méthode. `C13` : bornes dures 2-14. `V1b` : à valeur égale, `x-x-x` bat `1-1-x`. `V5` : la **nénette** est ajoutée. `A7` : `maxSameFace` passe de 2 à **4**, soit un plafond de **29,6 % de 4-2-1 au D6** — pic assumé, hors d'atteinte d'un run moyen (6 points de forge = 12 parties) et dilué par chaque montée de dé. Deux questions nouvelles, `Q13` et `Q14`, tranchées dans la foulée (entrée ci-dessus). |
| 2026-09-07 | **`Q2` tranchée par l'auteur : une défaite termine le run** — le joueur est félicité d'être arrivé au Cercle *n* et renvoyé au début (`R6`, `R10`, `U15`). Conséquences en cascade : « d'affilée » devient **automatique** (`R6b`, aucune défaite n'étant survivable), le run entier demande **59 victoires consécutives** (`R6c`), et l'argent d'une partie perdue est perdu avec le run — il n'y a plus de farm (`J6`). §17 refait entièrement : la structure roguelike **règle** le problème de durée (un run raté coûte 2 à 10 parties au lieu de 124) mais **crée un verrouillage circulaire** — pour s'équiper il faut un run long, pour avoir un run long il faut être équipé, et un run non équipé ne dure que **1,5 partie**, soit 0 point de forge et 2 achats. Trois sorties compatibles proposées, dont `S5` (le niveau des démons monte avec le Cercle) qui devient le premier réglage à mesurer. Le risque de gravure dégénérée (`A7`) se déplace : plus « le joueur casse le jeu au Cercle 2 » mais « le run qui a démarré ne peut plus perdre ». Ajout de `G6` (démarrage arbitraire), sans quoi les Cercles 5 à 9 ne seront jamais vus par un testeur. |
| 2026-09-07 | Mise au propre de `gameplay.md` : numérotation des règles, 12 questions de revue dont une bloquante (`Q1`, le nombre de participants). Quatre trous comblés par le calcul plutôt que par choix : le **pot suit `3 × (faces + 1)`** sur les 5 types de dés (`R3`), ce qui impose le barème généralisé `faces + 4` / `faces + 1` (`V2`) — sans lui, un brelan de 100 écraserait le 4-2-1 au Cercle 9 ; les récompenses `give3`/`give5` ne peuvent puiser que **dans le pot** (`B6`), puisque personne ne possède de jeton à ce moment-là ; le classement des mains est **indépendant** de `valuePlus1` (`V4`). Deux risques quantifiés, avec l'hypothèse alors en vigueur d'une défaite qui ne coûte que la série (révisée le jour même, voir l'entrée ci-dessus) : le run demandait **96 parties dans le meilleur cas et ~90 000 au pire**, et la gravure des dés permettait un **4-2-1 garanti dès le Cercle 2** pour 12 points de forge — d'où le garde-fou `A7` et la métrique `M8`, tous deux conservés. |
