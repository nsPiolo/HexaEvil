# 08 · Corrections post-test (run joué du 15/09)

## Contexte

Constats issus d'un run complet joué sur le code courant (viewport 1440×900, vitesse ×4) : menu → intro → paris → boutique → course → gains → carte. Les specs 01 à 06 sont déjà largement intégrées (jauge, frise de sous-phases, triade boutique, prévisualisation, file réordonnable, états de paris « provisoire ») — ce fichier ne les répète pas. Il liste ce que le test réel a révélé, presque entièrement des problèmes de **gestion de l'espace et de feedback**, classés par priorité. Captures de référence : archive `captures-proto.zip` de la session (numéros de capture cités par ticket).

Règle de lecture commune : ces tickets **précisent** les specs 01–06, ils ne les contredisent pas. En cas de doute, le principe qui tranche est celui de l'analyse d'ergonomie : *le plateau est roi, et chaque écran est optimisé pour une seule décision.*

---

## P1 — À corriger en premier

### C1 · Réserver une rangée haute au HUD (plus aucun chevauchement)

**Constat (captures 04, 05, 06, 07).** Dès qu'un drawer est ouvert, la carte des pièces recouvre le fil d'ariane et le bandeau « ADVERSAIRE » ; l'étape « PARI » est à moitié masquée. Le HUD est posé en overlay absolu au-dessus de la table, sans espace réservé, et sa position dépend de l'état des drawers.

**Cible.** Une rangée haute en grid, hors de la table : cercle/course/coach à gauche, fil d'ariane centré dans l'espace restant, pièces + jauge + artefacts + auto/menu à droite. La table commence sous cette rangée. Aucun élément du HUD ne recouvre jamais un autre élément, quel que soit l'état des drawers, de 1024 à 1920 px de large.

**Critères.**
- [ ] Drawer paris ouvert, drawer boutique ouvert, les deux, aucun : les quatre étapes du fil d'ariane et tous les blocs du HUD sont entièrement visibles et non recouverts (vérifier par bounding boxes en E2E, viewports 1024/1280/1440/1920).
- [ ] Le bandeau « ADVERSAIRE » n'est jamais recouvert.

### C2 · Basculer les panneaux en haut / bas (révision de la décision gauche / droite)

