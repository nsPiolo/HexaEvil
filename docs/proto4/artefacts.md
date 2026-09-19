# Artefacts

Objets passifs, actifs pour tout le run dès l'achat (GDD §6.4). Capacité :
**5 emplacements** au départ, +1 aux rangs 2 et 4 du stagiaire
(`shop.artefactSlotLevels`). Remplacer un artefact le détruit, sans remboursement ;
la revente rend 40 % du prix du cercle (`shop.resaleRatio`) et libère la place. Les
deux gestes sont dans l'atelier de la boutique. ✔ Implémenté.

Rareté : **C**ommune (visible dès le rang 0), **R**are (rang 2), **L**égendaire
(rang 4, une par vitrine au maximum). Les objets ⚠ ont une contrepartie. Les
objets ✔ sont déjà implémentés dans `Proto4Html` (achetables en boutique), avec
les règles de ce document.

Familles couvertes : dés et combinaisons, collisions, paris, économie,
information, tour adverse, boutique, plateau.

## Récapitulatif

| # | Artefact | Famille | Rareté | Impact | Prix |
|---:|---|---|:-:|---|---:|
| 1 | Relance jumelle ✔ | dés | C | Moyen | 45 |
| 2 | Quatrième tête de Cerbère ✔ | dés | R | Fort | 90 |
| 3 | Boussole des Limbes ✔ | dés | C | Moyen | 50 |
| 4 | Clepsydre fêlée ✔ | dés | C | Moyen | 40 |
| 5 | Fiole de sang ✔ | dés / argent | R | Fort | 70 |
| 6 | Verrou de Minos ✔ | dés | R | Fort | 85 |
| 7 | Semelles de plomb ✔ | collisions | C | Moyen | 45 |
| 8 | Bât de chameau ✔ | collisions | R | Fort | 95 |
| 9 | Balance truquée ✔ | collisions | C | Moyen | 40 |
| 10 | Chaîne du Coccyte ✔ | collisions | R | Fort | 80 |
| 11 | Fer à cheval rouillé ✔ | paris | C | Moyen | 50 |
| 12 | Sablier de Charon ✔ | paris | C | Moyen | 55 |
| 13 | Ticket de la première heure ✔ | paris | R | Fort | 90 |
| 14 | Livre des comptes ✔ | paris | C | Moyen | 60 |
| 15 | Quatrième marche ✔ | paris | C | Moyen | 30 |
| 16 | Encensoir du dernier ✔ | paris | C | Moyen | 45 |
| 17 | Pièce à deux faces ⚠ ✔ | paris | R | Fort | 75 |
| 18 | Bourse percée ✔ | argent | C | Moyen | 50 |
| 19 | Tribune infernale ✔ | argent / plateau | R | Fort | 85 |
| 20 | Dette infernale ⚠ ✔ | argent | L | Extrême | 150 |
| 21 | Œil de Charon ✔ | information | R | Fort | 95 |
| 22 | Fouet du contremaître ✔ | tour adverse | R | Fort | 90 |
| 23 | Miroir de Narcisse ✔ | tour adverse | L | Extrême | 180 |
| 25 | Sceau du stagiaire | boutique | C | Moyen | 55 |
| 26 | Marteau d'Héphaïstos ✔ | boutique / forge | C | Moyen | 50 |
| 27 | Œil du parieur ✔ | paris / information | R | Fort | 80 |
| 28 | Pourboire du stagiaire ✔ | argent | C | Faible | 35 |
| 29 | Denier du cercle ✔ | paris / argent | C | Moyen | 60 |
| 30 | Rabais de Ploutos ✔ | boutique | C | Faible | 30 |
| 31 | Baume du perdant ✔ | paris / argent | C | Moyen | 50 |
| 32 | Tirelire du stagiaire ✔ | argent | C | Moyen | 45 |
| 33 | Bornes du stagiaire | plateau | R | Fort | 70 |
| 34 | Raccourci de Malebolge | plateau | R | Fort | 80 |
| 35 | Chaîne des Limbes | plateau | C | Moyen | 70 |
| 36 | Boule de Cocyte | dés | R | Fort | 75 |
| 37 | Écho du Styx | dés | R | Fort | 85 |
| 38 | Sommeil du contremaître | tour adverse | R | Fort | 80 |
| 39 | Registre des paris exotiques | paris | C | Moyen | 55 |
| 40 | Cote montante | paris | C | Moyen | 50 |
| 41 | Crochet de Charon ⚠ | plateau / paris | R | Fort | 85 |
| 42 | Roue d'Ixion ⚠ | plateau / paris | R | Extrême | 110 |

