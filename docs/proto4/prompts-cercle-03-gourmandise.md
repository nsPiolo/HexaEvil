# Cercle 3 — Gourmandise : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md), qui reste la
référence pour la direction artistique commune, les découpages et les règles de
lisibilité. Ici, seulement ce qui est **propre au cercle 3**. Même paire de
fichiers que pour la [Luxure](prompts-cercle-02-luxure.md).

Deux images à générer, dans `Proto4Html/public/circles/03-gourmandise/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

La dalle de pierre (`frame.webp`), le parchemin (`shop.webp`) et les dalles de
registre (`tier.webp`) restent **partagés par les neuf cercles** dans
`public/table/`. Les rendus bruts vont dans `docs/proto4/raw/` (traçabilité IA,
`docs/STEAM_AI_DISCLOSURE.md`).

## L'univers du cercle 3

`run.circles[2]` dans `config/race.json` : **Gourmandise**, boss **Cerbère**,
6 âmes, 380 pièces pour sortir, pouvoir « une âme percutée est mordue : elle
recule d'une case après le saut ». Habitants du GDD : Ciacco et les gourmands
anonymes.

Chez Dante (chant VI), les gourmands croupissent dans une **boue fétide** sous
une pluie éternelle, froide et lourde — grêle, eau noire et neige mêlées — que
rien n'arrête. Cerbère y hurle à trois gueules et écorche les damnés. C'est le
premier cercle **sale** : pas de pierre noble, pas de perspective grandiose,
une fosse basse, grasse et suintante.

### Le vrai risque du cercle 3 : tout devient marron

Les Limbes et la Luxure tenaient sur un contraste franc (ambre contre
bleu-gris, violet contre basalte). Ici, la palette naturelle — boue, rouille,
jaune malade — occupe une seule zone du cercle chromatique, et Gemini rend
volontiers une bouillie ocre saturée, chaude et moyenne en valeur. Trois
conséquences concrètes :

- **Le parchemin de la boutique ne se détache plus.** `shop.webp` est un papier
  crème clair ; posé sur un fond ocre chaud, il perd son contraste de teinte et
  ne tient plus que par la valeur.
- **La terre cuite de l'interface se confond avec le décor.** Les boutons
  d'action de la boutique sont en `#a35f46`, très proche d'une boue chaude.
- **Le jaune malade monte vite.** Saturé, il attire l'œil plus fort que
  l'ambre des Limbes, alors qu'il doit rester un éclairage, pas un sujet.

D'où la consigne, écrite dans les deux prompts : la boue tire vers l'**olive et
le brun-vert désaturés**, pas vers l'ocre chaud ; les valeurs restent
**basses** ; le jaune n'apparaît que comme une lueur diffuse dans la brume, sans
source ponctuelle.

### Pas de Cerbère peint

Tentant, et écarté — pour la même raison que Charon absent des Limbes et Minos
de la Luxure. Une créature reconnaissable est un **sujet**, et il n'y a pas de
place pour un sujet : le tiers central est recouvert par la table, et les tiers
extérieurs sont rognés différemment selon la largeur de la fenêtre. Un Cerbère
posé à gauche se retrouverait coupé en deux sur un écran étroit. Le monstre
existe déjà dans le texte de l'écran de fin de cercle
([`interface.md`](interface.md)) ; le décor se contente de ses traces : os
rongés, griffures dans la pierre, remous dans la boue.

### La pluie, seulement là où rien ne se lit

La pluie battante est le motif du cercle, mais c'est aussi un **motif fin et
régulier sur toute l'image** — exactement ce que la règle de lisibilité
interdit sous du texte. Elle est donc demandée **dense sur les bords et dans le
quart droit du guichet**, et absente du centre du décor comme des trois quarts
gauches du panneau de paris.

---

## 1. `bg.jpg` — le décor du cercle

Mêmes contraintes de composition que pour les cercles précédents : posé en
`cover` sur `.table` avec un dégradé sombre par-dessus, il est recouvert en son
milieu par la table de jeu (1400 px CSS). Seules restent visibles **deux bandes
latérales d'environ 260 px** sur un écran 1920, plus le haut de l'écran.
L'intérêt va dans les **tiers extérieurs**, le centre reste sombre et vide.
L'image est calée en `center 45%` et rognée en haut et en bas : rien
d'important dans les 10 % du haut ni du bas.

