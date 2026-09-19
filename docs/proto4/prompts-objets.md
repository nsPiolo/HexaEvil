# Objets achetables — images à générer (Gemini)

Les soixante-quinze objets de la boutique (`Proto4Html/config/shop.json`) : quarante et un
artefacts, huit dés, quinze opérations de forge et onze masques de personnalité. Chacun
reçoit une **vignette carrée** posée à gauche de son nom dans la carte de vitrine, et en
réduction dans la pastille d'inventaire. **Les soixante-quinze sont peintes et installées**
(2026-09-19, les seize dernières avec la vague 2 : artefacts n° 25 et 33 à 42, Dé du Damné,
faces de revers, d'écho, de bras de fer et de fusion). Ce fichier reste la référence pour en
ajouter une, ou en refaire une qui ne tient pas à 18 px.

| Où | Sélecteur | Taille affichée |
|---|---|---|
| Carte de vitrine | `.shop-art` | 52 à 88 px selon la largeur de la carte |
| Pastille d'inventaire | `.inv-art` | 18 px |

## Poser un fichier suffit

Les fichiers vont dans `Proto4Html/public/objets/`, **nommés par l'`id` de l'objet**
dans `config/shop.json` (voir le tableau plus bas) : `sablier.webp`,
`ferACheval.webp`, `lateBet.webp`… Le composant `ItemArt`
(`src/presentation/ItemArt.tsx`) construit le chemin à partir de l'id, donc :

- poser le `.webp` dans le dossier **suffit**, il n'y a rien à déclarer dans le code ;
- tant qu'un fichier manque, la carte montre `qmark.webp`, le point d'interrogation peint.
  Toutes les cartes gardent donc la même silhouette, et les dessins peuvent arriver un par
  un, dans n'importe quel ordre, sans qu'une carte s'élargisse parce qu'il lui manque le sien.

Les PNG détourés vivent dans `docs/proto4/raw/objects/png/` et c'est
`Proto4Html/scripts/install-art.py` qui les pose dans le jeu :

```bash
cd Proto4Html
python3 scripts/install-art.py objets
```

Il recadre chaque vignette sur sa boîte opaque et la repose au centre d'un carré dont elle
occupe 85 %, avant de réduire à 256 × 256 en WebP qualité 88. Ce recadrage n'est pas
cosmétique : le cadrage des sources va de 70 % à 91 % du cadre, et les vignettes étant
affichées en `object-fit: contain` dans des cases de même taille, s'en remettre au cadrage
d'origine ferait des objets visiblement plus petits que d'autres en vitrine.

Format : **2048 × 2048** en source — c'est ce que sort l'API, en JPEG et non en PNG
(voir `scripts/gen-objets.mjs`) —, réduit à **256 × 256** en WebP qualité 88 (quelques
dizaines de Ko pièce). Détourer à 2048 puis réduire d'un facteur huit fait disparaître
les artefacts de compression le long des bords, qui seraient sinon le principal défaut
d'un détourage sur JPEG. L'objet doit occuper environ 85 % du cadre, centré, sans rien
qui touche les bords : la vignette est affichée en `object-fit: contain`, une marge trop
grande fait un objet minuscule.

## Transparence : fond violet sombre, détourage à l'édition

Gemini ne produit pas d'alpha : les prompts demandent un **fond uni, sans ombre portée
ni dégradé**, à supprimer ensuite et à enregistrer en PNG avec alpha. La couleur de ce
fond n'est pas neutre, parce qu'un détourage laisse toujours un **liseré** : les pixels
du bord sont semi-transparents par antialiasing et gardent la couleur du fond mélangée
dedans. Ils ne disparaissent pas, quelle que soit la couleur — la seule question est de
quelle couleur ils seront. Sur fond blanc, ce liseré fait un halo clair bien visible sur
l'interface sombre ; c'est ce qu'on voit après un « Supprimer l'arrière-plan ».

Deux exigences contradictoires, donc :

- **le fond doit ressembler à la destination**, pour que le liseré restant se fonde —
  les vignettes sont toujours posées sur du sombre : `#28303a` et `#262e37` pour les
  cartes de vitrine (même dans le panneau de parchemin, les cartes restent de l'ardoise
  froide), `#2f2216` pour la pastille d'inventaire ;
- **le fond doit être loin de l'objet**, pour que le détourage accroche. Un noir pur
  échoue là-dessus : le fer, le basalte et le bronze noirci s'y confondent.

D'où le choix d'un **violet très sombre, `#2A1240`** : sa luminosité est celle des
fonds de destination, donc un liseré survivant passe pour une ombre — `.shop-art` porte
déjà un `drop-shadow` — et sa teinte n'existe nulle part dans la palette du jeu (ambre,
or, rouille, gris-bleu, patine pâle), donc la sélection garde une prise chromatique
même là où la luminosité de l'objet égale celle du fond. Avantage annexe : un pixel
violet oublié se voit à l'œil, un pixel noir sur fond noir ne se révèle qu'une fois la
vignette posée sur un fond clair.

