# Vocabulaire de l'interface — référence de traduction

**Jeu :** *Sinner's Bet* (Proto4). **Langue source :** français.
**À qui s'adresse ce document :** aux traductrices et traducteurs qui vont porter
l'interface dans une autre langue, et aux relecteurs qui valideront leur travail.

Le français du jeu emploie beaucoup de mots courants dans un sens **spécialisé**
(courses hippiques, jeu de dés, enfer de Dante). Traduits au premier sens du
dictionnaire, ils produisent des contresens. Chaque entrée ci-dessous donne donc :

| Colonne | Contenu |
| --- | --- |
| **Terme** | le mot ou l'expression tel qu'il apparaît à l'écran |
| **Sens dans le jeu** | ce qu'il désigne réellement |
| **Note de traduction** | le piège à éviter, et un pivot anglais quand il lève l'ambiguïté |

Le pivot anglais n'est **pas** une traduction officielle : c'est une béquille de
désambiguïsation. Traduisez depuis le français.

> **Où vivent ces chaînes.** Tout l'affichage est regroupé dans un fichier par
> langue, `Proto4Html/src/presentation/texts/<langue>.ts` — le français
> (`fr.ts`) est la référence, l'anglais (`en.ts`) le premier traduit. Les noms
> collés aux nombres (âmes, cercles, boss, pouvoirs, terrains, objets de
> boutique) restent dans `Proto4Html/config/race.json` et
> `Proto4Html/config/shop.json` ; leur traduction est une simple couche de mots,
> `Proto4Html/config/i18n/<langue>.json`.
>
> Le mode d'emploi complet — ce qu'il faut créer, ce que le compilateur vérifie
> tout seul, ce qui reste à la charge du traducteur — est dans
> [i18n.md](i18n.md).

---

## 0. À lire avant de traduire une seule ligne

### 0.1 L'univers

Le joueur est **mort** et se retrouve en enfer. Un **démon stagiaire**, employé
de bureau blasé de l'administration infernale, lui propose un pacte : parier sur
des **courses d'âmes damnées** pour réunir de quoi payer son passage, et remonter
ainsi les **neuf cercles** de l'enfer de Dante. Le registre est celui de la
**bureaucratie infernale** et du **champ de courses** (PMU, hippodrome, guichet de
paris) : gardez ce croisement, c'est l'identité du jeu.

### 0.2 Les âmes sont des hommes, mais le mot est féminin

Les concurrentes de la course s'appellent **Homère, Virgile, Aristote, Platon,
Socrate, Ovide, Sénèque, Euclide, Cléo, Lucain, Hippocrate, Ptolémée** — des
figures historiques masculines. Mais l'interface ne les désigne jamais autrement
que par le mot **« âme »**, qui est féminin en français. D'où partout :
« l'âme qui s'y arrête », « une âme percutée », « la première », « une coureuse ».

**Conséquence :** dans une langue genrée, ne calquez pas le féminin français si
votre mot pour « âme » n'est pas féminin, et ne basculez pas au masculin sous
prétexte que les personnages sont des hommes — accordez avec **votre** mot.

### 0.3 Le tutoiement / vouvoiement est incohérent dans la source

Le jeu vouvoie le joueur presque partout (HUD, aide, dialogues, paris), **mais
tutoie** dans trois endroits : la boutique (`SHOP.emptyState`), la collection
(`COLLECTION.*`) et la révélation de fin de cercle (`UNLOCK.*`).
C'est un défaut de la version française, pas une intention.

**Consigne :** **unifiez sur le registre de politesse distant / formel** (l'équivalent du
vouvoiement) dans toute votre langue cible. Le démon est familier de ton mais
c'est un guichetier qui s'adresse à un dossier, pas un ami.

### 0.4 Symboles et gabarits à ne pas traduire

| Élément | Rôle | Consigne |
| --- | --- | --- |
| `¤` | symbole monétaire du jeu (les **pièces**) | à conserver tel quel, c'est un glyphe, pas une abréviation |
| `×` | multiplicateur de cote (« ×3,5 ») | signe multiplication U+00D7, pas la lettre `x` |
| `{n}`, `{price}`, `{stake}`, `{rank}`… | valeurs insérées à l'exécution | **ne jamais traduire ni renommer la clé** ; on peut la déplacer dans la phrase |
| `{s}` | marque de pluriel française (voir ci-dessous) | traitement particulier, lire §0.5 |
| `«` `»` | guillemets français | remplacez par les guillemets de votre langue |
| `⚠` `⛓️` `🎲` `💥` `🛤️` `🏁` `🎫` `💰` `🛒` `👑` `😈` | pictos décoratifs | à conserver |
| `¤` `✷` `▲` | marques de cases spéciales sur le plateau (payante / piège / tremplin) | à conserver, ce sont des icônes |
| `»` `⚿` `↺` | boutons Élan / Verrou / Revoir | à conserver |
| `3,5` `1,5` | décimales à la **virgule** française | adaptez au séparateur de votre langue |

### 0.5 Le piège du `{s}`

Des phrases comme `'{n} couloir{s}'` ou `'recule de {n} case{s}'` reçoivent dans
`{s}` un `s` ou une chaîne vide, calculé par la fonction `plural(n)` :
**`s` si n > 1, rien sinon** (règle française : zéro et un restent au singulier).

Ce mécanisme ne survit pas à la plupart des langues (pluriels multiples du russe
ou du polonais, absence de pluriel du japonais, pluriel dès 2 en français contre
dès 2 mais avec « 0 » pluriel en anglais…).

**Consigne :** signalez chaque chaîne contenant `{s}`. Ne cherchez pas à la faire
entrer de force dans le gabarit ; ces chaînes demandent une adaptation du code
(pluralisation par langue) et doivent remonter à l'équipe technique. Elles sont
listées en annexe A.

