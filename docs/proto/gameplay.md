# Gameplay du prototype

Ce document décrit ce qui est dans le proto html permettant de tester la mécanique du jeu.

> Note importante : dans le proto, il faut pouvoir changer les paramètres du jeu (les recettes, les variables des batiments, etc) à partir d'un fichier unique et lisible humainement.

Le proto permet de représenter une rencontre (l'une des premières du jeu), ou le joueur va rencontrer un démon. Le joueur doit réussir à construire une tour en apportant des pierres à cette dernière. De son côté le démon va envoyer des effets pour détruire ces pierres de façon régulière. Il faut donc produire plus vite les pierres, ou envoyer des pierres de meilleures qualitées.

## Elements du jeu

* Plateau de jeu : composé d'espace hexagonale
* Tuile (tuile hexagonale) : ce sont les élements que le joueur place sur le plateau de jeu 
* Démon : adversaire du joueur
* Ame : ressources qui se déplace sur le plateau de jeu pour servir de travailleur ou de transporteur pour les ressources et batiments.
* Sbire : équivalent des âmes mais pour l'adversaire
* Ressource : élément utilisé ou produit par un batiment. Les âmes déplacent les ressources d'un batiment à l'autre, et sont nécessaire pour produire les ressources.
* Recette : asigné à un type de batiment, indique les ressources à consommer pour produire un nouveau type de ressource, en un certain nombre de tour. Exemple : il faut 1 tour pour produire 2 basalte dégrossi à partir de 1 basalte brut. (Le réglage de ces recettes est l'un des enjeux du proto)

### Types de tuile

Une tuile peut avoir ou nom un batiment. Chaque batiment a une fonction spéciale.

#### Sans batiment

* Vide : il n'y a rien sur la tuile (1 sortie)
* Split : permet de répartir le flux des âmes entrant vers une ou plusieurs sorties  (2 sorties)

#### Avec batiment
* `Puit des âmes` : endroit à partir du quel apparaisse les nouvelles âmes.  (1 sortie)
* `Gouffre` : endroit à partir du quel apparraisse les sbires.  (1 sortie)
* `Carrière` : permet de produire du `basalte brut`  (1 sortie)
* `Tailleur de pierre` : permet de convertir du `basalte brut` en `basalte dégrossi`  (1 sortie)
* `atelier` : permet de convertir du `basalte dégrossi` en `outil de basalte`  (1 sortie)
* `sculteur` : permet de convertir 1x`basalte dégrossi` + 1x`outil en basalte` en `pavé de basalte`  (1 sortie)
* `Escalier` : escalier en construction où le joueur doit livrer les pierres.  (0 sortie)

### Recettes 

| Ressource IN | Ressource OUT | Tour | Batiment |
| --- | --- | --- | --- | 
| rien | 2 x `Basalte brut` | 1 | `Carrière` |
| 1 x `Basalte brut` | 2 x `Basalte dégrossi` | 2 | `Tailleur de pierre` | 
| 1 x `Basalte dégrossi` | 1 x `Outil en basalte` | 1 | `Atelier` |  
| 1 x `Basalte dégrossi` + 1 x `Outil en basalte` | 1 x `Pavé en basalte` | 1 | `Sculteur` | 
| 1 x `Basalte brut` | Fait progresser de 1 la construction de l'escalier  | 1 | `Escalier` |
| 1 x `Basalte dégrossi` | Fait progresser de 3 la construction de l'escalier  | 2 | `Escalier` |
| 1 x `Pavé en basalte` | Fait progresser de 7 la construction de l'escalier  | 3 | `Escalier` |


## Cycle du jeu

Le jeu va alterner les étapes suivantes : 

1. Le joueur place une tuile
2. On lance n tours (on va commencer avec n = 5). Lors d'un tour il se passe dans l'ordre

    a. Le puit des âmes fait apparaitre une nouvelle âme.
    b. Chaque âme qui se trouve dans un batiment du joueur fait progresser la production de la ressource de 1. 
    c. Les âmes qui ne sont pas bloquée par un process de production tente de se déplacer.
    d. Le démon fait apparaître un nouveau sbire
    e. Chaque sbire qui se trouve dans un batiment du démon fait progresser la production de la ressource de 1.
    f. Les sbires qui ne sont pas bloquée par un process de production tente de se déplacer.

> On peut aussi le reformuler comme tel : Les âmes puis les sbires font dans l'ordre : Apparition -> Production -> Déplacement

## Règles

### Déplacement

(les règles de déplacement s'applilque aux âmes comme aux sbires)

* Une tuile est hexagonale, on utilise les 6 directions de l'hexagone comme des accès.
* En fonction des types de tuiles, le joeur peut choisir de convertir des accès en sortie. Quand une âme tente de se déplacer elle utilisera la sortie désignée par le joueur pour rejoindre l'hexagone suivant. Le nombre de sortie possible d'une tuile dépent du type de tuile.
* Tout les accés qui ne sont pas des sorties sont considéré comme des entrées.
* S'il n'y a pas d'hexagone en face de la sortie, l'âme ne peut pas se déplacer. On considère qu'il y a un hexagone en face quand une entrée fait face à une sortie.
* Quand une âme tente de se déplacer, mais qu'elle ne peut pas se déplacer, elle est détruite.
* En 1 tour, une âme se déplace d'un hexagone vers le suivant.
* S'il y a plusieurs sorties désignée sur la tuile, un compteur s'assure de répartir équitablement les âmes sur les différentes sorties. Cette règles peut être surchargée par une règles spéciale de la tuile.
* Quand une âme arrive sur un batiment du joueur (ou un sbire sur un batiment du démon), et qu'il porte une ressource d'entrée de la recette du batiment, il dépose les ressources correspondants dans le stockage du batiment.
* Quand le déplacement de l'âme est possible et qu'elle quitte un batiment, si une ressources est disponible dans le stockage de sortie elle en prend autant que possible (par défaut 1, mais plutard, les âmes pourront en porter plus)

### Production

* Quand une âme est sur une tuile avec un batiment doté d'une recette ET que l'âme ne porte rien ET que l'âme n'a pas commencé à produire pour ce batiment -> alors il va tenter de suivre la recette du batiment.
* Pour commencer une recette, il doit y avoir dans la réserve du batiment assez de ressource IN pour la recette. 
    - Si c'est le cas, l'âme ou le sbire sort ces ressources du stockage et compte 1 tour dans la production de la recette. 
    - S'il n'y a pas assez de ressource, l'ame ne commence pas la recette.
* Si une recette nécessite plusieurs tours, c'est l'âme qui a commencé qui ira au bout de la production.
* Quand le nombre de tour de la recette est écoulé, l'âme place les ressources générées dans le stockage de sortie du batiment.


### Notes 

* Une ame qui produit peut donc déplacer ensuite la ressource quelle vient de produire car le déplacement se fait à la suite de la production.
* On associe un ID à chaque âmes/sbires, et on les traitent une par une de façon séquentielle phase par phase (une phase étant une des étapes du tour production, déplacement, apparition)