Conséquences sur les prompts :

- **aucun violet, aucun magenta, aucun pourpre sur l'objet** — c'est la couleur-clé, il
  faut qu'elle soit unique dans l'image. Attention au sceau de cire : sa cire est d'un
  rouge franc et chaud, elle ne doit pas virer au prune ;
- **pas de noir pur dans l'objet** : les ombres, les creux, le fer et le cuir sombre
  restent en gris-bleu profond, brun charbon ou bronze éteint, jamais en `#000000` —
  une masse plus sombre que le fond redevient impossible à séparer ;
- **une arête de lumière froide le long de la silhouette**, qui sert deux fois : au
  détourage, et à 18 px dans l'inventaire où elle est ce qui dessine la forme ;
- **pas d'ombre portée, pas de halo qui déborde** : les braises et l'or en fusion
  éclairent l'intérieur de l'objet, jamais le fond autour — une lueur qui se dissout
  dans le fond n'a pas de bord détourable. L'ombre est ajoutée en CSS
  (`drop-shadow` sur `.shop-art`) ;
- **bord net et fermé**, sans fumée ni braises qui s'évaporent hors de l'objet ;
- **rien qui flotte à côté** : le modèle a tendance à lâcher un coup de pinceau détaché
  dans le vide, invisible à l'œil sur fond sombre mais que la baguette magique laissera
  en place — c'est la dernière chose à vérifier avant d'exporter ;
- **pas de cadre** : demander un objet bien centré dans son carré suffit à lui faire
  peindre un filet clair le long des bords, comme une bordure de tableau. Il compte pour
  un objet distinct au détourage et ruine la vignette, d'où la clause explicite dans le
  squelette.

Le blanc pur, lui, est autorisé : les reflets vifs et les arêtes les plus claires
peuvent monter jusqu'au blanc sans risque, c'était l'interdit du temps du fond blanc.

## Direction artistique commune

Le paragraphe suivant est repris **mot pour mot** dans chaque prompt, c'est lui qui
fait tenir les quarante-sept objets ensemble — et avec le reste du jeu, puisque c'est la
même DA que les décors et les personnages :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast between
> warm firelight and cold blue-grey rock, expressionist and textured, like a
> speed-painting concept art.

Deux règles qui priment sur le joli :

- **Un seul objet par image**, isolé, vu de trois quarts, pas une composition ni une
  scène. À 18 px dans l'inventaire, il faut une silhouette reconnaissable d'un coup.
- **Aucun texte, aucun chiffre, aucun symbole lisible** peint sur l'objet. Les
  valeurs de face, les prix et les noms sont du HTML posé à côté. En particulier,
  **les dés ne portent pas de chiffres** : les faces sont affichées séparément sous
  la carte, et un dé peint avec un « 3 » mentirait dès la première forge.
- **Répondre aux objets déjà peints** quand il y en a un : les dés de la boutique
  reprennent la face de céramique de la table (voir plus bas), pas une forme inventée.

## Le squelette de prompt

