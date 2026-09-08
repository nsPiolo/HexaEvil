# Gameplay du prototype 3

Ce document décrit ce qui est dans le proto html permettant de tester la mécanique du jeu.

> Note importante : dans le proto, il faut pouvoir changer les paramètres du jeu à partir d'un fichier unique et lisible humainement.

> Dans le poc, il est important d'animer les transitions pour permettre au tester de comprendre ce qu'il se passe.

On va tester une autre mécanique, complètement différente de la mécanique de ./docs/proto/gameplay.md et de celle de ./docs/proto2/gameplay.md

Répertoire de sortie : ./Proto3Html (React et Typescript)


L'affrontement ici va se présenter comme un jeu de dés 4-21 amélioré.

Une partie de 4-21 se passe en deux phases : une premières phase pour se répartir les jetons, puis une seconde où il faut donner ses jetons aux autres joueurs.

Avant de pouvoir lancer les dés pour chaque phase, on aura 3 batailles de carte, celui qui remporte chaque bataille de carte pourra choisir d'activer un bonus parmis une liste.

La particularité du jeu, c'est que d'une partie à l'autre le joueur aura la possibilité d'upgradé son jeu de carte et/ou ses dés.

## Bataille de carte

Chaque participant a son propre deck de cartes avec les cartes du 2 à l'AS mais que dans les 4 couleurs : Carreau, Coeur, Pique et Trèfle.

Il tire un nombre de carte qui varie d'un cercle à l'autre : 
- Cercle 1 : 1 cartes.
- Cercle 2 : 2 cartes.
- Cercle 3 : 2 cartes.
- Cercle 4 : 3 cartes.
- Cercle 5 : 3 cartes.
- Cercle 6 : 4 cartes.
- Cercle 7 : 4 cartes.
- Cercle 8 : 5 cartes.
- Cercle 9 : 5 cartes.

Chaque participant peut alors choisir de changer de 0 à toutes ses cartes - 2 fois.

Une fois les changements fait, on compare les mains, la meilleure combinaison (façon poker) l'emporte. 
Avec les altération de carte, il se peut qu'on ait des combinaisons de types 5 cartes identiques (ce qui est mieux que tout).
En cas d'égalité, le joueur peut choisir pile ou face, on lance une piece, le résultat définit le gagnant.

### Choix possibles pour le vainqueur de la partie de carte

Avant de commencer les 3 batailles, on tire au sort 4 choix au hazard qu'on affiche. 
Une fois qu'un choix est pris par un participant, il n'est plus disponible.

#### Avant la phase de répartition

* Donner 3 jetons à un adversaire de votre choix.
* Donner 5 jetons à un adversaire de votre choix.

#### Avant la phase pour donner les jetons

* Prendre 3 jetons à un adversaire de votre choix.
* Prendre 1 jetons à un adversaire de votre choix.

### Bonus communs

* Choisir le nombre de relance maximal des dés : 1, 2 ou 3. (normalement au 4-21, c'est 2 relance max). S'applique à tous les participants.
* Choisir si on doit indiquer que l'on s'arrête avant de lancer les dés, ou si on peut le faire après. (normalement, au 4-21, on peut avant de lancer les dés indiquer que c'est notre dernier lancé). S'applique au participant qui a choisi ce bonus. Utilisable une fois seulement dans la phase.
* Permet d'altérer la valeur d'un dés aprés le lancé en retournant le dés (un 1 devient un 6, un 3 devient un 4, etc (la somme des deux faces opposées est égal à 7)). Utilisable une fois par partie.
* Permet de lancer un 4ème dés lors de son premier lancé de la phase, il faut en choisir un à retirer avant de procéder aux relances.
* Avant un de vos lancé : fixé la valeur de 2 dés sur 4 et 2. Puis lancer un dés. Un lancé unique et définitif. (Si vous avez l'option avec un 4ème dés, il se lance en même temps et vous devez choisir lequel retirer parmis les 4 dés.)
* Augmente de 1 la valeur en jetons des combinaisons de dés.

## Partie de dés (4-21)

Le type de dés qu'on lance va dépendre du cercle en cours : 

- Cercle 1 : 3 x D6.
- Cercle 2 : 3 x D6.
- Cercle 3 : 3 x D8.
- Cercle 4 : 3 x D8.
- Cercle 5 : 3 x D12.
- Cercle 6 : 3 x D12.
- Cercle 7 : 3 x D20.
- Cercle 8 : 3 x D20.
- Cercle 9 : 3 x D100.

En suivant les règles du 4-21, pendant la phase de répartition on distribue un certain nombre de jeton en fonction du cercle.

- Cercle 1 : 3 x 7.
- Cercle 2 : 3 x 7.
- Cercle 3 : 3 x 9.
- Cercle 4 : 3 x 9.
- Cercle 5 : 3 x 13.
- Cercle 6 : 3 x 13.
- Cercle 7 : 3 x 21.
- Cercle 8 : 3 x 21.
- Cercle 9 : 3 x 101.

La valeur des combinaisons est classique : 

- 4,2,1 : 10 jetons
- 1,1,1 : 7 jetons
- 1,1,x ou x,x,x: x jetons (exemple 1,1,5 ou 5,5,5 : 5 jetons)
- suite 3,2,1 ou 4,3,2 ou 5,4,3 ou 6,5,4 : 2 jetons

## Récompense

Pendant la phase "Donner des jetons", on compte combien le joueur à donné de jeton à l'adversaire, on fait un cumul et on affiche dans l'interface la somme. Cela représente le montant remporté par le joueur à la fin de la partie.

A la fin de toute les partie paires, le joueur gagne en plus 1 point de forge.

## Avancer d'un cercle à l'autre

Pour finir un cercle, il faut remporter x parties d'affilées.

Le nombre de partie qu'il faut remporter pour passer d'un cercle à l'autre dépend du cercle : 
- Cercle 1 : 4.
- Cercle 2 : 4.
- Cercle 3 : 6.
- Cercle 4 : 6.
- Cercle 5 : 8.
- Cercle 6 : 8.
- Cercle 7 : 10.
- Cercle 8 : 10.
- Cercle 9 : 3.

Dans le 9eme cercle, si le joueur remporte toutes les parties, il gagne le jeu.

Entre chaque partie le joueur peut dépenser son argent pour améliorer son deck de carte ou ses dés.

Voici les options et le coût : 

| Option | Coût |
| --- | --- |
| Retirer deux cartes de votre choix du deck de carte parmis 10 cartes tirés au hasard | 10 |
| Ajouter +1 à la valeur de deux cartes parmis 10 cartes tirés au hasard | 5 |
| Cloner une carte sélectionnée dans un ensemble de 10 cartes tirées au hasard | 5 |
| Retirer une carte sélectionnée dans un ensemble de 10 cartes tirées au hasard | 5 |
| Redéfinir la couleur de 5 cartes tirés au hasard dans le deck (le choix de la nouvelle couleur se fait aprés avoir vu les 5 cartes) | 10 |
| Change la valeur d'une face d'un de ses dés par une valeur de son choix (le joueur choisi le dés, la face et la valeur cible) | 1 point de forge |
| Change la valeur d'une face de chacun de ses dés par une valeur de son choix (le joueur choisi le dés, la face et la valeur cible) | 2 point de forge |

## Quand on change de dés (passage d'un cercle à l'autre)

Pour passer d'un D6 à un D8, on rajoute les faces nouvelles sur le dés actuel, donc les modifications précédentes sont toujours là.