# Cercle 2 — Luxure : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md), qui reste la
référence pour la direction artistique commune, les découpages et les règles de
lisibilité. Ici, seulement ce qui est **propre au cercle 2**.

Deux images à générer, dans `Proto4Html/public/circles/02-luxure/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

La dalle de pierre (`frame.webp`), le parchemin (`shop.webp`) et les dalles de
registre (`tier.webp`) restent **partagés par les neuf cercles** dans
`public/table/` : rien à générer de ce côté. Les rendus bruts vont dans
`docs/proto4/raw/` (traçabilité IA, `docs/STEAM_AI_DISCLOSURE.md`).

## L'univers du cercle 2

`run.circles[1]` dans `config/race.json` : **Luxure**, boss **Minos**, 6 âmes,
280 pièces pour sortir, pouvoir « les vents éternels : tout -1 devient -2 ».
Les âmes du GDD : Didon, Cléopâtre, Tristan, Isolde, Paolo et Francesca.

Chez Dante (chant V), les luxurieux sont emportés sans repos par la *bufera
infernale*, une tempête noire qui les projette contre les parois. Comme les
Limbes, c'est un cercle **sans feu** : le froid, la pluie et le vent, pas la
lave. La seule lumière est celle des **éclairs pourpres** sur un ciel noir.

### Deux écarts à surveiller

- **La phrase de DA commune parle de `warm firelight`** et elle est reprise mot
  pour mot — c'est elle qui fait tenir les neuf cercles ensemble. La phrase
  d'univers doit donc l'**annuler explicitement** (`no fire, no flames, no
  lava, no torch`) : le contraste chromatique est porté ici par le violet
  électrique contre le basalte noir, pas par l'ambre.
- **Pas de corps, pas de peau.** Le cercle se prête à l'illustration
  érotique ; ce n'est ni le ton du jeu ni ce que les filtres de Gemini laissent
  passer. Les figures restent **lointaines, petites, entièrement drapées**, vues
  en silhouette : ce sont les étoffes arrachées qui disent la luxure, pas les
  corps. La consigne est écrite dans les deux prompts.

---

## 1. `bg.jpg` — le décor du cercle

Mêmes contraintes de composition que pour les Limbes : posé en `cover` sur
`.table` avec un dégradé sombre par-dessus, il est recouvert en son milieu par
la table de jeu (1400 px CSS). Seules restent visibles **deux bandes latérales
d'environ 260 px** sur un écran 1920, plus le haut de l'écran. L'intérêt va donc
dans les **tiers extérieurs**, le centre reste sombre et vide. L'image est calée
en `center 45%` et rognée en haut et en bas : rien d'important dans les 10 % du
haut ni du bas.

Les deux falaises qui encadrent le gouffre tombent bien : elles occupent
naturellement les tiers extérieurs et laissent le milieu au ciel noir.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Second Circle of Hell, Lust: a vast
> chasm between two towering wind-carved cliffs of dark wet basalt, an endless
> black storm roaring through it, long torn sails and shredded veils of cloth
> whipped upward along the rock walls on both sides, ragged robed silhouettes
> carried helplessly by the gale in the far distance, sheets of cold driving
> rain, violet and magenta lightning flashing behind the cliffs and rimming
> their edges in cold purple light, black starless sky, no fire, no flames, no
> lava, no torch, no warm light, violent and mournful. Cinematic wide shot,
> horizontal 16:9 composition, the cliffs, the flying cloth and the lightning
> are in the left and right thirds; the whole central third is a calm, dark,
> empty and out-of-focus area of black sky and drifting rain, left free for
> interface elements. All figures are distant, small, faceless and fully
> draped in flowing cloth, no bare skin, no nudity, no close-up body. No text,
> no letters, no writing, no logo, no buttons, no frame, no border, no user
> interface. 2752 × 1536 pixels.

À l'édition : assombrir le tiers central si un éclair y a laissé du contraste —
le violet saturé remonte vite sous le dégradé du CSS ; vérifier qu'aucune
source lumineuse ne tombe derrière la table ; exporter en JPEG qualité 82,
progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

Le panneau de paris s'ouvre en bas de la table, en trois colonnes (type de
pari · âmes · mise) plus un en-tête et un pied. C'est l'écran le plus chargé en
texte du jeu : l'image est un fond d'ambiance. Elle est posée en `cover`, calée
**à droite**, sous un dégradé horizontal qui la rattrape (`.panel-bets
.bet-panel` dans `src/index.css`) — d'où la règle : **valeurs basses partout**,
la lumière seulement dans le quart droit, là où il n'y a que le bouton « Lancer
la course ».

Pour les Limbes, c'était un guichet de pierre avec une échappée sur la plaine
grise. Ici, le même guichet est **taillé dans la falaise**, et l'échappée donne
sur le gouffre et sa tempête.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel:
> the worn stone parapet of an ancient betting booth cut into the cliff of the
> Second Circle of Hell, seen from the front, cold dark basalt streaked with
> rain, with, in the right quarter only, the cliff opening onto the eternal
> storm — driving rain, a long torn veil whipped upward by the wind, two tiny
> distant draped silhouettes carried away into the dark, lit by a cold violet
> lightning glow. The left three quarters of the image are almost entirely
> dark, calm and empty wet stone in deep desaturated blue-black, barely lit,
> with no detail, no object and no pattern, so that small text stays perfectly
> readable over it. Very low overall brightness, no bright highlight outside
> the right quarter, no strong edge in the middle, no fire, no flames, no
> torch. The figures are distant, small, faceless and fully draped, no bare
> skin, no nudity. Wide cinematic 3:1 composition. No text, no letters, no
> writing, no logo, no buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : mesurer la luminance des trois quarts gauche (viser < 20 %) et
assombrir si besoin ; **désaturer l'éclair** s'il tire vers le magenta pur, qui
bave sur le texte blanc du bouton ; poser au besoin un léger dégradé sombre de
gauche à droite pour que la colonne des mises reste lisible.

---

## Après génération

1. Enregistrer les deux fichiers dans
   `Proto4Html/public/circles/02-luxure/{bg.jpg,bet-bg.jpg}` (JPEG qualité 82,
   progressif — pas de WebP ici, ce sont des images opaques).
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)) :
   `{ 1: '01-limbes', 2: '02-luxure' }`. Sans ça, le cercle 2 retombe sur le
   décor des Limbes, qui est le comportement de repli voulu.
3. Ouvrir le cercle 2 et vérifier les deux états qui changent la hauteur de la
   table : panneau de paris ouvert, puis boutique ouverte — le parchemin clair
   sur un fond d'orage violet est le cas de contraste le plus défavorable des
   neuf cercles.