Un seul prompt, dont seule la **phrase d'objet** change d'une vignette à l'autre :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast between
> warm firelight and cold blue-grey rock, expressionist and textured, like a
> speed-painting concept art. A single object on its own, seen at a three-quarter
> angle, centered and filling about 85 % of the image, nothing touching the borders:
> **\<phrase d'objet\>**. Pure flat dark violet background (#2A1240), perfectly even,
> no drop shadow, no glow or light spilling onto the background, crisp closed edges
> between the object and the background; a faint cool rim light running along the whole
> silhouette so the object separates cleanly; no violet, purple or magenta anywhere on
> the object itself, and no pure black either — its darkest areas stay a deep blue-grey,
> lighter than the background. The misty atmosphere, the smoke and the brush texture stay
> strictly inside the object's silhouette: the background is one perfectly flat colour and
> completely empty, no mist, no smoke, no brush strokes, no vignette, no gradient.
> Everything painted in the image belongs to that one object — no detached brush strokes,
> specks, flecks or floating fragments anywhere in the background, and no frame, border,
> outline, panel or edging drawn around the image. No text, no letters, no numbers, no logo,
> no user interface, no hands, no character.

## Les phrases d'objet

Onze objets sont sombres par nature — `sablier`, `livreDesComptes`, `colere`,
`limee`, `retournee`, `sceau`, et dans la vague 2 `chaineDesLimbes`,
`sommeilDuContremaitre`, `crochetDeCharon`, `damne`, `revers`. Leur phrase porte une
mention explicite d'arête de lumière, en plus de celle du squelette : sur fond sombre,
c'est elle qui décide si la silhouette existe.