**Constat (captures 04, 06 : cases 11 à 16 et l'arrivée masquées par le panneau de paris ; capture 07 : les deux drawers ouverts laissent ~480 px de plateau, piste illisible).** La spec 02 avait entériné l'axe gauche/droite du proto en supposant qu'il préservait la piste horizontale. Le test montre l'inverse : **la piste consomme de la largeur, pas de la hauteur** (14–17 colonnes contre 1 à 6 couloirs), et les panneaux latéraux volent précisément la ressource dont le plateau a besoin — en course, le panneau de paris rouvert masque la zone d'arrivée qu'on surveille.

**Cible.** Revenir à la disposition d'`interface.md` et des maquettes : **paris en panneau bas, boutique en panneau haut**, pleine largeur.

- *Paris en bas* : le panneau occupe l'emplacement du `PlayerSlot` (dés/file), qui est vide en préparation — les deux se partagent naturellement le même espace dans le temps (préparation = ticket, course = dés). En pleine largeur, les sections du ticket (type / âme / mise / paris posés) se posent **en colonnes côte à côte** au lieu de la pile verticale actuelle, ce qui remonte « Paris posés » au-dessus de la ligne de flottaison et résout une partie de C4. En course, le panneau remonte sur la zone des dés, jamais sur le plateau.
- *Boutique en haut* : elle descend sur la zone adverse et le haut de table, en préparation uniquement (aucune course à surveiller à ce moment). Vitrine en une rangée, réserve en pied.
- *Bénéfice structurel* : les deux panneaux ouverts ensemble redeviennent possibles sans tuer le plateau — il garde toute sa largeur et reste visible en bandeau central (au cercle 1 : 1 couloir, ~150 px suffisent). Aux cercles à 4+ couloirs, si la hauteur restante passe sous le minimum lisible (~45 px par couloir), l'ouverture devient exclusive.
- Les poignées suivent : « Paris (2) · 30 ¤ misés » en bas, « Boutique · 3 objets » en haut (les résumés de 02/C1 inchangés).

**Coût assumé** : re-layout CSS des deux panneaux (interne : vertical → colonnes) et des poignées ; aucune logique de jeu touchée. Si ce coût est jugé trop élevé pour l'itération, le repli minimal est : le conteneur de table se **rétrécit** quand un drawer latéral s'ouvre (le plateau se redessine sur la largeur restante, il ne passe jamais dessous) et deux drawers ouverts deviennent exclusifs dès 1440 px. Mais la cible haut/bas est la bonne réponse au problème, pas le repli.

**Critères.**
- [ ] Panneau de paris ouvert (préparation et course) : les 17 colonnes (départ → post-arrivée) et tous les jetons sont visibles, en pleine largeur.
- [ ] Boutique + paris ouverts au cercle 1 : la piste reste visible en bandeau entre les deux.
- [ ] Au cercle 6 (4 couloirs, via menu dev), ouvrir le second panneau replie le premier.
- [ ] Les boutons croisés « Boutique » / « Retour aux paris » font la bascule en un clic, comme aujourd'hui.
- [ ] La spec 02 (`02-navigation-pari-boutique.md`) est mise à jour : la « décision d'adaptation » gauche/droite est annulée au profit de haut/bas.

### C3 · Le cumul produit une seule carte de combinaison

**Constat (captures 10, 11).** Trois dés Âme sur la même âme : la file affiche « ① Platon +1 (−1 +2) » **et** « ② Platon +2 · cumulé dans la carte n°1 ». Le +2 est compté deux fois à l'écran — la carte 2 se lit comme un déplacement encore à venir.

**Cible.** Quand plusieurs combinaisons ciblent la même âme, la file n'affiche **qu'une carte fusionnée** : « Platon +1 » avec les dés constitutifs en miniature (−1, +2) à l'intérieur. Dissocier la carte fusionnée rend tous ses dés. Les numéros d'ordre ne comptent que les cartes visibles. (La donnée `combinations` peut rester telle quelle : c'est un regroupement d'affichage.)

**Critères.**
- [ ] Deux dés sur la même âme = une seule carte dans la file, aucun libellé « cumulé avec… » résiduel.
- [ ] La prévisualisation de cette carte projette le déplacement total (+1), jamais un déplacement partiel.
- [ ] `×` sur la carte fusionnée libère ses deux dés Distance et ses dés Âme.

### C4 · Poser un pari doit se voir

**Constat (capture 06).** Après « Poser le pari », seuls le solde et la jauge bougent. La section « Paris posés » est sous la ligne de flottaison du panneau (à 900 px de haut, les sections I–III et le pied occupent tout), et le pied affiche aussitôt « Choisis encore 1 âme » pour le ticket suivant — ce qui se lit comme un échec de la pose.

**Cible.** Trois retouches conjointes : (1) une **confirmation transitoire** dans le pied — « Pari posé : Vainqueur pur · Homère · 20 ¤ → +50 si gagné » pendant ~2 s (mise à l'échelle vitesse) avant de revenir au guidage du ticket suivant ; (2) le compteur « Paris posés (n) » remonte en **en-tête de panneau**, toujours visible, et s'incrémente avec une micro-animation ; (3) la liste des paris posés devient un accordéon repliable placé au-dessus du pied plutôt qu'en fond de scroll.

**Critères.**
- [ ] À 1440×900, après une pose, une trace visible du pari existe sans scroller (confirmation + compteur).
- [ ] Le message « Choisis encore N âme(s) » n'apparaît qu'après la confirmation transitoire.
- [ ] Le compteur d'en-tête ouvre/replie la liste des paris posés.

---

## P2 — Ensuite

### C5 · Slot d'âme du ticket illisible

**Constat (capture 05).** Le slot de la section II affiche le nom de l'âme retenue en gris minuscule, quasi invisible (le chip « Homère » de la liste est lui bien marqué). Bug de style du slot rempli.

**Cible.** Slot rempli = pastille de la couleur de l'âme + nom à la taille du corps de texte, même traitement que le chip sélectionné ; slot vide = tiret sur fond neutre (état actuel correct).

**Critère.** [ ] Contraste du nom dans le slot ≥ celui des chips ; vérifiable à l'œil sur la capture équivalente.

### C6 · Reformuler l'ordre d'arrivée dans le classement

**Constat (capture 12).** « 1 · Platon · case 16 · arrivée n°2 » devant « 2 · Virgile · case 14 · arrivée n°1 » : exact (la colonne prime, GDD §2.7) mais se lit comme une contradiction — « arrivée n°1 » ressemble à un rang.

**Cible.** Ne montrer la mention que lorsqu'elle diffère du rang, et la rendre narrative : « a franchi l'arrivée le 1er · doublé pendant la fin du tour » (et l'inverse : « a franchi 2e · a dépassé après l'arrivée »). Libellés dans `texts.ts`. C'est le pendant du départage montré (06/C3) : chaque bizarrerie de classement s'explique sur la ligne concernée.

**Critères.**
- [ ] Quand rang = ordre d'arrivée, aucune mention.
- [ ] Quand ils diffèrent, la ligne explique le dépassement en français clair, sans jargon (« résolution complète » reste dans le sous-titre).

### C7 · Empilement des jetons au départ

**Constat (captures 04, 10).** Les jetons empilés sur la case de départ se masquent (Aristote disparaît derrière l'anneau de sélection de Platon). À 10 âmes / 6 couloirs au cercle 9, la pile deviendra illisible.

**Cible.** Écart vertical minimal garanti entre jetons d'une même case (aucun jeton masqué à plus de 50 %), anneau de sélection qui ne recouvre pas les voisins (dessiné sous les autres jetons ou plus fin), et au survol d'une pile, éventail temporaire qui écarte les jetons. La légende reste la source fiable — le survol d'une entrée de légende doit faire ressortir le jeton même enfoui (mécanisme `highlightSoul` de 05/C4).

**Critères.**
- [ ] Au départ avec 5 âmes, les 5 jetons sont identifiables (initiales visibles) sans interaction.
- [ ] Config cercle 9 (10 âmes) via menu dev : chaque jeton reste localisable par survol de la légende.

### C8 · Contraste du fil d'ariane

**Constat (captures 10, 12).** Les étapes non courantes (« GAINS » surtout) sont presque invisibles sur le fond sombre ; l'étape faite en gras clair et la courante en or fonctionnent.

**Cible.** Relever le gris des étapes à venir jusqu'à un contraste AA sur le fond de table (~4,5:1), et donner à l'étape courante un halo plus franc (c'est le repère de macro-progression du GDD/interface.md). Aucun changement de structure.

**Critère.** [ ] Les 4 étapes sont lisibles sur une capture en l'état de n'importe quelle phase.

---

## P3 — Si le coût est faible

### C9 · Estomper la jauge du HUD quand un panneau affiche la sienne

**Constat (captures 04–07).** Deux, parfois trois jauges identiques côte à côte (HUD + en-tête de chaque panneau ouvert). Cohérent mais redondant dans un espace disputé.

**Cible.** Quand au moins un drawer affichant la jauge est ouvert, celle du HUD s'estompe (opacité réduite, valeurs conservées). Jamais l'inverse : celle du panneau, au plus près de la décision, reste pleine.

### C10 · Zone adverse discrète hors de son tour

**Constat (captures 04–06).** Le bandeau « ADVERSAIRE » occupe toute la largeur en phase de préparation, vide. Acceptable, mais c'est de l'espace vertical pris au plateau sur petits écrans.

**Cible.** Hors des phases `opponent`, réduire le bandeau à une ligne fine (libellé + emplacement de paire réduit) ; il reprend sa hauteur pleine quand la paire se révèle, avec la transition d'attention voulue par la spec 05.

---

## Non évalué pendant ce test (à couvrir par la spec 07)

La séquence de révélation des tickets de gains (une seule mise dans le run joué), le pulse du bouton Résoudre après inactivité, et le parcours clavier complet de la file de combinaisons. Les scénarios E2E-06-A, E2E-05-E et E2E-05-A de `07-tests-e2e-playwright.md` les couvrent : les implémenter avant de considérer 05 et 06 comme terminées.

## Ce qui est bien et ne doit pas régresser

La carte des cercles (fiche boss claire, mention honnête « règle à venir dans le proto »), le récap « ↺ dernier tour » qui compense le retrait du journal, le libellé d'événement du type « Platon −1 +2 = +1 : case 0 → 1 », l'état « compromis · provisoire » des paris en course, et la triade SÛR / DANGER de la boutique avec contrepartie en toutes lettres.
