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
  en place — c'est la dernière chose à vérifier avant d'exporter.

Le blanc pur, lui, est autorisé : les reflets vifs et les arêtes les plus claires
peuvent monter jusqu'au blanc sans risque, c'était l'interdit du temps du fond blanc.

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
> **\<phrase d'objet\>**. Pure flat dark violet background (#2A1240), perfectly even,
> no drop shadow, no glow or light spilling onto the background, crisp closed edges
> between the object and the background; a faint cool rim light running along the whole
> silhouette so the object separates cleanly; no violet, purple or magenta anywhere on
> the object itself, and no pure black either — its darkest areas stay a deep blue-grey,
> lighter than the background. The misty atmosphere, the smoke and the brush texture stay
> strictly inside the object's silhouette: the background is one perfectly flat colour and
> completely empty, no mist, no smoke, no brush strokes, no vignette, no gradient.
> Everything painted in the image belongs to that one object — no detached brush strokes,
> specks, flecks or floating fragments anywhere in the background. No text, no letters, no
> numbers, no logo, no user interface, no hands, no character.

## Les seize phrases d'objet

Six objets sont sombres par nature — `sablier`, `livreDesComptes`, `colere`,
`limee`, `retournee`, `sceau`. Leur phrase porte une mention explicite d'arête de
lumière, en plus de celle du squelette : sur fond sombre, c'est elle qui décide si la
silhouette existe.

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
| `colere.webp` | Dé de la Colère | a single thick rounded-square ceramic tile, blank and glazed, in dark cracked basalt, molten orange light glowing from the cracks and staying inside the tile, one corner chipped off, a cold pale rim light along its edges |
| `glace.webp` | Dé de Glace | a single thick rounded-square tile of clear blue ice, blank, sharp-edged, frost crusted along its rim, a cold pale glow contained inside the ice |
| `prodigalite.webp` | Dé de Prodigalité | a single thick rounded-square tile cast in soft gold, blank, slightly deformed as if half melted, a few gold droplets frozen along its rim |

### Forge (`kind: "forge"`)

La forge ne vend pas un objet mais une **opération sur une face de dé** : la vignette
montre l'outil ou la marque, pas le dé.

| Fichier | Objet | Phrase d'objet |
|---|---|---|
| `limee.webp` | Face limée | a worn iron file lying at an angle, its handle wrapped in cracked leather, fine metal dust caught along its teeth, a cold pale rim light running the length of the blade |
| `doree.webp` | Face dorée | a small foundry crucible tipping over — a thick-walled ceramic cup held in an iron ring handle, not a rock — a thread of molten gold pouring from its lip and catching the light |
| `retournee.webp` | Face retournée | a blacksmith's iron tongs gripping a small glowing plate of metal, turning it over, the plate lit orange from within, a cold pale rim light along the arms of the tongs |
| `sceau.webp` | Sceau du parieur | a heavy wax seal stamp in blackened bronze, its handle short and thick, a blob of warm scarlet sealing wax still stuck to its face, never purple, a cold pale rim light along the handle and the collar |

## Générer : `npm run gen:objets`

Le script `Proto4Html/scripts/gen-images.mjs` appelle Gemini pour les seize objets
(famille `objets` ; la famille `boss` fait les portraits, voir [`prompts-boss.md`](prompts-boss.md)).
Il **lit ce document** — le squelette de prompt et les trois tableaux de phrases — donc
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
