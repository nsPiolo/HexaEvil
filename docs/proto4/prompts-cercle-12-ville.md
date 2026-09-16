# Cercle 12 — La ville bondée : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. Cercle du **mode
démon** (GDD §8.1).

Deux images, dans `Proto4Html/public/circles/12-ville/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

La cité infernale, un soir de foule. Des rues étroites à balcons de fer,
saturées d'âmes qui font la queue devant des guichets qui n'ouvrent jamais ; des
échafaudages, du linge tendu en travers, des lanternes basses, une brume de
suie. On parie au milieu d'une file d'attente éternelle : le cercle est
administratif, pas grandiose.

### C'est le décor le plus dangereux des quinze

Une foule, c'est du **détail haute fréquence partout** — exactement ce que la
règle de lisibilité interdit. Trois parades, écrites dans le prompt :

- la foule est une **masse de silhouettes à contre-jour dans la brume**, pas une
  collection d'individus ;
- elle est **cantonnée aux tiers extérieurs** ; le centre est une place vide,
  sombre et floue — le seul endroit désert de la ville, ce qui se justifie
  narrativement : c'est là qu'on a dressé la table ;
- **aucun visage**. De près, un visage peint devient un personnage et concurrence
  les âmes en course, qui sont des composants React ; et une foule de visages
  générés vire à l'inquiétant.

### Une ville, c'est de l'écrit

C'est le risque n° 1 de ce cercle : Gemini couvre spontanément une rue
d'enseignes, de banderoles, de numéros et de cadrans. Le « no text » habituel ne
suffit pas, il est donc **détaillé** : ni enseigne, ni panneau, ni affiche, ni
banderole, ni numéro de porte, ni horloge. À l'édition, relire l'image à 100 %
avant de la garder : un faux mot dans une bande latérale se voit en jeu.

Autre motif à surveiller : les **fenêtres éclairées**, qui forment une grille
régulière de points clairs. Peu nombreuses, faibles, et dans les tiers
extérieurs seulement.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, centre recouvert par la table, intérêt dans les
tiers extérieurs, rien d'important dans les 10 % du haut ni du bas — et le haut
reste sombre, le fil d'Ariane s'y écrit à même le fond.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Twelfth Circle, the crowded infernal
> city: a narrow street of tall soot-black tenements with iron balconies,
> scaffolding and sagging lines of hanging cloth, closing in on both sides, and
> along both walls a dense endless queue of damned souls waiting at shuttered
> booths. The crowd is a dark mass of faceless backlit silhouettes dissolving
> into smoke, never individual people, no visible face, no portrait, no close
> figure. A few low iron lanterns and a handful of dim window lights glow warm
> amber against the cold soot-grey stone, thick coal smoke and haze everywhere,
> no fire, no flames, no lava, no sky. Cinematic wide shot, horizontal 16:9
> composition, the buildings, the crowd and the lanterns are in the left and
> right thirds; the whole central third is a calm, dark, empty and out-of-focus
> patch of bare wet pavement with nobody on it, no lantern, no window and no
> detail, left free for interface elements. Absolutely no signage of any kind:
> no shop sign, no banner, no poster, no placard, no house number, no clock
> face, no symbol, no letters, no numbers, no writing anywhere in the image. Low
> overall brightness, the top of the image is the darkest part. No logo, no
> buttons, no frame, no border, no user interface. 2752 × 1536 pixels.

À l'édition : relire l'image à 100 % et **effacer au tampon tout signe qui
ressemble à de l'écriture**, y compris dans la brume ; assombrir le tiers
central et la bande du haut ; réduire le nombre de fenêtres allumées si elles
forment une trame régulière ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est ici littéralement un **guichet** : le comptoir de
zinc d'un bureau donnant sur la rue — le seul des quinze où le décor et la
fonction coïncident.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> scratched zinc counter of an old clerk's booth opening onto the street of the
> infernal city, seen from the front, dark dented metal and sooty wood, with, in
> the right quarter only, an opening onto the street — a dense dark mass of
> faceless backlit silhouettes queueing in the smoke, one low iron lantern, a
> warm amber haze. The left three quarters of the image are almost entirely
> dark, calm and empty metal and wood in deep desaturated grey-black, barely
> lit, with no detail, no object, no figure and no pattern, so that small text
> stays perfectly readable over it. Very low overall brightness, no bright
> highlight outside the right quarter, no strong edge in the middle, no fire, no
> flames. No visible face, no portrait. Absolutely no signage: no sign, no
> banner, no poster, no number, no letters, no writing anywhere. Wide cinematic
> 3:1 composition. No logo, no buttons, no cards, no user interface.
> 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; vérifier qu'aucune
silhouette n'a débordé à gauche, la foule doit s'arrêter net.

---

## Après génération

1. `Proto4Html/public/circles/12-ville/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte.
