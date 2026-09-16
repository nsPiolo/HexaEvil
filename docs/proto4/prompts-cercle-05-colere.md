# Cercle 5 — Colère : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité.

Deux images, dans `Proto4Html/public/circles/05-colere/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[4]` : **Colère**, boss **Phlégyas**, 7 âmes, 640 pièces, pouvoir
« dans le Styx, reculer sur une âme la fait reculer aussi au lieu d'échanger ».
Chez Dante (chants VII-VIII), les coléreux se frappent à la surface du **Styx**
pendant que les indolents étouffent sous l'eau noire ; Phlégyas fait passer les
vivants sur sa barque.

Le décor : un marais sans horizon, des blocs de pierre noire à demi immergés,
des roselières mortes, une brume basse et lourde, et la rougeur sourde d'un
incendie qu'on ne voit pas.

### Le piège : le rouge est la couleur d'alerte

Comme l'or au [cercle 4](prompts-cercle-04-avarice.md), le rouge **signifie**
dans ce jeu. `--bad: #d0453c` et les états `.gauge-warn` (barre rougie, détail
en `#ff9a8a`, montant en `#e0872c`) sont ce qui prévient le joueur qu'il n'aura
pas de quoi payer la sortie du cercle. Un décor rouge éteint l'alarme.

Le rouge est donc demandé **sourd, brun, désaturé et bas en valeur** — une
rougeur dans la brume, jamais une flamme, jamais une source, jamais un rouge
franc. C'est d'ailleurs fidèle au texte : le feu de Dité est encore loin, on
n'en voit que le reflet.

### Une eau calme fabrique une ligne en travers du centre

Le marais pose un problème que les cercles secs n'ont pas : **les reflets**.
Une eau étale renvoie la zone claire du ciel en une bande horizontale, à
mi-hauteur — exactement en travers de la zone que la table doit recouvrir, et le
genre de ligne franche qui se devine sous le plateau. L'eau est donc demandée
**noire, mate et sans reflet au centre**, les reflets n'existant que contre les
blocs des tiers extérieurs.

Les **roseaux** sont l'autre motif à contenir : fins, verticaux et réguliers,
ils sont interdits au centre et dans les trois quarts gauches du guichet.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas, haut sombre pour le fil
d'Ariane.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Fifth Circle of Hell, Wrath: the black
> marsh of the Styx, flanked on both sides by huge half-sunken blocks of black
> stone and by thickets of dead grey reeds, low heavy fog lying on the water,
> broken half-sunken causeways, and far off on both sides the faint silhouettes
> of souls struggling waist-deep against each other. A dull, muffled, brownish
> red glow smoulders deep in the fog on the left and right, the reflection of a
> distant fire that is never visible, never a flame, never a light source, never
> a saturated red. The water is black, matte and dead still, with no reflection
> and no sheen in the middle of the image, reflections existing only against the
> stone blocks at the sides. No fire, no flames, no torch, no horizon line, no
> sky. Cinematic wide shot, horizontal 16:9 composition, the stone blocks, the
> reeds and the red glow are in the left and right thirds; the whole central
> third is a calm, dark, empty and out-of-focus expanse of flat black water and
> fog with no reeds, no reflection and no detail, left free for interface
> elements. Very low overall brightness, the top of the image is the darkest
> part. No text, no letters, no writing, no logo, no buttons, no frame, no
> border, no user interface. 2752 × 1536 pixels.

À l'édition : **comparer le rouge du décor à `#d0453c`** — il doit être
nettement plus brun, plus sombre et moins saturé ; effacer toute bande de reflet
qui traverserait le centre ; assombrir la bande du haut ; JPEG qualité 82,
progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est le **plat-bord de la barque de Phlégyas**, amarrée : on
parie depuis le bateau, appuyé au bordage noir et suintant.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> black waterlogged gunwale of a flat ferryman's barge moored in the marsh and
> used as a betting counter, seen from the front, tarred timber slick with
> water and weed, one iron rowlock, with, in the right quarter only, an opening
> onto the Styx — black still water, dead reeds, a half-sunken block of stone,
> and a dull muffled brownish red glow far off in the fog. The left three
> quarters of the image are almost entirely dark, calm and empty wet black timber
> in deep desaturated blue-black, barely lit, with no detail, no object, no reeds,
> no reflection and no pattern, so that small text stays perfectly readable over
> it. The red stays dull, brown, desaturated and dim, never saturated, never a
> flame. Very low overall brightness, no bright highlight outside the right
> quarter, no strong edge in the middle, no fire, no flames, no torch. Wide
> cinematic 3:1 composition. No text, no letters, no writing, no logo, no
> buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; vérifier qu'aucun
reflet d'eau ne s'allume sous les trois colonnes.

---

## Après génération

1. `Proto4Html/public/circles/05-colere/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte — et **forcer l'état
   d'alerte de la jauge** (peu de pièces devant le prix de sortie) pour voir si
   le rouge d'avertissement se détache encore du décor.
