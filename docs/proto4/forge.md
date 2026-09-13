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

Les faces marquées ✔ sont implémentées dans `Proto4Html`. Dans le proto, une face
forgée ne peut pas être reforgée et un dé garde toujours une face positive.

Le prix dépend de la face remplacée : altérer le `-1` est moins cher qu'altérer
le `3`, parce qu'on perd moins. Les prix ci-dessous sont donnés pour la face
cible recommandée, avec un supplément si l'on choisit une autre face.

## Récapitulatif

| # | Face | Cible recommandée | Type | Impact | Prix |
|---:|---|:-:|---|---|---:|
| 1 | Limée ✔ | -1 | correction | Faible | 15 |
| 2 | Retournée ⚠ ✔ | -1 | correction risquée | Moyen | 35 |
| 3 | Dorée ✔ | 1 | argent | Moyen | 30 |
| 4 | Explosive ⚠ | 2 | collision | Fort | 55 |
| 5 | Bond | 3 | position | Fort | 60 |
| 6 | Miroir | 1 | dés | Moyen | 40 |
| 7 | Feu follet | -1 | dés | Moyen | 45 |
| 8 | Élan ⚠ | 2 | risque | Fort | 50 |
| 9 | Gel | -1 | tour adverse | Moyen | 40 |
| 10 | Aimant | 1 | position | Moyen | 45 |
| 11 | Sceau du parieur ✔ | 1 | paris | Fort | 55 |
| 12 | Face vide (dé Âme) | une âme | choix | Fort | 60 |
| 13 | Face double (dé Âme) | une âme | cumul | Moyen | 40 |
| 14 | Face du meneur (dé Âme) | une âme | position | Fort | 65 |

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

## Kits suggérés pour tester

| Kit | Faces | Ce qu'on regarde |
|---|---|---|
| Sécurité | Limée, Gel | le joueur perd-il des remontées en supprimant le -1 ? |
| Chaos | Explosive, Élan, Miroir | les courses restent-elles lisibles ? |
| Économie | Dorée ×2, Sceau du parieur | l'argent gagné en course couvre-t-il le prix du cercle 2 ? |
| Contrôle | Face vide, Face du meneur, Bond | le joueur a-t-il « trop » de contrôle dès le cercle 3 ? |

## Sources d'inspiration

- Altération de faces via essences : [Dice Legends (Steam)](https://store.steampowered.com/app/3112170/Dice_Legends/).
