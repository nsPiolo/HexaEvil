# Menu principal — images à générer (Gemini)

Référence visuelle : [`illus_menu.jpeg`](illus_menu.jpeg). Le menu du proto
(`Proto4Html/src/presentation/Screens.tsx`, CSS « Menu » dans `src/index.css`)
est découpé en **six images** chargées depuis `Proto4Html/public/menu/`, plus
l'écran de chargement qui précède le menu. Les
fichiers présents sont des **gabarits** : même nom, même taille, même zone utile
que la version finale. Remplacez chaque fichier par le rendu Gemini retouché, sans
changer le nom ni les dimensions, et le menu se met à jour tout seul (`npm run dev`
recharge à chaud).

Les libellés des boutons (« Continuer », « Commencer une nouvelle évasion »…)
restent du texte HTML posé par-dessus l'image : **ne pas écrire de texte dans les
dalles**. Seul le titre est une image.

| Fichier | Taille (px) | Fond du PNG final | Rôle |
|---|---:|---|---|
| `splash.jpg` | 2752 × 1536 (16:9) | opaque | Écran de chargement : le logo sur la pierre fendue — **rendu en place** (source `raw/splash_logo.jpeg`) |
| `bg.jpeg` | 2752 × 1536 (16:9) | opaque | La gorge infernale, **sans** titre ni boutons — **rendu Gemini en place** |
| `title.png` | 922 × 240 | transparent | « SINNER'S BET » en lettres de braise |
| `btn-stone-1.png` | 1096 × 376 | transparent | Dalle de pierre bleu-gris, variante 1 (« Continuer ») |
| `btn-stone-2.png` | 1096 × 376 | transparent | Dalle de pierre, variante 2 (« Statistiques ») |
| `btn-stone-3.png` | 1096 × 376 | transparent | Dalle de pierre, variante 3 (« Option ») |
| `btn-lava.png` | 1096 × 376 | transparent | Dalle de lave (« Commencer une nouvelle évasion ») |
| `btn-small.png` | 800 × 563 | transparent | Petite pierre pour les boutons secondaires (« ← Retour », « Menu » en jeu, « Passer l'introduction ») — **rendu en place**, réduit depuis `raw/btn-small.png` |
| `btn-small-orange.png` | 800 × 563 | transparent | Même pierre en lave, pour l'action principale des petits boutons (« Suite » / « Terminer » des dialogues) — **rendu en place**, réduit depuis `raw/btn-small-orange.png` |
| `scroll.png` | 1400 × 1793 | transparent autour | Parchemin déroulé, fond des écrans Statistiques et Option — **rendu en place**, réduit depuis `raw/scroll.png` (1824 × 2336) |
| `bubble-demon.png` | 1200 × 397 | transparent autour | Bande de parchemin déchiré, bulle du démon — **rendu en place**, réduit depuis `raw/` (3584 × 1184) |
| `bubble-player.png` | 1200 × 397 | transparent autour | Même bande, papier gris-bleu, bulle du joueur — **rendu en place** |
| `dialog-bg.jpg` | 2200 × 1118 | opaque | Fond des dialogues : la salle de lave **sans personnage** — **rendu en place** (source `raw/dialog_bg.jpeg`) |
| `perso/stagiaire_*.webp` | 700 × 884 | transparent | Portraits du stagiaire posés à gauche du dialogue, un par grade (+ cinq expressions au grade 0) — **rendus en place** (sources `raw/perso/*.png`, 976 × 1075) |

Le cadre déchiré (`frame.png`) a été **retiré du menu** : le fond peint se suffit.
Le fichier peut être supprimé de `public/menu/` (4,5 Mo copiés dans le build pour
rien) ; son prompt est conservé plus bas au cas où l'idée revient.

### Transparence : Gemini rend du fond blanc, le détourage se fait à l'édition

Gemini ne produit pas de PNG à canal alpha. Pour tout ce qui doit finir
transparent, les prompts demandent un **fond blanc pur, uni, sans ombre portée ni
dégradé**, à supprimer ensuite (baguette magique ou « supprimer l'arrière-plan »),
puis à enregistrer en PNG avec alpha. Conséquences à respecter :

- **Pas de blanc pur dans le sujet** : reflets et arêtes claires en crème, ivoire
  ou bleu très pâle, jamais en `#ffffff`, sinon ils partent avec le fond.
- **Pas d'ombre portée ni de halo** dans le rendu Gemini : sur blanc, une ombre se
  détoure mal. L'ombre est ajoutée à l'édition, dans la marge prévue (14 px CSS
  autour des dalles), ou en CSS. Les dalles au repos se contentent d'une ombre
  peinte à la main sous la dalle une fois détourée.
- **Bord net et fermé** entre le sujet et le blanc, sans fumée ni braises qui
  s'évaporent hors du sujet.
- Le **fond `bg.jpeg`** reste opaque : aucun détourage, rien à prévoir.

Les PNG sont en **2×** (affichés à moitié de leur taille) pour rester nets sur
écran Retina.

### Sprites des dalles

Chaque fichier de dalle est un **sprite à deux rangées** de 1096 × 188 px :

| Rangée | Pixels (y) | État |
|---|---:|---|
| haute | 0 à 187 | repos |
| basse | 188 à 375 | **survol** (et focus clavier) : un peu plus clair, arête haute plus vive, léger halo |

Dans une rangée, la dalle occupe le rectangle central 1040 × 132 px ; les 28 px
autour (14 px CSS) reçoivent l'ombre portée, qui déborde surtout en dessous. Les
deux rangées doivent avoir **la même silhouette** : le CSS ne fait que glisser
l'image vers le haut au survol, un décalage de forme sauterait à l'œil.

L'état désactivé (« Continuer » sans partie en cours) et l'enfoncement au clic
restent en CSS (désaturation, descente de 2 px) : pas de rangée à prévoir.

Les trois variantes de pierre doivent partager palette, éclairage et épaisseur,
et ne différer que par les coins, les fissures et les coups de brosse.

## Prompts

Prompts en anglais, Gemini y répond mieux pour l'image. Le style commun est
rappelé dans chaque prompt pour que les rendus se ressemblent. Les fonds unis
(blanc, ou noir pour le cadre) sont à supprimer à l'édition, voir ci-dessus.

### 1. `bg.jpeg` — fond sans interface (fait)

> Digital painting, loose expressive brush strokes, concept-art style. A vast
> infernal canyon seen from inside: towering jagged rock walls in cold blue-grey
> and slate, glowing orange lava veins and a small erupting fissure on the left,
> drifting pale smoke and embers, a warm orange light source deep in the cave on
> the right where a tiny dark silhouette of a running man is fleeing toward the
> glow. Cinematic wide shot, horizontal 16:9 composition, high contrast between
> cold blue rock and hot orange light. The center of the image is a calm, slightly
> darker and less detailed area of smoke and rock, left empty for UI elements.
> No text, no logo, no buttons, no frame, no border. 3840 × 2160 pixels.

Le rendu en place fait 2752 × 1536 (16:9), net sur écran Retina. Le CSS
l'affiche en couverture (`background-size: cover`, centré un peu sous le
milieu), donc il est rogné en haut et en bas sur les fenêtres plus larges que
16:9, et sur les côtés sur les fenêtres plus étroites : la faille de lave à
gauche et la silhouette à droite restent dans les 70 % centraux.

### 2. `title.png` — titre

> Game logo text "SINNER'S BET" in bold condensed uppercase letters, painted
> concept-art style. The letters look carved from dark volcanic rock with glowing
> orange-red lava cracks and embers seeping through, a hot molten-orange gradient
> from yellow-orange at the top to deep red at the bottom, thin dark stone outline,
> no glow and no shadow around the letters. Straight horizontal baseline, single
> line, centered. Pure flat white background (#ffffff), nothing else in the
> image, crisp closed edges between the letters and the white, and no pure white
> inside the letters (highlights in pale cream or ivory). 922 × 240 pixels, the
> text fills about 90 % of the width.

### 3. `btn-stone-1.png`, `btn-stone-2.png`, `btn-stone-3.png` — dalles de pierre

Un prompt pour la dalle au repos, à lancer trois fois en changeant la phrase de
variante ; puis un prompt d'édition pour la rangée de survol. Assemblez repos
(haut) et survol (bas) dans un fichier 1096 × 376.

Repos :

> A single horizontal slab of blue-grey stone, viewed from the front, for a game
> menu button. Painted concept-art style with visible brush strokes: cold slate
> and steel-blue tones, a lighter chiselled top edge catching the light, darker
> thick bottom edge giving the slab depth, slightly irregular hand-cut corners.
> Flat enough in the middle for text to be readable on top. No text, no symbols.
> Pure flat white background (#ffffff), no drop shadow, no glow, crisp closed
> edges between the slab and the white, no pure white inside the slab
> (highlights in pale ivory or pale blue). 1096 × 188 pixels, the slab occupies
> the central 1040 × 132 pixels and nothing touches the image borders.
> VARIANTE.

Phrase de variante, une par fichier :

- `btn-stone-1.png` : *Variation 1: one long thin diagonal crack across the lower
  left, corners slightly rounder on the left side.*
- `btn-stone-2.png` : *Variation 2: a short crack near the upper right, a small
  chipped notch on the top edge, corners sharper on the right side.*
- `btn-stone-3.png` : *Variation 3: two fine parallel cracks near the center, a
  lighter mineral vein running across, the top edge slightly uneven.*

Survol (édition de l'image obtenue, à coller en rangée basse) :

> Same slab, same exact silhouette and position, but lit as if highlighted: the
> whole stone about 10 % brighter and the chiselled top edge catching a stronger
> cool pale-blue light. Keep the pure flat white background, still no shadow and
> no glow, and no pure white inside the slab.

L'ombre portée et le halo de survol s'ajoutent à l'édition après détourage
(ombre sous la dalle dans les deux rangées, léger halo bleu pâle autour de la
rangée basse).

### 4. `btn-lava.png` — dalle de lave

Repos :

> The same stone slab shape as the blue-grey menu slabs, same size, same angle,
> same brush style, but made of glowing lava rock: molten orange to deep
> red-brown gradient, a bright yellow-orange top edge, dark ember crust at the
> bottom edge, faint glowing cracks, a warm glow bleeding slightly around the
> slab. Flat enough in the middle for white text to stay readable. No text, no
> symbols. Pure flat white background (#ffffff), no drop shadow, no glow
> bleeding outside the slab, crisp closed edges, no pure white inside the slab
> (the hottest spots in pale yellow). 1096 × 188 pixels, the slab occupies the
> central 1040 × 132 pixels and nothing touches the image borders.

Survol (rangée basse) :

> Same lava slab, same exact silhouette and position, but hotter: the molten
> orange brighter, the top edge pale yellow, the cracks glowing more. Keep the
> pure flat white background, still no shadow and no glow outside the slab, and
> no pure white anywhere in the slab.

Ombre et halo orangé de survol ajoutés à l'édition, comme pour la pierre.

### 4 bis. `btn-small.png` — petite pierre (bouton Retour)

Même principe que les dalles, en plus court et plus épais : un galet taillé plutôt
qu'une dalle, pour les boutons secondaires. Affiché en 200 × 72 px CSS (pierre
176 × 48, marge de 12 px pour l'ombre), sprite à deux rangées de 400 × 144 px :
repos en haut, survol en bas. Le libellé (« ← Retour ») reste du texte HTML.

Repos :

> A single small chunk of blue-grey stone, viewed from the front, for a small
> game menu button: a short, thick, roughly rectangular hand-cut stone block with
> softly irregular corners, about 3.5 times wider than tall. Painted concept-art
> style with visible brush strokes, same cold slate and steel-blue palette,
> lighting and thickness as the large stone slabs of the main menu: a lighter
> chiselled top edge catching the light, a darker thick bottom edge, one short
> thin crack. Flat enough in the middle for a short word to be readable on top.
> No text, no arrow, no symbols. Pure flat white background (#ffffff), no drop
> shadow, no glow, crisp closed edges between the stone and the white, no pure
> white inside the stone (highlights in pale ivory or pale blue). 400 × 144
> pixels, the stone occupies the central 352 × 96 pixels and nothing touches the
> image borders.

Survol (rangée basse) :

> Same small stone, same exact silhouette and position, but lit as if
> highlighted: the whole stone about 10 % brighter and the chiselled top edge
> catching a stronger cool pale-blue light. Keep the pure flat white background,
> still no shadow and no glow, and no pure white inside the stone.

Ombre portée dans la marge et halo bleu pâle sur la rangée basse ajoutés à
l'édition, comme pour les dalles. Une fois le fichier en place, le CSS du bouton
Retour (classe `back`) et du bouton « Menu » du HUD pourront pointer dessus avec
le même mécanisme de sprite que les dalles (`background-size: 100% 200%`,
`background-position: bottom` au survol).

### 4 ter. `scroll.png` — parchemin (fond des statistiques et des options)

Un parchemin déroulé verticalement, rouleaux en haut et en bas, comme l'exemple
fourni. Le contenu (lignes de statistiques, options) est du HTML posé dessus, en
encre brune et petites capitales ; le titre reste au-dessus du parchemin. Comme
la hauteur du contenu varie (7 lignes de statistiques, 3 options, d'autres
demain), le CSS étire le parchemin en **neuf tranches** : les deux rouleaux et
les bords latéraux sont fixes, seul le corps du papier s'étire. Le corps doit
donc être une texture **régulière et sans motif marquant** (pas de grande
tache, pas de dessin) pour supporter l'étirement.

Découpage attendu du fichier 1400 × 1800 (2×, affiché 700 × 900 CSS au maximum) :

| Zone | Pixels | Rôle |
|---|---|---|
| rouleau du haut | y 0 à 260 | fixe, bois et papier enroulé, ombre sous le rouleau |
| corps | y 260 à 1540 | papier vieilli uniforme, étiré verticalement |
| rouleau du bas | y 1540 à 1800 | fixe |
| bords latéraux | x 0 à 120 et 1280 à 1400 | fixes : lisière du papier déchirée et bâtons des rouleaux |

Les rouleaux dépassent un peu du papier sur les côtés (bâtons visibles), comme
sur l'exemple, mais **rien ne touche les bords de l'image**.

Sur fond **noir** (le papier est clair, un fond blanc serait indétourable) :

> An unrolled vertical parchment scroll, seen from the front, for a game menu
> background. Old aged paper in warm cream and light tan with soft brown stains
> at the torn, slightly burnt edges; the middle of the paper is an even, calm
> texture with no marks, no drawing and no text, so text can be laid over it.
> At the top and at the bottom the paper is rolled around dark wooden rods with
> small worn caps, the rods sticking out a little on both sides; the roll casts a
> soft shadow on the paper below it. Painted concept-art style with visible
> brush strokes, matching a fantasy menu made of blue-grey stone and lava.
> Centered composition, the scroll fills about 85 % of the image width and 95 %
> of its height, nothing touches the image borders. Pure flat black background
> (#000000), no glow, crisp closed edges between the scroll and the black.
> 1400 × 1800 pixels.

À l'édition : supprimer le noir, vérifier que le corps du papier (y 260 à 1540)
est bien uniforme, puis ajouter une ombre portée douce sous le parchemin si
besoin (dans la marge, sans toucher les bords).

En place : le CSS (`.scroll` dans `src/index.css`) pose le parchemin en
`border-image` à neuf tranches définies en pourcentage de l'image (rouleau du
haut 18 %, bas 17,8 %, lisières 13,7 %), corps étiré selon le contenu ; le texte
est en encre brune, petites capitales Cormorant Garamond, sans cartouche. La
**zone de texte** est le padding du bloc : sous l'ombre du rouleau, à l'intérieur
des lisières déchirées. Si vous remplacez l'image par une autre, seules ces
quatre proportions et le padding sont à recaler.

### 4 quater. `bubble-demon.png`, `bubble-player.png` — bulles de dialogue

Une **bande de parchemin déchirée**, horizontale, comme un lambeau arraché à un
rouleau : c'est le fond de chaque réplique de l'intro et des transitions. Le nom
du locuteur et le texte restent du HTML par-dessus, en encre brune. Les bulles
ont **toutes des largeurs et des hauteurs différentes** (une ligne courte, trois
lignes longues) : l'image est donc étirée en neuf tranches, comme le parchemin.
Pour que les bords déchirés ne soient pas lissés par l'étirement, le CSS les
**répète** (`border-image-repeat: round`) plutôt que de les étirer : la déchirure
doit donc être **fine et régulière**, sans grand accroc unique qui se
reconnaîtrait en boucle. Le centre est du papier uni.

Découpage attendu du fichier 1200 × 400 (2×, une bulle fait de 200 à 560 px de
large et de 60 à 130 px de haut à l'écran) :

| Zone | Pixels | Rôle |
|---|---|---|
| bords déchirés haut et bas | 60 px | fixes en épaisseur, répétés en largeur |
| bords déchirés gauche et droite | 70 px | fixes en épaisseur, répétés en hauteur |
| centre | 1060 × 280 | papier uni, étiré dans les deux sens |

Deux fichiers pour distinguer les locuteurs : le démon sur parchemin crème
comme le rouleau, le joueur sur un papier **gris-bleu ardoise** (la couleur
froide des pierres du menu), même forme.

Sur fond **noir** (papier clair) :

> A single horizontal strip of torn old parchment, seen from the front, for a
> game dialogue box. Warm cream and light tan aged paper with soft brown stains
> and slightly burnt, darker torn edges; the tearing is fine and regular all
> around, with no single large notch. The middle of the strip is an even, calm
> paper texture with no marks, no drawing and no text. Painted concept-art style
> with visible brush strokes, matching a fantasy menu made of blue-grey stone,
> lava and parchment. The strip is about three times wider than tall and fills
> about 90 % of the image, centered, nothing touches the image borders. Pure flat
> black background (#000000), no drop shadow, no glow, crisp closed edges between
> the paper and the black. 1200 × 400 pixels.

Variante joueur (`bubble-player.png`), en édition de l'image obtenue ou en
relançant le prompt avec cette phrase à la place de la première couleur :

> Same torn paper strip, same exact silhouette, but the paper is a cool slate
> blue-grey with pale steel highlights and darker blue-black torn edges, like a
> page cut from a stone ledger; no warm tones.

À l'édition : supprimer le noir, vérifier que les 60 px du haut et du bas et les
70 px des côtés contiennent toute la déchirure (le centre doit être franc), puis
ajouter une ombre portée très courte (2 à 4 px) sous le lambeau si besoin, dans
la marge.

En place : `.bubble-line` dans `src/index.css` pose le lambeau en `border-image`
(tranches 13 % haut et bas, 5,5 % côtés, bords répétés, centre étiré), encre
brune pour le démon et bleu-nuit pour le joueur, nom du locuteur en petites
capitales, bulle active signalée par un halo doré. Le démon dessiné en CSS a
disparu : le personnage est un PNG détouré posé à gauche (`perso/`, voir plus
bas) et les bulles occupent la partie droite de l'écran.

### 4 bis. `perso/` — le stagiaire, un portrait par grade

Le personnage n'est plus peint dans le fond : `dialog_bg.jpeg` est une salle de
lave vide, et le stagiaire est un **PNG détouré** posé par-dessus. Il change de
costume à chaque promotion, comme son nom dans les bulles.

Sources : `raw/perso/stagiaire_<niveau>[_<expression>].png`, 976 × 1075, buste
cadré de la même façon d'un fichier à l'autre (la tête ne doit pas sauter au
changement de grade). Conversion vers `Proto4Html/public/menu/perso/` : recadrage
commun `(46, 45) → (862, 1075)`, réduction à 700 px de large, WebP qualité 88
(≈ 60 Ko contre ≈ 460 Ko en PNG, pour neuf fichiers).

| Niveau | Fichier | Grade (`DEMON_RANKS`, `texts.ts`) |
|---:|---|---|
| 0 | `stagiaire_0_{normal,neutre,doute,fier,degout}` | Stagiaire — **cinq expressions**, choisies réplique par réplique |
| 1 | `stagiaire_1_assistant` | Démon assistant (après le cercle 1) |
| 2 | `stagiaire_2_souschef` | Démon tourmenteur (après le cercle 3) |
| 3 | `stagiaire_3_chef` | Démon contremaître (après le cercle 5) |
| 4 | `stagiaire_4_boss` | Démon sous-directeur (après le cercle 7) **et** stagiaire promu (évasion) |

Cinq dessins pour six grades : les deux derniers partagent le costume du boss,
le sixième n'étant atteint qu'au moment de l'évasion.

En place : `spokenBy` (`demon.ts`) pose `portrait` sur chaque réplique du démon
d'après son grade et la `face` demandée par la ligne ; `Dialogue.tsx` monte tous
les portraits du dialogue d'un coup, superposés, et ne rend opaque que l'actuel —
le changement d'expression est un fondu de 260 ms et non un blanc le temps du
téléchargement. Quand le joueur parle, le démon garde le portrait de sa dernière
réplique. Le bas de l'image est fondu au masque CSS : deux dessins sont coupés
net au bord du fichier, ici ils se perdent dans la fumée comme les autres.

Les expressions ne servent qu'au grade 0, c'est-à-dire à l'introduction, à
l'annonce du premier boss et à la fin du premier cercle. Une `face` posée sur une
réplique dite par un grade supérieur est simplement ignorée.

### 5. `frame.png` — cadre déchiré (retiré du menu, prompt conservé)

Sur fond **noir** (un cadre clair sur fond blanc serait indétourable) :

> A decorative border for a game screen: rough torn-paper or dry-brush edge in
> pale cream and ivory (no pure white), running along all four sides of the image
> like the ragged margin of a painting, thicker in the corners, with a few paint
> splatters and uneven strokes. The border is about 60 to 120 pixels wide. The
> entire center of the image is pure flat black (#000000), nothing but the border
> is drawn, crisp edges between the cream border and the black. 3840 × 2160
> pixels.

À l'édition, supprimer le noir, puis vérifier que les bords extérieurs du cadre
touchent bien les quatre côtés de l'image (le CSS l'affiche en neuf tranches de
120 px, étirées sur les bords).

## Après génération

1. Détourer le fond uni (blanc, noir pour le cadre) et enregistrer en PNG avec
   alpha ; recadrer et redimensionner exactement aux tailles du tableau.
2. Ajouter l'ombre portée des dalles dans la marge, et le halo de la rangée de
   survol ; assembler repos (haut) et survol (bas).
3. Vérifier la transparence (`title`, `btn-*`), qu'aucun reflet n'a
   disparu avec le fond, et qu'aucun texte n'est dessiné dans les dalles.
4. Remplacer les fichiers dans `Proto4Html/public/menu/` en gardant les noms.
5. Ouvrir le menu du proto ; au survol le CSS affiche la rangée basse du sprite
   et remonte la dalle de 1 px ; l'état désactivé de « Continuer » (désaturé), le
   focus clavier et l'enfoncement au clic restent en CSS.

Les gabarits actuels ont été dessinés en CSS puis exportés en PNG ; ils montrent
la silhouette, les deux rangées et les zones d'ombre attendues.

Si une image ne convient pas, le CSS d'origine (dalles et titre dessinés sans
image) est dans l'historique git du commit qui a introduit ce fichier.
