# Boutique — vue d'ensemble et repères de prix

Ces fichiers listent le contenu achetable du proto 4 (GDD §6). Ils servent de
réservoir : tout n'a pas vocation à être implémenté d'un coup, et chaque chiffre
est un point de départ pour la configuration du POC (GDD §9.1).

| Fichier | Contenu | Minimum demandé | Fourni | Implémenté |
|---|---|---:|---:|---:|
| [`personnalites.md`](personnalites.md) | Personnalités à donner aux âmes | 10 | 18 | 10 |
| [`artefacts.md`](artefacts.md) | Passifs permanents du run | 20 | 41 | 30 |
| [`forge.md`](forge.md) | Altérations de face de dé | 10 | 20 | 11 |
| [`des.md`](des.md) | Dés spéciaux | 4 | 12 | 7 |
| [`cartes.md`](cartes.md) | ~~Cartes action consommables~~ — **abandonné**, idées recyclées | — | 60 | 0 |

Reste à faire, et pourquoi : le **Sceau du stagiaire** (artefact n° 25) attend les
personnalités ; les trois **dés Âme** et les cinq **faces de dé Âme** attendent que
les dés Âme soient modélisés — aujourd'hui `rollPlayerDice` tire une âme au hasard
sans objet derrière.

Les **cartes action sont abandonnées** (19 septembre 2026) : le système demandait
une main et six fenêtres de jeu dans la boucle de tour pour de l'agentivité que la
forge, les dés et les artefacts couvrent déjà. Les idées retenues ont été
converties en **artefacts 33 à 42**, **faces de forge 15 à 20** et **dés 11 et
12** — la table de conversion complète est dans [`cartes.md`](cartes.md). Cette
vague n'est pas implémentée : elle est planifiée **après les archétypes d'âmes**.
Un seul objet demande une modification de la boucle de tour, le **Dé de Minos**
(fenêtre de jeu après la révélation de la paire adverse).

Les objets marqués ✔ dans les listes sont implémentés dans `Proto4Html`
(catalogue et prix dans `Proto4Html/config/shop.json`). Dans le proto, la boutique
ouvre **après les paris initiaux** (au moins un) et avant la course, conformément
au cycle macro révisé du GDD §2.1.

Les **vignettes** des objets du proto (leur emplacement dans la carte de
vitrine et dans l'inventaire, et les prompts pour les générer) sont décrites dans
[`prompts-objets.md`](prompts-objets.md).

## Hypothèses économiques

L'argent sert à parier, acheter et payer le prix du cercle : une même pièce a
trois usages concurrents, ce qui est voulu (inspi §3). Les prix ci-dessous
supposent l'échelle suivante, à recaler dès que les paris seront mesurés :

| Repère | Valeur supposée |
|---|---:|
| Capital initial | 100 |
| Mise typique d'un pari | 10 à 30 |
| Gain net d'une course bien lue | 40 à 120 |
| Prix du cercle 1 | 100 |
| Prix du cercle 5 | 400 |
| Prix du cercle 9 | 1 000 |

Les prix indiqués sont ceux du cercle 1. Règle de progression proposée :
**prix × (1 + 0,25 × (cercle − 1))**, arrondi à 5, pour que la boutique reste un
choix douloureux face au prix du cercle.

## Échelle d'impact

Chaque objet porte une étiquette d'impact qui justifie son prix :

| Impact | Sens | Fourchette de prix (cercle 1) |
|---|---|---:|
| Faible | Ajuste une valeur, une fois | 5 à 20 |
| Moyen | Change une lecture ou un comportement de course | 20 à 60 |
| Fort | Change la façon de jouer un cercle entier | 60 à 150 |
| Extrême | Casse une règle fondamentale, à charges limitées | 150 à 250 |

## Déblocage d'un run à l'autre

Le catalogue n'est pas ouvert d'un bloc. Au tout premier lancement, seuls les
objets listés dans `shop.unlockedAtStart` (`Proto4Html/config/shop.json`) sont en
rayon ; les autres sont **scellés**. **Chaque cercle payé descelle un objet**,
tiré au sort parmi les scellés, révélé sur un écran dédié juste après le dialogue
de fin de cercle.

- Le tirage est pondéré par `rarityWeights` : un commun sort plus souvent qu'un
  rare, un rare plus souvent qu'un légendaire. Les objets qui changent le plus la
  partie arrivent donc dans les runs tardifs — même intention que le déblocage par
  grade décrit plus bas, mais à l'échelle du joueur et non du run.
- Le déblocage est **définitif et hors run** : il survit à la mort du joueur, et
  la sauvegarde du run (`clearRun`) n'y touche pas. Un cercle raté (prix
  impayable) ne descelle rien.
- La vitrine ne tire que parmi les objets descellés. Le socle de départ doit donc
  compter au moins `slots` objets, sinon la première vitrine ouvrirait incomplète
  — le chargeur de configuration le refuse.
- Le menu `Collection` de l'accueil liste les objets descellés et compte les
  scellés **sans les nommer** (voir [`interface.md`](interface.md) § Collection).

Socle livré aujourd'hui (**9 objets sur 59**), réparti sur les trois familles pour
qu'une vitrine de trois puisse toujours offrir autre chose qu'une seule sorte de
geste : Clepsydre fêlée, Bourse percée, Tirelire du stagiaire, Semelles de plomb,
Dé des Limbes, Dé du Décathlon, Face limée, Face dorée, Face de gel.

