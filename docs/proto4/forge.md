# Forge — altérations de faces

La forge remplace **une face** d'un dé par une face altérée (GDD §6.3). Les dés
Distance de départ ont 4 faces `-1, 1, 2, 3` ; les dés Âme ont une face par âme.

Règles de forge proposées :

- une altération par visite de forge, 2 faces altérées au maximum par dé au rang
  0, 3 à partir du rang 2 ;
- impossible d'altérer une face déjà altérée sans la « décaper » d'abord (10) ;
- un dé Distance doit conserver au moins une face strictement positive ;
- les faces altérées sont dessinées différemment sur le dé pour rester lisibles
  au lancer ;
- l'altération est permanente pour le run et suit le dé s'il est remplacé par un
  dé spécial (elle est perdue, pas remboursée).

Les faces marquées ✔ sont implémentées dans `Proto4Html`, règles de forge comprises :
une face forgée ne se reforge pas, un dé garde toujours une face positive, un dé ne
porte pas plus de `shop.forge.maxAltered` faces altérées (2, puis
`maxAlteredAdvanced` = 3 à partir du grade `advancedLevel`), et le **décapage** rend
une face à sa valeur d'origine pour `shop.forge.decapCost` (10) depuis l'atelier de la
boutique.

Le prix dépend de la face remplacée : altérer le `-1` est moins cher qu'altérer
le `3`, parce qu'on perd moins. Les prix ci-dessous sont donnés pour la face
cible recommandée, avec un supplément si l'on choisit une autre face.

## Récapitulatif

| # | Face | Cible recommandée | Type | Impact | Prix |
|---:|---|:-:|---|---|---:|
| 1 | Limée ✔ | -1 | correction | Faible | 15 |
| 2 | Retournée ⚠ ✔ | -1 | correction risquée | Moyen | 35 |
| 3 | Dorée ✔ | 1 | argent | Moyen | 30 |
| 4 | Explosive ⚠ ✔ | 2 | collision | Fort | 55 |
| 5 | Bond ✔ | 3 | position | Fort | 60 |
| 6 | Miroir ✔ | 1 | dés | Moyen | 40 |
| 7 | Feu follet ✔ | -1 | dés | Moyen | 45 |
| 8 | Élan ⚠ ✔ | 2 | risque | Fort | 50 |
| 9 | Gel ✔ | -1 | tour adverse | Moyen | 40 |
| 10 | Aimant ✔ | 1 | position | Moyen | 45 |
| 11 | Sceau du parieur ✔ | 1 | paris | Fort | 55 |
| 12 | Face vide (dé Âme) | une âme | choix | Fort | 60 |
| 13 | Face double (dé Âme) | une âme | cumul | Moyen | 40 |
| 14 | Face du meneur (dé Âme) | une âme | position | Fort | 65 |
| 15 | Revers | 2 | collision | Moyen | 40 |
| 16 | Écho | 1 | dés / position | Fort | 55 |
| 17 | Bras de fer | -1 | position | Fort | 50 |
| 18 | Fusion | 1 | dés | Moyen | 45 |
| 19 | Face du suiveur (dé Âme) | une âme | position | Faible | 35 |
| 20 | Face grégaire (dé Âme) | une âme | cumul | Moyen | 40 |

**État du proto** : les onze faces de **dé Distance** (n° 1 à 11) sont
implémentées. Les faces de **dé Âme** (n° 12 à 14, 19, 20) attendent la
modélisation des dés Âme, voir [`des.md`](des.md). Les faces **15 à 18** sont
nouvelles et non implémentées : elles recyclent des idées du catalogue de cartes
abandonné (voir [`cartes.md`](cartes.md)) et attendent la fin du chantier des
archétypes d'âmes.

Chaque effet se résout à l'un de trois moments, ce qui décide où il vit dans le
code (`FaceEffect`, `src/core/rules/dice.ts`) : **au lancer** (Miroir, Feu
follet, dans `rollPlayerDice`), **à l'association** (Dorée, Élan, dans
`useRace`), **contre le plateau** (Sceau, Bond, Explosive, Aimant, Gel, dans
`applyMove`).

## Faces de dé Distance

**1. Limée — 15, sur le -1.** La face vaut `0` : l'âme est désignée mais ne
bouge pas. Elle compte comme « déplacée » pour les effets qui se déclenchent au
déplacement (Comptable, Parasite...). *La correction la plus simple ; supprime le
recul et donc les échanges de place sur ce dé. C'est une perte d'outil autant
qu'un gain.*

