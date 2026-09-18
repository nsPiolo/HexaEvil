# Interface

Nom du jeu : `Sinner's Bet`

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
* Démon stagiaire (ajout proto) : "Ah, et je n'ai le droit de prendre que les paris simples : vainqueur, top 3, dernier, un duel. Les gros tickets, c'est au-dessus de mon grade. Pour l'instant."

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

Le résultat de la course (classement) et le résultat des paris s'affichent dans une modale au-dessus de la table, pas dans la zone de jeu. Un bouton « Voir la table » la referme, un onglet « Gains » la rouvre.

Quand on clique sur le nombre d'artefacts, on affiche la liste des artefacts actif dans une fenêtre en popup.

## Entre deux courses.

Entre deux courses, on passe par un écran où on peut visualiser les 9 cercles, et là où on est.

Représenté par des cercles concentrique avec 3 points dans chaque cercle, en spirale relité par un trait.
Le premier cercle est au centre.

Le joueur doit cliquer sur la course suivante pour lancer la course.

C'est aussi sur cette page qu'on pourra voir le pouvoir de chaque boss et le monant attendu par le cercle en cours. (on ne peut pas voir le montant des cercles suivants).

## Fin de la seconde course

Le stagiaire revient pour te proposer de rencontrer son boss.

* `Mon boss est de retour, il nous a vu jouer. Il te propose de parier avec lui, et si tu as 200 piéces, il veut bien t'autoriser à continuer de parier.`

## Avant la course du boss

Quand le joueur lance la **troisième course** du cercle depuis la carte, le boss se
présente avant la table de jeu. Même écran que les dialogues du stagiaire, mais joué
dans le décor du cercle (`public/circles/<NN>-<nom>/bg.jpg`) plutôt que dans la salle
de lave : le boss parle sous son nom (`run.circles[].boss` de `config/race.json`) et
son portrait quand il est peint, le stagiaire lui donne la réplique avec son grade du
moment. La scène est passable (« Passer »), on la revoit à chaque nouvelle tentative.

Les textes sont dans `CIRCLES[].bossIntro` (`src/presentation/texts.ts`), un par
cercle ; `{boss}` et `{price}` y sont remplacés à l'affichage.

### Exemple pour le cercle 1

* Charon — `Alors c'est vous. Le mort qui joue aux dés au lieu de descendre.`
* Le stagiaire — `Charon, monsieur. Il a payé son passage, techniquement…`
* Charon — `Techniquement. J'ai passé neuf mille ans à compter des pièces, petit. Je sais ce que veut dire techniquement.`
* Charon — `Une course, alors. Si vous sortez d'ici avec 200 pièces, je vous laisse la barque. Sinon, je vous mets à la rame.`
* Vous — `Et si je gagne, c'est vous qui ramez ?`
* Charon — `Personne n'a jamais vécu assez longtemps pour me poser la question.`

## A la fin d'un cercle

Quand un cercle est terminé, on passe au suivant, mais avant la boutique, on affiche un écran de transition où le démon parle pour te féliciter et de dire ce qui va changer dans le prochain cercle.

### Exemple pour le cercle 1

Si le joueur a assez d'argent : 

* `Félicitation, je ne pensais pas que tu pouvais réussir.`
* `Si ça te va, je vais te coacher. On va te tester dans les autres cercles.`

Si le joueur n'a pas assez : 

* `Bon, t'es nul en faite !! Finalement, j'ai trouvé quel punition éternelle tu vas subir, bye.`
---

## Textes générés pour le proto (cercles 2 à 9 et fin)

> Section ajoutée avec le proto : ces textes vivent dans `Proto4Html/src/presentation/texts.ts`.
> `{souls}` et `{price}` sont remplacés par les valeurs du cercle suivant (config `run.circles`).
> Chaque cercle a un texte de réussite (prix payé, annonce du cercle suivant) et un texte d'échec (fin de run).

### Cercle 1 — Limbes

