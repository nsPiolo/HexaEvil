# Personnalités d'âmes

Une personnalité est un comportement **collé à une âme**, pas un pouvoir du joueur :
elle ne se déclenche pas, elle change la façon dont cette âme lit les dés, percute et
encaisse. Visible avant les paris initiaux, elle ne donne aucun contrôle direct — elle
change la **lecture** de la course (GDD §1.3, §6.5).

**Dix sont implémentées dans le proto** (`Proto4Html/src/core/rules/personalities.ts`) :
les six archétypes du GDD, chiffrés ici, et quatre ajoutées pour couvrir les axes qui
manquaient — traverser le plateau, lire le dé à l'envers, ne jamais varier, bousculer.
Les huit autres fiches du bas de page restent en réserve, non codées.

## Comment une âme en reçoit une

**La révélation.** À la fin de la **première course de chaque cercle, à partir du
troisième**, une âme révèle sa personnalité. Le choix de l'âme n'est pas tiré au sort :
c'est **la mieux classée de la course parmi celles qui n'en ont pas**. La personnalité,
elle, est tirée au hasard — de préférence parmi celles que personne ne porte encore, pour
que deux Martyrs ne disent pas deux fois la même chose au joueur. Un écran dédié l'annonce,
entre la course et la carte.

Le choix déterministe de l'âme est le point : le joueur voit le classement se faire, donc
il sait qui va se découvrir. La révélation se lit comme une **conséquence de la course
qu'il vient de jouer**, pas comme une surprise posée dessus.

**Le masque.** La boutique vend un masque par personnalité, plus un **masque brisé** qui
en retire une. Le joueur choisit l'âme à l'achat, y compris une âme déjà marquée : le
masque remplace ce qu'elle portait. Les masques ne sont pas dans le socle de départ de
`shop.json` — c'est la révélation qui fait découvrir le système, gratuitement et dans tous
les runs ; les masques sont ce qu'on en fait ensuite.

**Durée : tout le run.** Une personnalité, révélée ou achetée, tient jusqu'à la fin de
l'évasion. Elle voyage dans l'inventaire du joueur, donc dans la sauvegarde. Une âme n'en
porte qu'une à la fois ; rien ne limite le nombre d'âmes marquées.

## Où chaque effet se résout

Aucune personnalité ne se résout au même endroit, et c'est ce qui décide du câblage.

| Moment | Personnalités | Code |
|---|---|---|
| lecture de la face du dé | Le Constant, L'Opposant | `readDie`, appelé par `effectiveDistance` |
| amplitude du déplacement | L'Ambitieux, Le Martyr, Le Condamné | `shapeMove`, idem |
| tirage des dés Âme | Le Tricheur | `rollPlayerDice`, `rollOpponentPair` |
| contre le plateau | Le Résolu, L'Ogre, Le Parasite, les rancunes du Martyr | `applyMove` |
| règlement des paris | Le Juge | `settleBets` (`gainFactor`) |

L'ordre compte : la lecture de la face passe **avant** le pouvoir du boss et les artefacts
du joueur — Le Constant et L'Opposant ne modifient pas un déplacement, ils changent ce que
le dé veut dire pour cette âme-là — et l'amplitude passe **après** tout le reste.

## Récapitulatif

| # | Personnalité | Signe | Axe | Impact | Prix | Rang | Proto |
|---:|---|:--:|---|---|---:|---:|:--:|
| 1 | Le Martyr | ✚ | remontée tardive | Moyen | 35 | 1 | ✔ |
| 2 | L'Ambitieux | ▲ | variance | Moyen | 40 | 1 | ✔ |
| 3 | Le Tricheur | ⊗ | incertitude sur les dés Âme | Fort | 60 | 2 | ✔ |
| 4 | Le Condamné | ⇥ | accélération | Moyen | 40 | 1 | ✔ |
| 5 | Le Parasite | ≺ | dépendance | Fort | 55 | 2 | ✔ |
| 6 | Le Juge | § | économie des paris | Fort | 70 | 2 | ✔ |
| 7 | Le Résolu | ⊘ | terrain | Moyen | 50 | 1 | ✔ |
| 8 | L'Opposant | ⇄ | inversion | Moyen | 45 | 1 | ✔ |
| 9 | Le Constant | ≡ | stabilité absolue | Faible | 35 | 1 | ✔ |
| 10 | L'Ogre | ✖ | collisions agressives | Moyen | 45 | 1 | ✔ |
| — | Masque brisé | — | retire une personnalité | Faible | 10 | 1 | ✔ |

