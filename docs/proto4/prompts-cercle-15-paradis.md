# Cercle 15 — Le paradis : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. Dernier décor peint :
**le cercle 15 et tous les cercles suivants partagent ces deux images.**

Deux images, dans `Proto4Html/public/circles/15-paradis/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

Le démon est monté jusqu'au bout et ne redescendra plus. Au-dessus de l'orage
du [cercle 14](prompts-cercle-14-ciel.md) : un espace sans bord, des cercles de
lumière dorée tournant très loin, des degrés de nuage clair étagés en amphi-
théâtre, et des présences immobiles trop lointaines pour avoir un visage. On y
parie encore, ce qui est tout le sel de la chose.

### Un paradis sombre — et c'est historiquement le bon

Quatorze décors sombres précèdent celui-là, et toute l'interface est calibrée
dessus : le fil d'Ariane clair posé à même le fond, les halos dorés, l'encre
claire sur ardoise. Un paradis blanc les efface tous d'un coup.

La solution n'est pas un compromis, c'est la tradition même du sujet : chez
Dante comme chez Doré, l'Empyrée est une **lumière prise dans du noir**, pas un
fond blanc. On demande donc une **radiance dorée sur un champ indigo profond**,
la lumière la plus intense concentrée loin, au centre de l'image — c'est-à-dire
exactement là où la table la recouvre. Le halo qui reste visible sur les bandes
latérales suffit à dire le paradis ; il ne monte jamais assez haut en valeur
pour manger le texte.

C'est aussi le seul des quinze où la phrase de DA commune tombe juste sans
correction : le `warm firelight` contre le `cold blue-grey` devient l'or contre
l'indigo. Rien à annuler, contrairement aux cercles 2, 3 et 13.

### La contrainte que les quatorze autres n'ont pas : durer

C'est le décor que le joueur verra pour **tous les cercles suivants**, peut-être
des dizaines. Il doit donc être le **moins narratif des quinze** : rien qui se
passe, aucun incident lisible, aucune scène qu'on reconnaisse et qui lasse à la
troisième course. Du calme et de la profondeur, pas du drame.

C'est le même raisonnement que la dalle nue contre la frise sculptée dans
[`prompts-cercles.md`](prompts-cercles.md) : ce qui se répète doit être de la
matière, pas un motif.

---

## 1. `bg.jpg` — le décor

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, rien d'important
dans les 10 % du haut ni du bas — et le haut reste sombre, le fil d'Ariane s'y
écrit sans plaque.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Fifteenth Circle, paradise seen from
> its edge: a boundless dark indigo space, with vast concentric rings of soft
> golden light turning very far away in the depth, and on the left and right
> sides tiers of pale luminous cloud rising like the steps of an immense
> amphitheatre, dissolving into haze. Countless motionless distant presences
> stand on those tiers, far too small and too faint to have faces, reduced to
> soft pale marks in the glow. Slow drifting motes of gold light. The field is
> deep indigo and blue-black; the gold light is warm, soft, diffuse and always
> distant, never white, never a bright flat sky, no sun disc, no sunbeam, no
> lens flare, no god rays, no fire, no flames. Nothing is happening, no event,
> no scene, no gesture: the image is calm, still, and endlessly deep. Cinematic
> wide shot, horizontal 16:9 composition, the cloud tiers and the presences are
> in the left and right thirds; the whole central third is a calm, dark,
> out-of-focus depth where the distant rings fade almost to nothing, left free
> for interface elements. Low overall brightness, the top of the image is dark
> indigo, no bright band along the top edge. No text, no letters, no writing, no
> logo, no buttons, no frame, no border, no user interface. 2752 × 1536 pixels.

À l'édition : **mesurer la bande du haut** (fil d'Ariane) et la ramener au
niveau des décors infernaux ; vérifier qu'aucune « présence » ne se lit comme un
personnage ; poser `shop.webp` par-dessus — c'est l'autre risque de ce cercle, le
parchemin crème sur une lumière dorée — et désaturer l'or si le papier ne se
détache plus ; JPEG qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est une **balustrade de marbre pâle** au bord du vide,
polie par l'usage : le dernier comptoir, et celui qui servira le plus longtemps.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> worn balustrade of pale marble standing at the very edge of paradise and used
> as a betting counter, seen from the front, the marble in deep shadow and read
> almost as dark stone, with, in the right quarter only, an opening onto the
> depth — distant concentric rings of soft golden light, tiers of luminous cloud,
> faint motes of gold drifting. The left three quarters of the image are almost
> entirely dark, calm and empty shadowed marble in deep desaturated indigo-black,
> barely lit, with no detail, no object, no figure and no pattern, so that small
> text stays perfectly readable over it. Very low overall brightness, no bright
> highlight outside the right quarter, the gold stays soft, diffuse and distant,
> never white, no sun, no sunbeam, no lens flare, no strong edge in the middle,
> no fire, no flames. Nothing is happening, the image is calm and still. Wide
> cinematic 3:1 composition. No text, no letters, no writing, no logo, no
> buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; l'or du quart droit
ne doit pas dépasser l'ambre du cercle 1, sinon il éteint le bouton « Lancer la
course » — et ce serait le cas sur toutes les courses suivantes.

---

## Après génération

1. `Proto4Html/public/circles/15-paradis/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.

2. **Changer la règle de repli**, sans quoi le cercle 16 repart aux Limbes.
   Aujourd'hui, [GameScreen.tsx:31](Proto4Html/src/presentation/GameScreen.tsx#L31)
   dit `CIRCLE_ART[circle] ?? CIRCLE_ART[1]!` : tout cercle non déclaré retombe
   sur le premier décor. C'était le bon repli tant que la liste s'arrêtait à
   neuf ; à partir du quinzième, le paradis doit tenir jusqu'au bout :

   ```ts
   const CIRCLE_ART: Readonly<Record<number, string>> = { 1: '01-limbes', /* … */, 15: '15-paradis' }
   /** Au-delà du quinzième, le paradis sert à tous les cercles suivants (GDD §8.1). */
   const circleArt = (circle: number): string => CIRCLE_ART[Math.min(circle, 15)] ?? CIRCLE_ART[1]!
   ```

   Les cercles 10 à 14 non encore peints continuent de retomber sur les Limbes,
   ce qui reste le comportement voulu tant qu'ils manquent.

3. Vérifier panneau de paris ouvert, puis boutique ouverte — et **enchaîner deux
   cercles d'affilée** au-delà du quinzième : c'est le seul décor dont on voie
   la répétition.
