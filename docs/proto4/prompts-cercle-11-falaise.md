# Cercle 11 — Au pied de la falaise : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. Cercle du **mode
démon** (GDD §8.1), comme le
[cercle 10](prompts-cercle-10-fonds-marins.md).

Deux images, dans `Proto4Html/public/circles/11-falaise/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

Le fond d'un gouffre. Une paroi colossale monte hors champ, si haute qu'on n'en
voit ni le sommet ni le ciel. À son pied : un chaos d'éboulis, des échelles de
corde rompues et des chaînes qui pendent de très haut, quelques arbres morts
plantés dans la caillasse, et le filet noir d'une cascade qui tombe de si loin
qu'elle arrive en pluie. Ceux qui montaient sont retombés.

### Le piège de composition est inversé

Les autres cercles doivent **libérer** leur centre. Une falaise fait le
contraire toute seule : elle remplit le cadre d'une grande masse plate, ce qui
donne un centre calme sans effort — mais laisse les **tiers extérieurs vides**,
c'est-à-dire précisément les deux bandes de 260 px que le joueur voit
réellement. D'où la construction demandée : la paroi est un **fond**, sombre,
flou et texturé ; tout l'intérêt est ce qui s'accumule **à son pied, à gauche et
à droite** — éboulis, chaînes, arbres morts, cascade.

### Roche sur roche : la dalle doit rester le seul caillou net

`frame.webp` est une pierre bleu-gris froide, nettement peinte. Sur une falaise
de pierre, c'est une collision de **matière** (au cercle 10, c'était une
collision de teinte) : la table se lit comme un morceau du décor. Deux parades,
demandées dans le prompt et à contrôler à l'édition :

- la paroi est d'une autre couleur — **basalte presque noir et éboulis
  brun-rouge sombre**, jamais gris bleuté ;
- elle est d'un autre piqué — **floue et à faible contraste**, la dalle restant
  le seul élément net de l'écran.

Enfin, une falaise appelle des **verticales** (strates, chaînes, coulées) qui
emmènent l'œil hors du cadre par le haut, là où passe le fil d'Ariane écrit à
même le fond. Elles sont demandées **brisées et interrompues**, et le haut de
l'image reste la zone la plus sombre : pas de ciel, pas de sommet éclairé.

---

## 1. `bg.jpg` — le décor du cercle

Mêmes contraintes que partout : `cover`, calé `center 45%`, centre recouvert par
la table, intérêt dans les tiers extérieurs, rien d'important dans les 10 % du
haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Eleventh Circle, the bottom of a chasm:
> the foot of a colossal wall of near-black basalt rising out of frame, so high
> that neither its top nor any sky is visible, the wall itself dark, soft,
> out of focus and low in contrast. Piled at its foot in the left and right
> thirds: chaotic fields of dark red-brown scree and shattered boulders, snapped
> rope ladders and heavy rusted chains hanging down from far above and ending in
> mid-air, a few dead leafless trees wedged in the rubble, and on one side only a
> thin black waterfall falling from so high it arrives as cold spray and mist. A
> faint dim amber glow at the very foot of the wall on both sides, no visible
> light source, no fire, no flames, no torch, no sky, no clouds, no blue-grey
> rock, no summit, no horizon. Cinematic wide shot, horizontal 16:9 composition,
> all the detail is in the left and right thirds; the whole central third is a
> calm, dark, empty and out-of-focus expanse of flat wall and rubble with no
> chain, no tree and no detail, left free for interface elements. Vertical lines
> in the rock are broken and interrupted, never continuous from top to bottom.
> Very low overall brightness, the top of the image is the darkest part. No
> text, no letters, no writing, no logo, no buttons, no frame, no border, no
> user interface. 2752 × 1536 pixels.

À l'édition : **poser `frame.webp` par-dessus** — si la dalle se lit comme un
bloc tombé de la paroi, désaturer et assombrir encore la roche, ou flouter la
paroi d'un cran ; assombrir la bande du haut ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est un **abri de pierre sèche** monté contre la paroi, son
linteau fait de chaînes nouées.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> dry-stone ledge of a shelter built against the foot of a colossal cliff and
> used as a betting counter, seen from the front, stacked dark basalt blocks and
> knotted rusted chains, with, in the right quarter only, an opening onto the
> chasm floor — fields of red-brown scree, one dead leafless tree, cold spray
> drifting from a distant fall, lit by a soft dim amber glow. The left three
> quarters of the image are almost entirely dark, calm and empty stacked stone in
> deep desaturated brown-black, barely lit, with no detail, no object, no chain
> and no pattern, so that small text stays perfectly readable over it. Very low
> overall brightness, no bright highlight outside the right quarter, no strong
> edge in the middle, no fire, no flames, no torch, no sky, no blue-grey rock.
> Wide cinematic 3:1 composition. No text, no letters, no writing, no logo, no
> buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; casser toute
verticale marquée qui tomberait derrière la colonne des mises.

---

## Après génération

1. `Proto4Html/public/circles/11-falaise/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte.
