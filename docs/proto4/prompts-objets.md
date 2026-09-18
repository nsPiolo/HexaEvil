# Objets achetables — images à générer (Gemini)

Les seize objets de la boutique (`Proto4Html/config/shop.json`) : huit artefacts,
quatre dés et quatre opérations de forge. Chacun reçoit une **vignette carrée**
posée à gauche de son nom dans la carte de vitrine, et en réduction dans la
pastille d'inventaire. Le code est en place ; il ne manque que les dessins.

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
- tant qu'un fichier manque, la carte se passe d'image et le texte reprend toute la
  largeur — pas de cadre vide, pas de trou. Les dessins peuvent donc arriver un par
  un, dans n'importe quel ordre.

Format : **1024 × 1024** en source, réduit à **256 × 256** en WebP qualité 88
(quelques dizaines de Ko pièce). L'objet doit occuper environ 85 % du cadre, centré,
sans rien qui touche les bords : la vignette est affichée en `object-fit: contain`,
une marge trop grande fait un objet minuscule.

## Transparence : fond blanc, détourage à l'édition

Comme pour le menu et les personnages, Gemini ne produit pas d'alpha : les prompts
demandent un **fond blanc pur, uni, sans ombre portée ni dégradé**, à supprimer
ensuite et à enregistrer en PNG avec alpha. Conséquences :

- **pas de blanc pur dans l'objet** : les reflets et les arêtes claires en crème,
  ivoire, or pâle ou bleu très pâle, jamais en `#ffffff`, sinon ils partent avec le
  fond ;
- **pas d'ombre portée ni de halo** : l'ombre est ajoutée en CSS
  (`drop-shadow` sur `.shop-art`) ;
- **bord net et fermé**, sans fumée ni braises qui s'évaporent hors de l'objet.

## Direction artistique commune

Le paragraphe suivant est repris **mot pour mot** dans chaque prompt, c'est lui qui
fait tenir les seize objets ensemble — et avec le reste du jeu, puisque c'est la
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
> **\<phrase d'objet\>**. Pure flat white background (#ffffff), no drop shadow, no
> glow, crisp closed edges between the object and the white; no pure white anywhere
> on the object itself. No text, no letters, no numbers, no logo, no user interface,
> no hands, no character. 1024 × 1024 pixels.

## Les seize phrases d'objet

### Artefacts (`kind: "artefact"`)

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `lateBet.webp` | Œil du parieur | an ancient bronze amulet shaped like a wide-open eye, its iris a glowing amber ember, hanging from a short broken chain |
| `sablier.webp` | Sablier de Charon | a squat hourglass in tarnished bronze and dark waterlogged wood, the falling sand glowing faint amber, river silt crusted on its base |
| `boussole.webp` | Boussole des Limbes | a battered brass compass, its lid open, the needle spinning loose over a dial with no marks, pale green patina on the case |
| `clepsydre.webp` | Clepsydre fêlée | a small stone water clock, cracked from rim to base, a thin thread of luminous water escaping through the crack |
| `ferACheval.webp` | Fer à cheval rouillé | a heavy horseshoe eaten by rust, one branch bent out of shape, three bent nails still stuck in it |
| `boursePercee.webp` | Bourse percée | a worn leather coin purse, its drawstring loose and a hole torn in the bottom, two or three tarnished coins slipping out |
| `livreDesComptes.webp` | Livre des comptes | a thick ledger bound in cracked dark leather, closed, its edges gilded and worn, a frayed red ribbon marker hanging out |
| `tirelire.webp` | Tirelire du stagiaire | a small chipped clay money box shaped like a horned imp, a coin slot on top, a hairline crack down one side |

### Dés (`kind: "die"`)

À la table, un dé n'est pas un cube : c'est une **face de céramique arrondie**,
épaisse et émaillée (`public/table/dice/`, posée en fond de `.die` par le CSS), la
valeur étant écrite par-dessus en HTML. Les vignettes de la boutique reprennent cet
objet-là, vu de trois quarts pour qu'on en voie l'épaisseur — **jamais un cube, jamais
un chiffre gravé**. Les quatre dés se distinguent par la matière et la couleur, pas
par leurs valeurs, qui sont affichées sous la carte et changent avec la forge.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `limbes.webp` | Dé des Limbes | a single thick rounded-square ceramic tile, blank and glazed, carved from pale grey stone, smooth and worn, its edges softened by handling, faintly dusty |
| `colere.webp` | Dé de la Colère | a single thick rounded-square ceramic tile, blank and glazed, in dark cracked basalt, molten orange light glowing from the cracks, one corner chipped off |
| `glace.webp` | Dé de Glace | a single thick rounded-square tile of clear blue ice, blank, sharp-edged, frost crusted along its rim, a cold pale glow inside |
| `prodigalite.webp` | Dé de Prodigalité | a single thick rounded-square tile cast in soft gold, blank, slightly deformed as if half melted, a few gold droplets frozen along its rim |

### Forge (`kind: "forge"`)

La forge ne vend pas un objet mais une **opération sur une face de dé** : la vignette
montre l'outil ou la marque, pas le dé.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `limee.webp` | Face limée | a worn iron file lying at an angle, its handle wrapped in cracked leather, fine metal dust caught along its teeth |
| `doree.webp` | Face dorée | a small crucible of molten gold tipping over, a thick thread of liquid gold pouring from its lip and catching the light |
| `retournee.webp` | Face retournée | a blacksmith's iron tongs gripping a small glowing plate of metal, turning it over, the plate lit orange from within |
| `sceau.webp` | Sceau du parieur | a heavy wax seal stamp in blackened bronze, its handle short and thick, a blob of deep red wax still stuck to its face |

## Après génération

1. Détourer le blanc et enregistrer en PNG avec alpha ; vérifier qu'aucun reflet
   clair n'est parti avec le fond.
2. Recadrer sur l'objet en gardant une marge égale de tous les côtés, puis réduire à
   256 × 256 et enregistrer en WebP qualité 88, sous le nom de l'`id`.
3. Poser les fichiers dans `Proto4Html/public/objets/` et ouvrir la boutique
   (`npm run dev`) : les vignettes apparaissent sans autre modification.
4. Contrôler la lisibilité **à 18 px**, dans la pastille d'inventaire : c'est la
   taille qui décide si la silhouette tient ou non.
