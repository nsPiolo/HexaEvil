# Cercle 7 — Violence : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité.

Deux images, dans `Proto4Html/public/circles/07-violence/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[6]` : **Violence**, boss **Le Minotaure**, 8 âmes, 1000 pièces,
pouvoir « les distances positives de l'adversaire gagnent +1 ». Chez Dante
(chants XII-XVII), le cercle a trois giron : le **Phlégéthon**, fleuve de sang
bouillant ; le bois des suicidés ; et le **désert de sable brûlant** sous une
pluie de feu lente et continue.

Le décor retient le troisième, avec le fleuve au loin : une plaine de sable noir
et de cendre, quelques troncs morts, le ruban sombre du fleuve à l'horizon, et
les flocons de feu qui tombent sans fin.

### Le piège : c'est le cercle le plus saturé, et l'orange est une couleur d'action

Troisième collision sémantique après l'or du [cercle 4](prompts-cercle-04-avarice.md)
et le rouge du [cercle 5](prompts-cercle-05-colere.md), et la plus forte des
trois. `--ember: #d4541e` est la couleur des boutons d'action — c'est elle qui
dit « cliquez ici ». Le fichier maître note déjà qu'elle « crevait l'œil » sur
le parchemin ; posée en plus dans tout le décor, elle cesse de désigner quoi que
ce soit.

Le feu est donc demandé **lointain, éteint et ambré-brun**, jamais un orange
franc, et le sable est une **cendre sombre et désaturée**, pas un sable doré.
La violence passe par l'échelle et le vide, pas par la saturation.

### La pluie de feu est une trame de points clairs

C'est la signature visuelle du giron, et c'est aussi la texture explicitement
interdite sous du texte : des petits points clairs répartis sur toute l'image.
Elle est demandée **rare, floue et cantonnée aux tiers extérieurs**, absente du
centre — et absente du haut, où passe le fil d'Ariane écrit à même le fond.

### Le fleuve fabrique un horizon

Un ruban clair et horizontal à mi-hauteur se devine sous le plateau, comme
l'eau du cercle 5 et comme le ciel du [cercle 14](prompts-cercle-14-ciel.md). Le
fleuve est donc **interrompu**, masqué par les dunes au centre, et ne réapparaît
que dans les tiers extérieurs.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Seventh Circle of Hell, Violence: a vast
> plain of dark burning sand and ash, flanked in the left and right thirds by
> black dunes, by a few charred leafless trunks, and by the dark ribbon of a
> distant river of boiling blood glimpsed between the dunes, broken and hidden in
> the middle so that it never crosses the image as a continuous line. Slow flakes
> of falling fire drift down in the left and right thirds only, sparse, soft and
> out of focus, never a shower of bright dots. The light is dim, distant and
> amber-brown, the sand is dark desaturated ash, never golden, never bright
> orange, never saturated; the whole image is smoky, hot and exhausted rather
> than blazing. No visible flame, no bonfire, no lava, no torch, no horizon line
> across the middle, no figure. Cinematic wide shot, horizontal 16:9 composition,
> the dunes, the trunks, the distant river and the falling fire are in the left
> and right thirds; the whole central third is a calm, dark, empty and
> out-of-focus stretch of flat ash and haze with no falling fire, no river and no
> detail, left free for interface elements. Low overall brightness, the top of
> the image is the darkest part, no glow near the top edge. No text, no letters,
> no writing, no logo, no buttons, no frame, no border, no user interface.
> 2752 × 1536 pixels.

À l'édition : **prélever la teinte la plus chaude du rendu et la comparer à
`#d4541e`** — elle doit être plus sombre et plus brune ; effacer les flocons de
feu qui auraient dérivé vers le centre ; couper le fleuve s'il traverse ;
assombrir la bande du haut ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est une **dalle de pierre sous un auvent de fer** criblé et
rougi, qui protège de la pluie de feu : le seul comptoir des neuf dont l'abri
fasse partie du sujet.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: a
> low stone slab used as a betting counter under a pitted rusted iron canopy that
> shelters it from the falling fire, seen from the front, dark scorched stone and
> dull red-brown metal, with, in the right quarter only, an opening onto the
> burning plain — black dunes, one charred trunk, a few soft distant flakes of
> falling fire, lit by a dim amber-brown glow. The left three quarters of the
> image are almost entirely dark, calm and empty scorched stone in deep
> desaturated brown-black, barely lit, with no detail, no object, no falling
> fire and no pattern, so that small text stays perfectly readable over it. The
> warm light stays dim, brown and distant, never bright orange, never saturated.
> Very low overall brightness, no bright highlight outside the right quarter, no
> strong edge in the middle, no visible flame, no lava. Wide cinematic 3:1
> composition. No text, no letters, no writing, no logo, no buttons, no cards, no
> user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; effacer tout flocon
de feu tombé à gauche ; vérifier que le quart droit ne dépasse pas l'ambre du
cercle 1, sinon il éteint le bouton « Lancer la course ».

---

## Après génération

1. `Proto4Html/public/circles/07-violence/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte — et regarder
   d'abord **les boutons d'action**, en terre cuite sur le parchemin et en
   `--ember` ailleurs.