### Artefacts (`kind: "artefact"`)

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `lateBet.webp` | Œil du parieur | an ancient bronze amulet shaped like a wide-open eye, its iris a glowing amber ember, hanging from a short broken chain |
| `sablier.webp` | Sablier de Charon | a squat hourglass in tarnished bronze and dark waterlogged wood, the falling sand glowing faint amber, river silt crusted on its base, a cold pale rim light along the wooden frame |
| `boussole.webp` | Boussole des Limbes | a battered brass compass, its lid open, the needle spinning loose over a dial with no marks, pale green patina on the case |
| `clepsydre.webp` | Clepsydre fêlée | a small stone water clock, cracked from rim to base, a thin thread of luminous water escaping through the crack |
| `ferACheval.webp` | Fer à cheval rouillé | a heavy horseshoe eaten by rust, one branch bent out of shape, three bent nails still stuck in it |
| `boursePercee.webp` | Bourse percée | a worn leather coin purse, its drawstring loose and a hole torn in the bottom, two or three tarnished coins slipping out |
| `livreDesComptes.webp` | Livre des comptes | a thick ledger bound in cracked dark leather, closed, its edges gilded and worn, a frayed red ribbon marker hanging out, a cold pale rim light along the cover and the spine |
| `tirelire.webp` | Tirelire du stagiaire | a small chipped clay money box shaped like a horned imp, a coin slot on top, a hairline crack down one side |
| `relanceJumelle.webp` | Relance jumelle | a pair of twin bronze amulets cast from the same mould, hanging side by side from one split ring, one of them turned to show its blank reverse |
| `quatriemeTete.webp` | Quatrième tête de Cerbère | a stone carving of a fourth dog's head, freshly broken off a larger statue, its muzzle chipped and its eye sockets lit by a faint amber ember |
| `fioleDeSang.webp` | Fiole de sang | a small thick glass vial of dark blood, its cork sealed with red wax and bound with a leather cord, a single drop running down the outside |
| `verrouDeMinos.webp` | Verrou de Minos | a heavy square iron padlock, ancient and pitted, its shackle firmly closed, a short length of scaled tail-like chain threaded through it |
| `semellesDePlomb.webp` | Semelles de plomb | a pair of thick boot soles cast in dull grey lead, their leather straps frayed and their edges rounded by dragging |
| `batDeChameau.webp` | Bât de chameau | a heavy leather pack-saddle on a wooden frame, a laden pannier slung on either side, its girth strap buckled tight |
| `balanceTruquee.webp` | Balance truquée | a small brass balance scale, visibly rigged, one pan hanging far lower than the other, a lead slug stuck under it |
| `chaineDuCoccyte.webp` | Chaîne du Coccyte | a short length of thick iron chain caught inside a block of blue-white ice, two links protruding at either end, hoarfrost along the metal |
| `ticketPremiereHeure.webp` | Ticket de la première heure | a torn paper betting slip, blank and unprinted, its edge ragged where it was pulled from a book, punched once with a round hole, yellowed and creased |
| `quatriemeMarche.webp` | Quatrième marche | a short flight of worn stone steps, three of them smoothed hollow by use, a fourth one freshly cut and paler with its edge still sharp |
| `encensoirDuDernier.webp` | Encensoir du dernier | a battered brass censer hanging from three short chains, its pierced lid half open, a little pale smoke caught in the holes and going no further |
| `pieceADeuxFaces.webp` | Pièce à deux faces | a thick tarnished silver coin standing on its edge and caught mid-spin, both visible faces struck with the same blank relief |
| `denierDuCercle.webp` | Denier du cercle | one large worn silver coin resting on a small stack of three lesser ones, its rim deeply nicked all the way round |
| `baumeDuPerdant.webp` | Baume du perdant | a squat clay ointment jar, its stopper pushed askew, a pale greenish balm oozing over the rim and down one side |
| `tribuneInfernale.webp` | Tribune infernale | a small wooden grandstand of three tiered benches built from dark salvaged planks, one of its legs propped up on a stone |
| `detteInfernale.webp` | Dette infernale | a folded parchment note sealed with a blob of dark red wax, a broken length of iron chain threaded through a hole torn in its corner |
| `pourboireDuStagiaire.webp` | Pourboire du stagiaire | a chipped clay saucer holding a loose handful of tarnished coins, one coin balanced upright against the rim |
| `oeilDeCharon.webp` | Œil de Charon | a short battered brass spyglass, its barrel green with patina, its lens clouded, an old coin wedged into the ring of the eyepiece |
| `fouetDuContremaitre.webp` | Fouet du contremaître | a coiled leather whip with a braided handle bound in brass wire, its lash wound tight and its tip frayed to threads |
| `miroirDeNarcisse.webp` | Miroir de Narcisse | a small hand mirror in tarnished silver with an ornate handle, its glass cracked across once and reflecting nothing but flat grey |
| `marteauHephaistos.webp` | Marteau d'Héphaïstos | a blacksmith's hammer with a scarred steel head and a short charred wooden handle, its striking face still glowing dull orange from the anvil |
| `rabaisDePloutos.webp` | Rabais de Ploutos | a merchant's brass scale weight, squat and round with a ring handle on top, visibly filed down along its base, brass dust caught in the cuts |
| `sceauDuStagiaire.webp` | Sceau du stagiaire | a small official signet ring in dull office brass resting on a folded scrap of parchment, its flat bezel worn smooth by use, a smear of scarlet ink dried on its rim |
| `bornes.webp` | Bornes du stagiaire | three short surveyor's stakes tied together with coarse cord, one tipped with a spiked iron cap, one with a small hinged wooden plank, one crusted with thick black tar |
| `raccourci.webp` | Raccourci de Malebolge | a carved stone milestone snapped clean in two, its halves pushed back together so the break runs right through the worn engraving, dry dust caught in the seam |
| `chaineDesLimbes.webp` | Chaîne des Limbes | a long heavy iron chain loosely coiled, three of its links visibly newer than the rest and still bright from the forge, a cold pale rim light running along the coil |
| `bouleDeCocyte.webp` | Boule de Cocyte | a clouded sphere of river ice held in a small blackened iron claw stand, pale blue light moving deep inside it, frost crusted where the claws grip |
| `echoDuStyx.webp` | Écho du Styx | a small bronze bell with no clapper, its mouth ringed with green patina, a second fainter bell rippling out of it like a reflection spreading on still water |
| `sommeilDuContremaitre.webp` | Sommeil du contremaître | a coiled leather whip gone slack on a blackened iron bracket, its handle drooping and its lash uncoiling, a thin curl of smoke rising from the coil, a cold pale rim light along the handle |
| `registreExotique.webp` | Registre des paris exotiques | a slim betting ledger lying open on its spine, its ruled pages blank, a carved bone token and a small brass counter resting in the gutter, a frayed green ribbon marker hanging out |
| `coteMontante.webp` | Cote montante | a small brass balance scale with one pan tipped high, a single amber glass token resting in the raised pan, the beam notched along its length |
| `crochetDeCharon.webp` | Crochet de Charon | a long boat hook, its curved barb in blackened iron still wet and trailing a strand of river weed, its shaft of dark waterlogged wood, a cold pale rim light along the barb and the shaft |
| `roueDIxion.webp` | Roue d'Ixion | a broken cartwheel of charred wood bound in iron, two of its spokes snapped and a length of chain wound through the hub, a faint orange glow caught in the burnt grain |

