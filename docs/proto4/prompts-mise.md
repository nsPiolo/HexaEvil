# Zone de mise — jetons à poser (images à générer, Gemini)

Référence d'intention : un plateau de pierre avec un **logement vide** (la zone
active), le **jeton sélectionné** posé dedans et mis en feu, et les autres jetons
en réserve autour. On prend l'idée de disposition, pas le rendu : les prompts
décrivent une pièce originale, dans le style déjà en place
(`raw/frame.png`, `raw/btn-small.png`, fond `bg.jpeg`).

Aujourd'hui la mise est une rangée de boutons texte
(`BetPanel.tsx`, `.bet-stakes` / `.chip` dans `src/index.css`). On la remplace par
des jetons peints déplaçables (drag and drop **et** clic), donc par des images
chargées depuis `Proto4Html/public/table/chips/`.

## Découpage en fichiers

| Fichier | Taille (px) | Fond du PNG final | Rôle |
|---|---:|---|---|
| `chip-1.png` | 256 × 256 | transparent | Jeton palier 1, vert-de-gris (mise la plus basse) |
| `chip-2.png` | 256 × 256 | transparent | Jeton palier 2, bleu ardoise |
| `chip-3.png` | 256 × 256 | transparent | Jeton palier 3, rouge braise |
| `chip-4.png` | 256 × 256 | transparent | Jeton palier 4, or |
| `chip-flames.png` | 384 × 384 | **noir pur**, posé en `mix-blend-mode: screen` | Couronne de flammes du jeton sélectionné |
| `socket.png` | 256 × 512 (sprite 2 rangées) | transparent | Logement vide : rangée haute = repos, rangée basse = survol / cible de drop |
| `tray.png` | 1200 × 420 | transparent | Rebord de pierre qui porte les jetons en réserve |

Tous les PNG sont en **2×** (affichés à moitié). Le jeton actif s'affiche à
~110 px CSS, ceux de la réserve à ~52 px : une seule image par palier suffit.

### Trois règles qui conditionnent les prompts