**2. Retournée ⚠ — 35, sur le -1.** La face vaut `+1`. Contrepartie : pour le
reste du run, les `-1` des dés de l'adversaire valent aussi `+1`. *Le recul
disparaît des deux côtés : courses plus rapides, remontées plus rares. À prendre
si l'on parie tôt et sûr.*

**3. Dorée — 30, sur le 1.** La face vaut `+1` et rapporte **5 pièces** quand
elle sort, qu'elle soit associée ou non. *Argent direct, environ 1 sortie sur 4
par dé : ~10 pièces par course.*

**4. Explosive ⚠ — 55, sur le 2.** La face vaut `+2`. Si l'âme percute à
l'atterrissage, toutes les âmes sur les cases adjacentes à la case d'atterrissage
reculent de 1 (départ exclu). Si l'âme n'a percuté personne, **elle** recule de 1
après coup (elle vaut donc `+1`). *Explosif au sens propre : à jouer en dernière
combinaison sur une grappe.*

**5. Bond — 60, sur le 3.** Au lieu d'une distance fixe, l'âme avance jusqu'à la
**prochaine âme devant elle** et saute devant (règle de collision normale). S'il
n'y a personne devant, elle avance de 3. Ne peut pas faire franchir l'arrivée si
l'âme suivante est déjà au-delà (elle s'arrête sur la dernière case avant). *Une
distance qui dépend du plateau : forte en course serrée, quelconque en tête.*

**6. Miroir — 40, sur le 1.** La face copie la valeur de l'**autre dé Distance**
du lancer. *Deux `3` deviennent possibles, mais aussi deux `-1`. Se combine avec
le cumul pour des `+6`.*

**7. Feu follet — 45, sur le -1.** Quand elle sort, le joueur relance ce dé une
fois et **doit** garder le nouveau résultat, sauf s'il ressort Feu follet : alors
il vaut `+2`. *Le -1 devient une seconde chance ; petite loterie interne.*

**8. Élan ⚠ — 50, sur le 2.** La face vaut `+2`. Le joueur peut relancer ce dé
et **ajouter** le résultat (y compris un `-1`). Une seule relance. *Pousser sa
chance à la Black Jacket : `+2` sûr ou `+1` à `+5`.*

**9. Gel — 40, sur le -1.** La face vaut `0` et l'âme désignée est **gelée**
jusqu'à la fin du tour : les paires de l'adversaire ne la déplacent pas. *Protège
un pari du tour adverse ; le joueur décide qui il gèle grâce aux 3 dés Âme.*

**10. Aimant — 45, sur le 1.** La face vaut `+1` et l'âme directement **derrière**
l'âme déplacée avance de 1 aussi (pas de collision possible : elle prend la case
libérée). *Petit train ; rend le pari Deux âmes dans le top 3 plus lisible.*

**11. Sceau du parieur — 55, sur le 1.** La face vaut `+1`. Si l'âme déplacée
fait l'objet d'un pari actif du joueur, la face vaut `+3`. *Le dé « sait » sur qui
vous avez parié. Fort, mais lisible : le joueur voit la face sortir et choisit
l'âme.*

**15. Revers — 40, sur le 2.** La face vaut `+2`. Si l'âme percute à
l'atterrissage (colonne pleine, voir les couloirs dans
[`regles-du-jeu.md`](regles-du-jeu.md)), elle ne saute **pas** devant l'âme
heurtée : elle s'arrête sur la première case libre **derrière** elle, en reculant
colonne par colonne, couloir le plus bas d'abord. Si aucune case libre n'est
trouvée avant sa case de départ, le déplacement est annulé et la face vaut `0`.
*La face qui permet de s'accrocher sans dépasser. Elle prépare tout ce qui a
besoin d'une âme juste derrière une autre : l'Aimant (n° 10), le Bât de chameau,
la Chaîne du Coccyte, les Jumeaux, la Face du suiveur (n° 19). Recyclée de la
carte 39 (Inversion).*

**16. Écho — 55, sur le 1.** La face vaut `+1` et s'applique **une seconde fois**
à l'âme désignée par un dé Âme inutilisé, au choix du joueur. Si le lancer ne
comporte aucun dé Âme inutilisé (troisième dé Distance équipé), la face vaut
`+2` sur l'âme associée. *L'Aimant avec le choix de la cible : deux âmes avancent
d'une case, ou une seule avance de deux si le joueur pointe le même dé Âme.
Recyclée de la carte 30 (Double face). Elle donne un second usage au dé
inutilisé : cumulée avec la **Boussole des Limbes** (artefact n° 3), le même dé
inutilisé sert deux fois dans le tour — à mesurer, c'est peut-être une fois de
trop.*