### Dés (`kind: "die"`)

**En vitrine, les dés sont des cubes.** C'est un écart assumé avec la table, où
un dé n'est pas un cube mais une **face de céramique arrondie**, épaisse et émaillée
(`public/table/dice/`, posée en fond de `.die` par le CSS), la valeur étant écrite
par-dessus en HTML.

Les deux n'ont pas le même travail à faire. À la table, le contexte dit ce qu'est
l'objet : le dé est aligné avec les autres, il porte une valeur, on sait ce qu'on
regarde. Dans la vitrine il est seul, entre un creuset et une bourse, et la silhouette
doit suffire — une dalle épaisse s'y lit comme une pierre. Le cube dit « dé »
immédiatement, la face de céramique non.

Ils partagent donc la même silhouette — cube vu de trois quarts, trois faces
visibles — et ne se distinguent que par la **matière**, qui emporte le traitement des
arêtes : la pierre des Limbes est usée et ses angles émoussés, la glace reste vive et
ébréchée, l'or est gonflé comme à demi fondu, le basalte est fendu, la corne brûlée du
Damné est prise dans une chaîne.

**Une seule exception : le Décathlon**, seul dé à dix faces du catalogue. Il se dessine
en trapézoèdre pentagonal, parce que c'est là sa règle entière — dix valeurs au lieu de
quatre — et qu'une silhouette qui la dit avant le texte vaut mieux qu'un cube de plus.

**Aucun dé ne porte de chiffre ni de point.** C'est la règle qui ne bouge pas : les
valeurs sont affichées sous la carte en HTML et changent avec la forge, un dé peint avec
un « 3 » ou avec des points mentirait dès la première opération.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `limbes.webp` | Dé des Limbes | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, carved from pale grey stone, smooth and worn, its corners rounded and its edges softened by long handling, faintly dusty; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `colere.webp` | Dé de la Colère | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, its corners rounded and its edges bevelled, carved from dark cracked basalt, molten orange light glowing from the cracks and staying inside the cube, one corner chipped off, a cold pale rim light along its edges; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `glace.webp` | Dé de Glace | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, carved from clear blue ice, its edges crisp and one corner chipped away, frost crusted along the edges, a cold pale glow contained inside the ice; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `prodigalite.webp` | Dé de Prodigalité | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, cast in soft gold, its corners rounded and its edges swollen as if half melted, slightly slumped out of true, a few gold droplets frozen along its lower edges; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `fraude.webp` | Dé de Fraude | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, its corners rounded and its edges worn, cast in tarnished green-grey lead, one face visibly slumped and re-cast as if tampered with; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `troisiemeDe.webp` | Troisième dé Distance | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, its corners rounded and its edges crisp, carved from plain bone yellowed with age, a hairline crack running across one face; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `decathlon.webp` | Dé du Décathlon | a single ten-sided die, a pentagonal trapezohedron, standing on one point and seen at a three-quarter angle so several faces are visible, cut from polished white marble faintly veined with grey, its edges crisp and one edge chipped away, a thin dry olive-leaf wreath resting around its widest ring, a cold pale rim light along its edges; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |
| `damne.webp` | Dé du Damné | a single cube with the proportions of a gaming die, seen at a three-quarter angle so three faces are visible, its corners rounded and its edges sharp, carved from black scorched horn shot through with a dull red inner heat, a thin iron chain biting into two of its edges, a cold pale rim light along its edges; its faces completely blank — no pips, no dots, no numbers, no carving of any kind |

### Forge (`kind: "forge"`)

