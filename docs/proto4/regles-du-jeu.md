# Sinner's Bet — Les règles du jeu

> Vous êtes mort. Bienvenue. Le démon stagiaire qui gère votre dossier s'ennuie
> ferme, alors il vous propose un pacte : pariez sur des courses d'âmes damnées,
> gagnez assez de pièces pour payer votre passage, et remontez les neuf cercles
> de l'enfer. Lui, il coache. Vous, vous misez. Un pacte, c'est un pacte.

## Le but

S'évader de l'enfer. Chaque cercle a un **prix de sortie** (150 pièces pour le
premier, de plus en plus cher ensuite). Vous avez **trois courses** par cercle
pour réunir la somme — la troisième se joue contre le boss du cercle. Si vous
pouvez payer à la fin, vous montez. Sinon… le stagiaire a déjà choisi votre
punition éternelle.

Perdre une course n'est jamais la fin : c'est la caisse vide à la fin du cercle
qui vous condamne.

## Une course, comment ça marche

Les âmes damnées courent sur une piste de cases. **Vous ne les contrôlez pas** —
vous les poussez, discrètement.

À chaque tour :

1. **Lancez les dés.** Deux dés **Distance** (de −1 à +3) et trois dés **Âme**
   (chacun désigne une coureuse).
2. **Associez.** Collez un dé Âme sur un dé Distance : ça fait une combinaison
   « Platon avance de +2 ». Un dé Âme restera toujours sur le carreau — à vous
   de choisir lequel.
3. **Ordonnez.** L'ordre de résolution, c'est VOTRE décision, et c'est là que
   tout se joue : avancer Platon avant ou après Virgile ne raconte pas la même
   course.
4. **Résolvez, puis subissez.** Vos combinaisons s'appliquent une à une… puis
   l'adversaire lance sa propre paire de dés. Lui ne vous demande pas votre avis.

Deux dés sur la même âme ? Les distances s'additionnent en un seul bond.

### Collisions

Les cases sont petites et les damnés n'ont aucune politesse :

- Une âme qui **avance** sur une case occupée la **percute** et **saute devant**
  elle : le percuteur gagne une case de plus. Provoquer une collision est
  parfois le meilleur coup du tour.
- Une âme qui **recule** sur une case occupée **échange sa place** avec elle.

### Plusieurs couloirs (à partir du 2e cercle)

Au premier cercle, la piste n'a qu'un couloir : chaque atterrissage sur une âme
est une collision. Ensuite, à chaque âme ajoutée au départ, la piste gagne un
couloir — jusqu'à six au neuvième cercle. Trois choses à retenir :

- **Seule la colonne compte.** Les couloirs sont des files côte à côte ; votre
  position dans la course, c'est votre colonne, pas votre couloir. Changer de
  couloir ne fait ni avancer ni reculer.
- **On se rabat quand c'est pris.** Une âme atterrit dans son couloir si la case
  est libre. Occupée ou **bloquée** (éboulis, chaînes) ? Elle se rabat sur une
  case libre de la même colonne — la plus **basse** d'abord. Et si toute la
  colonne est pleine, alors seulement, c'est la collision : saut devant en
  avançant, échange en reculant.
- **Le bas a toujours raison.** À colonne égale en fin de course, l'âme du
  couloir le plus bas — le plus proche de vous — passe devant. Jamais d'ex æquo
  en enfer : le classement tranche tout, couloir compris.

Les cases bloquées rétrécissent la piste et créent des embouteillages : ce sont
des pièges à collisions, repérez-les avant de miser. Chaque cercle a plusieurs
**terrains** possibles, tirés au sort au départ de chaque course : la carte vous dit
lesquels, jamais lequel. Le terrain joué est nommé en haut à gauche de la table.

### L'arrivée

Dès qu'une âme franchit la ligne, **le tour se termine quand même** — vos
combinaisons restantes et la paire adverse sont jouées. Le classement n'est
établi qu'après. Une course peut donc se retourner sur la ligne : franchir en
premier ne garantit pas de finir premier.

## Les paris — votre vraie arme

Avant la course, posez au moins un pari. Pendant la course, vous pouvez en
rajouter… tant que l'âme visée n'a pas dépassé le **seuil de pari** (60 % du parcours). Au-delà,
le guichet est fermé pour elle : trop facile, même pour un démon.

Trois familles de tickets :

- **Simples** — une seule âme sur le ticket, ouverts dès le départ : vainqueur
  (×2,2), top 3 (×1,5), pas dans le top 3 (×1,35), dernière place (×1,65).
- **Combinés** — deux âmes sur le même ticket : le duel « A finit devant B »
  (×1,35), deux âmes dans le top 3 (×2,05), le podium dans le désordre (×3,4).
  La cote n'est pas toujours plus grosse — ce qui change, c'est qu'un duel se
  **lit** quand un vainqueur se devine.