Le Dé de la Colère a quitté ce socle : ses deux dés y disaient la même chose
(remplacer un dé pour aller plus vite ou plus fort), et le premier achat de dé se
jouait donc sur la seule variance. Le Décathlon, qui échange la vitesse contre le
choix de la valeur, ouvre l'autre geste — freiner une âme — dès le premier cercle ;
la Colère reste au catalogue, scellée comme les autres.

Un run complet jusqu'au neuvième cercle descelle 9 objets. Avec 50 objets scellés,
il faut six runs complets pour ouvrir tout le catalogue : c'est le chiffre à
surveiller si le rythme paraît trop lent — il se règle par `unlockedAtStart`, sans
toucher au code. Les onze masques de personnalité sont entrés au catalogue scellés, ce
qui a allongé le compte d'un run : c'est assumé, parce que le système se découvre de
toute façon par la révélation du troisième cercle, sans rien acheter.

Code : `Proto4Html/src/core/shop/unlocks.ts` (tirage et partage descellé/scellé),
`storage.ts` (clé `sinnersbet.unlocks.v1`), `App.tsx` (révélation de fin de cercle).

## Trois options par vitrine

La vitrine montre **trois objets** (`shop.slots`), renouvelables contre
`shop.rerollCost`. Pour respecter la tension prudente / ambitieuse / dangereuse
(inspi §6), chaque vitrine devrait proposer au moins :

- un objet **sûr** (Faible ou Moyen, sans contrepartie) ;
- un objet **ambitieux** (Fort, souvent conditionnel) ;
- un objet **dangereux** (avec contrepartie explicite, marqué ⚠ dans les listes).

## Déblocage par la hiérarchie du stagiaire

Le démon stagiaire monte en grade quand son poulain progresse (GDD §5.2). Les
listes indiquent un **rang** minimal quand il y en a un :

| Rang | Obtenu | Débloque | Paris ouverts (proto 4, `economy.betUnlockLevel`) |
|---|---|---|---|
| 0 — Stagiaire | départ | cartes communes, forge de base, un dé spécial | Vainqueur, Top 3, Pas dans le top 3, Dernière place |
| 1 — Assistant | boss du cercle 2 battu | personnalités (1 par course), artefacts communs | + Duel, Deux âmes dans le top 3, Top 3 dans le désordre |
| 2 — Tourmenteur | boss du cercle 3 battu | 2 personnalités par course, dés rares, forge avancée | + Vainqueur + dernier |
| 3 — Contremaître | boss du cercle 5 battu | 3 personnalités, artefacts rares, modification du circuit | + Podium exact |
| 4 — Sous-directeur | boss du cercle 7 battu | tout, y compris les objets ⚠ extrêmes | + Classement complet exact |

Les paris à gros multiplicateur arrivent tard : un classement complet exact (×80)
gagné au premier cercle rendrait toutes les courses suivantes inutiles.

**Dans le proto** : chaque objet porte un `minRank` dans `config/shop.json` — le grade
minimal pour qu'il sorte en vitrine. Absent, il se déduit de la rareté : **commune dès
le grade 0, rare au 2, légendaire au 4**, ce qui correspond exactement aux rangs donnés
objet par objet dans [`des.md`](des.md). Le filtrage est levé en mode e2e, où les
graines de référence doivent pouvoir tirer dans tout le catalogue.

Les **emplacements d'artefacts** suivent la même hiérarchie : 5 au départ, +1 à chaque
grade listé dans `shop.artefactSlotLevels` (2 et 4). Emplacements pleins, la vitrine
continue de proposer des artefacts : l'achat en **remplace** un, qui est détruit sans
remboursement. Pour récupérer des pièces, il faut le **revendre** d'abord, à
`shop.resaleRatio` du prix du cercle (40 %) — ces deux gestes vivent dans l'atelier de
la boutique, replié sous la vitrine.

## Vocabulaire commun

- **Percuter** : atterrir en avançant sur une case occupée → saut devant (GDD §2.6).
- **Échanger** : atterrir en reculant sur une case occupée → échange de place.
- **Zone de fin** : cases à partir du seuil 60 %, où l'on ne parie plus.
- **Combinaison** : un dé Âme associé à un dé Distance, résolue dans l'ordre choisi.
- **Dé Âme inutilisé** : le dé Âme qui n'a pas été associé (3 dés Âme pour 2 Distance).
- **Tour adverse** : la ou les paires lancées par l'ordinateur après le joueur.
- **Charge** : nombre d'utilisations restantes d'un objet limité.

## Sources externes consultées

- [Camel Up — règles](https://www.ultraboardgames.com/camel-up/game-rules.php) et [Geeky Hobbies](https://www.geekyhobbies.com/camel-up-board-game-review-and-rules/) : empilement des chameaux, tuiles de spectateur, tickets de pari dégressifs.
- [Long Shot: The Dice Game — livret de règles](https://tesera.ru/images/items/1868785/Long_Shot_DG_Rules_Booklet_4.1.pdf), [Nights Around a Table](https://nightsaroundatable.com/2022/02/17/how-to-play-long-shot-the-dice-game/) : pouvoirs par cheval, concessions, interdiction de gagner par un bonus.
- [Ready Set Bet — Board Game Quest](https://www.boardgamequest.com/ready-set-bet-review/), [comparatif Roll to Review](https://rolltoreview.com/best-betting-board-games-long-shot-camel-up-ready-set-bet/) : paris exotiques, cotes qui se dégradent avec le temps.
- [Dice Legends — Steam](https://store.steampowered.com/app/3112170/Dice_Legends/) : altération de faces par essences, verrouillage de faces avant le lancer.
