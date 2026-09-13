# Artefacts

Objets passifs, actifs pour tout le run dès l'achat (GDD §6.4). Capacité
proposée : **5 emplacements** au départ, +1 aux rangs 2 et 4 du stagiaire.
Remplacer un artefact le détruit ; revente à 40 % du prix.

Rareté : **C**ommune (visible dès le rang 0), **R**are (rang 2), **L**égendaire
(rang 4, une par vitrine au maximum). Les objets ⚠ ont une contrepartie. Les
objets ✔ sont déjà implémentés dans `Proto4Html` (activables depuis la barre
provisoire d'artefacts, en attendant la boutique).

Familles couvertes : dés et combinaisons, collisions, paris, économie,
information, tour adverse, plateau.

## Récapitulatif

| # | Artefact | Famille | Rareté | Impact | Prix |
|---:|---|---|:-:|---|---:|
| 1 | Relance jumelle | dés | C | Moyen | 45 |
| 2 | Quatrième tête de Cerbère | dés | R | Fort | 90 |
| 3 | Boussole des Limbes ✔ | dés | C | Moyen | 50 |
| 4 | Clepsydre fêlée ✔ | dés | C | Moyen | 40 |
| 5 | Fiole de sang ⚠ | dés / argent | R | Fort | 70 |
| 6 | Verrou de Minos | dés | R | Fort | 85 |
| 7 | Semelles de plomb | collisions | C | Moyen | 45 |
| 8 | Bât de chameau | collisions | R | Fort | 95 |
| 9 | Balance truquée | collisions | C | Moyen | 40 |
| 10 | Chaîne du Coccyte | collisions | R | Fort | 80 |
| 11 | Fer à cheval rouillé ✔ | paris | C | Moyen | 50 |
| 12 | Sablier de Charon ✔ | paris | C | Moyen | 55 |
| 13 | Ticket de la première heure | paris | R | Fort | 90 |
| 14 | Livre des comptes ✔ | paris | C | Moyen | 60 |
| 15 | Talisman des ex æquo | paris | C | Faible | 30 |
| 16 | Encensoir du dernier | paris | C | Moyen | 45 |
| 17 | Pièce à deux faces ⚠ | paris | R | Fort | 75 |
| 18 | Bourse percée ✔ | argent | C | Moyen | 50 |
| 19 | Tribune infernale | argent / plateau | R | Fort | 85 |
| 20 | Dette infernale ⚠ | argent | L | Extrême | 150 |
| 21 | Œil de Charon | information | R | Fort | 95 |
| 22 | Fouet du contremaître | tour adverse | R | Fort | 90 |
| 23 | Miroir de Narcisse | tour adverse | L | Extrême | 180 |
| 24 | Filet du pêcheur ✔ | plateau | C | Moyen | 40 |
| 25 | Sceau du stagiaire | boutique | C | Moyen | 55 |
| 26 | Marteau d'Héphaïstos | boutique / forge | C | Moyen | 50 |
| 27 | Œil du parieur ✔ | paris / information | R | Fort | 80 |

## Fiches

### Dés et combinaisons

**1. Relance jumelle — 45, C.** Quand deux dés Âme désignent la même âme, le
joueur peut, au lieu de cumuler, relancer les deux dés Distance concernés et
garder le meilleur des deux comme déplacement unique. *Le cumul devient un choix
et non une fatalité (GDD §2.5.1).*

**2. Quatrième tête de Cerbère — 90, R.** Le lancer comporte un dé Âme de plus
(4 pour 2 Distance). *Plus de choix, deux dés inutilisés : renforce tout ce qui
exploite le dé inutilisé.*

**3. Boussole des Limbes — 50, C.** À la fin de vos combinaisons, l'âme désignée
par le **dé Âme inutilisé** avance de 1. *Donne un sens au dé « perdu » ; le
joueur choisit désormais aussi qui il laisse de côté.*

**4. Clepsydre fêlée — 40, C.** Au tour 1 de chaque course, vos dés Distance
négatifs comptent 0 et vos dés positifs gagnent +1. *Départ canon, rend les paris
initiaux plus lisibles.*

**5. Fiole de sang ⚠ — 70, R.** Une fois par tour, payez 5 pièces pour ajouter
+1 à un dé Distance avant de l'associer. Si vous n'avez plus d'argent, la Fiole
prélève 5 sur le prochain gain. *L'argent devient une ressource de course (inspi §3).*

**6. Verrou de Minos — 85, R.** Avant chaque lancer, vous pouvez verrouiller un
dé Distance sur sa face du tour précédent au lieu de le relancer. *Contrôle moyen
emprunté à Dice Legends : on fabrique le hasard qu'on veut.*

### Collisions

**7. Semelles de plomb — 45, C.** Les âmes situées en zone de fin ne subissent
plus d'échange quand une autre recule sur elles : l'âme qui recule s'arrête juste
derrière. *Sécurise les paris déjà posés ; les remontées passent par le saut.*

**8. Bât de chameau — 95, R.** Quand une âme est percutée, au lieu que l'autre
saute devant, l'autre **la porte** : elles avancent ensemble jusqu'à la case
d'atterrissage, la percutée devant. *L'empilement de Camel Up : une âme lente peut
être remorquée jusqu'au podium. Change tout l'ordre des combinaisons.*

**9. Balance truquée — 40, C.** Quand une âme recule sur une autre et échange sa
place, l'âme échangée avance de 1 case supplémentaire. *Le -1 devient un outil
pour pousser une âme alliée.*

**10. Chaîne du Coccyte — 80, R.** Deux âmes ayant échangé leur place restent
liées jusqu'à la fin du tour : si l'une se déplace, l'autre suit de la même
distance. *Le tour adverse devient une occasion : une paire sur l'une bouge les deux.*

### Paris

**11. Fer à cheval rouillé — 50, C.** Le pari Vainqueur pur paie +50 %. Le pari
Dernière place paie -50 %. *Une spécialisation, pas un bonus gratuit.*

**12. Sablier de Charon — 55, C.** Le seuil de pari passe de 60 % à 70 % du
parcours, dès la course où il est acheté. *Fenêtre plus longue ; affaiblit le
Prophète et renforce les paris tardifs.* ✔ Implémenté dans le proto.

**13. Ticket de la première heure — 90, R.** Les paris posés **avant le premier
lancer** paient +1 au multiplicateur ; les paris posés en course paient -0,5.
*Les tickets qui perdent de la valeur (Camel Up, Ready Set Bet) : récompense la
lecture des personnalités avant la course.*

**14. Livre des comptes — 60, C.** Une fois par course, un pari perdu est
remboursé à 50 %. *Filet de sécurité, option prudente de la vitrine.*

**15. Talisman des ex æquo — 30, C.** Une égalité de position compte comme
réussite pour toute condition « devant » ou « dans le top 3 » des deux âmes.
*Petit, mais rend la dernière case après l'arrivée intéressante.*

**16. Encensoir du dernier — 45, C.** Le pari Dernière place paie x2 si l'âme
dernière est à 5 cases ou plus de l'avant-dernière. *Un pari d'écart : on lit la
traîne, pas seulement la tête.*

**27. Œil du parieur — 80, R.** Une fois par cercle, après avoir lancé ses dés
et avant de les associer, le joueur peut poser un pari. *Normalement un pari se
pose avant le lancer ; ici on parie en connaissant ses 5 dés, mais pas le tour
adverse. Une seule charge par cercle pour que le moment choisi compte.* ✔
Implémenté dans le proto.

**17. Pièce à deux faces ⚠ — 75, R.** Après le premier lancer de la course, vous
pouvez doubler la mise de tous vos paris actifs. Si vous le faites, le tour adverse
lance une paire de plus pour le reste de la course. *L'option dangereuse : plus de
gain, plus de chaos.*

### Argent

**18. Bourse percée — 50, C.** Chaque collision (saut ou échange) rapporte 2
pièces, qu'elle vienne de vous ou de l'adversaire. *Le chaos paie ; incite à
ordonner ses combinaisons pour percuter.*

**19. Tribune infernale — 85, R.** Avant chaque course, placez une **tribune** sur
une case libre (hors départ, hors zone de fin). Chaque âme qui s'y arrête vous
rapporte 4 pièces et est déplacée de +1 ou -1, au choix fixé lors du placement.
*La tuile de spectateur de Camel Up : premier pas vers la modification du circuit
(GDD §7).*

**20. Dette infernale ⚠ — 150, L.** Si vous ne pouvez pas payer le prix du
cercle, vous pouvez une fois par run emprunter le manquant, plafonné à 50 % du
prix. Le prix du cercle suivant augmente de 150 % de la somme empruntée. *Repousse
la fin de run sans l'annuler : c'est une course contre la dette.*

### Information

**21. Œil de Charon — 95, R.** Vous voyez la première paire de l'adversaire avant
d'ordonner vos combinaisons. *Équivalent permanent du Prophète, sans condition ;
prix en conséquence. Ne se cumule pas avec lui.*

### Tour adverse

**22. Fouet du contremaître — 90, R.** L'adversaire lance **toutes** ses paires
en début de tour, avant votre lancer ; elles sont résolues après vous comme
d'habitude. Contrepartie : dès qu'une âme est en zone de fin, l'adversaire lance
une paire de plus par tour. *Plus d'information que l'Œil de Charon (toutes les
paires, pas seulement la première), payée en chaos de fin de course. Ne se cumule
pas avec l'Œil.*

**23. Miroir de Narcisse — 180, L.** Une fois par course, vous pouvez résoudre vos
combinaisons **après** le tour adverse au lieu d'avant. *Casse l'ordre du tour
(GDD §2.5.2). Réservé au rang 4.*

### Plateau

**24. Filet du pêcheur — 40, C.** Deux cases supplémentaires après l'arrivée.
*Plus de départage, moins d'ex æquo, paris exacts plus lisibles.*

### Boutique

**25. Sceau du stagiaire — 55, C.** Les personnalités coûtent 30 % de moins et
vous pouvez en retirer une gratuitement une fois par cercle.

**26. Marteau d'Héphaïstos — 50, C.** La première altération de forge de chaque
cercle est gratuite ; les autres coûtent 20 % de moins.

## Combinaisons à surveiller

| Combinaison | Risque |
|---|---|
| Œil de Charon + Fouet du contremaître | redondants : interdire le cumul |
| Bât de chameau + Chaîne du Coccyte + Jumeaux | trop de déplacements gratuits : plafonner à un « déplacement induit » par âme et par tour |
| Fiole de sang + Comptable + Bourse percée | machine à sous : l'argent gagné en course finance les +1. C'est le build « casser le jeu » (inspi §5), à laisser possible mais cher |
| Ticket de la première heure + Prophète | aucun conflit, mais le Prophète devient inutile pour parier : les deux se choisissent rarement ensemble, bon signe |
| Dette infernale | doit être proposée tard (rang 4) sinon elle enlève la peur du prix du cercle |

## Sources d'inspiration

- Empilement et tuiles de spectateur : [Camel Up (règles)](https://www.ultraboardgames.com/camel-up/game-rules.php), [Geeky Hobbies](https://www.geekyhobbies.com/camel-up-board-game-review-and-rules/).
- Cotes qui se dégradent : [Ready Set Bet (Board Game Quest)](https://www.boardgamequest.com/ready-set-bet-review/), [comparatif Long Shot / Camel Up / Ready Set Bet](https://rolltoreview.com/best-betting-board-games-long-shot-camel-up-ready-set-bet/).
- Verrouillage de faces et altération de faces : [Dice Legends (Steam)](https://store.steampowered.com/app/3112170/Dice_Legends/).
