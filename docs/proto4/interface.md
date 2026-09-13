# Interface

Nom du jeu : `Damned Race Bet`

## 1 . Lancement

* Quand le joueur lance l'application, une version animé du logo est affiché pendant 5 secondes.
PUIS 
* Le menu principal de l'application est affichée. Avec dans l'ordre
    - `Continuer` (pour reprendre un run en cours, grisé si aucun run est en cours).
    - `Commencer une nouvelle évasion` (pour lancer un nouveau run)
    - `Statistiques` (affiche des stats sur les parties)
    - `Option` (affiche le menu d'option)

### Statistique

Un écran avec un bouton pour revenir en arrière sur le menu principal.
Affiche les statistiques suivantes : 
* `Nombre de tentatives` (compte le nombre de run)
* `Nombre d'évasion` (Compte le nombre de partie gagnée - valeur + pourcentage)
* `Cercle atteint` (Le cercle le plus haut atteint)
* `Argent gagné` (Somme d'argent dépensé)
* `Argent dépensé` (Somme d'argent dépensé)
* `Courses jouées` (valeur)
* `Meilleur pari` (valeur nette la plus haute remportée)

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
* Démon stagiaire : "Ça vous tente un petit pari pour tuer le temps ?"
* Joueur : "Non merci, sans plus."
* Démon stagiaire : "Non !? Je comprend que vous ne souyez pas d'humeur, mais j'me fait chier ici. Je vous prète un peu d'argent et tu pourras conserver tes gains."
* Joueur : "Bon ok, mais pas d'entourloupe"
* Démon stagiaire : "Parfait, on a un pacte !"
* Démon stagiaire : "Ici on mise sur une course d'âmes damnées, donc voilà 100 pièces pour commencer."

## Continuer

A chaque fois que le joueur termine une course, on sauve l'état de son deck, de ses dés, de ses possessions (argents)

Quand il faut continuer, on le met au début de la rencontre.

> Dans la version web, on garde ces informations dans le localstorage.

## Ecran de jeu

Arrière plan, vue du champs de course du point de vue du joueur.
En haut de la table de jeu (imprimé sur la table) les étapes de la partie à la façon d'un fil d'ariane un peu courbé. Un trait fin horizontal entre les étapes.
* `Pari`
* `Boutique`
* `Course`
* `Gains`

Une étape terminée est en gras, une étape en cours possède un halo lumineux.

En overlay (en haut à gauche) le cercle en cours et le nombdre de rencontre prévu : 
* `1er Cercle`
* `1ère course sur 3`

En overlay (en haut à droite) les possessions : 
* `17 Pièces`
* `2 artefacts`

Posé sur la table (donc pas en overlay) :
* 2 emplacements de jeu (un en bas pour le joueur, un en haut pour l'adversaire.)

## Interface de course

Pendant la phase `pari initiaux` et `boutique`, il faut pouvoir passer des éléments de la boutique aux paris facilement.

En faite, un panneau venant du bas (brawler) affiche les options de pari.
Un bouton permet d'afficher la boutique, qui s'affiche au dessus du champs de course dans un panneau venant du haut (brawler).

Une fois la course lancé, on ne peut plus voir la boutique.

Tu peux retirer la zone journal 

Quand on clique sur le nombre d'artefacts, on affiche la liste des artefacts actif dans une fenêtre en popup.

## Fin de la seconde course

Le stagiaire revient pour te proposer de rencontrer son boss.

* `Mon boss est de retour, il nous a vu jouer. Il te propose de parier avec lui, et si tu as 200 piéces, il veut bien t'autoriser à continuer de parier.`

## A la fin d'un cercle

Quand un cercle est terminé, on passe au suivant, mais avant la boutique, on affiche un écran de transition où le démon parle pour te féliciter et de dire ce qui va changer dans le prochain cercle.

### Exemple pour le cercle 1

Si le joueur a assez d'argent : 

* `Félicitation, je ne pensais pas que tu pouvais réussir.`
* `Si ça te va, je vais te coacher. On va te tester dans les autres cercles.`

Si le joueur n'a pas assez : 

* `Bon, t'es nul en faite !! Finalement, j'ai trouvé quel punition éternelle tu vas subir, bye.`