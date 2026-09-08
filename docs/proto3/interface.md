# Interface

## 1 . Lancement

* Quand le joueur lance l'application, une version animé du logo est affiché pendant 5 secondes.
PUIS 
* Le menu principal de l'application est affichée. Avec dans l'ordre
    - `Continuer` (pour reprendre un run en cours, grisé si aucun run est en cours).
    - `Commencer une nouvelle évasaion` (pour lancer un nouveau run)
    - `Statistiques` (affiche des stats sur les parties)
    - `Option` (affiche le menu d'option)

### Statistique

Un écran avec un bouton pour revenir en arrière sur le menu principal.
Affiche les statistiques suivantes : 
* `Nombre de tentatives` (compte le nombre de run)
* `Nombre d'évasion` (Compte le nombre de partie gagnée - valeur + pourcentage)
* `Cercle atteint` (Le cercle le plus haut atteint)
* `Rencontres gagnées` (Nombre de rencontres gagnées)
* `Argent dépensé` (Somme d'argent dépensé)
* `Batailles jouées` (valeur)
* `Batailles gagnées` (valeur et %)
* `Nombre de 4-21` (Nombre de 4,2,1 fait par le joueur)

> Dans la version web, on garde ces informations dans le localstorage.

### Option

Un écran avec un bouton pour revenir en arrière sur le menu principal.
Quand on modifie une valeur elle est prise en compte immédiatement, pas besoin de valider.

* `Volume` (slider permettant de choisir le volume permets d'aller de 0 à 100 par pas de 10)
* `Langue` (Select : English, Français, Deutsch, Español)
* `Vitesse des animations` (slider permetttant d'aller de x0.5 à x4 par pas de 0.5)


> Dans la version web, on garde ces informations dans le localstorage.
> Si une option n'a pas de sens (par exemple le volume car pour le moment il n'y a pas de musique) on grise la ligne.

## 2 . Commencer une nouvelle évasaion

Affiche une suite d'écrans animés avec un démon qui vous parle dans des bulles de texte, alternance de bulles entre les paroles du démon et celles du joueur.
Le joueur peut passer à la bulle suivante avec un bouton `suite` ou en appuyant sur la barre d'espace.
On a la possibilité de sauter toute l'intro avec un bouton `Passer l'introduction`

Dans l'ordre des bulles:
* Démon stagiaire : "Félicitation, vous êtes mort !"
* Démon stagiaire : "On a étudié votre dossier, et sans grande surprise, vous avez fini ici."
* Démon stagiaire : "Je suis en stage, et je n'ai pas les accréditations nécessaires pour vous affecter à la bonne punition, en plus elle est actuellement en réfection..."
* Démon stagiaire : "...on va devoir attendre le boss..."
* Démon stagiaire : "...voilà, voilà... désolé..."
* Démon stagiaire : "Ça vous tente une partie de dés pour tuer le temps ?"
* Joueur : "Non merci, sans plus."
* Démon stagiaire : "Non !? Je comprend que vous ne souyez pas d'humeur, mais j'me fait chier ici et si vous gagnez j'allège votre peine."
* Joueur : "Je ne suis pas là pour vous occuper"
* Démon stagiaire : "Allez s'il vous plaît !"
* Démon stagiaire : "Je vous laisse même jouer avec un dés de plus."
* Joueur : "Bon ok, mais pas d'entourloupe"
* Démon stagiaire : "Parfait, on a un pacte !"
* Démon stagiaire : "Ici on joue à une variante du 4-21, donc voilà 3 dés et un jeu de carte."
* Joueur : "Je dois pas avoir un dés en plus ?"
* Démon stagiaire : "Ah oui ! Bon... voilà un 4ème dés, mais on ne prendra que les 3 meilleurs, faut pas abuser non plus"
* Joueur : "Et a quoi servent les cartes au 4-21 ?"
* Démon stagiaire : "A tricher, pardi !?"

## Continuer

A chaque fois que le joueur termine une rencontre, on sauve l'état de son deck, de ses dés, de ses possessions (argents, forge) - avant la boutique.

Quand il faut continuer, on le met dans la boutique (même s'il a quitté en plein milieu d'une rencontre).

> Dans la version web, on garde ces informations dans le localstorage.

## Ecran de jeu

Arrière plan, vue d'une table de jeu du point de vue du joueur.
En haut de la table de jeu (imprimé sur la table) les étapes de la partie à la façon d'un fil d'ariane un peu courbé. Un trait fin horizontal entre les étapes.
* `Batailles` (avec 3 blocs représentant les 3 premières batailles)
* `Répartition`
* `Batailles` (avec 2 blocs)
* `Distribution`

Une étape terminée est en gras, une étape en cours possède un halo lumineux.

En overlay (en haut à gauche) le cercle en cours et le nombdre de rencontre prévu : 
* `1er Cercle`
* `1ère recontre sur 4`

En overlay (en haut à droite) les possessions : 
* `17 Pièces`
* `1 Forge`

Posé sur la table (donc pas en overlay) :
* Un tas de jeton au centre de la table (correspondant au jetons à se répartir) un peu décalé vers le haut pour laisser la place aux tuiles.
* 3 emplacements de jeu (un en bas pour le joueur, un à droite et un à gauche pour les adversaires.)

* Des tuiles posées au centre pour représenter les options bonus sélectionnables. Un peu en vrac avec rotations, mais non supperposé. Quand un participant choisi un bonus, le bonus est déplacé dans sa zone de jeu. Quand il est utilisé il est retiré du tapis. On affiche que le titre, au survol on affiche la description de l'option.

* Dans la zone de jeu des participants un deck de carte posé dos visibles.

### Batailles

La carte du joueur s'affiche dans sa zone de jeu face visible, et celles des adversaires apparraissent face caché dans leur zone de jeu.

Deux boutons apparraissent au dessus des cartes `Echanger n cartes` et `Passer`
Un texte d'aide passe entre les boutons et les cartes : `Vous pouvez échanger des cartes jusqu'à deux fois.`
Le joueur peut sélectionner une ou plusieurs cartes, quand au moins une carte est sélectionnée, le bouton Echanger n carte s'active.

Il faut animer le changement de carte, on fait glisser vers le bas la carte à échanger, et on fait glisser une nouvelle carte à partir du deck.

On pose un badge "Couronne" sur le la carte qui gagne la bataille et on highlight les options si c'est au joueur de choisir.

### Phases de dés

On affiche sur le côté de la zone de jeu d'un participant ses jetons (avec dessous la valeur numérique affichée).
Quand un transfert de jeton se fait, on doit voir les jetons se déplacer d'un tas à l'autre.

> Dans la version HTML les dés sont représentés en vue du dessus par un carré.
> Dans la version Unity, ce sera un objet 3D qui roulera sur la table.

Un bouton permet de lancer les dés, cela anime un déplacement des dés sur la zone de jeu du participant. 
Quand on relance un dés, il tourne sur lui même avant d'afficher sa nouvelle valeur.

On peut sélectionner les dés à garder avant de les relancer. Un dés sélectionné grossi et a un halo contour.

Des boutons de contrôles sont placés au dessus de la zone de jeu du joueur pour `Relancer n dés`, `M'arrêter là`ou les autres controles liés aux options bonus.

Un jeton de Dealer (comme au poker) indique le leader, sur ce jeton apparaît le nombre de relances effectuées quand il a validé sa combinaison.

En impression sur la table, danc chaque zone de jeu, on affiche le nom de la combinaisson (ex : `suite`) et sa valeur en jeton.
Il n'est pas nécessaire de mettre en évidence les 3 dés conservé pour faire la meilleure combinaison possible.

L'aide de jeu affiche : `Cliquez les dés à garder, puis relancez les autres.`

## Boutique

Dans la boutique, on change de fond, on est plus sur la table de jeu.

Les éléments en overlay comme le cercle ou les possession reste visible ici aussi.

Le joueur peut cliquer sur les éléments achetable affichés sous forme de tuiles à l'écran.

Le coût est affiché sur la gauche de la tuile en gros.
La tuile est grisée si le joueur n'a pas assez pour l'acheter.


Deux encarts listes : 
* Les dés du joueur, en listant toutes les faces.
* Les cartes du deck en affichant sur 4 lignes (une par couleur) toutes les cartes de la couleur dans l'ordre.

Quand on survole une face d'un dés, ça mets en évidence la face opposée.

Un bouton `Lancer la rencontre suivante` permets de continuer.

## A la fin d'un cercle

Quand un cercle est terminé, on passe au suivant, mais avant la boutique, on affiche un écran de transition où le démon parle pour te féliciter et de dire ce qui va changer.

* `Félicitation, je ne pensais pas me faire battre par une âme déchûe un jour. Je te laisse passer au cercle suivant, mais attention...`
* `...ils jouent avec 3 cartes leurs batailles` ou `...ils utilisent des dès à 8 faces.`