Le **signe** est le glyphe posé sur le jeton de l'âme marquée
(`PERSONALITY_GLYPH`, `presentation/PersonalityMark.tsx`) et gravé sur la vignette du
masque (`prompts-objets.md` § Masques) : le joueur doit reconnaître sur la piste ce qu'il
a acheté en vitrine.

## Fiches — les dix du proto

### 1. Le Martyr ✚ — 35

- **Effet.** Ses avancées perdent une case (jamais moins de 1). Chaque fois qu'il est
  percuté (dépassé par un saut) ou échangé, il gagne une **rancune**. En entrant en zone de
  fin, il les dépense toutes d'un coup : +1 case par rancune, en un seul déplacement.
- **Lecture pour les paris.** Mauvais pari Vainqueur précoce, excellent pari Top 3 tardif
  ou Duel contre une âme qui l'a beaucoup bousculé.
- **Écart avec le GDD.** La dépense se fait à l'entrée en zone de fin seulement ; la clause
  « à la moitié du parcours » a sauté, le seuil de pari étant déjà à 60 %.

### 2. L'Ambitieux ▲ — 40

- **Effet.** Une avancée de 3 ou plus gagne une case ; un recul de 1 ou plus en perd une.
- **Lecture.** Le pari Vainqueur pur ou Dernier sur la même âme : il finit rarement au
  milieu. Un pari Pas dans le top 3 sur lui est presque toujours franc.
- **Prix.** Variance pure, ni bonne ni mauvaise : prix moyen.

### 3. Le Tricheur ⊗ — 60

- **Effet.** Quand un dé Âme le désigne, **une fois sur quatre** le dé est relancé et c'est
  le second tirage qui compte — quitte à le redésigner. Vaut pour les dés du joueur comme
  pour les paires de l'adversaire.
- **Lecture.** Son nom sur un dé ne veut plus dire grand-chose : c'est de l'incertitude
  ajoutée là où le joueur croyait décider.
- **Écart avec le GDD.** Le GDD lui faisait changer l'identité désignée, au choix du
  joueur. Le proto en garde l'incertitude sans l'interaction : pas d'écran de plus pendant
  l'appariement, et l'effet reste symétrique — il triche aussi contre son propriétaire,
  d'où la contrepartie affichée sur le masque.
- **Le hasard n'est consulté que pour les dés qui le nomment** : une course sans Tricheur
  tire exactement la même suite qu'avant, et les graines de référence restent valables.

### 4. Le Condamné ⇥ — 40

- **Effet.** Ses avancées du **premier tour** perdent une case ; celles qu'il entame
  **depuis la zone de fin** en gagnent une. Un recul reste un recul.
- **Lecture.** Récompense les paris posés tard, juste avant le seuil.
- **Écart avec le GDD.** Le malus porte sur le premier tour et non sur le premier
  déplacement positif : même lecture pour le joueur (il part lent), sans compteur par âme
  qu'un artefact ou une case spéciale déréglerait sans que ça se voie.

### 5. Le Parasite ≺ — 55

- **Effet.** Quand l'âme **directement devant lui** avance de 2 cases ou plus, il avance de
  1 aussitôt après. Les positions lues sont celles d'avant le déplacement : c'est bien son
  hôte du moment qui vient de bouger.
- **Lecture.** Crée des paris couplés : parier sur l'hôte, c'est parier un peu sur le
  Parasite. Le pari Deux âmes dans le top 3 devient lisible.
- **Écart avec le GDD.** Le vol de case à la percussion a été retiré : c'est le métier de
  L'Ogre, et deux personnalités qui font la même chose ne se distinguent plus sur la piste.

### 6. Le Juge § — 70

- **Effet.** Ne modifie aucun déplacement. Au règlement : s'il finit dans le top 3, **tous
  les gains de la course sont multipliés par 1,5** ; s'il finit dernier, ils sont divisés
  par deux. Les pertes ne sont pas touchées.
- **Lecture.** Une méta-couche : le joueur doit lire le Juge même s'il ne parie pas dessus.
  Pousse à couvrir avec un pari Pas dans le top 3 sur lui.
- **Prix.** Fort : le seul effet qui touche tout le tableau de paris.

### 7. Le Résolu ⊘ — 50

- **Effet.** Les cases bloquées n'existent pas pour lui : il s'y arrête comme sur n'importe
  quelle autre, et ne dévie donc jamais de couloir à cause d'un rétrécissement.
- **Lecture.** Sur un terrain chargé d'éboulis, c'est l'âme dont la trajectoire est la plus
  prévisible — et la seule qui ne perd jamais de temps en détour. Son intérêt dépend
  entièrement du terrain tiré, annoncé avant les paris.