**17. Bras de fer — 50, sur le -1.** La face vaut `0` : au lieu de reculer, l'âme
désignée **échange sa place** avec l'âme immédiatement devant elle (`soulAheadOf`
dans `rules/race.ts`), qui recule donc d'autant. L'échange est plafonné à **3
colonnes** d'écart ; au-delà, ou s'il n'y a personne devant, la face vaut `0` sans
effet. *Un `-1` qui fait gagner une place au lieu d'en perdre une, et qui en fait
perdre une à la tête de course. Recyclée de la carte 24. Le plafond de 3 colonnes
est là pour l'empêcher de téléporter une âme de queue jusqu'au meneur : c'est le
chiffre à mesurer au POC.*

**18. Fusion — 45, sur le 1.** La face vaut `+1`. Si l'**autre** dé Distance du
lancer est associé à une autre âme, le joueur peut fusionner les deux
combinaisons : un seul déplacement, de la **somme** des distances, sur l'une des
deux âmes au choix. L'autre âme ne bouge pas du tour. *Concentrer tout le tour
sur son pari, au prix d'un déplacement perdu. C'est le cumul (GDD §2.5.1) obtenu
sans que les dés Âme aient à tomber sur la même âme. Recyclée de la carte 37.*

## Faces de dé Âme

Un dé Âme a une face par âme (5 au cercle 1). Altérer une face retire une âme du
dé : elle ne pourra plus être désignée par ce dé, ce qui est en soi une décision.

**12. Face vide — 60.** Quand elle sort, le joueur désigne **n'importe quelle
âme** au moment de l'association. *Contrôle fort (inspi §2) ; réservé au rang 2.*

**13. Face double — 40.** Quand elle sort, elle désigne l'âme gravée **et** l'âme
directement derrière elle : la distance associée s'applique aux deux, l'âme
gravée d'abord. *Deux déplacements pour un dé, mais pas au choix.*

**14. Face du meneur — 65.** Quand elle sort, elle désigne l'âme **en tête** au
moment de la résolution de la combinaison (pas au lancer). *Une face qui lit le
plateau : ordonner cette combinaison en dernier change qui elle vise. Variante
« Face du traînard » au même prix, pour la dernière âme.*

**19. Face du suiveur — 35.** Quand elle sort, elle désigne l'âme immédiatement
**derrière** l'âme gravée (`soulBehind` dans `rules/race.ts`). Si l'âme gravée est
dernière, la face la désigne elle-même. *Le complément de la Face du meneur
(n° 14) : une face qui vise une **position relative** au lieu d'une âme, et qui
change donc de cible selon l'ordre où l'on résout la combinaison. Bon marché
parce qu'elle ne laisse aucun choix. Recyclée de la carte 17 (Transfert).*

**20. Face grégaire — 40.** Quand elle sort, elle désigne la même âme qu'un autre
dé Âme du lancer, au choix du joueur. *Le cumul sur commande (GDD §2.5.1) : deux
distances sur une seule âme, sans attendre que le hasard aligne deux dés Âme.
Entre en conflit frontal avec la **Relance jumelle** (artefact n° 1), qui relance
justement les dés Âme en doublon — les deux ne se choisissent jamais ensemble, et
il faut trancher lequel gagne si le joueur possède les deux (proposition : la
face grégaire est immunisée à la relance). Recyclée de la carte 48 (Cumul forcé).*

## Kits suggérés pour tester

| Kit | Faces | Ce qu'on regarde |
|---|---|---|
| Sécurité | Limée, Gel | le joueur perd-il des remontées en supprimant le -1 ? |
| Chaos | Explosive, Élan, Miroir | les courses restent-elles lisibles ? |
| Économie | Dorée ×2, Sceau du parieur | l'argent gagné en course couvre-t-il le prix du cercle 2 ? |
| Contrôle | Face vide, Face du meneur, Bond | le joueur a-t-il « trop » de contrôle dès le cercle 3 ? |
| Train | Revers, Aimant, Face du suiveur | peut-on vraiment construire un convoi d'âmes, et est-ce lisible ? |
| Concentration | Fusion, Écho, Face grégaire | tout miser sur une âme par tour : trop sûr pour les paris Vainqueur ? |

## Sources d'inspiration

- Altération de faces via essences : [Dice Legends (Steam)](https://store.steampowered.com/app/3112170/Dice_Legends/).