Le n° 24 (Filet du pêcheur) est retiré, voir [Retirés](#retirés). Les numéros
restent stables pour que les autres documents puissent y renvoyer.

**État du proto** : 30 des 31 artefacts d'origine sont implémentés. Seul le
**n° 25 (Sceau du stagiaire)** ne l'est pas : il porte sur le prix et le retrait
des **personnalités**, système qui n'existe pas encore dans `Proto4Html`. Il
entrera avec elles. Le n° 32 (Tirelire du stagiaire) a été fiché après coup : il
était déjà en boutique sans figurer ici.

Les artefacts **33 à 42** sont une vague nouvelle, non implémentée. Ils recyclent
les idées du catalogue de cartes abandonné ([`cartes.md`](cartes.md)) sous forme
de passifs permanents ou de charges par course, et attendent la fin du chantier
des **archétypes d'âmes**. Chaque fiche indique ce qu'elle demande au moteur.

## Fiches

### Dés et combinaisons

**1. Relance jumelle — 45, C.** Quand deux dés Âme ou plus désignent la même âme,
ils sont **tous relancés automatiquement**, une seule fois : si le nouveau
résultat désigne encore plusieurs fois la même âme, on le garde et le cumul
s'applique normalement. *Le cumul devient rare sans disparaître (GDD §2.5.1) ;
le joueur voit plus souvent trois âmes différentes à ordonner.*

**2. Quatrième tête de Cerbère — 90, R.** Le lancer comporte un dé Âme de plus
(4 pour 2 Distance). *Plus de choix, deux dés inutilisés : renforce tout ce qui
exploite le dé inutilisé.*

**3. Boussole des Limbes — 50, C.** À la fin de vos combinaisons, l'âme désignée
par chaque **dé Âme inutilisé** avance de 1 (deux dés inutilisés avec la
Quatrième tête : deux âmes avancent, ou la même de 2). *Donne un sens au dé
« perdu » ; le joueur choisit désormais aussi qui il laisse de côté.* ✔ Implémenté dans le
proto, dés inutilisés multiples compris.

**4. Clepsydre fêlée — 40, C.** Au tour 1 de chaque course, vos dés Distance
négatifs comptent **leur valeur absolue** (-1 devient +1) et vos dés positifs
gagnent +1. *Départ canon, rend les paris initiaux plus lisibles. Sur la ligne
de départ, un 0 ou un -1 ne déplaçait personne : autant que toutes les faces
fassent avancer.* ✔ Implémenté dans le proto.

**5. Fiole de sang — 70, R.** Une fois par tour, payez 5 pièces pour ajouter +1 à
un dé Distance avant de l'associer. Utilisable **seulement si vous avez 5 pièces
disponibles** : on ne fait pas de crédit. *L'argent devient une ressource de
course (inspi §3) ; la mise et le +1 se disputent la même bourse.*

**6. Verrou de Minos — 85, R.** Avant chaque lancer, vous pouvez verrouiller un
dé Distance sur sa face du tour précédent au lieu de le relancer. *Contrôle moyen
emprunté à Dice Legends : on fabrique le hasard qu'on veut.*

**36. Boule de Cocyte — 75, R.** Une fois par course, après avoir vu vos cinq dés
et avant de les associer, relancez-les **tous**. Le second résultat est gardé.
*Recyclé de la carte 38 (Divination). Le mulligan complet : il sauve le tour où
deux `-1` sortent avec les mauvaises âmes. Ne se combine pas avec le **Verrou de
Minos** (n° 6) sur le même lancer — on ne verrouille pas une face pour ensuite
tout relancer ; trancher l'ordre des deux effets, ou interdire le cumul dans le
tour.*

**37. Écho du Styx — 85, R.** Une fois par course, juste après la résolution
d'une combinaison, rejouez-la **à l'identique** : même âme, même distance, mêmes
règles de collision. *Recyclé de la carte 42 (Second souffle). La charge unique
en fait un outil de dernier tour : un `+3` devient `+6` sur l'âme pariée, ou une
collision se répète sur la même grappe. Comme il copie la combinaison résolue, il
copie aussi ses effets de face (Bond, Explosive, Aimant) — c'est voulu, mais
c'est le point à mesurer.*

### Collisions

**7. Semelles de plomb — 45, C.** Une âme qui recule sur une âme située **en zone
de fin** ne l'échange plus : elle saute juste derrière. Si cette case est occupée
aussi, même règle tant qu'on reste en zone de fin ; dès qu'on en sort, la règle
normale (échange) reprend. *Sécurise les paris déjà posés ; les remontées passent
par le saut.*

**8. Bât de chameau — 95, R.** **Une fois par course**, quand une âme est
percutée, au lieu que l'autre saute devant, les deux **fusionnent** jusqu'à la
fin de la course : la percutée devant, l'autre juste derrière, et tout
déplacement de l'une (vos combinaisons comme le tour adverse) déplace les deux.
*L'empilement de Camel Up : une âme lente peut être remorquée jusqu'au podium.
Change tout l'ordre des combinaisons ; une seule fusion par course pour que le
moment choisi compte.*

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
lancer** paient +1 au multiplicateur ; les paris posés en course paient -0,5,
**sans jamais descendre sous ×1** (un pari gagné ne peut pas être déficitaire).
*Les tickets qui perdent de la valeur (Camel Up, Ready Set Bet) : récompense la
lecture des personnalités avant la course.*

**14. Livre des comptes — 60, C.** Une fois par course, un pari perdu **tiré au
sort parmi les paris perdants** est remboursé à 50 %. *Filet de sécurité, option
prudente de la vitrine ; le tirage empêche de compter dessus pour couvrir un
gros ticket.* ✔ Implémenté dans le proto.

**15. Quatrième marche — 30, C.** Les conditions « dans le top 3 » de vos paris
s'étendent au **top 4** : Top 3, Deux âmes dans le top 3 et Top 3 dans le
désordre réussissent aussi avec une 4e place. Ne change ni « Pas dans le top 3 »
ni le Podium exact. *Remplace le Talisman des ex æquo : petit, lisible, et une
raison de suivre la quatrième âme.*

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

**29. Denier du cercle — 60, C.** Vos paris valent gratuitement **n pièces de
plus**, n étant le numéro du cercle en cours : vous payez la mise choisie, le
pari est réglé comme si la mise était de mise + n. *Un bonus qui grandit avec la
partie sans toucher aux cotes ; incite à poser plusieurs petits paris plutôt
qu'un gros.*

**31. Baume du perdant — 50, C.** Toute perte nette liée à un pari perdu est
réduite de 10 % (10 % de la mise rendue au règlement). *Cumulable avec le Livre
des comptes : le Baume s'applique à ce qui reste après le remboursement.*

**39. Registre des paris exotiques — 55, C.** Ajoute deux types de paris à la
table de mise, pour tout le run : « l'âme X sera percutée au moins deux fois »
(×3) et « aucune âme ne reculera de la course » (×4). Les deux ne se posent
qu'avant la course. *Recyclé de la carte 53. Le seul artefact qui **élargit** le
catalogue de paris au lieu d'en modifier les cotes : il fait parier sur la manière
dont la course se déroule, pas sur son classement. Synergie évidente avec la
Bourse percée ; anti-synergie avec les faces Explosive et Revers, qui fabriquent
précisément ce qu'il faut éviter pour le second pari. Les deux cotes sont des
suppositions : « aucun recul » dépend entièrement du nombre de faces négatives en
jeu (dés adverses compris) et doit être mesuré avant d'être figé.*

**40. Cote montante — 50, C.** Vos paris posés **en course** paient +0,5 au
multiplicateur ; vos paris posés **avant le premier lancer** paient -0,5, sans
jamais descendre sous ×1. *Le miroir exact du **Ticket de la première heure**
(n° 13), qui manquait au catalogue : sans lui, le build « parieur tardif » n'a
aucun objet à lui alors que le Sablier de Charon et l'Œil du parieur le préparent.
Recyclé de la carte 57 (Cote glissante). **Interdire le cumul avec le n° 13** :
les deux s'annulent exactement.*

### Argent

**18. Bourse percée — 50, C.** Chaque collision (saut ou échange) rapporte 2
pièces, qu'elle vienne de vous ou de l'adversaire. *Le chaos paie ; incite à
ordonner ses combinaisons pour percuter.*

**19. Tribune infernale — 85, R.** Avant chaque course, placez une **tribune** sur
une case libre (hors départ, hors zone de fin). Chaque âme qui s'y arrête vous
rapporte 4 pièces et est **poussée de +1**. *La tuile de spectateur de Camel Up :
premier pas vers la modification du circuit (GDD §7). Pas de choix de sens : la
tribune pousse toujours vers l'avant.*

**20. Dette infernale ⚠ — 150, L.** Si vous ne pouvez pas payer le prix du
cercle, vous pouvez une fois par run emprunter le manquant, plafonné à 50 % du
prix. Le prix du cercle suivant augmente de 150 % de la somme empruntée. *Repousse
la fin de run sans l'annuler : c'est une course contre la dette.*

**32. Tirelire du stagiaire — 45, C.** L'avance que le stagiaire verse avant
chaque course augmente de 10 pièces, pour le reste du run. *Le revenu qui ne
dépend pas de la bourse (`rules/allowance.ts`) : il grandit déjà avec le cercle,
la Tirelire le décale vers le haut une fois pour toutes.* ✔ Implémenté dans le proto.

**28. Pourboire du stagiaire — 35, C.** Au début de chaque course, juste après
votre premier lancer de dés, vous gagnez 10 pièces. *Garantit de quoi poser un
pari en course même quand les paris initiaux ont vidé la bourse. Arrive après le
lancer : l'argent sert aux paris des tours suivants, ou tout de suite avec l'Œil
du parieur.*

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

**23. Miroir de Narcisse — 180, L.** **L'adversaire joue avant vous** : à chaque
tour, ses paires sont lancées **et résolues** avant votre lancer. Vous
combinez en connaissant le plateau final du tour adverse. *Casse l'ordre du tour
(GDD §2.5.2) : information complète et dernier mot sur les collisions. Rend
l'Œil de Charon et le Fouet inutiles, interdire le cumul. Réservé au rang 4.*

**38. Sommeil du contremaître — 80, R.** Un compteur suit vos **lancers de dés**
pour tout le run : **tous les 10 lancers**, l'adversaire saute son tour. Le
compteur ne se réinitialise ni entre les courses, ni entre les cercles — il court
du premier lancer du run au dernier. *Recyclé de la carte 43 (Temps mort), mais
transformé : la carte laissait choisir le moment, l'artefact ne le laisse pas. Une
course dure 5 à 8 tours, donc le saut tombe environ une fois toutes les une à
deux courses, et jamais quand on l'aurait voulu. **Le compteur doit être visible
en permanence** (« 7 / 10 avant le sommeil ») : sans lui, le tour sauté arrive
comme un accident et l'artefact n'est plus qu'un bonus statistique ; avec lui, le
joueur peut décider de faire durer un tour ou d'en presser un autre pour placer
le sommeil au bon endroit. C'est là qu'est le jeu.*

### Boutique

**25. Sceau du stagiaire — 55, C.** Les personnalités coûtent 30 % de moins et
vous pouvez en retirer une gratuitement une fois par cercle.

**26. Marteau d'Héphaïstos — 50, C.** La première altération de forge de chaque
cercle est gratuite ; les autres coûtent 20 % de moins.

**30. Rabais de Ploutos — 30, C.** Tout ce que vend la boutique coûte 3 % de
moins (arrondi à la pièce, le renouvellement de vitrine compris). *Petit et
permanent : il se rentabilise sur un run long, pas sur un cercle.*

### Plateau

Une famille nouvelle : ces artefacts ne touchent ni les dés ni les cotes, ils
touchent **le circuit lui-même** (GDD §7). C'est le premier pas hors du plateau
fixe, et c'est ce que le catalogue de cartes abandonné faisait le mieux.

**33. Bornes du stagiaire — 70, R.** Avant chaque course, placez **deux bornes**
sur des cases libres (hors départ, hors zone de fin), choisies librement parmi
trois types, deux fois le même type compris :

- **Fosse** — l'âme qui s'y arrête recule de 2 ;
- **Tremplin** — l'âme qui s'y arrête avance de 2 ;
- **Goudron** — l'âme qui s'y arrête perd ses **déplacements induits** jusqu'à la
  fin du tour (Parasite, Jumeaux, Aimant, Bât de chameau, Boussole des Limbes).

Une borne se déclenche à chaque passage, pour toute la course, et suit les règles
de collision normales après déplacement.

*Le geste « je prépare le plateau avant la course » sans main de cartes : il
recycle d'un coup les cartes 2 (Éboulement), 5 (Sables mouvants), 6 (Tremplin),
9 (Fosse de Malebolge) et 11 (Goudron). Même modèle d'implémentation que la
**Tribune infernale** (n° 19) — une paire `{ column, lane }`, voir `placeTribune`
dans `rules/race.ts` — mais deux emplacements et un type par borne. À surveiller :
avec la Tribune, cela fait **trois cases posées** sur une piste de 14 colonnes. Ne
pas monter plus haut sans allonger la piste.*

**34. Raccourci de Malebolge — 80, R.** Le parcours de chaque course est
**raccourci d'une colonne** pour le reste du run. Le seuil de pari (60 %) est
recalculé sur la nouvelle longueur. *Moins de tours par course : les paris
initiaux pèsent plus lourd, l'argent gagné en course pèse moins, les remontées
tardives deviennent rares. C'est l'artefact du joueur qui lit les personnalités
avant le départ et veut encaisser vite. Recyclé des cartes 3 (Pont branlant) et
10 (Ligne d'arrivée avancée).*

**35. Chaîne des Limbes — 70, C.** Le parcours de chaque course est **rallongé
d'une colonne** pour le reste du run. Le seuil est recalculé. *L'inverse exact :
plus de tours, donc plus de lancers, plus d'avance versée, plus d'occasions de
parier en course et plus de remontées. Le socle du build Martyr / Bourse percée /
Pourboire du stagiaire. Recyclé de la carte 4 (Rallonge). **Anti-synergie
directe avec le n° 34** : les deux s'annulent, il faut interdire de posséder les
deux.*

**41. Crochet de Charon ⚠ — 85, R.** Une fois par course, une âme en zone de fin
recule jusqu'à la colonne du **seuil de pari** (échange de place si la colonne est
pleine). Elle **redevient pariable**. *Recyclé de la carte 26 (Rappel). Il frotte
contre le principe non négociable n° 4 (pas de pari au-delà de 60 %) : l'esprit
est respecté puisque l'âme n'est plus au-delà du seuil, mais c'est le point à
surveiller au POC. Le prix doit rester élevé et la charge unique par course.*

**42. Roue d'Ixion ⚠ — 110, R, rang 2.** **Une fois par cercle** : quand une âme
franchit la ligne d'arrivée **en premier** dans une course, si **aucun de vos
paris actifs ne porte sur elle**, elle ne termine pas. Elle est replacée sur la
case de départ, dans son couloir d'origine, et la course continue comme si la
ligne n'avait pas été franchie.

Points de règle retenus :

- **Déclenchement automatique**, sur la première âme à franchir seulement. Si
  plusieurs âmes franchissent dans le même tour, seule celle qui a le plus petit
  `finishOrder` est concernée.
- L'âme repart à la colonne 0 avec `finishOrder` remis à `null` : pour le moteur,
  elle n'a jamais fini.
- La case de départ accepte déjà plusieurs âmes (`createSouls` les y empile au
  premier cercle), donc aucune collision au retour.
- **Le guichet reste fermé pour elle** : elle ne redevient pas pariable, bien
  qu'elle soit repassée sous le seuil. Sans cette restriction, l'artefact est une
  machine à sous — une âme renvoyée au départ à mi-course finit dernière à coup
  sûr, et on poserait un pari Dernière place gagné d'avance.

*L'objet qui refuse un résultat. Il ne prolonge pas la course pour tout le monde
comme le faisait la carte 47 (Tour supplémentaire) : il annule le tour d'arrivée
d'une seule âme, celle sur qui vous n'aviez rien. C'est donc autant une
élimination qu'une prolongation, et le joueur le pilote en amont, par les paris
qu'il **ne pose pas**. Il respecte le principe non négociable n° 3 : le classement
reste établi après la résolution complète du tour d'arrivée, c'est le fait même
d'arriver qui est annulé.*

**À trancher au POC** : le déclenchement automatique peut gâcher la charge du
cercle sur la première course, quand le joueur aurait préféré la garder pour la
course du boss. Deux options : une confirmation au moment du franchissement, ou
un interrupteur posé avant la course (« la Roue est armée / désarmée »). La
seconde est plus lisible et n'interrompt pas la résolution.


## Retirés

- **24. Filet du pêcheur** (deux cases supplémentaires après l'arrivée) : retiré,
  il n'y a pas d'ex æquo à départager. Retiré du proto aussi (`config/shop.json`,
  `useRace.ts`).
- **Talisman des ex æquo** (une égalité compte comme réussite) : remplacé par la
  Quatrième marche (n° 15).

## Combinaisons à surveiller

| Combinaison | Risque |
|---|---|
| Œil de Charon + Fouet du contremaître + Miroir de Narcisse | redondants : interdire le cumul, le Miroir rend les deux autres inutiles |
| Bât de chameau + Chaîne du Coccyte + Jumeaux | trop de déplacements gratuits : plafonner à un « déplacement induit » par âme et par tour |
| Fiole de sang + Comptable + Bourse percée + Pourboire du stagiaire | machine à sous : l'argent gagné en course finance les +1. C'est le build « casser le jeu » (inspi §5), à laisser possible mais cher |
| Livre des comptes + Baume du perdant | deux filets de sécurité : le Baume s'applique après le remboursement, la perte reste réelle |
| Denier du cercle + Ticket de la première heure | bonus de mise et bonus de cote sur les mêmes paris initiaux : à mesurer aux cercles 7 à 9 |
| Ticket de la première heure + Prophète | aucun conflit, mais le Prophète devient inutile pour parier : les deux se choisissent rarement ensemble, bon signe |
| Dette infernale | doit être proposée tard (rang 4) sinon elle enlève la peur du prix du cercle |
| Raccourci de Malebolge + Chaîne des Limbes | s'annulent exactement : interdire de posséder les deux |
| Cote montante + Ticket de la première heure | s'annulent exactement : interdire de posséder les deux |
| Bornes du stagiaire + Tribune infernale | trois cases posées sur 14 colonnes : plafond atteint, ne pas ajouter un quatrième poseur |
| Roue d'Ixion + Encensoir du dernier + « vainqueur ET dernier » | une âme renvoyée au départ finit dernière à coup sûr : c'est la raison pour laquelle le guichet reste fermé pour elle |
| Roue d'Ixion + Chaîne des Limbes | piste plus longue et retour au départ : la course peut s'étirer très au-delà du budget de tours, à mesurer |
| Écho du Styx + Bond / Explosive | la combinaison rejouée rejoue aussi l'effet de face : le `+6` et la double explosion sont-ils encore lisibles ? |
| Boule de Cocyte + Verrou de Minos | ordre des deux effets à trancher, ou cumul interdit dans le tour |
| Face grégaire (forge n° 20) + Relance jumelle | la face fabrique le doublon que l'artefact relance : trancher lequel gagne |

## Sources d'inspiration

- Empilement et tuiles de spectateur : [Camel Up (règles)](https://www.ultraboardgames.com/camel-up/game-rules.php), [Geeky Hobbies](https://www.geekyhobbies.com/camel-up-board-game-review-and-rules/).
- Cotes qui se dégradent : [Ready Set Bet (Board Game Quest)](https://www.boardgamequest.com/ready-set-bet-review/), [comparatif Long Shot / Camel Up / Ready Set Bet](https://rolltoreview.com/best-betting-board-games-long-shot-camel-up-ready-set-bet/).
- Verrouillage de faces et altération de faces : [Dice Legends (Steam)](https://store.steampowered.com/app/3112170/Dice_Legends/).