- **Prix.** Moyen, mais très variable d'une course à l'autre : c'est ce qui le rend
  intéressant à poser sur une âme plutôt qu'une autre.

### 8. L'Opposant ⇄ — 45

- **Effet.** Il prend la valeur **opposée** du dé Distance : un +2 le fait reculer de deux
  cases, un −1 l'avance d'une.
- **Lecture.** Le joueur doit inverser sa main : les dés qu'il gardait pour freiner une âme
  la poussent, et réciproquement. Avec deux dés Distance et trois dés Âme, c'est un choix
  d'ordre, pas une fatalité.
- **Prix.** Moyen : l'espérance baisse un peu (le dé de base est positif en moyenne), mais
  le contrôle offert la compense.

### 9. Le Constant ≡ — 35

- **Effet.** Quel que soit le dé, il avance d'une case. Jamais plus, jamais moins, jamais
  en arrière.
- **Lecture.** L'âme la plus prévisible du plateau : un mètre étalon contre lequel se lisent
  toutes les autres. Idéale pour un Duel, inutile pour un gros multiplicateur.
- **Prix.** Faible : c'est de la stabilité, pas de la puissance.

### 10. L'Ogre ✖ — 45

- **Effet.** L'âme qu'il dépasse en la percutant recule d'une case après le saut.
- **Lecture.** Son voisinage est dangereux, et il gagne deux fois à chaque percussion :
  il passe devant et creuse l'écart. Duels très lisibles.
- **Prix.** Moyen : offensif, mais il faut que les dés le fassent percuter.

## Réserve — fiches non implémentées

Ces huit-là restent au dossier : elles complètent les axes information, économie, liens
entre âmes et tempo, et attendent d'être chiffrées en jeu.

### Le Fantôme — 45

Immatériel : personne ne le percute ni ne l'échange. Une âme qui atterrit sur sa case s'y
arrête, en cohabitation. Lui-même ne saute jamais devant : il s'arrête où le dé le dit.

### Le Prophète — 65

Tant qu'il n'est pas dans la zone de fin, le joueur voit la paire de l'adversaire avant de
choisir ses associations. Au-delà du seuil, l'information disparaît.

### Le Comptable — 50

Chaque fois qu'il se déplace, positif ou négatif, le joueur gagne 2 pièces. S'il finit
dernier, le joueur en rend 10.

### Les Jumeaux — 80 (deux âmes)

Deux âmes liées pour le cercle : quand l'une se déplace d'au moins 2, l'autre se déplace de
1 dans la même direction. Si l'une percute l'autre, elles cohabitent.

### Le Paresseux — 25

Ses −1 deviennent 0, ses 3 deviennent 2. Il n'est jamais désigné par la première paire de
l'adversaire au tour 1.

### Le Somnambule — 45

Sur les paires de l'adversaire, ses déplacements sont doublés ; sur les combinaisons du
joueur, réduits de 1.

### Le Pénitent ⚠ — 60, rang 3

Chaque échange de place subi lui donne +1 permanent sur ses déplacements positifs de la
course, cumulable. Contrepartie : un pari Vainqueur pur posé sur lui coûte double mise.

### Le Bélier — 45

Absorbé par L'Ogre dans le proto (percussion qui fait reculer). Sa moitié défensive —
l'âme qui le percute s'arrête sur sa case au lieu de sauter devant — reste à prendre si
l'on veut une personnalité purement défensive.

## Interactions notables

| Couple | Effet |
|---|---|
| Parasite derrière Ambitieux | le Parasite bouge presque à chaque déplacement de l'hôte |
| Ogre devant Martyr | le Martyr récolte des rancunes en série |
| Opposant + Constant | deux façons opposées de rendre une âme lisible : l'une inverse la main du joueur, l'autre la lui retire |
| Juge + Ogre | le joueur a intérêt à faire monter le Juge, l'Ogre est le moyen le plus direct de bousculer ce qui le gêne |
| Résolu sur un terrain sans éboulis | rien du tout : c'est le seul effet qui peut être nul selon le terrain tiré |

## À mesurer dans le POC

- Fréquence des rancunes du Martyr sur une course de 14 colonnes : assez pour que le
  retournement se voie ?
- Le Juge doit-il agir sur les pertes aussi, pour créer un vrai enjeu négatif ?
- Le rythme de révélation (une âme par cercle à partir du troisième) donne 7 âmes marquées
  au neuvième cercle, qui en aligne 10. Est-ce trop de choses à lire avant de parier ?
- L'Opposant est-il un cadeau ou une punition ? À deux dés Distance, le joueur choisit
  souvent l'ordre : mesurer s'il perd réellement de la vitesse.