* Réussite : `Félicitations, je ne pensais pas que vous pouviez réussir.` / `Si ça vous va, je vais vous coacher. On va vous tester dans les autres cercles.` / `Prochain arrêt : la Luxure. Des vents éternels y bousculent les âmes, il y en aura {souls} au départ, une de plus. Et le tarif de sortie monte à {price} pièces.`
* Échec : `Bon, vous êtes nul en fait !! Finalement, j'ai trouvé quelle punition éternelle vous allez subir. Bye.`

### Cercle 2 — Luxure

* Réussite : `Deux cercles ! Mon chef de service a cessé de me tutoyer, c'est bon signe.` / `La Gourmandise nous attend : de la boue jusqu'aux genoux et Cerbère qui ronge tout ce qui traîne. Toujours {souls} âmes au départ, mais la sortie coûte {price} pièces.`
* Échec : `Dommage. Les vents de la Luxure vous emportent, et moi je retourne classer des dossiers. Bye.`

### Cercle 3 — Gourmandise

* Réussite : `Vous avez le nez pour les bonnes cotes. On m'a confié un badge d'accès au quatrième.` / `L'Avarice : des âmes qui poussent des poids face à face, éternellement. {souls} âmes au départ, une de plus, et {price} pièces pour passer.`
* Échec : `Cerbère a faim, et vous n'avez plus rien à miser. Vous connaissez la sortie… enfin, non, justement. Bye.`

### Cercle 4 — Avarice

* Réussite : `Quatre cercles. Les avares ont pleuré en vous voyant repartir avec leur argent. Moi, j'ai eu une prime.` / `La Colère, maintenant : le Styx, un marais où les âmes se frappent sans fin. Toujours {souls} âmes, et {price} pièces pour la sortie.`
* Échec : `Les avares gardent tout, vous compris. Ça finit bizarrement bien pour eux. Bye.`

### Cercle 5 — Colère

* Réussite : `Vous êtes ressorti du Styx sans une éclaboussure. Le boss a demandé votre nom. Le mien aussi, pour une fois.` / `L'Hérésie ensuite : des tombes incandescentes, et {souls} âmes au départ, une de plus. La sortie passe à {price} pièces.`
* Échec : `Le Styx vous garde. Pas de rancune : je vous mets dans le marais, c'est juste à côté du bureau. Bye.`

### Cercle 6 — Hérésie

* Réussite : `Six cercles. On me laisse remplacer des âmes en course, maintenant. Coach titulaire, presque.` / `La Violence est en trois sous-cercles : fleuve de sang, buissons, sable brûlant. Toujours {souls} âmes, mais {price} pièces pour passer.`
* Échec : `Les tombes de l'Hérésie ont une place libre, ça tombe bien. Bye.`

### Cercle 7 — Violence

* Réussite : `Sept cercles. Mon boss commence à me regarder de travers. Je crois qu'il a compris qui coache qui.` / `La Fraude : dix fosses concentriques, les Malebolge, pleines de séducteurs et de faussaires. {souls} âmes au départ, une de plus, et {price} pièces de sortie.`
* Échec : `Le sable brûlant, le fleuve de sang… choisissez, je suis bon prince. Bye.`

### Cercle 8 — Fraude

* Réussite : `Huit cercles. Il ne reste que la Trahison. Et… on m'a promu. Je dirige le neuvième.` / `Ce n'est pas un problème, hein ? Un pacte, c'est un pacte. Il y aura {souls} âmes au départ, gelées dans le Cocyte, et il faudra {price} pièces pour sortir. Pour de bon.`
* Échec : `Les faussaires vous ont eu à votre propre jeu. Une fosse vous attend au fond des Malebolge. Bye.`

### Cercle 9 — Trahison (le carrefour)

Le neuvième cercle payé n'est plus la fin du jeu : c'est un **choix** (GDD §5.3).
Le dialogue ouvre les deux issues, l'écran `Évasion` les propose, et le run reste
sauvegardé tant que le joueur n'est pas rentré au menu.

