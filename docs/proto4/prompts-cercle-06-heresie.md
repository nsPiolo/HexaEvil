# Cercle 6 — Hérésie : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité.

Deux images, dans `Proto4Html/public/circles/06-heresie/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[5]` : **Hérésie**, boss **Les Furies**, 8 âmes, 800 pièces, pouvoir
« le seuil de pari tombe à 40 % du parcours ». Chez Dante (chants IX-X), la cité
de Dité s'ouvre sur une plaine de **sépulcres ouverts et chauffés à blanc**, dont
les couvercles sont soulevés ; les hérétiques y brûlent debout.

Le décor : une nécropole à perte de vue, pierre fendue et noircie, dalles
renversées, et la braise blanche qui sourd de l'intérieur des tombeaux.

### Le piège : un tombeau ouvert est un rectangle lumineux

C'est le motif le plus dangereux des neuf cercles, et il est pourtant la
signature du lieu. Une rangée de sépulcres vus de face donne une **file de
rectangles clairs alignés et régulièrement espacés** — exactement la silhouette
des cartes de la boutique et des cartouches de pari, qui sont eux aussi des
rectangles posés sur du sombre. Le fond se met à ressembler à l'interface, et
l'œil va y chercher du contenu.

Trois parades, écrites dans le prompt :

- **peu de tombeaux**, espacés **irrégulièrement**, jamais en file ;
- vus **de trois quarts ou en fuyante**, jamais de face : une ouverture oblique
  ne lit plus comme un rectangle ;
- la lueur **diffuse et contenue dans l'ouverture**, qui déborde en halo sur la
  pierre au lieu de découper un bord net.

### La braise blanche bat tout le reste en valeur

Le blanc est la valeur la plus haute disponible, et l'interface s'appuie sur des
hautes lumières bien plus faibles : le halo doré de l'étape en cours, les
liserés de sélection. Une braise vraiment blanche les écrase. Elle est donc
demandée **blanc d'os légèrement bleuté et basse en intensité**, jamais un blanc
pur, et **absente du centre** comme de la bande haute où passe le fil d'Ariane.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Sixth Circle of Hell, Heresy: a vast
> necropolis of open stone sepulchres on a cracked blackened plain, with, in the
> left and right thirds only, a few scattered tombs at irregular distances,
> their heavy lids heaved aside and half broken, seen from three quarters or
> receding at an angle, never square to the viewer, never in a row. From inside
> them rises a dim bone-white, faintly bluish glow that spills softly onto the
> surrounding stone as a diffuse halo, with no hard edge and no bright rectangle;
> the glow is low, muted and never pure white. Fallen slabs, split columns, dry
> ash drifting, the far walls of a black city lost in haze. No fire, no flames,
> no torch, no visible body, no figure. Cinematic wide shot, horizontal 16:9
> composition, all the tombs and all the light are in the left and right thirds;
> the whole central third is a calm, dark, empty and out-of-focus stretch of
> cracked paving and ash with no tomb, no glow and no detail, left free for
> interface elements. Low overall brightness, the top of the image is the
> darkest part, no light near the top edge. No text, no letters, no writing, no
> logo, no buttons, no frame, no border, no user interface. 2752 × 1536 pixels.

À l'édition : **plisser les yeux devant le rendu** — si une rangée de taches
claires alignées apparaît, c'est le défaut à corriger, en éteignant un tombeau
sur deux ; baisser la braise jusqu'à ce qu'elle passe sous le halo doré du fil
d'Ariane ; assombrir la bande du haut ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est un **couvercle de sarcophage posé à plat** sur deux
tréteaux de pierre, sa face gravée retournée contre le sol — le seul comptoir des
neuf qui soit un objet volé au décor.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> heavy lid of a stone sarcophagus laid flat on two rough stone trestles and used
> as a betting counter, seen from the front, its carved face turned down so the
> top is blank, cracked and blackened stone, with, in the right quarter only, an
> opening onto the necropolis — one tilted open tomb seen at an angle, drifting
> ash, and a dim bone-white bluish glow spilling softly onto the paving. The left
> three quarters of the image are almost entirely dark, calm and empty blank
> stone in deep desaturated grey-black, barely lit, with no detail, no object, no
> carving, no glow and no pattern, so that small text stays perfectly readable
> over it. The glow is low, diffuse, never pure white, with no hard edge and no
> bright rectangle. Very low overall brightness, no bright highlight outside the
> right quarter, no strong edge in the middle, no fire, no flames. Wide cinematic
> 3:1 composition. No text, no letters, no writing, no carving, no symbols, no
> logo, no buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; vérifier qu'aucune
gravure n'est apparue sur le couvercle — sur un sarcophage, Gemini écrit.

---

## Après génération

1. `Proto4Html/public/circles/06-heresie/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis **boutique ouverte** : c'est là que
   les cartes sombres et les tombeaux lumineux se retrouvent sur le même écran.
