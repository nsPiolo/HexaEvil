# Cercle 4 — Avarice : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune, les découpages et les règles de lisibilité. Ici,
seulement ce qui est **propre au cercle 4**.

Deux images, dans `Proto4Html/public/circles/04-avarice/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[3]` : **Avarice**, boss **Ploutos**, 7 âmes, 500 pièces, pouvoir
« les paris posés en course coûtent le double de mise ». Chez Dante (chant VII),
avares et prodigues poussent éternellement des **poids énormes** en deux files
qui se heurtent, s'invectivent et repartent en sens inverse.

Le décor : une salle au trésor effondrée, des dalles d'or terni au sol, des
meules et des poids de pierre abandonnés en travers, la voûte crevée. Tout est à
**contre-jour** : la lumière vient du fond, les masses sont en silhouette.

### Le piège : l'or est déjà une couleur d'interface

C'est le seul cercle dont la matière est une **couleur sémantique du jeu**.
Dans le thème, `--gold: #e0a83c` ne décore pas, il **signifie** : c'est l'argent
(`.gauge-money`, `.hud-link`), l'étape en cours du fil d'Ariane (`#ffd479` avec
son halo), et le halo de sélection des dalles de registre. Un décor d'or
saturé met la même couleur partout et ces signaux cessent de se lire.

Deux conséquences écrites dans les prompts :

- l'or est **terni, froid, oxydé** — bronze verdi, laiton sale, jamais un or
  jaune saturé, et jamais une haute lumière dorée ;
- **pas de pièces de monnaie** dans les zones lisibles. Un tas de pièces, c'est à
  la fois une trame fine de points clairs — la pire texture sous du texte — et
  littéralement l'icône de la monnaie du jeu peinte dans le fond.

### Le contre-jour se met au mauvais endroit

Un contre-jour place naturellement sa source **au centre du cadre**, c'est-à-dire
sous la table. Il est donc demandé **décalé dans les tiers extérieurs**, et
partiellement masqué par les masses : ce sont les poids et les colonnes qui
découpent la lumière, on ne voit jamais la source elle-même.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, centre recouvert par la table : l'intérêt va dans
les **tiers extérieurs**, le centre reste sombre et vide, rien d'important dans
les 10 % du haut ni du bas, et le haut reste sombre — le fil d'Ariane s'y écrit
à même le fond, sans plaque.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Fourth Circle of Hell, Avarice: the
> collapsed treasury hall of hell, its vault broken open, flanked on both sides
> by toppled columns and by enormous abandoned stone weights and millstones
> lying across the floor, the ground paved with cracked, tarnished, oxidised
> gold slabs gone dull bronze and green, heaps of dark rubble, and far off on
> both sides the bent silhouettes of damned souls pushing huge weights against
> each other. Everything is backlit: a cold pale light comes from deep openings
> in the left and right thirds, broken up by the columns and the weights, the
> source itself never visible. The gold is always tarnished, cold, oxidised and
> desaturated, never bright yellow gold, no golden highlight, no glitter, no
> coins, no treasure pile, no jewels, no sparkle. No fire, no flames, no torch.
> Cinematic wide shot, horizontal 16:9 composition, the columns, the weights and
> the backlight are in the left and right thirds; the whole central third is a
> calm, dark, empty and out-of-focus stretch of dull paving and dust with no
> light source, no object and no detail, left free for interface elements. Low
> overall brightness, the top of the image is the darkest part. No text, no
> letters, no writing, no logo, no buttons, no frame, no border, no user
> interface. 2752 × 1536 pixels.

À l'édition : **désaturer l'or** jusqu'à ce qu'il ne dispute plus rien à la
jauge — le test est de comparer un prélèvement du décor à `#e0a83c`, il doit
être franchement plus froid et plus sombre ; effacer au tampon toute pièce ou
tout scintillement ; assombrir le tiers central et la bande du haut ; JPEG
qualité 82, progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement, derrière le bouton « Lancer la course ». Le guichet est une **table
de changeur en bronze terni**, plateau creusé par des siècles de comptage, ses
plateaux de balance vides et tordus.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> worn tarnished bronze table of an ancient money changer used as a betting
> counter, seen from the front, dark oxidised metal hollowed by centuries of use,
> its empty scale pans bent and still, with, in the right quarter only, an
> opening onto the ruined treasury — toppled columns, one huge stone weight, dull
> cracked gold paving, lit by a cold pale backlight. The left three quarters of
> the image are almost entirely dark, calm and empty tarnished metal in deep
> desaturated brown-black, barely lit, with no detail, no object and no pattern,
> so that small text stays perfectly readable over it. The gold is always dull,
> cold and oxidised, never bright yellow, no coins, no glitter, no sparkle. Very
> low overall brightness, no bright highlight outside the right quarter, no
> strong edge in the middle, no fire, no flames. Wide cinematic 3:1 composition.
> No text, no letters, no writing, no logo, no buttons, no cards, no user
> interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % ; vérifier qu'aucun
reflet métallique ne s'allume derrière la colonne des mises.

---

## Après génération

1. `Proto4Html/public/circles/04-avarice/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte — et regarder
   d'abord **la jauge et le fil d'Ariane**, les deux signaux dorés que ce cercle
   menace.