La forge ne vend pas un objet mais une **opération sur une face de dé** : la vignette
montre l'outil ou la marque, pas le dé.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `limee.webp` | Face limée | a worn iron file lying at an angle, its handle wrapped in cracked leather, fine metal dust caught along its teeth, a cold pale rim light running the length of the blade |
| `doree.webp` | Face dorée | a small foundry crucible tipping over — a thick-walled ceramic cup held in an iron ring handle, not a rock — a thread of molten gold pouring from its lip and catching the light |
| `retournee.webp` | Face retournée | a blacksmith's iron tongs gripping a small glowing plate of metal, turning it over, the plate lit orange from within, a cold pale rim light along the arms of the tongs |
| `sceau.webp` | Sceau du parieur | a heavy wax seal stamp in blackened bronze, its handle short and thick, a blob of warm scarlet sealing wax still stuck to its face, never purple, a cold pale rim light along the handle and the collar |
| `explosive.webp` | Face explosive | a squat blackened iron powder charge bound with two bands, its short fuse lit, a tight orange spark contained at the tip |
| `bond.webp` | Face de bond | a thick oiled steel spring compressed under a worn iron plate, wound tight and about to let go |
| `miroir.webp` | Face miroir | a polished steel plate held in a small clamp, its surface mirror-bright and slightly warped, the reflection smeared out of shape |
| `feuFollet.webp` | Face feu follet | a small glass lantern with no candle in it, a pale green flame floating loose inside the glass, the top of the pane smoked black-brown |
| `elan.webp` | Face d'élan | a heavy iron flywheel on a short axle, its rim nicked and scarred, spinning fast enough to blur along one side |
| `gel.webp` | Face de gel | a blacksmith's tongs gripping a metal plate that has frozen instead of glowing, blue-white frost creeping up the jaws |
| `aimant.webp` | Face aimant | a squat grey bar lodestone, pitted and dark, iron filings and two bent nails clinging in dense tufts to each end |
| `revers.webp` | Face de revers | an iron drawknife with two short wooden handles, its blade curved back on itself and worn bright where it has been drawn backwards over and over, a cold pale rim light along the blade |
| `echo.webp` | Face d'écho | a steel punch standing upright on a scarred anvil block, an identical second punch doubling out of it and slightly fainter, as if the first one's shadow had been struck solid |
| `brasDeFer.webp` | Face de bras de fer | two heavy iron gauntlets locked hand in hand on a scarred oak block, knuckles braced and straining against each other, the oak splintered under the grip |
| `fusion.webp` | Face de fusion | two thick iron ingots half melted into one another in a shallow stone mould, the seam between them still glowing orange, a thread of slag pooled at the lip |

### Masques de personnalité (`kind: "personality"`)

Les onze masques sont le seul endroit du catalogue où les vignettes doivent se
**ressembler volontairement**. Une personnalité (GDD §6.5) n'est pas un objet de plus
dans la main du joueur : c'est une marque posée sur une âme, et dix marques différentes
doivent se lire comme dix variantes d'une même chose, pas comme dix objets. La phrase est
donc rigoureusement la même pour tous — même masque, même matière, même cordon, même
cadrage — et **seul le symbole gravé au front change**.

C'est aussi la seule entorse à la règle « aucun symbole peint sur l'objet » de la
direction artistique commune, et elle est assumée : ici le symbole **est** l'information.
Il reste **géométrique** — pas une lettre, pas un chiffre, ce que le squelette interdit
toujours — et c'est le même que celui affiché sur le jeton de l'âme marquée
(`PERSONALITY_GLYPH`, `Proto4Html/src/presentation/PersonalityMark.tsx`) : le joueur doit
reconnaître sur la piste ce qu'il a acheté en vitrine.

Le masque brisé, lui, ne porte rien : c'est le même masque fendu en deux, front nu.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `masqueMartyr.webp` | Masque du Martyr | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: an equal-armed cross with plain square ends |
| `masqueAmbitieux.webp` | Masque de l'Ambitieux | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a solid triangle pointing upwards |
| `masqueTricheur.webp` | Masque du Tricheur | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a ring crossed out by two diagonal strokes forming an X inside it |
| `masqueCondamne.webp` | Masque du Condamné | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a horizontal arrow striking a vertical bar at its tip |
| `masqueParasite.webp` | Masque du Parasite | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a narrow chevron lying on its side, pointing left like an arrowhead |
| `masqueJuge.webp` | Masque du Juge | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: two interlaced curls stacked one above the other, like an old section mark |
| `masqueResolu.webp` | Masque du Résolu | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a ring cut through by a single diagonal stroke |
| `masqueOpposant.webp` | Masque de l'Opposant | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: two parallel horizontal arrows pointing in opposite directions |
| `masqueConstant.webp` | Masque du Constant | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: three short horizontal bars stacked evenly one above the other |
| `masqueOgre.webp` | Masque de l'Ogre | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, and one geometric mark branded dark into its forehead: a thick saltire, two heavy strokes crossing in an X |
| `masqueBrise.webp` | Masque brisé | a plain oval face-mask of pale bone-coloured ceramic, featureless except for two narrow empty eye slits, hanging from a short frayed leather cord, a cold pale rim light along its whole edge, cracked clean in two down the middle with the halves slightly apart and the fracture edges chipped, its forehead completely bare with no mark of any kind |

