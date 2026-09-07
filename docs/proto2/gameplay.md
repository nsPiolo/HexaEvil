# Gameplay du prototype 2

Ce document décrit ce qui est dans le proto html permettant de tester la mécanique du jeu.

> Note importante : dans le proto, il faut pouvoir changer les paramètres du jeu à partir d'un fichier unique et lisible humainement.

On va tester une autre mécanique, complètement différente de la mécanique de ./docs/proto/gameplay.md

Répertoire de sortie : ./Proto2Html (React et Typescript)

Ici, les joueurs vont successivemen placer sur un plateau de cases hexagonales des tuiles. Le but est de détruire la tuile "Roi" de l'adversaire. 

Chaque tuile à une force (qui correspond à la fois à sa vie et à sa puissance)
Quand on pose une tuile, on compare la force de la tuile aux tuiles adjacentes, et on fait sur chaque tuile une soustraction des forces. Si une tuile arrive à 0, elle est retiré du plateau.

## Mise en place

Le board est un ensemble de case hexagonale défini par un radius et une liste de case désactivé (où on ne peut pas poser de tuile.)

```
"board": {
    "radius": 4,
    "blocked": [
      { "q": 4, "r": -3 },
      { "q": 3, "r": -3 },
      { "q": 2, "r": -2 },
      { "q": 1, "r": -1 },
      { "q": 0, "r": 1 },
      { "q": 0, "r": 2 },
      { "q": 0, "r": 3 },
      { "q": 1, "r": 3 }
    ]
  },
```

Chaque case du board est aussi assignée à une couleur (les couleurs du Type de tuiles)
On doit pouvoir indiquer en pourcentage la répartition de chaque couleur.
Les couleurs sont ensuite appliquée aléatoirement sur les cases du plateau en respectant les pourcentage.

Le joueur et son adversaire ont tous les deux un roi (N00) placé à l'opposé du plateau (choix des cases dans la conf). Il se peut qu'on place aussi des tours (V00) autour des rois.

## Mécanique

Les joueurs ont pour chaque couleur possible de tuile un deck (répartition à faire via les ID des tuiles dans le config).

Un tour de jeu se passe en alternance du joueur et de l'adversaire : pose d'une tuile, déclenchement des effets, mise à jour des forces des tuiles.

Quand un joueur pose une tuile, il le fait sur une case du board, chaque case a une couleur, cette couleur défini le type de tuile que l'adversaire devra poser.

> Tuile allié : les autres tuiles du joueur.
> Tuile adverse : les tuiles de l'adversaire.
> Tuile neutre : des tuiles n'appartenant à personne, ni allié ni adverse.

### Pose d'une tuile

* Le joueur peut poser une tuile sur toutes case vide du plateau.
    * Il doit respecter la couleur imposé par l'adversaire pendant son tour.
    * Si c'est la première pose, le joueur n'est pas contraint par la couleur.
* Quand on pose une tuile, elle gagne +1 de force par tuile allié adjacente (avant le déclenchement des effets). Si une tuile alliée adjacente est détruite on ne mets pas à jour la force des autres tuiles, le +1 ne s'applique qu'au moment de la pose.

### Déclenchement des effets

* On applique les effets spécifique du type de tuile (voir plus bas).

### Mise à jour des forces des tuiles

Se fait en 3 étapes : 
1. On garde en mémoire la valeur initiale des forces des tuiles.
2. Pour chaque tuile adverse adjacente (tuile B) à celle posée (tuile A), on soustrait la valeur de la tuile posée A à la valeur de la tuile B. Dans ce calcul, on soustrait à la valeur de A le nombre de bouclier présent sur B.
3. On regarde les tuiles adjacentes à la tuile posée et on regarde la force max (à partir des valeur initiale gardé en mémoire à l'étape 1, et non les valeurs aprés l'étape 2). On soustrait à la valeur de la force de la tuile cette force max.

Si une tuile tombe a zéro ou moins de force elle est retiré du plateau. Si c'est le roi, victoire imédiate.

## Effet 

### A la pose 

Signifie que l'effet se déclenche au moment où on pose la tuile. Si la tuile est déplacée, l'effet se déclenche à nouveau

### A l'apparition

