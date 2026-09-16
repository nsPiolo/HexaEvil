# Cercle 8 — Fraude : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité.

Deux images, dans `Proto4Html/public/circles/08-fraude/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[7]` : **Fraude**, boss **Géryon**, 9 âmes, 1250 pièces, pouvoir
« les dés Âme mentent : une fois sur quatre ils désignent l'âme voisine ». Chez Dante (chants
XVIII-XXX), les **Malebolge** sont dix fosses concentriques de pierre, reliées
par des ponts de roche, chacune avec son châtiment ; Géryon, le monstre au
visage d'honnête homme, y descend le poète sur son dos.

Le décor : la lèvre d'une fosse, ses ponts en enfilade, des machineries de
pierre et de bronze verdi qui tournent sans qu'on sache pourquoi, et des
lanternes basses accrochées aux parapets. C'est le cercle **administratif** de
l'enfer, et ça tombe bien : le démon stagiaire y décroche sa promotion.

### Le piège : les fosses concentriques traversent le centre

Le motif du lieu est un ensemble d'**anneaux vus de haut**, et tout anneau vu de
haut passe par le milieu du cadre — la zone qui doit rester calme, et sous
laquelle le joueur devinerait des arcs sous le plateau.

La parade est un choix de point de vue : on ne regarde **pas les fosses d'en
haut**, on se tient **au bord de l'une d'elles, en regardant le long**. Les
anneaux deviennent alors deux parois courbes qui fuient à gauche et à droite,
exactement la construction des falaises du cercle 2 et des murs de nuage du
cercle 14. Le centre n'est plus qu'un vide sombre : la fosse elle-même.

### Les machineries sont un détail haute fréquence

Rouages, chaînes, passerelles, poulies : c'est la texture la plus fine des neuf
cercles après la foule du [cercle 12](prompts-cercle-12-ville.md). Cantonnée aux
tiers extérieurs, et **floue** — de la silhouette de machine, pas de la
mécanique lisible.

### Ne pas peindre deux fois le même vert

Le vert-de-gris de ce cercle et le sarcelle des [fonds marins](prompts-cercle-10-fonds-marins.md)
sont voisins ; vus à quelques courses d'intervalle, les deux décors se
confondraient. Le 8 est donc poussé vers un **bronze verdi chaud et sale**
réchauffé par les lanternes ambrées, quand le 10 reste un **vert-noir froid sans
aucune source chaude**.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Eighth Circle of Hell, Fraud, the
> Malebolge: the view from the very edge of one stone ditch, looking along its
> length, so that its curved walls recede steeply into haze on the left and on
> the right like two facing cliffs, never seen from above and never as
> concentric rings across the image. Along both walls: tiers of dark stone
> masonry, narrow arched bridges crossing away into the fog, and heavy blurred
> silhouettes of stone and verdigris bronze machinery, cogs and chains turning
> slowly, kept soft and out of focus. Small low iron lanterns hang from the
> parapets on both sides, casting warm amber pools against the dirty green-brown
> bronze and the cold stone. Far below and far ahead, only darkness. No fire, no
> flames, no lava, no sky, no figure, no monster. Cinematic wide shot, horizontal
> 16:9 composition, the walls, the bridges, the machinery and the lanterns are
> in the left and right thirds; the whole central third is a calm, dark, empty
> and out-of-focus void of open air and haze above the ditch, with no bridge, no
> lantern, no machinery and no detail, left free for interface elements. Low
> overall brightness, the top of the image is the darkest part. No text, no
> letters, no writing, no numbers, no logo, no buttons, no frame, no border, no
> user interface. 2752 × 1536 pixels.

À l'édition : vérifier qu'**aucun arc ne traverse le centre** — si le rendu a
glissé vers la vue de dessus, relancer plutôt que réparer ; flouter d'un cran
les machineries ; assombrir la bande du haut ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est le **capot d'une machine à peser** en bronze verdi,
posée au bord de la fosse, dont le plateau supérieur sert de comptoir : la
bureaucratie infernale a son mobilier.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> flat top casing of an old verdigris bronze weighing machine standing at the
> edge of a stone ditch and used as a betting counter, seen from the front, dark
> dirty green-brown metal, riveted plates, one still lever, with, in the right
> quarter only, an opening onto the ditch — a narrow arched stone bridge fading
> into fog, a blurred silhouette of slow machinery, and one low iron lantern
> casting a warm amber pool. The left three quarters of the image are almost
> entirely dark, calm and empty bronze casing in deep desaturated green-black,
> barely lit, with no detail, no rivet, no cog, no dial and no pattern, so that
> small text stays perfectly readable over it. Very low overall brightness, no
> bright highlight outside the right quarter, no strong edge in the middle, no
> fire, no flames. Wide cinematic 3:1 composition. No text, no letters, no
> writing, no numbers, no dial faces, no gauges, no logo, no buttons, no cards,
> no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; **traquer les
cadrans** — sur une machine, Gemini dessine des graduations et des chiffres, qui
sont à la fois du texte et un faux élément d'interface.

---

## Après génération

1. `Proto4Html/public/circles/08-fraude/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte.