- **Gros tickets** — le podium exact (×22) et le classement complet (×80) : de
  quoi payer un cercle entier d'un coup, si vous lisez la course comme un livre
  ouvert. Entre les deux, « vainqueur ET dernier » (×3,15) ne demande que de
  regarder les deux bouts.

> Les cotes ci-dessus sont celles de `config/race.json` au 18 septembre 2026.
> La page d'aide du jeu ne les recopie pas : elle les interpole depuis la config
> (`oddsText`, `texts.ts`). Après un `npm run odds -- --suggest`, l'aide suit
> toute seule — ce paragraphe, non. Le remettre à jour à la main.

Deux choses à savoir sur les cotes : elles **fondent** à mesure que la course
avance (parier tard, c'est parier sûr, donc parier petit), et les gros tickets
sont **verrouillés au début** — le stagiaire n'a pas le grade pour les encaisser.
Pas encore.

## Votre argent a trois vies

Chaque pièce peut devenir **une mise**, **un achat en boutique**, ou **une part
du prix du cercle**. Les trois se disputent le même tas. Dépenser, c'est
s'armer ; garder, c'est survivre. La jauge en haut de l'écran vous rappelle en
permanence où vous en êtes par rapport au prix de sortie.

## La boutique du stagiaire

Entre les paris et la course, le stagiaire ouvre sa petite caisse (une fois
votre premier pari posé — il ne sert pas les indécis) :

- des **dés spéciaux** qui remplacent un dé Distance — le prudent Dé des
  Limbes (1, 1, 2, 2), le Dé de Glace et ses extrêmes (−1, −1, 2, 5)… ;
- la **forge**, pour modifier une face de dé, une seule, mais pour toujours ;
- des **artefacts**, effets permanents qui tordent les règles en votre faveur —
  l'Œil du parieur pour miser après avoir vu vos dés, le Sablier de Charon qui
  repousse le seuil de pari à 70 %…

Chaque objet annonce la couleur : **SÛR**, **AMBITIEUX** ou **DANGER** — et un
objet dangereux dit toujours ce qu'il vous coûtera. En enfer, au moins, les
contrats sont clairs.

## Le stagiaire monte en grade (et vous aussi)

Plus votre poulain — vous — impressionne, plus le stagiaire grimpe dans la
hiérarchie : Assistant, Tourmenteur, Contremaître, Sous-directeur… Chaque
promotion **ouvre de nouveaux paris** et garnit la boutique. Après le huitième
cercle, il obtient même une belle promotion. Au neuvième — le cercle de la
Trahison — devinez qui tient le guichet en face de vous.

## L'avance et les jetons grandissent avec vous

Avant chaque course, le stagiaire vous avance de l'argent : 20 pièces au premier
cercle, puis **davantage à chaque cercle** — 40 au deuxième, 60 au troisième, 180 au
neuvième. Un stagiaire qui monte en grade a plus de caisse. C'est ce qui vous permet
de repartir après avoir payé la sortie d'un cercle, même la bourse vide.

Les quatre jetons de mise valent 5, 10, 20 et 50 au premier cercle. Ensuite ils
grossissent aussi, comme les prix de la boutique : plus vous descendez, plus vous
pouvez risquer d'un coup — c'est ce qui permet à une bourse bien garnie de suivre
des prix de sortie qui grimpent. Une garantie ne bouge pas : le plus petit jeton ne
dépasse jamais l'avance du cercle. Même ruiné, vous pouvez toujours poser le pari
minimum.

## Et après le neuvième ?

Payer le neuvième cercle, c'est sortir de l'enfer : la porte s'ouvre et la partie
peut s'arrêter là. Mais rien ne vous y oblige. Le stagiaire a lu les registres et
il y a autre chose au-dessus — les fonds marins, une falaise, une ville, une
montagne, le ciel, et tout en haut un guichet que personne n'a jamais tenu. Si
vous montez avec lui, vous gardez tout : votre argent, vos dés, vos artefacts.

Au sommet, ça ne s'arrête plus : on rejoue le dernier cercle, encore et encore,
avec un tarif de sortie qui grimpe à chaque tour. La partie se termine le jour où
vous ne pouvez plus payer. C'était le marché depuis le début.

## Les trois conseils du stagiaire

1. « Pariez avant de rêver : un ticket simple payé vaut mieux qu'un podium
   exact raté. Les gros tickets, c'est pour les courses que vous avez préparées. »
2. « L'ordre des combinaisons est gratuit et c'est le coup le plus fort du
   jeu. Regardez l'aperçu avant de résoudre — l'enfer est déterministe, profitez-en. »
3. « Gardez toujours de quoi payer le cercle. Je vous aime bien, mais un pacte,
   c'est un pacte. »

*Bonne chance. Vous en aurez besoin — enfin, non : vous aurez besoin de bien lire.*