* Réussite (évasion) :
  * Démon : `Vous… vous avez payé. Contre moi. Contre le neuvième cercle.`
  * Démon : `Un pacte, c'est un pacte. La porte est là, ouverte. Personne n'est jamais remonté d'ici, alors ne racontez pas comment vous avez fait.`
  * Joueur : `Et vous ?`
  * Démon : `Moi ? Patron d'un cercle, et toujours pas grand-chose. Il me manque un parieur qui sache lire une course.`
  * Démon : `Parce qu'il y a autre chose, au-dessus. J'ai vu les registres : les fonds marins, une falaise, une ville, une montagne, le ciel. Et tout en haut, un guichet que personne n'a jamais tenu.`
  * Démon : `Alors : la porte, ou la montée. Vous gardez la monnaie dans les deux cas.`
  * Écran final `Évasion` : `Neuf cercles traversés, {money} pièces en poche. Le stagiaire est devenu boss, et vous, vous êtes sorti.`
  * Deux boutons : `Monter avec lui` (le run continue au cercle 10) et `Retour au menu` (le run est clos).
* Échec : `À une pièce près. C'est le cercle de la Trahison, vous vous attendiez à quoi ? Bienvenue dans la glace. Bye.`
  * Écran final `Punition éternelle` : `Le prix du cercle était de {price} pièces. Il vous en manquait {missing}.`

### Cercles 10 à 15 — la montée (mode démon)

Le joueur qui reste quitte l'enfer par le haut : fonds marins, falaise, ville,
montagne, ciel, paradis. Mêmes règles, mêmes écrans ; ce qui change est le décor,
le boss, le nombre d'âmes (jusqu'à 12) et le prix. Les textes sont dans `CIRCLES`
(`src/presentation/texts.ts`) comme les neuf premiers.

Au-delà du quinzième, le paradis se rejoue sans fin avec un prix qui monte à
chaque tour : le run s'arrête quand le joueur ne peut plus payer. Le HUD continue
de compter les cercles (« 22e Cercle »), et la carte allonge sa spirale d'un tour
par cercle, dans la même pierre peinte.

### Montées en grade du stagiaire

> Grades de `boutique-README.md` (« Déblocage par la hiérarchie du stagiaire »). Le grade est acquis quand le boss du cercle indiqué est battu **et** le prix payé. Les lignes s'insèrent dans le dialogue de réussite du cercle, juste avant l'annonce du cercle suivant ; à partir de là le nom du démon change dans les bulles et le HUD affiche « Coach : {grade} ». Textes dans `texts.ts` (`DEMON_RANKS`), assemblage dans `demon.ts`. Chaque grade ouvre des types de paris (`economy.betUnlockLevel`, tableau dans `boutique-README.md`) ; les `×{…}` sont remplacés par les cotes de la config. Aucun effet sur la boutique pour l'instant.

* Rang 1 — **Assistant** (après le cercle 1), bulles « Démon assistant » :
  * Démon : `Et… j'ai une nouvelle. Charon a signé un papier : je suis assistant. Assistant ! Mon premier grade en trois siècles de stage.`
  * Joueur : `Félicitations. Ça change quoi ?`
  * Démon : `Pour moi, une chaise avec un dossier. Pour vous, deux tickets de plus au guichet : « Deux âmes dans le top 3 » à ×{twoInTop3}, et « Top 3 dans le désordre » à ×{podiumAnyOrder}. Un assistant a le droit de prendre des paris combinés.`
* Rang 2 — **Tourmenteur** (après le cercle 3), bulles « Démon tourmenteur » :
  * Démon : `Pendant que Cerbère cherchait sa balle, on m'a remis un grade : tourmenteur. Deuxième échelon.`
  * Démon : `J'ai le droit de tourmenter, maintenant. Officiellement. Je vais commencer par mon ancien chef de service.`
  * Joueur : `Et moi, je suis sur la liste ?`
  * Démon : `Vous ? Vous me rapportez trop. Tant que vous gagnez, je ne tourmente que vos adversaires.`
  * Démon : `Et j'ai un tampon de plus : le pari « Vainqueur + dernier » vous est ouvert. ×{winnerAndLast} si vous lisez les deux bouts de la course.`