La fosse tombe bien : deux parois suintantes qui montent à gauche et à droite,
la boue qui s'étale au milieu, sombre et sans détail.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Third Circle of Hell, Gluttony: a low
> foul pit of thick grey-brown sludge, closed on both sides by high dripping
> walls of slick wet rock streaked with slime and clawed gouges, heaps of
> gnawed bones and broken pottery piled at the foot of the walls, endless cold
> heavy rain and sleet pouring down along both walls, cold steam rising off the
> mud, a sickly diffuse yellow-green glow filtering through the haze from above
> with no visible light source, no fire, no flames, no lava, no torch, putrid,
> heavy and miserable. The mud and the rock are desaturated olive, grey-brown
> and cold green, never warm ochre, never orange, never golden. Cinematic wide
> shot, horizontal 16:9 composition, the dripping walls, the bones and the
> falling rain are in the left and right thirds; the whole central third is a
> calm, dark, empty and out-of-focus expanse of still mud and haze with no
> rain, no bones and no detail, left free for interface elements. No creature,
> no monster, no dog, no animal, no figure. Low overall brightness, no bright
> highlight, no bright spot in the middle. No text, no letters, no writing, no
> logo, no buttons, no frame, no border, no user interface. 2752 × 1536 pixels.

À l'édition : **désaturer la boue** si le rendu tire vers l'ocre chaud — le
test rapide est de poser le parchemin `shop.webp` par-dessus, il doit se
détacher franchement ; assombrir le tiers central ; vérifier qu'aucun amas d'os
ne se lit comme un visage dans les bandes latérales ; exporter en JPEG qualité
82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

Le panneau de paris s'ouvre en bas de la table, en trois colonnes (type de
pari · âmes · mise) plus un en-tête et un pied. C'est l'écran le plus chargé en
texte du jeu : l'image est un fond d'ambiance. Elle est posée en `cover`, calée
**à droite**, sous un dégradé horizontal qui la rattrape (`.panel-bets
.bet-panel` dans `src/index.css`) — d'où la règle : **valeurs basses partout**,
la lumière seulement dans le quart droit, là où il n'y a que le bouton « Lancer
la course ».

Aux Limbes, un guichet de pierre ouvrant sur la plaine grise ; à la Luxure, le
même guichet taillé dans la falaise. Ici, un **comptoir de planches gonflées
d'eau**, sali de boue séchée, adossé à la fosse : c'est le seul cercle où le
guichet n'est pas en pierre, et cet écart vaut la peine — il dit la déchéance
du lieu sans rien changer à la lisibilité.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel:
> the sagging waterlogged wooden counter of a filthy betting booth in the
> Third Circle of Hell, seen from the front, dark swollen planks caked with
> dried mud and slime, with, in the right quarter only, an opening onto the
> pit — cold rain falling in sheets, thick sludge, a few pale gnawed bones half
> sunk in the mud, lit by a sickly diffuse yellow-green haze. The left three
> quarters of the image are almost entirely dark, calm and empty wet wood and
> mud in deep desaturated brown-black, barely lit, with no detail, no object,
> no rain and no pattern, so that small text stays perfectly readable over it.
> Very low overall brightness, no bright highlight outside the right quarter,
> no strong edge in the middle, no fire, no flames, no torch, no warm ochre and
> no orange. No creature, no monster, no dog, no animal, no figure. Wide
> cinematic 3:1 composition. No text, no letters, no writing, no logo, no
> buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : mesurer la luminance des trois quarts gauche (viser < 20 %) et
assombrir si besoin ; **effacer au tampon toute traînée de pluie** qui aurait
débordé sur la moitié gauche, c'est le défaut le plus probable ici ; vérifier
que le jaune du quart droit ne dépasse pas la luminosité de l'ambre du cercle 1,
sans quoi le bouton « Lancer la course » passe au second plan.

---

## Après génération

1. Enregistrer les deux fichiers dans
   `Proto4Html/public/circles/03-gourmandise/{bg.jpg,bet-bg.jpg}` (JPEG qualité
   82, progressif — pas de WebP ici, ce sont des images opaques).
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)) :
   `{ 1: '01-limbes', 2: '02-luxure', 3: '03-gourmandise' }`. Sans ça, le
   cercle 3 retombe sur le décor des Limbes, qui est le comportement de repli
   voulu.
3. Ouvrir le cercle 3 et vérifier les deux états qui changent la hauteur de la
   table : panneau de paris ouvert, puis boutique ouverte. Regarder en
   particulier la **boutique** : c'est le cercle où le parchemin crème risque le
   plus de se fondre dans le décor.
