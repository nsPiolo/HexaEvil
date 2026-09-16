# Cercle 10 — Les fonds marins : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md), qui reste la
référence pour la direction artistique commune, les découpages et les règles de
lisibilité. Ici, seulement ce qui est **propre au cercle 10**.

Premier des cercles du **mode démon** (GDD §8.1) : après le neuvième, le joueur
continue comme démon dans des cercles générés, « infernaux, mais qui ne suivent
pas nécessairement une cosmologie fixe ». Ils ne sont donc pas dans
`config/race.json`, qui s'arrête à neuf : le décor se prépare avant le contenu.

Deux images, dans `Proto4Html/public/circles/10-fonds-marins/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

Dalle, parchemin et dalles de registre restent partagés dans `public/table/`.

## L'univers

Un cercle **noyé** : la course se tient par cent brasses de fond, sur le sable
noir, entre les ruines d'une cathédrale engloutie. Des chaînes montent vers une
surface qu'on ne voit pas, des forêts d'algues noires ondulent contre les
parois, et des âmes debout dans le courant regardent passer les paris sans
bouger. Froid, lent, sous pression.

### Trois pièges propres à ce cercle

- **La dalle disparaît dans l'eau.** `frame.webp` est une pierre **bleu-gris
  froid**, partagée par tous les cercles : posée sur un fond bleu-vert de même
  teinte et de même valeur, elle cesse de se lire comme un objet et la table
  perd son assise. L'eau est donc demandée en **vert-noir et sarcelle profonde**,
  nettement plus sombre que la dalle, et il n'y a **aucune roche bleu-gris** dans
  le décor : les ruines sont en pierre noire couverte d'algues.
- **Les rais de lumière traversent le centre.** Les faisceaux venus de la
  surface sont des diagonales, et une diagonale claire passe précisément par la
  zone qui doit rester calme. Ils sont demandés **cantonnés aux tiers
  extérieurs**, coupés avant le milieu.
- **Les caustiques sont un motif fin et régulier** — le pire fond possible sous
  du texte. Interdites au centre du décor et dans les trois quarts gauches du
  guichet.

La surface, qui est la seule zone claire d'un fond marin, tomberait en haut de
l'image, là où le fil d'Ariane (`.steps`) est écrit **à même le fond, sans
plaque**. Elle reste donc hors champ : on est trop bas pour la voir.

---

## 1. `bg.jpg` — le décor du cercle

Posé en `cover` sur `.table` (calé `center 45%`), recouvert en son milieu par la
table de jeu : seules restent visibles deux bandes latérales d'environ 260 px
sur un écran 1920, plus le haut de l'écran. L'intérêt va dans les **tiers
extérieurs**, le centre reste sombre et vide, et rien d'important dans les 10 %
du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Tenth Circle, drowned: the black sand
> floor of an abyssal sea, flanked on both sides by the ruins of a sunken
> cathedral in black weed-covered stone, broken arches and toppled columns
> furred with dark algae, tall forests of black kelp swaying against the walls,
> heavy rusted chains rising out of frame into the dark water, slow columns of
> silver bubbles, a few motionless drowned robed silhouettes standing far off in
> the current, cold pale green light filtering from far above in narrow shafts
> that touch only the left and right walls, the water is deep teal and
> green-black, crushing and silent, no fire, no flames, no torch, no blue-grey
> rock, no bright surface, no sky. Cinematic wide shot, horizontal 16:9
> composition, the ruins, the kelp and the light shafts are in the left and
> right thirds; the whole central third is a calm, dark, empty and out-of-focus
> expanse of black sand and open water, with no light shaft, no caustics, no
> bubbles and no detail, left free for interface elements. Very low overall
> brightness, the top of the image is the darkest part. No text, no letters, no
> writing, no logo, no buttons, no frame, no border, no user interface.
> 2752 × 1536 pixels.

À l'édition : **poser `frame.webp` par-dessus pour vérifier que la dalle se
détache** — c'est le test qui décide de ce cercle ; assombrir le tiers central
et la bande du haut ; effacer au tampon tout faisceau qui mord sur le milieu ;
JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

Trois colonnes de texte serré, image d'ambiance, posée en `cover` calée **à
droite** sous un dégradé horizontal (`.panel-bets .bet-panel`) : **valeurs
basses partout**, la lumière seulement dans le quart droit, derrière le bouton
« Lancer la course ».

Le guichet est ici une **épave** : la coque ouverte d'un navire couché sur le
fond, dont le bastingage sert de comptoir.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel:
> the barnacled rail of a wrecked ship lying on the abyssal sea floor and used
> as a betting counter, seen from the front, black waterlogged timber crusted
> with shells and dark algae, with, in the right quarter only, an opening onto
> the deep — black kelp, a rusted chain rising into the dark, one narrow pale
> green shaft of light and a slow trail of bubbles. The left three quarters of
> the image are almost entirely dark, calm and empty wet timber and black sand
> in deep desaturated green-black, barely lit, with no detail, no object, no
> caustics, no bubbles and no pattern, so that small text stays perfectly
> readable over it. Very low overall brightness, no bright highlight outside the
> right quarter, no strong edge in the middle, no fire, no flames, no torch, no
> blue-grey rock. Wide cinematic 3:1 composition. No text, no letters, no
> writing, no logo, no buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; supprimer toute
caustique qui aurait débordé à gauche.

---

## Après génération

1. `Proto4Html/public/circles/10-fonds-marins/{bg.jpg,bet-bg.jpg}`, JPEG
   qualité 82 progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)) —
   voir la note de repli dans
   [`prompts-cercle-15-paradis.md`](prompts-cercle-15-paradis.md), qui change la
   fonction de recherche pour les cercles au-delà du quinzième.
3. Vérifier les deux états qui changent la hauteur de la table : panneau de
   paris ouvert, puis boutique ouverte.