* Rang 3 — **Contremaître** (après le cercle 5), bulles « Démon contremaître » :
  * Démon : `Phlégyas a rendu mon évaluation. Contremaître. J'ai une équipe, un bureau, une fenêtre sur la lave.`
  * Démon : `Un contremaître, ça ne coache plus dans son coin : on me regarde. Alors ne me faites pas honte au sixième.`
  * Joueur : `C'est vous qui parlez de honte ?`
  * Démon : `Je parle d'image de marque. Mon nom est sur votre dossier, maintenant. En gros.`
  * Démon : `En échange, un contremaître peut ouvrir le guichet du « Podium exact » : trois âmes, dans l'ordre, ×{podiumExact}. Le genre de ticket qui change une évasion.`
* Rang 4 — **Sous-directeur** (après le cercle 7), bulles « Démon sous-directeur » :
  * Démon : `Sous-directeur. Le Minotaure a insisté lui-même. Il paraît que je « fais monter les enjeux ».`
  * Démon : `Deux échelons sous le boss du neuvième. Il n'y a jamais eu de stagiaire aussi haut. Il n'y a jamais eu de parieur aussi loin non plus.`
  * Joueur : `On est liés, alors.`
  * Démon : `Par un pacte, oui. Ne l'oubliez pas. Moi, je ne l'oublierai pas.`
  * Démon : `Et le grand livre s'ouvre : le « Classement complet exact », ×{fullRankingExact}. Personne ne l'a jamais touché. Ce serait amusant que ce soit contre moi.`
* Rang 5 — **Boss du neuvième** (après le cercle 8) : pas de lignes propres, le texte du cercle 8 (« on m'a promu. Je dirige le neuvième ») fait office de promotion ; bulles « Le stagiaire promu » au cercle 9.

### Prix et âmes par cercle (config `run.circles`)

| Cercle | Prix | Âmes |
|---:|---:|---:|
| 1 Limbes | 200 | 5 |
| 2 Luxure | 280 | 6 |
| 3 Gourmandise | 380 | 6 |
| 4 Avarice | 500 | 7 |
| 5 Colère | 640 | 7 |
| 6 Hérésie | 800 | 8 |
| 7 Violence | 1000 | 8 |
| 8 Fraude | 1250 | 9 |
| 9 Trahison | 1500 | 10 |

# Direction Artistique

```
Une peinture numérique conceptuelle à coups de pinceau larges et visibles, avec une atmosphère brumeuse et éthérée. L'éclairage est dramatique et théâtral, créant de forts contrastes chromatiques, comme du feu chaud contre de la roche bleutée froide. Le rendu est expressionniste et texturé, comme un speed painting concept art.
```

Peinture numérique (Digital Painting) / Speed painting : Le rendu imite la peinture traditionnelle avec des coups de pinceau (brushstrokes) très marqués, texturés et assumés. On sent le geste de l'artiste.

Concept Art : C'est un style très utilisé dans la préproduction de films ou de jeux vidéo pour poser rapidement une ambiance, une échelle ou un univers sans s'attarder sur les micro-détails.

Atmosphérique et immersif : Il y a une forte utilisation de la perspective atmosphérique (les éléments lointains sont fondus dans la brume, la fumée ou la lumière). Cela crée beaucoup de profondeur.

Lumière dramatique (Chiaroscuro / Contraste) : Les éclairages sont très forts et théâtraux. Dans la première image, c'est le contraste chaud/froid (feu contre roche bleutée).

Paysage épique (Epic Landscape) / Stylisé : L'échelle est gigantesque par rapport au personnage (le "Scale reference"), ce qui donne un sentiment d'immensité et d'écrasement. Les formes (roches, ruines) sont taillées à la serpe, assez brutes et géométriques.