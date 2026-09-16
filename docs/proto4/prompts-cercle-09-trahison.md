# Cercle 9 — Trahison : images à générer (Gemini)

Fichier compagnon de [`prompts-cercles.md`](prompts-cercles.md) pour la
direction artistique commune et les règles de lisibilité. **Dernier cercle de la
partie principale** : au-delà commence le mode démon
([cercle 10](prompts-cercle-10-fonds-marins.md)).

Deux images, dans `Proto4Html/public/circles/09-trahison/` :

| Fichier | Sélecteur CSS | Format | Rôle |
|---|---|---|---|
| `bg.jpg` | `.table` (`--circle-bg`) | 2752 × 1536, opaque | Le décor, derrière tout |
| `bet-bg.jpg` | `.panel-bets .bet-panel` (`--circle-bet-bg`) | 2800 × 900, opaque | Le fond du panneau de paris |

## L'univers

`run.circles[8]` : **Trahison**, 10 âmes, 1500 pièces — et un boss qui n'est pas
de Dante : **le stagiaire promu**, dont le pouvoir est
de connaître vos paris (« ses paires visent d'abord vos âmes pariées pour les
faire reculer »). Le démon qui coachait le joueur depuis le
premier cercle dirige le neuvième
([`interface.md`](interface.md) : « Il ne reste que la Trahison. Et… on m'a
promu. Je dirige le neuvième. Ce n'est pas un problème, hein ? Un pacte, c'est
un pacte. »). Le cercle porte donc son nom deux fois.

Le décor : le **Cocyte**, lac gelé jusqu'au fond, des silhouettes prises dans la
glace à des profondeurs différentes, des plaques soulevées, un vent qui ne
souffle plus rien. Aucune chaleur nulle part.

### Le seul cercle sans aucune source chaude — et c'est un atout

La phrase de DA commune parle de `warm firelight` : ici, il n'y en a pas, et
c'est le sens même du lieu. Conséquence à assumer plutôt qu'à corriger :
**l'interface devient la seule chose chaude de l'écran**. L'or de l'argent
(`--gold: #e0a83c`), le halo doré de l'étape en cours, le liseré de sélection —
tout ce qui est chaud est alors, littéralement, ce que le joueur contrôle. Le
décor n'a qu'à rester très froid et très sombre pour que ça fonctionne.

C'est aussi le **plus sombre des neuf** : le fond de l'entonnoir. Les cercles 1
à 8 peuvent s'échelonner, celui-ci est le plancher.

### La glace, troisième collision avec la dalle

`frame.webp` est une pierre bleu-gris froide. La glace est de la même teinte, en
plus lisse et en plus réfléchissant — c'est la pire des trois occurrences, après
les [fonds marins](prompts-cercle-10-fonds-marins.md) et la
[montagne](prompts-cercle-13-montagne.md). Deux parades :

- la glace est **bleu-noir profond**, largement plus sombre que la dalle ;
- les silhouettes prises sont vues **sous la surface**, donc **plus sombres que
  la glace**, jamais des formes claires posées dessus. Le lac gagne en
  profondeur et ne renvoie rien.

Interdits : les **reflets étalés** (même piège qu'au [cercle 5](prompts-cercle-05-colere.md),
une bande claire en travers du centre) et les **craquelures fines et régulières**
sur toute la surface, qui sont une trame sous le texte. La glace est franche au
centre, fracturée seulement sur les bords.

---

## 1. `bg.jpg` — le décor du cercle

`cover`, calé `center 45%`, intérêt dans les tiers extérieurs, centre sombre et
vide, rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The Ninth Circle of Hell, Treachery: the
> frozen lake of Cocytus, a plain of deep blue-black ice, flanked in the left and
> right thirds by heaved and tilted slabs of ice, by black frozen rock outcrops
> and by drifting ice fog. Trapped far below the surface, seen dimly through the
> ice, the dark silhouettes of the damned at different depths, always darker than
> the ice around them, never bright shapes on top of it. The light is faint,
> colourless and directionless, a dead cold blue; there is no fire, no flame, no
> torch, no lantern, no warm light of any kind anywhere in the image, no sun, no
> sky. The ice is deep and dark, matte, with no mirror reflection, no sheen and
> no fine regular cracking across the middle; fractures exist only at the edges
> of the image. Cinematic wide shot, horizontal 16:9 composition, the heaved
> slabs, the rock and the trapped figures are in the left and right thirds; the
> whole central third is a calm, very dark, empty and out-of-focus expanse of
> flat black ice with no figure, no crack and no detail, left free for interface
> elements. This is the darkest image of the series, very low overall brightness,
> the top of the image is the darkest part. No text, no letters, no writing, no
> logo, no buttons, no frame, no border, no user interface. 2752 × 1536 pixels.

À l'édition : **poser `frame.webp` par-dessus** et vérifier que la dalle se
détache de la glace — si elle s'y fond, assombrir et désaturer encore le lac ;
supprimer tout reflet en bande ; vérifier qu'aucune trace chaude ne subsiste,
c'est la seule image de la série qui n'a droit à aucun ambre ; JPEG qualité 82,
progressif.

---

## 2. `bet-bg.jpg` — le fond du panneau de paris

`cover` calé **à droite**, valeurs basses partout, lumière dans le quart droit
seulement. Le guichet est un **bloc de glace scié à plat**, et quelque chose est
pris juste dessous, à peine lisible : le dernier comptoir de la partie
principale, celui où le stagiaire promu encaisse.

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: a
> block of deep blue-black ice sawn flat and used as a betting counter on the
> frozen lake, seen from the front, dark matte ice with one faint dark shape
> frozen just beneath its surface, barely readable, with, in the right quarter
> only, an opening onto the lake — tilted slabs of ice, black rock, drifting ice
> fog, lit by a faint dead cold blue light. The left three quarters of the image
> are almost entirely dark, calm and empty dark ice in deep desaturated
> blue-black, barely lit, with no detail, no figure, no crack, no reflection and
> no pattern, so that small text stays perfectly readable over it. There is no
> fire, no flame, no torch, no lantern and no warm light of any kind anywhere in
> the image. Very low overall brightness, no bright highlight outside the right
> quarter, no mirror sheen, no strong edge in the middle. Wide cinematic 3:1
> composition. No text, no letters, no writing, no logo, no buttons, no cards, no
> user interface. 2800 × 900 pixels.

À l'édition : luminance des trois quarts gauche sous 20 % — viser plus bas
encore que les autres cercles ; vérifier que la forme prise sous la glace reste
une suggestion et ne se lit pas comme un visage.

---

## Après génération

1. `Proto4Html/public/circles/09-trahison/{bg.jpg,bet-bg.jpg}`, JPEG qualité 82
   progressif.
2. Déclarer le dossier dans `CIRCLE_ART`
   ([GameScreen.tsx:30](Proto4Html/src/presentation/GameScreen.tsx#L30)).
3. Vérifier panneau de paris ouvert, puis boutique ouverte — et **enchaîner le
   cercle 8 puis le 9** : c'est le seul endroit du jeu où l'on doit sentir que le
   fond a été atteint.