1. **Aucun chiffre peint sur le jeton.** Les mises viennent de
   `config/race.json` (`economy.stakes`, aujourd'hui `[5, 10, 20, 50]`) et sont
   éditables : le nombre reste du texte HTML posé sur le médaillon central. Les
   prompts demandent donc un **centre lisse, vide, légèrement en creux**,
   couvrant ~55 % du diamètre. Le palier `n` prend `chip-{n}.png` par index.
2. **Pas d'état « sélectionné » dans le fichier du jeton.** La sélection =
   `chip-flames.png` en dessous (blend `screen`) + `filter: drop-shadow()` en
   CSS. Le drag (inclinaison, agrandissement, ombre portée) est aussi du CSS :
   rien à générer pour ça.
3. **Transparence : Gemini ne rend pas d'alpha.** Fond blanc pur uni pour tout ce
   qui doit finir détouré, aucun blanc pur dans le sujet (reflets en crème /
   ivoire), aucune ombre portée ni halo dans le rendu, bord net et fermé.
   Exception : `chip-flames.png` se rend sur **noir pur** et n'est pas détouré,
   le blend `screen` mange le noir tout seul.

## Style commun

À coller en tête de chaque prompt (déjà inclus ci-dessous) :

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. Cold blue-grey slate stone, warm ember and molten-gold accents,
> high contrast, painted highlights, no cel shading, no 3D render look, no vector
> flat design.

## Prompts

Prompts en anglais, Gemini y répond mieux pour l'image.

### 1. Jetons — direction A : « jeton de tripot infernal »

Le plus proche de la référence. Une passe par palier, on ne change que la phrase
de couleur.

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. A single round gambling chip seen perfectly from above, flat top-down
> view, centered, filling about 90 % of the frame. The chip is a thick disc of
> carved stone and tarnished metal: a raised outer rim with six evenly spaced
> inset notches inlaid with dull antique brass, a ring of worn engraved infernal
> ornaments between the rim and the center, tiny chips and scratches in the
> stone. The center is a **flat, smooth, slightly recessed circular medallion
> covering the middle 55 % of the chip, completely empty** — no number, no letter,
> no symbol, no text anywhere in the image. COLOR: deep verdigris green stone
> with brass inlays. Even frontal lighting, subtle painted highlight on the upper
> left of the rim. Pure flat white background (#ffffff), nothing else in the
> image, crisp closed edge between the chip and the white, no drop shadow, no
> glow, no reflection on the background, and no pure white inside the chip
> (highlights in pale cream or ivory). 1024 × 1024 pixels, square.

Remplacer la ligne `COLOR:` :

| Fichier | Ligne COLOR |
|---|---|
| `chip-1.png` | `COLOR: deep verdigris green stone with brass inlays.` |
| `chip-2.png` | `COLOR: dark slate blue stone with cold silver inlays.` |
| `chip-3.png` | `COLOR: deep oxblood red stone with dark bronze inlays, faint ember-orange glow in the engraved lines.` |
| `chip-4.png` | `COLOR: black obsidian with rich molten-gold inlays and gold ornaments.` |

Les quatre doivent partager **silhouette, épaisseur, nombre d'encoches et
éclairage** : seule la couleur change. Le plus simple est de générer le palier 1,
puis de demander les trois autres en édition d'image — « same chip, same shape,
same lighting, only change the colour to … ».

### 2. Jetons — direction B : « sceau d'os et de cire »

Variante à tester : moins casino, plus greffe infernale.

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. A single round token seen perfectly from above, flat top-down view,
> centered, filling about 90 % of the frame. The token is a disc of pale carved
> bone bound by a thin iron ring, its surface cracked and stained, with a broken
> wax seal ring around the edge. The center is a flat, smooth, slightly recessed
> circular medallion covering the middle 55 % of the token, completely empty — no
> number, no letter, no symbol, no text anywhere in the image. COLOR: bone ivory
> with dark green wax and black iron. Even frontal lighting. Pure flat white
> background (#ffffff), crisp closed edge, no drop shadow, no glow, no pure white
> inside the token (bone in warm cream and beige). 1024 × 1024 pixels, square.

Paliers : `dark green wax` → `deep blue wax`, `blood red wax`, `gold wax with
gilded iron`.

### 3. Jetons — direction C : « obole du passeur »

Variante monnaie antique, cohérente avec les âmes de Dante (Homère, Virgile…).

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. A single ancient coin seen perfectly from above, flat top-down view,
> centered, filling about 90 % of the frame. The coin is hand-struck and slightly
> irregular, its edge uneven and nicked, its surface pitted and encrusted with
> ash and old patina, a beaded border running around the rim. The center is a
> flat, worn, slightly recessed circular field covering the middle 55 % of the
> coin, completely blank and struck smooth — no number, no letter, no portrait,
> no symbol, no text anywhere in the image. COLOR: weathered green-patina bronze.
> Even frontal lighting. Pure flat white background (#ffffff), crisp closed edge,
> no drop shadow, no glow, no pure white inside the coin. 1024 × 1024 pixels,
> square.

Paliers : `weathered green-patina bronze` → `tarnished cold silver`, `dark copper
with red patina`, `worn yellow gold`.

### 4. Planche d'exploration (à lancer en premier)

Pour choisir une direction avant de produire les quatre paliers :

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. A character sheet of six different round gambling tokens for an
> infernal betting game, arranged in a clean 3 × 2 grid on a pure flat white
> background, each token seen perfectly from above, flat top-down view, same
> size, generous even spacing. Six distinct design directions: carved stone
> casino chip with brass notches, cracked bone disc with a wax seal, ancient
> hand-struck patinated coin, black obsidian disc with molten lava cracks, iron
> token with a hanging broken chain link, folded parchment medal with a brass
> rim. Every token has a flat empty recessed center medallion — no number, no
> letter, no symbol, no text anywhere in the image. Cold blue-grey and ember
> palette. No drop shadows, no glow, crisp closed edges. 2048 × 1365 pixels.

### 5. `chip-flames.png` — couronne de flammes du jeton sélectionné

Seul fichier rendu sur noir, appliqué **derrière** le jeton actif en
`mix-blend-mode: screen` (le noir disparaît, aucun détourage à faire).

> Digital painting, loose expressive brush strokes, concept-art style. A ring of
> licking orange and yellow flames with rising sparks and embers, forming a
> circular crown seen from above: the flames rise from the edge of an invisible
> disc and lean outward, the exact center of the image is a clean empty circle of
> pure black covering the middle 60 % of the frame, with no flame and no smoke
> inside it. Hot molten-orange to pale yellow gradient, a few drifting embers
> around the ring. Pure flat black background (#000000), nothing else in the
> image, no stone, no chip, no object, no text. 1024 × 1024 pixels, square, the
> flame ring centered.

Le trou central est important : c'est là que se pose le jeton, sinon les flammes
passent par-dessus en mode `screen`.

### 6. `socket.png` — le logement vide (cible du drop)

Sprite à deux rangées de 256 × 256 : repos en haut, survol / cible active en bas.
Deux rendus, **même silhouette**, assemblés à l'édition.

Repos :

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. An empty round socket carved into a block of cold blue-grey slate
> stone, seen perfectly from above, centered, the round hole filling about 75 %
> of the frame. The hole is deep and dark, its inner wall worn smooth, its stone
> rim chipped and cracked, a faint ring of old ash and soot around the opening.
> Nothing inside the hole: no chip, no coin, no object, no number, no text. Even
> frontal lighting, cold palette, no warm light. Pure flat white background
> (#ffffff) outside the stone block, crisp closed edge, no drop shadow, no glow,
> no pure white in the stone. 1024 × 1024 pixels, square.

Survol (prompt d'édition sur le rendu précédent) :

> Same image, same stone block, same hole, exactly the same shape, size and
> framing. Only change the lighting: a warm ember-orange light now rises from
> inside the hole and grazes the inner wall and the upper edge of the rim, the
> ring of soot glows faintly orange, a few small embers sit on the stone. The
> hole stays empty. Keep the pure flat white background, no drop shadow, no glow
> spilling onto the white background.

### 7. `tray.png` — le rebord de pierre de la réserve

Le rail horizontal sur lequel reposent les jetons non sélectionnés. Le CSS pose
les jetons par-dessus : **aucun jeton dans l'image**.

> Digital painting, loose expressive brush strokes, concept-art style, dark
> fantasy. A horizontal ledge of cold blue-grey slate stone seen slightly from
> above, like a narrow shelf or a stone tray with a low raised lip along its
> front edge, its surface worn and dusted with ash, a few cracks and iron rivets
> at both ends. Empty: no chips, no coins, no objects, no number, no text. Even
> frontal lighting, cold palette with a faint warm reflection on the front lip.
> Pure flat white background (#ffffff) around the ledge, crisp closed edges, no
> drop shadow, no glow, no pure white in the stone. 2400 × 840 pixels,
> horizontal, the ledge filling the full width.

## Intégration (faite)

Sources retenues dans [`raw/mises/`](raw/mises), exportées en webp 2× vers
`Proto4Html/public/table/chips/` (272 Ko au total) :

| Source | Asset | Taille |
|---|---|---:|
| `chip-1..4.png` (2048²) | `chip-1..4.webp` | 256 × 256 |
| `flammes.png` | `flames.webp` | 384 × 384 |
| `socket.png` (2048 × 4096) | `socket.webp` | 256 × 512, sprite 2 rangées |
| `tray.png` | `tray.webp` | 1200 × 418 |

Les rendus sont revenus **déjà détourés** (canal alpha), flammes comprises : le
détour par le fond noir et `mix-blend-mode: screen` prévu au §5 n'a pas servi,
les flammes sont simplement posées sur le jeton (`z-index`), et elles ne s'allument
que sous la **mise maximum** : le logement suffit à dire « choisi », le feu dit
« tu joues gros ». Les deux règles sont tenues par `E2E-03-F` et `E2E-03-G`.

Deux directions cohabitent : `chip-1` et `chip-2` sont des oboles (§3), `chip-3`
et `chip-4` des jetons gravés à encoches (§1). Ça se lit comme une montée en
valeur (monnaie usée → jeton d'apparat) ; pour uniformiser, reprendre le rendu
qui plaît et demander les autres en édition — « same token, same shape, same
lighting, only change the colour to … ».

Le code : `.stake-zone` dans `src/index.css`, la colonne « III — Mise » de
`BetPanel.tsx` (glisser-déposer natif, comme l'appariement des dés dans
`PlaySlots.tsx`), test `E2E-03-F` dans `e2e/03-paris.spec.ts`.

## Ce qui reste en CSS, donc à ne pas générer

- Le **chiffre** de la mise (texte HTML sur le médaillon).
- L'**état sélectionné** : le jeton passe dans le logement, sa place sur le rebord reste creuse.
- La **mise maximum** : `flames.webp` par-dessus le jeton, qui suit ses agrandissements au survol.
- Le **drag** : `transform: scale(1.08) rotate(-4deg)` + ombre portée, retour animé si drop hors zone.
- Le **survol de la cible** : bascule vers la rangée basse de `socket.png`.
- L'état **désactivé** (mise > argent disponible) : désaturation + opacité.