Signifie que l'effet se déclenche la première fois qu'on pose la tuile sur le plateau. Ne se redéclenche plus aprés.

### Bouclier X

Quand on fait le calcul de mise à jour de la force de la tuile, diminue de +1 à la force de la tuile adverse.

### Permanent

S'applique toujours, donc quand on pose une nouvelle tuile, on vérifie si elle rentre dans la condition et on applique l'effet.

### N fois

Un compteur qui fait que l'effet va s'appliquer une nombre N de fois avant de ne plus se déclencher

.........

## Type de tuiles

Il y a plusieurs couleurs de tuiles : 

* Rouge : Attaque
* Bleue : Magie
* Vert : Défense
* Noir : Nécromancie
* Jaune : Lumière

Pour repérer chaque type de tuile dans la config on utilise un ID composé de la première lettre de la couleur et de 2 chiffres

### Rouge 

* R01: 7 force.
* R02: 6 force.
* R03: 4 force.
* R04: 3 force. A la pose : gagne 1 bouclier.
* R05: 2 force. A la pose : diminue la force des tuiles adverses adjacentes de 2.

### Bleue

* B01: 2 force. Permanent : +1 bouclier aux tuiles alliés adjacentes.
* B02: 4 force. A la pose : change la couleur des espaces adjacents en rouge
* B03: 1 force.
* B04: 1 force. Renvoyer la tuile adverse avec la force la plus faible dans le deck de l'adversaire.

### Vert

* V00: (TOUR) 10 force.
* V01: 3 force. A la pose : gagne 2 bouclier.
* V02: 2 force. A la pose : gagne 3 bouclier.
* V03: 1 force. A la pose : gagne 3 bouclier.
* V04: 4 force

### Noir 

* N00: (ROI) 20 force.
* N01: 1 force. Permanent : Annule l'effet de toute les tuiles adjacentes (alliés ou non)
* N02: 2 force.
* N03: 3 force. A la pose : diminue la force des tuiles (alliées ou non) adjacentes de 2.


### Jaune 

* J01: 1 force. Permanent : Diminue de 2 les boucliers adverses. A la pose : gagne 1 bouclier.
* J02: 1 force. Permanent : +2 force aux tuiles adjacentes alliés.
* J03: 3 force.
* J04: 1 force. A la pose : soigne de 3 les tuiles alliés adjacentes.

## Deck de départ

```
[
    "R01","R02","R03","R04","R05","R02","R03","R04","R05","R03",
    "B01","B02","B03","B01","B02","B03","B03","B03","BO4",
    "V01","V02","V03","V04","V01","V02","V03","V04",
    "N01", "N02", "N03", "N02", "N02",
    "J01", "J01", "J02", "J03", "J03", "J03", "J04",
]
```


## Jeu de l'adversaire (gameplay de l'ordinateur)

On va définir un profil pour l'ordinateur dans la config : 
* profil : attaque/bourrin,  prudent/defensif, neutre
* niveau : expert, moyen, neutre, mauvais

Avant de poser une tuile, l'ordinateur tests toutes les positions possibles à partir des tuiles qu'il a en main à ce moment. On les classe alors par rapport à plusieurs critères :
* Score de défense
    * Combien de tuiles de l'ordinateur seront détruites.
    * Combien de dégat fait sur le roi de l'ordinateur
    * Combien de bouclier vont être ajoutés.
    * Quel est le delta de force sur les tuiles alliés (avant et aprés la pose)
* Score d'attaque
    * Combien de dégat fait sur le roi adverse
    * Combien de dégat fait sur les tuiles adverse.
    * Combien de tuiles adverse seront détruites.
    * Quel est le delta de force sur les tuiles adverses (avant et aprés la pose)


Si le joueur a un rôle d'attaque on bonifie le score d'attaque, si c'est un défensif on bonifie le score de défense.

On estime un score global en associant defense et attaque.
On trie dans l'ordre décroissant.

Si c'est un expert, on choisi au hazard parmis le top 2 des options.

Si c'est un moyen, on choisi au hazard parmis le top 5 des options.

Si c'est un neutre, on choisi parmis le top 8 des options.

Si c'est un mauvais, on choisi parmis le top 8 en excluant les deux meilleurs options.
