# Cercle 13 — La montagne enneigée : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. Cercle du **mode
démon** (GDD §8.1).

Deux images, dans `Proto4Html/public/circles/13-montagne/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

Une arête à flanc de montagne, en pleine tempête de nuit. Des séracs bleus, des
pierres dressées à moitié ensevelies, des cordes fixes qui claquent au vent,
quelques silhouettes encordées arrêtées pour toujours à mi-pente. Parenté avec
le neuvième cercle de Dante — le froid comme châtiment final — mais à ciel
ouvert et debout, là où le Cocyte est un lac horizontal.

### Le premier décor clair : ce que ça casse

Les douze cercles précédents sont sombres, et l'interface a été calibrée
là-dessus. Un point précis le prouve : le **fil d'Ariane** (`.steps`,
[index.css:1146](Proto4Html/src/index.css#L1146)) est du texte clair — `--ink`
pour les étapes faites, `#ffd479` avec un halo doré pour l'étape en cours —
posé **à même le fond, sans plaque**, contrairement au HUD qui a la sienne
(`rgba(20, 16, 15, 0.75)`). Il se trouve exactement en haut de l'écran, où une
montagne enneigée met naturellement sa zone la plus claire.

D'où le parti pris, qui n'est pas un compromis mais le meilleur choix de DA
disponible : **c'est une tempête de nuit**. Le ciel est noir, la neige est une
matière sombre, bleu nuit, et le blanc n'apparaît que par rafales dans les tiers
extérieurs. Le décor reste spectaculaire sans jamais monter en valeur là où on
lit.

### La dalle sur la neige

Même collision de teinte qu'au [cercle 10](prompts-cercle-10-fonds-marins.md) :
`frame.webp` est une pierre **bleu-gris froid**, et une neige de nuit est
exactement de cette teinte. La neige est donc demandée **bleu nuit profond, très
en dessous de la dalle en valeur**, et les arêtes rocheuses sont noires, pas
grises.

Deux motifs à contenir : les **stries du blizzard**, fines et régulières
(tiers extérieurs seulement), et les **lignes de crête**, diagonales à fort
contraste (hors du centre).

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Thirteenth Circle, the frozen mountain:
> a high exposed ridge at night in a howling blizzard, flanked on both sides by
> towering blue ice seracs and black rock spurs half buried in snow, leaning
> standing stones, frozen fixed ropes snapping in the wind, and two or three
> distant roped silhouettes stopped forever on the slope. The sky is black and
> starless, the snow is a dark deep night-blue mass, not white, lit only by a
> faint cold moonless glow; driving snow streaks whip across the left and right
> thirds only. No fire, no flames, no torch, no sunrise, no bright sky, no white
> highlight anywhere near the top of the image. Cinematic wide shot, horizontal
> 16:9 composition, the seracs, the rock spurs and the blowing snow are in the
> left and right thirds; the whole central third is a calm, dark, empty and
> out-of-focus slope of deep blue snow with no streaks, no rock, no rope and no
> detail, left free for interface elements. Very low overall brightness, the top
> of the image is the darkest part, no ridgeline crossing the middle. No text,
> no letters, no writing, no logo, no buttons, no frame, no border, no user
> interface. 2752 × 1536 pixels.

À l'édition : **mesurer la luminance de la bande du haut** (celle du fil
d'Ariane) et l'abaisser sans pitié, c'est le contrôle décisif de ce cercle ;
poser `frame.webp` par-dessus pour vérifier que la dalle se détache de la neige ;
JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est un **cairn** doublé d'une plaque de glace, à l'abri
d'un surplomb.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> flat slab on top of a snow-crusted stone cairn used as a betting counter under
> a rock overhang on a night mountain, seen from the front, black rock rimed with
> frost and hard dark ice, with, in the right quarter only, an opening onto the
> storm — blue seracs, driving snow, one distant roped silhouette, lit by a faint
> cold blue glow. The left three quarters of the image are almost entirely dark,
> calm and empty frosted black rock in deep desaturated blue-black, barely lit,
> with no detail, no object, no snow streaks and no pattern, so that small text
> stays perfectly readable over it. Very low overall brightness, the snow is dark
> night-blue and never white, no bright highlight outside the right quarter, no
> strong edge in the middle, no fire, no flames, no torch. Wide cinematic 3:1
> composition. No text, no letters, no writing, no logo, no buttons, no cards, no
> user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; effacer les stries
de neige qui auraient débordé à gauche ; vérifier que le quart droit ne monte
pas plus haut en valeur que l'ambre du cercle 1, sinon il éteint le bouton
« Lancer la course ».

---

## Après génération

1. `Proto4Html/public/circles/13-montagne/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte — et cette fois,
   regarder d'abord **le fil d'Ariane en haut de l'écran**.