## Générer : `npm run gen:objets`

Le script `Proto4Html/scripts/gen-images.mjs` appelle Gemini pour les objets
(famille `objets` ; la famille `boss` fait les portraits, voir [`prompts-boss.md`](prompts-boss.md)).
Il **lit ce document** — le squelette de prompt et les quatre tableaux de phrases — donc
il n'existe pas de copie des prompts ailleurs : éditer une phrase ci-dessus suffit à
changer ce qui sera généré.

```bash
cd Proto4Html
npm run gen:objets                  # tous les objets manquants
npm run gen:objets -- sablier colere # seulement ceux-là
npm run gen:objets -- --list        # l'état de chacun, aucun appel réseau
npm run gen:objets -- --dry-run     # les prompts complets, aucun appel réseau
npm run gen:objets -- --force sceau # refait même si le fichier existe
```

La clé `GOOGLE_API_KEY` est lue dans le `.env` à la racine du dépôt (ignoré par git).
Modèle par défaut `gemini-3-pro-image` en 2K, surchargeable par `--model=` et `--size=`
(`1K` | `2K` | `4K`).

**L'idempotence tient au fichier de sortie.** Les images brutes vont dans
`docs/proto4/raw/objects/` ; une image présente n'est jamais regénérée. Le geste
attendu est donc : regarder, supprimer celles qui ne vont pas, relancer — seules
celles-là repartent. `manifest.json` garde à côté la **clé** de chaque image,
l'empreinte du modèle, de la taille et du prompt qui l'ont produite : si le document
change, l'image existante est signalée **périmée** au lancement suivant mais reste en
place, à toi de décider. L'écriture est atomique, une interruption en plein appel ne
laisse pas de demi-fichier qui passerait ensuite pour valide.

Deux choses à savoir sur ce que rend l'API :

- **elle ne sort que du JPEG**, jamais de PNG. D'où le 2K par défaut : détourer à
  2048 puis réduire à 256 noie les artefacts de compression des bords, qui sont le
  principal risque d'un détourage sur JPEG ;
- **le fond sort à quelques points de la consigne** — mesuré à `#261440` pour une
  demande de `#2A1240` — mais parfaitement uni (écart-type de 1 par canal). Une
  sélection par plage de couleurs à tolérance faible suffit ; c'est la valeur exacte
  qui est approximative, pas l'uniformité.

## Après génération

1. Détourer le fond et enregistrer en PNG avec alpha. Après la sélection de sujet,
   passer par **Sélectionner et masquer > Décontaminer les couleurs** (ou
   `Calque > Cache > Défranger`, 1 px) : c'est ce qui retire le violet mélangé dans les
   pixels de bord, plutôt que de le laisser au détourage brut. Puis vérifier deux
   choses — que les zones sombres de l'objet (fer, cuir, basalte) sont restées dans la
   sélection, et qu'il ne reste pas de pixel violet, en posant le calque une fois sur du
   blanc : c'est là que le liseré se voit — et aussi les coups de pinceau détachés restés
   dans le fond, à gommer.
2. Recadrer sur l'objet en gardant une marge égale de tous les côtés, puis réduire à
   256 × 256 et enregistrer en WebP qualité 88, sous le nom de l'`id`.
3. Poser les fichiers dans `Proto4Html/public/objets/` et ouvrir la boutique
   (`npm run dev`) : les vignettes apparaissent sans autre modification.
4. Contrôler la lisibilité **à 18 px**, dans la pastille d'inventaire : c'est la
   taille qui décide si la silhouette tient ou non. Le fond de la pastille étant
   sombre (`#2f2216`), un objet détouré trop serré y disparaît — c'est là que l'arête
   de lumière se juge.
