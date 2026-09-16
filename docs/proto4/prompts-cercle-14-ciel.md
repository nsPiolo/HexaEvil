# Cercle 14 — Le ciel : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. Cercle du **mode
démon** (GDD §8.1), avant-dernier avant le
[paradis](prompts-cercle-15-paradis.md).

Deux images, dans `Proto4Html/public/circles/14-ciel/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

Plus de sol du tout. La table flotte en plein orage, entre des falaises de
nuages noirs qui montent à perte de vue, traversées d'éclairs lointains et
d'oiseaux immenses. Le démon a fini de monter et le jeu se tient en l'air, sans
rien dessous.

### Un ciel n'a pas de tiers extérieurs

C'est le problème de composition de ce cercle, et il est l'inverse de celui de
la [falaise](prompts-cercle-11-falaise.md) : un ciel ouvert n'a **aucune
verticale**, donc rien à mettre dans les deux bandes latérales que le joueur
voit réellement, et tout se retrouve étalé au milieu — sous la table.

La parade est déjà éprouvée dans le jeu : **deux murs de cumulonimbus** tenant
le rôle des falaises du cercle 2, l'air ouvert au centre. La composition du
gouffre de la Luxure fonctionne ici pour la même raison géométrique.

### La dalle doit poser sur quelque chose

`.felt` est une dalle de pierre opaque, et son `drop-shadow` la décolle du fond.
Sur un ciel vide, elle **flotte sans assise** et l'écran perd son poids. D'où
une demande précise, qui n'apparaît dans aucun autre cercle : une **bande de
nuages plus denses et plus sombres à mi-hauteur**, sur toute la largeur, contre
laquelle la dalle se pose.

Deux choses à interdire : un **horizon clair et droit**, la pire ligne possible
en travers du centre, et un ciel **clair en haut du cadre** — le fil d'Ariane
(`.steps`) s'y écrit à même le fond, sans plaque. Donc orage de nuit, pas ciel
de beau temps.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre calme,
rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Fourteenth Circle, high in the open
> sky: a canyon of immense black storm clouds, two towering cumulonimbus walls
> rising out of frame on the left and on the right like cliffs, boiling and
> ragged, veined with distant silent lightning deep inside them, a few huge dark
> birds wheeling far off along the cloud walls, torn streamers of vapour. No
> ground, no land, no horizon line, no sun, no moon, no stars. Across the middle
> height of the image, a continuous band of denser, darker, heavier cloud runs
> from side to side, like a dark floor of vapour. The sky is deep blue-black and
> charcoal, the lightning is cold and distant, no fire, no flames, no bright
> sky, no daylight. Cinematic wide shot, horizontal 16:9 composition, the cloud
> walls, the lightning and the birds are in the left and right thirds; the whole
> central third is a calm, dark, empty and out-of-focus expanse of open air and
> vapour with no lightning, no bird and no detail, left free for interface
> elements. Very low overall brightness, the top of the image is the darkest
> part. No text, no letters, no writing, no logo, no buttons, no frame, no
> border, no user interface. 2752 × 1536 pixels.

À l'édition : vérifier qu'aucun **horizon** ne s'est formé en travers du centre
(le cas échéant, le casser au pinceau avec des lambeaux de vapeur) ; assombrir
la bande du haut ; **poser `frame.webp` par-dessus** et vérifier que la dalle a
l'air posée et non collée ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est une **passerelle de pierre** restée en l'air, dernier
morceau d'un pont dont tout le reste est tombé.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> broken stone parapet of a ruined bridge hanging alone in the open sky and used
> as a betting counter, seen from the front, dark weathered stone with its iron
> rail twisted, with, in the right quarter only, an opening onto the storm — black
> boiling cloud walls, one distant silent lightning flash deep inside the vapour,
> a single far-off bird, lit by a cold pale glow. The left three quarters of the
> image are almost entirely dark, calm and empty weathered stone in deep
> desaturated blue-black, barely lit, with no detail, no object, no cloud and no
> pattern, so that small text stays perfectly readable over it. Very low overall
> brightness, no bright highlight outside the right quarter, no strong edge in
> the middle, no horizon line, no fire, no flames, no daylight. Wide cinematic
> 3:1 composition. No text, no letters, no writing, no logo, no buttons, no
> cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; s'assurer que
l'éclair du quart droit reste **diffus** — un éclair net et ramifié tire l'œil
plus fort que le bouton « Lancer la course ».

---

## Après génération

1. `Proto4Html/public/circles/14-ciel/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte, en regardant
   surtout l'assise de la dalle : c'est le seul cercle où elle ne repose sur
   rien.