---

## 1. Structure de la partie

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Évasion** | **La partie entière**, du premier cercle jusqu'à la sortie ou la mort définitive. « Commencer une nouvelle évasion » = démarrer une nouvelle partie. | Pivot : *run* / *escape attempt*. Pas une évasion de prison au sens littéral, mais bien la remontée hors de l'enfer. Le mot revient dans « dans cette évasion comme dans les suivantes » = d'une partie à l'autre. |
| **Cercle** | Un **niveau** du jeu. Les neuf cercles de l'enfer de Dante, puis des cercles inventés au-delà. Chaque cercle contient 3 courses et se termine par un péage. | Pivot : *circle (of Hell)*. Référence dantesque explicite : utilisez le terme consacré par la traduction de *L'Enfer* dans votre langue. Ni « cercle » au sens géométrique, ni « cercle » au sens de club. |
| **Course** | Une **manche** : une course d'âmes sur la piste. Trois par cercle. | Pivot : *race*. Course au sens sportif/hippique. Jamais « faire les courses » (achats), jamais « parcours ». |
| **Course du boss** | La **troisième et dernière** course du cercle, disputée contre le boss du cercle, qui applique son pouvoir. | Pivot : *boss race*. |
| **Tour** | Un **round** de la course : on lance les dés, on associe, on ordonne, on résout, puis l'adversaire joue. | Pivot : *turn*. Ni « tour » (tower), ni « tour » (excursion), ni un tour de piste. |
| **Tentative** | Une évasion terminée, comptée dans les statistiques. | Pivot : *attempt / run*. |
| **Prix du cercle** | La somme à payer **à la fin du cercle** pour monter au suivant. 150 pièces au premier, croissant ensuite. Ne pas la réunir = fin de partie. | Pivot : *exit price / toll*. C'est un **péage**, pas le prix d'un objet ni une récompense. |
| **Punition éternelle** | L'écran de **game over** : le joueur n'a pas pu payer le prix du cercle. | Pivot : *game over*. |
| **Évasion** *(écran de fin)* | L'écran de **victoire** : neuf cercles franchis. | Même mot qu'en §1 ligne 1 : le titre de l'écran de victoire est aussi « Évasion ». |
| **Monter** | Passer au cercle suivant (on remonte, l'enfer descend). | Attention au sens directionnel : dans Dante on **remonte** vers la sortie. |

---

## 2. Personnages

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Démon stagiaire** / **le stagiaire** | Le personnage principal non-joueur : un démon **en stage**, employé subalterne de l'administration infernale, qui coache le joueur et tient le guichet de paris. Personnage comique, blasé, arriviste. | Pivot : *intern demon*. « Stagiaire » = stagiaire en entreprise (intern/trainee), **pas** un stagiaire militaire ni un apprenti artisan. Le comique tient à ce décalage bureaucratique : préservez-le. |
| **Grade** | Le **rang hiérarchique** du stagiaire, qui monte quand le joueur réussit. Chaque grade **débloque de nouveaux types de paris**. Six grades : Stagiaire → Assistant → Tourmenteur → Contremaître → Sous-directeur → Boss du neuvième. | Pivot : *rank / grade (in a hierarchy)*. Jamais une note scolaire, jamais un grade militaire. Registre : **organigramme d'entreprise**. |
| **Assistant** | Grade 1, obtenu après 2 cercles. | Registre bureau. |
| **Tourmenteur** | Grade 2. Celui qui **tourmente** les damnés — c'est une fiche de poste. | Pivot : *tormentor*. |
| **Contremaître** | Grade 3. Chef d'équipe d'atelier / de chantier. | Pivot : *foreman*. |
| **Sous-directeur** | Grade 4. Cadre supérieur. | Pivot : *deputy director*. |
| **Coach** | Étiquette du HUD (« Coach : {rank} ») : le rôle du stagiaire auprès du joueur. | Pivot : *coach*. Vocabulaire sportif volontairement plaqué sur un démon. |
| **Boss du cercle** / **le boss** | L'adversaire de la 3ᵉ course de chaque cercle. Aussi le **supérieur hiérarchique** du stagiaire — le double sens est intentionnel. | Pivot : *boss* (jeu vidéo **et** patron). Si votre langue distingue les deux, choisissez le mot « patron/chef » : le jeu s'appuie sur le sens hiérarchique. |
| **Pouvoir** | La règle spéciale que le boss applique pendant sa course. | Pivot : *power / special rule*. Pas un pouvoir politique. |
| **Âme** / **âme damnée** | Une **concurrente** de la course. Voir §0.2 pour le genre. | Pivot : *soul (as a racer)*. C'est le « cheval » du jeu : pensez champ de courses. |
| **Coureuse** | Synonyme d'âme, employé une fois dans l'aide. | Pivot : *runner / racer*. |
| **Adversaire** | La **maison** : l'entité qui lance sa propre paire de dés à la fin de chaque tour, contre le joueur. Pas un autre joueur humain. | Pivot : *the opponent (the house)*. |
| **Vous** | Le joueur, dans les bulles de dialogue. | Étiquette du locuteur au-dessus de la bulle. |

---

## 3. La piste et le plateau

C'est ici que se concentrent les contresens les plus probables.

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Piste** | Le **terrain de course** sur lequel avancent les âmes : une grille de cases. | Pivot : *racetrack*. Ni piste de danse, ni piste d'aéroport, ni piste (indice), ni sentier. |
| **Couloir** | ⚠️ **Une des files parallèles de la piste**, exactement comme les couloirs d'une piste d'athlétisme ou d'un bassin de natation. De 1 (cercle 1) à 6 (cercle 9). Changer de couloir ne fait **ni avancer ni reculer**. | Pivot : **lane** (athletics / swimming). **Jamais** le couloir d'une maison ou d'un immeuble (*hallway, corridor*), jamais un couloir aérien. C'est **le** faux ami numéro un du document. Utilisez le mot que votre langue emploie pour les lignes d'un stade. |
| **Colonne** | ⚠️ **La position le long de la piste**, de la colonne 0 (départ) à la dernière. **C'est la colonne qui dit qui est devant**, pas le couloir. | Pivot : *column / position along the track*. Pas une colonne de tableau ni une colonne d'architecture — c'est un **repère de distance parcourue**. |
| **Case** | Une **case du plateau** : l'intersection d'une colonne et d'un couloir, où une âme peut se tenir. | Pivot : *square / space (on a board)*. Jamais « caisse », jamais « boîte », jamais « cas ». Vocabulaire de **jeu de plateau**. |
| **Départ** / **Ligne de départ** | La colonne 0. On ne peut pas reculer au-delà : l'âme y reste sur place. | Pivot : *start line*. |
| **Arrivée** / **Ligne d'arrivée** | La colonne finale. **Une fois franchie, le tour se termine quand même** : le classement n'est établi qu'après. | Pivot : *finish line*. |
| **Franchir l'arrivée** | Dépasser la ligne. Franchir en premier ne garantit **pas** de finir premier. | Pivot : *to cross the finish line*. Nuance centrale du jeu. |
| **Seuil de pari** | La colonne à **60 %** du parcours. Dès qu'une âme la dépasse, **on ne peut plus parier** sur cette course. | Pivot : *betting cutoff / betting threshold*. Pas un seuil de porte, pas un seuil au sens statistique. |
| **Zone de fin** | Les cases **à partir du seuil de pari**, où le guichet est fermé. | Pivot : *closed zone*. |
| **Plus de pari** *(étiquette)* | Marqueur affiché sur le seuil quand le guichet s'est fermé. | Lire « il n'est plus possible de parier », pas « davantage de paris ». **Ambiguïté réelle en français** : levez-la dans votre langue. |
| **Case bloquée** | Une case où **aucune âme ne peut s'arrêter** (éboulis, chaînes…). Crée des embouteillages. | Pivot : *blocked square*. |
| **Case payante** | Case spéciale : l'âme qui **s'y arrête** rapporte des pièces au joueur, à condition qu'il ait un pari ouvert sur elle. Marque `¤`. | Pivot : *paying / gold square*. « Payante » = qui rapporte de l'argent, pas « à péage ». |
| **Piège** | Case spéciale : l'âme qui **s'y arrête recule** de n cases. Marque `✷`. | Pivot : *trap square*. |
| **Tremplin** | Case spéciale : l'âme qui **s'y arrête avance** de n cases de plus. Marque `▲`. | Pivot : *boost / springboard*. Objet de gymnastique ou de saut à ski, employé au figuré. |
| **S'y arrête** | Formule cruciale : les cases spéciales n'agissent **que sur l'âme qui termine son déplacement dessus**, jamais au passage. | Traduisez sans ambiguïté : *lands on*, pas *passes over*. |
| **Tribune infernale** | Objet posé par le joueur sur une case libre : l'âme qui s'y arrête le paie et repart poussée. | « Tribune » = **gradins de spectateurs** d'un stade, pas une tribune de presse ni une tribune d'opinion. |
| **Terrain** | La **variante de piste** tirée au sort au départ de chaque course : quelles cases sont bloquées, quelles cases sont spéciales. Chaque cercle a ses terrains, avec des noms propres (« La plaine grise », « Rafale basse », « Fondrières »…). | Pivot : *track variant / layout*. Pas « terrain » au sens de parcelle. |
| **Percuter** | ⚠️ Une âme qui **avance** sur une case occupée la percute et **saute devant elle** — le percuteur gagne une case de plus. C'est souvent le meilleur coup du tour. | Pivot : *to ram (and leapfrog)*. Le percuteur est **avantagé**, pas pénalisé : le mot ne doit pas évoquer un accident subi. |
| **Échanger** | Une âme qui **recule** sur une case occupée **échange sa place** avec elle. | Pivot : *to swap places*. Pas un échange commercial ni un échange de paroles. |
| **Détour** / **se rabattre** | La case visée est bloquée ou occupée : l'âme se **décale sur un autre couloir de la même colonne**, le plus **bas** d'abord. Elle n'avance ni ne recule pour autant. | Pivot : *to sidestep into another lane*. « Se rabattre » est un terme de **conduite automobile** (changer de file) — c'est cette image. |
| **Le bas** / **le couloir le plus bas** | Le couloir le plus **proche du joueur** à l'écran (couloir 0). Il est prioritaire : il **départage les ex æquo** et reçoit les âmes qui se rabattent. | Pivot : *lowest lane*. « Bas » = position à l'écran, pas une qualité morale. |
| **Départage** | La règle qui tranche entre deux âmes à colonne égale : **le couloir le plus bas passe devant**. « Jamais d'ex æquo en enfer. » | Pivot : *tiebreaker*. |
| **Ex æquo** | Deux âmes à égalité — situation qui n'existe pas dans le classement final. | Locution latine ; utilisez l'équivalent local. |
| **Embouteillage** | Amas d'âmes bloquées, provoqué par les cases bloquées. | Pivot : *traffic jam*. Image routière assumée. |
| **Jeton** *(sur le plateau)* | Le **pion coloré** qui représente une âme sur la piste. Une couleur par âme. | ⚠️ Le même mot désigne aussi les **jetons de mise** (§5). Si votre langue a deux mots (pion / jeton de casino), **utilisez-les tous les deux** : le français ne distingue pas, mais rien n'oblige à reproduire la confusion. |

---

## 4. Les dés et les combinaisons

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Dé** | Dé à jouer. | Pivot : *die / dice*. |
| **Dé Distance** | Dé qui donne **de combien** on avance : faces −1, 1, 2, 3. Le joueur en lance **deux** par tour. | Pivot : *Distance die*. La majuscule marque le nom du type : gardez une majuscule ou un équivalent typographique. |
| **Dé Âme** | Dé qui désigne **quelle âme** bouge : une face par concurrente, à la couleur de l'âme. Le joueur en lance **trois** — il y en aura donc toujours un d'inutilisé. | Pivot : *Soul die*. |
| **Face** | Une **face de dé** (la valeur inscrite sur un côté). Aussi la matière première de la forge : « Face limée », « Face dorée », « Face de bond ». | Pivot : *die face*. Jamais un visage, jamais un côté au sens « aspect de la question ». |
| **Lancer les dés** | Action de base du tour ; touche **Espace**. | Pivot : *to roll*. |
| **Associer** | **Coller un dé Âme sur un dé Distance** pour former une combinaison. | Pivot : *to pair*. Pas « associer » au sens de s'associer avec quelqu'un. |
| **Combinaison** | Le résultat de l'association : « Platon avance de +2 ». Résolue dans l'ordre choisi par le joueur. | Pivot : *pairing / combination*. Pas une combinaison de vêtements, pas un code de coffre-fort. |
| **File de combinaisons** | La **liste ordonnée** des combinaisons en attente de résolution. | Pivot : *queue*. File d'attente, pas une lime ni un fichier. |
| **Carte** *(n° dans la file)* | Chaque combinaison de la file est affichée comme une **carte** (élément d'interface). « cumulé dans la carte n°{n} ». | ⚠️ Rien à voir avec la **carte des cercles** (§8) ni avec une carte à jouer. Ici : une **fiche / vignette** d'interface. Choisissez un mot différent de celui de la carte des cercles si votre langue le permet. |
| **Ordonner** | **Choisir l'ordre de résolution** des combinaisons. L'aide insiste : c'est gratuit et c'est le coup le plus fort du jeu. | Pivot : *to order / to sequence*. Jamais « donner un ordre » (commander), jamais « ranger » au sens de faire le ménage. |
| **Résoudre** | Appliquer les combinaisons une à une, puis subir la paire de l'adversaire. | Pivot : *to resolve*. Vocabulaire de jeu de plateau. |
| **Dissocier** | Défaire une combinaison : les deux dés redeviennent disponibles. | Pivot : *to unpair*. |
| **Cumul** / **cumulé** | Deux dés Distance sur la **même** âme : les distances s'additionnent en un seul bond. | Pivot : *stacked / combined*. |
| **Prévisualisation** / **aperçu** | Le **fantôme** qui montre où l'âme atterrira si l'on résout maintenant. | Pivot : *preview / ghost*. |
| **Étapes du tour** / **phases** | La frise : **préparer · lancer · ordonner · résoudre · adversaire**. | Pivot : *turn steps*. Ces cinq mots sont des **verbes à l'infinitif** en français — un registre d'étiquette neutre ; adaptez à la convention de votre langue (substantifs, impératifs…). |
| **Réinitialiser** | Vider la file de combinaisons pour tout recommencer. | Pivot : *reset*. |
| **Charge** | Le **nombre d'utilisations restantes** d'un objet limité (« 2 charges »). | Pivot : *use / charge (remaining uses)*. Pas une charge électrique, pas une charge de cavalerie, pas une charge financière. |
| **Relancer** | Relancer un dé (objet Élan, Relance jumelle). | Pivot : *to reroll*. |
| **Verrou** | Garder un dé sur sa face pour le prochain lancer (objet *Verrou de Minos*). | Pivot : *to lock a die*. |

---

## 5. Les paris

Champ lexical **des courses hippiques et du guichet de paris**. Tenez-le.

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Pari** | Le fait de miser sur un résultat de course. Aussi le nom de la **première étape** du HUD. | Pivot : *bet / wager*. |
| **Parier** | Poser un pari. | Pivot : *to bet*. |
| **Poser un pari** | Formule de validation (« Poser le pari »). | Pivot : *to place a bet*. Geste physique de poser le ticket sur le comptoir. |
| **Ticket** | Le **bulletin de pari** : un type de pari + les âmes désignées + la mise. « Trois familles de tickets », « gros tickets ». | Pivot : *betting slip*. Pas un ticket de caisse, pas un ticket de support, pas un billet de transport. |
| **Guichet** | Le **comptoir de paris** du stagiaire, métaphore filée. « Le guichet est fermé », « ouvrir le guichet du Podium exact », « du bon côté du guichet ». | Pivot : *betting window / counter*. Le guichet d'une gare ou d'un bureau de poste, pas un distributeur automatique. |
| **Mise** | La **somme engagée** sur un ticket. Débitée immédiatement. | Pivot : *stake*. Pas une mise en scène, pas une mise à jour. |
| **Miser** | Engager une somme. | Pivot : *to stake / to wager*. |
| **Misé en course** | Total des mises actuellement engagées sur la course en cours. | Pivot : *staked in this race*. |
| **Jeton de mise** | Le **jeton de casino** qu'on glisse dans le logement pour choisir le montant de la mise (5, 10, 20, 50…). | ⚠️ Voir §3 « Jeton » : le plateau utilise aussi ce mot pour les pions des âmes. |
| **Logement** / **emplacement d'âme** | Les **cases vides du ticket** où l'on dépose les âmes désignées (une, deux ou trois selon le type de pari). | Pivot : *slot*. Pas un logement au sens habitation. |
| **Désigner une âme** | Choisir l'âme sur laquelle porte le pari, en cliquant sur le plateau ou dans la liste. | Pivot : *to pick*. |
| **Cote** | Le **multiplicateur de gain** d'un pari (« ×3,5 »). ⚠️ La cote **fond à mesure que la course avance** : parier tard, c'est parier sûr, donc parier petit. | Pivot : *odds*. Faux ami redoutable : ni « côte » (rivage/côtelette), ni une cote de popularité, ni une cotation boursière. C'est la **cote d'un cheval**. |
| **Multiplicateur** | Synonyme technique de la cote. | Pivot : *multiplier*. |
| **Gain potentiel** | Ce que rapporterait le ticket s'il gagnait, **net de la mise**. | Pivot : *potential payout*. |
| **Gains** | Nom de la **quatrième étape** du HUD : l'écran de règlement des paris après la course. | Pivot : *payouts / winnings*. Au pluriel : l'argent gagné, pas un gain de temps. |
| **Net de la course** | Le solde de la course : gains moins mises. Peut être négatif. | Pivot : *net result*. |
| **Solde** | ⚠️ **L'argent disponible** du joueur. | Pivot : *balance (of an account)*. **Jamais** « solde » au sens de rabais/promotion (*sale*), ni la solde d'un soldat. Terme **bancaire**. |
| **Solde après mise** | Ce qu'il restera une fois le ticket payé. | Pivot : *balance after stake*. |
| **Retirer** | **Annuler un pari** et se faire rembourser la mise, tant que la course n'est pas lancée. | Pivot : *to cancel / to withdraw a bet*. Pas « retirer » au sens de retirer de l'argent d'un distributeur, ni d'enlever un vêtement. |
| **Bilan des paris** | Le récapitulatif de fin de course : quels tickets ont payé. | Pivot : *bet settlement*. |
| **Remboursé** | Mise rendue (objet *Livre des comptes*). | Pivot : *refunded*. |
| **En bonne voie** / **compromis** | État **provisoire** d'un pari pendant la course, d'après les positions actuelles. | Pivot : *on track* / *at risk*. « Compromis » ici = **mal parti**, pas un accord négocié. Ambiguïté réelle : levez-la. |
| **Provisoire** | Rappel que seul le classement final compte. | Pivot : *provisional*. |
| **Verrouillé** | Type de pari **non encore accessible** : il demande un grade supérieur du stagiaire. | Pivot : *locked*. |
| **Seuil de pari** | Voir §3. | |

### 5.1 Les dix types de paris

Ce sont des **noms de tickets**. Ils apparaissent tels quels au guichet.

Les cotes citées ci-dessous sont celles de `config/race.json` au 18 septembre 2026 ;
la source de vérité reste la config, jamais ce tableau.

| Terme | Sens exact | Note de traduction |
| --- | --- | --- |
| **Simples** | Famille 1 : un seul nom d'âme sur le ticket. | Pivot : *simple / straight bets*. |
| **Combinés** | Famille 2 : deux ou trois âmes sur le même ticket. | Pivot : *combination bets*. Terme consacré des paris sportifs. |
| **Avancés** / **gros tickets** | Famille 3 : les paris à très gros multiplicateur, débloqués tard. | Pivot : *advanced / big-ticket bets*. |
| **Vainqueur pur** | L'âme termine **première**. ×2,2 | « Pur » = sans condition annexe, le pari le plus simple. Pivot : *straight win*. |
| **Top 3** | L'âme termine **dans les trois premières**. ×1,5 | Pivot : *place / top 3*. L'anglicisme « Top 3 » est employé tel quel en français : décidez s'il passe dans votre langue. |
| **Pas dans le top 3** | L'âme **ne** termine **pas** dans les trois premières. ×1,35 | Attention à la négation, qui porte sur tout le groupe. |
| **Dernière place** | L'âme termine **dernière**. ×1,65 | Pivot : *last place*. |
| **Top 3 dans le désordre** | Trois âmes désignées occupent les trois premières places, **dans n'importe quel ordre**. ×3,4 | « Dans le désordre » = *in any order*, **pas** « en pagaille ». |
| **Deux âmes dans le top 3** | Les deux âmes désignées terminent toutes deux dans les trois premières. ×2,05 | |
| **Duel** | La première âme désignée termine **devant** la seconde. Emplacements : **devant** / **derrière**. ×1,35 | Pivot : *head-to-head / match bet*. Pas un duel au pistolet. |
| **Podium exact** | Les trois premières places **dans cet ordre exact**. Emplacements : **1re / 2e / 3e**. ×22 | Pivot : *exact trifecta*. « Podium » au sens sportif des trois premiers. |
| **Vainqueur + dernier** | Le premier **et** le dernier, exactement. Emplacements : **vainqueur** / **dernier**. ×3,15 | |
| **Classement complet exact** | **Toutes** les positions finales dans l'ordre exact. ×80 | Le pari mythique, débloqué au dernier grade. |
| **Devant** / **derrière** | Étiquettes des deux emplacements du Duel. | Position dans la course, pas dans l'espace physique. |
| **1re / 2e / 3e** | Ordinaux abrégés (première, deuxième, troisième). | Abréviations françaises avec exposant : adaptez à votre langue (*1st, 2nd, 3rd*…). |

---

## 6. L'argent

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Pièce** | L'unité monétaire, symbole `¤`. | Pivot : *coin*. Pas une pièce de théâtre, pas une pièce d'un logement, pas une pièce détachée. |
| **Avance** | Les pièces que le stagiaire **prête sans contrepartie avant chaque course** (20 au cercle 1, croissant ensuite). C'est le revenu de base qui permet de repartir après avoir payé un cercle. | Pivot : *advance / allowance*. « Avancer de l'argent » = en prêter d'avance. Pas une avance au sens de progression, pas une avance amoureuse. |
| **Jauge** | La **barre** en haut de l'écran qui montre en permanence : solde · misé en course · prix du cercle. | Pivot : *gauge / meter*. |
| **Marge de jeu** | Ce qui dépasse le prix du cercle : l'argent qu'on peut se permettre de risquer. | Pivot : *headroom*. |
| **Prix du cercle couvert** | Le joueur a déjà de quoi payer le péage. | Pivot : *covered*. |
| **Argent gagné / dépensé** | Compteurs de l'écran Statistiques. | |
| **Dette infernale** | Le **marché proposé** quand le prix du cercle est hors d'atteinte : le stagiaire avance la somme manquante, **une seule fois**, et le prix du cercle suivant augmente d'autant d'intérêts. | Pivot : *infernal debt*. « Infernal » = de l'enfer (sens propre) **et** exténuant (sens figuré) : le double sens est voulu. |
| **Emprunter** | Accepter la dette. | Pivot : *to borrow*. |
| **Intérêts** | Le surcoût du cercle suivant. | Pivot : *interest*. Sens **financier**, jamais « intérêt » au sens de curiosité. |
| **Registre** / **Livre des comptes** | Le **grand livre comptable** du stagiaire. Aussi le nom d'un artefact. | Pivot : *ledger*. Pas un registre au sens de niveau de langue, pas un registre informatique. |

---

## 7. La boutique, la forge et les objets

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Boutique** | L'échoppe du stagiaire, ouverte **entre les paris et la course**, une fois le premier pari posé. Aussi le nom de la **deuxième étape** du HUD. | Pivot : *shop*. |
| **Caisse** | Le tiroir-caisse du stagiaire. « Il n'ouvre pas la caisse aux indécis », « un stagiaire qui monte en grade a plus de caisse ». | Pivot : *till / cash*. Jamais une caisse en bois, jamais une caisse (voiture, argot). |
| **Vitrine** | Les objets **actuellement proposés** à l'achat. « Renouveler la vitrine » = tirer un nouvel assortiment contre paiement. | Pivot : *shop offer / display*. La vitrine d'un magasin. |
| **Rayon** | Le **catalogue complet** des objets disponibles dans le jeu. « {n} objets sur {total} en rayon ». | Pivot : *stock / catalogue*. Le rayon d'un supermarché, **jamais** un rayon lumineux ni un rayon de roue ni un rayon de cercle. |
| **Réserve** | L'arrière-boutique où dorment les objets encore scellés. | Pivot : *back room / storeroom*. |
| **Scellé** / **descellé** | Un objet **scellé** n'est pas encore entré dans le catalogue : on ne connaît même pas son nom. Chaque cercle payé en **descelle** un, **définitivement, pour toutes les parties à venir**. | Pivot : *sealed / unsealed (permanently unlocked)*. Image du **sceau de cire** sur un document officiel. « Desceller » = briser le sceau, pas descendre ni desserrer. |
| **Collection** | L'écran qui montre les objets descellés, d'une partie à l'autre. | Pivot : *collection*. |
| **Artefact** | Objet à **effet permanent** pour toute la partie, occupant un **emplacement**. Les emplacements sont limités : acheter quand ils sont pleins **détruit** l'artefact sacrifié. | Pivot : *artifact / relic*. |
| **Emplacement** | Une des places d'artefact disponibles. | Pivot : *slot*. |
| **Sacrifier** | Détruire un artefact pour libérer son emplacement, **sans remboursement**. | Pivot : *to sacrifice / destroy*. |
| **Dé spécial** | Objet qui **remplace un dé Distance** par un dé aux faces différentes (Dé des Limbes, Dé de Glace…). | Pivot : *special die*. |
| **Forge** | Le service qui **modifie une face d'un dé**, une seule, **et pour toujours**. | Pivot : *forge (a smithy service)*. Pas « forger » au sens de falsifier. |
| **Face forgée** | Une face modifiée à la forge. Un dé ne peut pas en porter plus d'un certain nombre. | |
| **Atelier** | L'espace où l'on **défait** ce qu'on possède : revendre un artefact, décaper une face forgée. | Pivot : *workshop*. |
| **Décaper** | **Annuler une face forgée** : elle retrouve sa valeur d'origine, contre paiement. Terme de menuiserie/peinture (retirer les couches). | Pivot : *to strip (a modification)*. Jamais « décapiter », jamais « décaler ». |
| **Revendre** | Rendre un artefact contre **40 %** du prix du cercle ; l'emplacement se libère. | Pivot : *to sell back*. |
| **Impact** | Puissance annoncée de l'objet : **faible · moyen · fort · extrême**. | Pivot : *impact / power level*. Pas un impact au sens de choc. |
| **Sûr** | Étiquette de risque : **sans contrepartie**, impact au plus moyen. | Pivot : *safe*. |
| **Ambitieux** | Étiquette de risque : impact fort ou extrême, change la façon de jouer le cercle. | Pivot : *bold*. Pas « ambitieux » au sens de carriériste. |
| **Danger ⚠** | Étiquette de risque : l'objet a une **contrepartie** explicite, affichée en rouge. Demande une confirmation d'achat. | Pivot : *danger*. |
| **Contrepartie** | Le prix caché d'un objet dangereux, toujours annoncé. « En enfer, au moins, les contrats sont clairs. » | Pivot : *drawback / downside*. Pas une contrepartie financière. |
| **Confirmer** | Second clic exigé pour les achats importants. | Pivot : *confirm*. |

### 7.1 Noms propres d'objets — politique

Les ~47 objets portent des noms à référence **mythologique gréco-latine et dantesque** :
*Sablier de Charon, Boussole des Limbes, Chaîne du Coccyte, Quatrième tête de Cerbère,
Verrou de Minos, Marteau d'Héphaïstos, Rabais de Ploutos, Miroir de Narcisse,
Œil du parieur, Bourse percée, Tirelire du stagiaire, Fer à cheval rouillé*…

**Consigne :** traduisez le **nom commun** (sablier, boussole, chaîne, verrou, miroir…)
et laissez le **nom propre mythologique** dans la forme consacrée de votre langue
(Charon → Charon/Caronte/Χάρων selon l'usage local). Vérifiez les référents :

- **Limbes** — le premier cercle de Dante, séjour des vertueux non baptisés. Pas « les limbes » au sens vague de « dans le flou ».
- **Coccyte** — le fleuve gelé du neuvième cercle (graphie du jeu ; la forme usuelle en français est « Cocyte »).
- **Bourse percée** — « bourse » = **le sac à monnaie**, pas la Bourse financière ni l'aide étudiante.
- **Fer à cheval rouillé** — porte-bonheur ; l'ironie tient à « rouillé ».
- **Fouet du contremaître** — voir le grade §2.
- **Denier du cercle** — le denier est une **pièce de monnaie** antique.
- **Baume du perdant** — un **onguent** consolateur.
- **Encensoir du dernier** — le brûle-encens d'église.
- **Bât de chameau** — le **bât** est la selle de charge d'une bête de somme (homophone de « bas »).
- **Pièce à deux faces** — pièce de monnaie truquée, à jouer avec §4 « Face ».
- **Face limée / dorée / retournée / explosive / de bond / miroir / feu follet / d'élan / de gel / aimant** — toutes des **faces de dé** modifiées ; le déterminant varie en français, harmonisez dans votre langue.

---

## 8. Écrans, menus et navigation

| Terme | Sens dans le jeu | Note de traduction |
| --- | --- | --- |
| **Sinner's Bet** | Le **titre du jeu**. | **Ne pas traduire.** Il est déjà en anglais dans la version française. |
| **Continuer** | Reprendre la partie sauvegardée. | |
| **Commencer une nouvelle évasion** | Démarrer une partie. | Voir §1 « Évasion ». |
| **Statistiques** | Écran de compteurs cumulés entre les parties. | |
| **Collection** | Voir §7. | |
| **Option** | Écran des réglages. ⚠️ **Au singulier dans la source** (titre et entrée de menu) — vraisemblablement une coquille pour « Options ». | Utilisez le **pluriel** de votre langue, la convention habituelle des réglages. |
| **Langue** | Réglage de langue — actuellement désactivé, « seul le français est disponible pour l'instant ». Cette ligne devra changer. | |
| **Vitesse des animations** | Réglage. | |
| **Aide** | La page de règles consultable à tout moment, sans interrompre la course. | Pivot : *help*. |
| **Les cercles** *(écran)* | La **carte des neuf cercles** : où l'on est, ce qui vient, ce qu'on a joué. C'est l'écran de sélection de course. | Pivot : *map of the circles*. ⚠️ Ne pas confondre avec la « carte » de la file de combinaisons (§4). |
| **Vous êtes ici** | Repère de position sur la carte. | |
| **Course jouée** / **prochaine course** / **à venir** | États des courses sur la carte. | « À venir » = encore verrouillée. |
| **Étapes** *(HUD)* | Les quatre temps d'une course : **Pari · Boutique · Course · Gains**. | Pivot : *steps / phases*. Distinguez-les des cinq « étapes du tour » (§4), qui sont un autre niveau. |
| **Poignée** | Onglet repliable du HUD qui résume son contenu (« Paris (2) · 30 ¤ misés »). | Pivot : *tab / handle*. Terme d'interface, pas une poignée de porte ni une poignée de main. |
| **Journal** | Le **log de la course** : ce qui s'est passé, tour par tour. | Pivot : *log*. Pas un journal intime ni un quotidien. |
| **Classement final** | L'ordre d'arrivée définitif, établi **après la résolution complète du dernier tour**. | Pivot : *final ranking*. |
| **Revoir le dernier tour** / **↺** | Rejouer visuellement le tour précédent. | Pivot : *replay*. |
| **Plateau de course** | Nom d'accessibilité de la zone de jeu. | Pivot : *race board*. Lu par les lecteurs d'écran. |
| **Âmes en course** | Nom d'accessibilité de la liste des concurrentes. | |
| **Menu développeur** | Outil de test interne (Ctrl+Maj+D). Non destiné aux joueurs. | **À ne pas traduire en priorité** — signalez-le à l'équipe si vous le rencontrez dans le lot. |
| **Mode test** | Bouton de test interne. | Idem. |
| **Raccourci clavier** | Rappel de touche. La touche de lancer est **Espace**. | Le **nom des touches** dépend du clavier local : vérifiez avec l'équipe avant de traduire « Espace ». |
| **Glisser** / **déposer** | Interaction souris (glisser-déposer). | Pivot : *drag and drop*. |

---

## 9. Les neuf cercles et leurs boss — noms propres

Ne les traduisez pas « à l'oreille » : ce sont des **noms canoniques de Dante**.
Reprenez la forme consacrée par la traduction de référence de *L'Enfer* dans
votre langue.

| # | Cercle | Sens du nom | Boss | Sens du nom |
| --- | --- | --- | --- | --- |
| 1 | **Limbes** | Séjour des vertueux non baptisés | **Charon** | Le passeur des morts sur l'Achéron |
| 2 | **Luxure** | Le péché de **chair**, pas le luxe (faux ami : *lust*, pas *luxury*) | **Minos** | Le juge qui assigne les damnés |
| 3 | **Gourmandise** | Gloutonnerie (*gluttony*, pas *gourmet*) | **Cerbère** | Le chien à trois têtes |
| 4 | **Avarice** | Cupidité et thésaurisation (*greed*) | **Ploutos** | Dieu de la richesse (à ne pas confondre avec Pluton) |
| 5 | **Colère** | Ire (*wrath*) | **Phlégyas** | Le nocher du Styx |
| 6 | **Hérésie** | (*heresy*) | **Les Furies** | Les Érinyes ; **pluriel** |
| 7 | **Violence** | (*violence*) | **Le Minotaure** | |
| 8 | **Fraude** | Tromperie (*fraud / deceit*) | **Géryon** | Le monstre à visage d'honnête homme |
| 9 | **Trahison** | (*treachery*) | **Le stagiaire promu** | ⚠️ **Le démon stagiaire lui-même**, devenu boss du neuvième : c'est la révélation finale. Traduisez « promu » au sens de **promotion professionnelle**. |

Au-delà du neuvième, le jeu continue avec des cercles inventés — **Fonds marins,
Falaise, Ville, Montagne, Ciel, Paradis** — et leurs boss : **Le Noyé, Le
Porte-chaînes, Le Guichetier, Le Givre, Le Souffle, L'Ange**.
*Le Guichetier* renvoie au **guichet de paris** (§5). *Le Givre* est le gel, pas
une personne nommée Givre. *L'Ange* est un anonyme du paradis qui descend parier
pour surveiller l'enfer — **ce n'est pas le stagiaire**, qui coache toujours le
joueur à ce cercle-là.

**Les terrains** portent aussi des noms propres, à traduire en gardant l'image
(« La plaine grise », « Rafale basse », « Rafale haute », « Bourrasques croisées »,
« Fondrières », « Bourbier bas », « Ornières »…). *Fondrière* et *ornière* sont
des **trous et sillons de chemin de terre** ; *bourrasque* et *rafale* sont des
coups de vent — cohérents avec le cercle de la Luxure, où les damnés sont emportés
par un vent éternel.

---

## 10. Formules récurrentes à traiter une fois pour toutes

Ces tournures reviennent des dizaines de fois. Fixez leur traduction **une seule
fois**, puis appliquez-la partout : leur cohérence porte la compréhension des règles.

| Formule | Ce qu'elle dit |
| --- | --- |
| « l'âme qui **s'y arrête** » | l'effet ne vaut que si le déplacement **se termine** sur la case |
| « **une fois par tour** » | limite de fréquence, à ne pas confondre avec une charge totale |
| « **pour toujours** » / « **définitivement** » | l'effet persiste au-delà de la partie en cours |
| « **dans cette évasion comme dans les suivantes** » | déblocage **méta-partie**, conservé après la mort |
| « **le tour se termine quand même** » | l'arrivée franchie n'interrompt pas le tour en cours |
| « **seul le classement final compte** » | tout affichage pendant la course est provisoire |
| « **sans remboursement** » | l'argent est perdu, pas rendu |
| « **hors départ et hors zone de fin** » | contrainte de placement de la tribune |
| « **pour vous comme pour lui** » | un pouvoir de boss symétrique, qui s'applique aussi au joueur |

---

## Annexe A — Chaînes à pluralisation dépendante de la langue

Ces chaînes contiennent `{s}`, rempli par la règle de pluriel **de la langue**
(`fmt.plural`, un par pack — voir [i18n.md](i18n.md)). Le français met un `s` à
partir de deux, l'anglais à partir de zéro ; les deux sont écrits et testés.

Elles restent listées ici parce qu'une langue à pluriels multiples (russe,
polonais) ou sans pluriel (japonais) ne tient toujours pas dans ce gabarit :
`{s}` ne sait poser qu'un suffixe. Traduisez-les en signalant à l'équipe
technique si votre langue en demande davantage.

| Clé | Chaîne française |
| --- | --- |
| `HUD.tabShop` | Boutique · {n} objet{s} |
| `HUD.artefacts` | {n} artefact{s} |
| `MAP.lanes` | {n} couloir{s} |
| `MAP.blocked` | {n} case{s} bloquée{s} (colonnes {columns}) |
| `COLLECTION.locked` | {n} objet{s} encore scellé{s}. Le stagiaire refuse d'en dire le nom. |
| `UNLOCK.remaining` | Encore {n} objet{s} sous scellé. |
| `GAUGE.missingIn` | encore {missing} ¤ à trouver en {n} course{s} |
| `BOARD.special.gold` | Case payante : l'âme qui s'y arrête vous rapporte {n} pièce{s}, à condition que vous ayez un pari ouvert sur elle. |
| `BOARD.special.trap` | Piège : l'âme qui s'y arrête recule de {n} case{s}. |
| `BOARD.special.boost` | Tremplin : l'âme qui s'y arrête avance de {n} case{s} de plus. |
| *(BetPanel)* | Œil du parieur : parier après le lancer ({n} charge{s}) |

S'y ajoutent les **ordinaux** (`1er`, `1re`, `2e`, `3e`, `9e`, `{n}e`), construits
par concaténation dans `ordinalOf()` : cette logique est française et devra être
réécrite par langue.

---

## Annexe B — Points à remonter à l'équipe avant traduction

1. **Tutoiement / vouvoiement incohérent** (§0.3) — à trancher côté français d'abord.
2. **« Option » au singulier** (§8) — probable coquille.
3. **« Plus de pari »** (§3) — ambigu même en français (« davantage » vs « fini »).
4. **« Compromis »** (§5) — ambigu même en français.
5. **« Jeton »** employé pour deux objets différents (§3, §5).
6. **« Carte »** employé pour deux objets différents (§4, §8).
7. **Pluralisation et ordinaux** codés en dur (annexe A).
8. **Nom de touche « Espace »** dépendant du clavier (§8).
9. **`OPTIONS.languageDisabled`** (« seul le français est disponible pour l'instant ») devra changer dès la deuxième langue.
10. **« Chaîne du Coccyte »** — le fleuve dantesque s'écrit « Cocyte » en français ; vérifier si la graphie du jeu est voulue.
