# Barre d'actions du guichet — les objets peints

La barre du bas du panneau de paris (`.bp-foot` / `.bp-actions`, CSS « Le
guichet » dans `Proto4Html/src/index.css`) porte trois objets peints, un par
bouton. Fichiers dans `Proto4Html/public/table/bar/`, sources pleine résolution
dans `docs/proto4/raw/barre/`.

## Le patron

Le bouton **reste un bouton** : sa classe, sa place dans la grille, sa boîte de
clic et son fond ne changent pas. L'objet est un `<span aria-hidden>` enfant en
`position: absolute`, purement décoratif, qui **déborde du cadre**. Le libellé
est un second `<span>`, posé devant le décor et décalé pour rester lisible.

Deux façons de dimensionner, selon la forme de l'objet :

- **une bande** (le parchemin) : tendue sur la largeur du bouton
  (`width: min(100% + 36px, 520px)`), la hauteur suit par `aspect-ratio` ;
- **un objet** (le coffre, la corne) : dimensionné par sa largeur fixe, ancré à
  un bord du bouton, le libellé s'écarte d'autant en `padding`.

Le plafond de 520 px sur la bande n'est pas décoratif : sous 980 px la grille
passe en une colonne, le bouton devient très large, et sans plafond le parchemin
atteignait 213 px de haut et recouvrait la ligne d'état.

**Les libellés restent du texte HTML** — aucun texte dans les images.

## Le débordement

`.panel .bet-panel` n'a plus d'`overflow: hidden` : le rabat du parchemin sort
par le bas du panneau et la corne par la droite. En contrepartie, les coins
arrondis sont redits sur `.bp-foot`, seul enfant qui peint jusqu'au bord.

Le bouton de lancement est **le même des deux côtés** : `.bp-start` sert au pied
du panneau de paris (`BetPanel.tsx`) et au panneau replié (`PlaySlots.tsx`,
`.slot-player-prep`), avec les mêmes `<span>` corne et halo. Replié ou déplié,
le lancement a la même tête.

Trois marges à tenir, sinon les objets se cognent :

| Marge | Valeur | Ce qu'elle protège |
|---|---:|---|
| `gap` de `.bp-foot` | 54 px | la ligne d'état, que le parchemin recouvrait |
| `row-gap` de `.bp-actions` sous 980 px | 60 px | « Boutique », sur qui le rabat retombait |
| `padding-bottom` de `.bp-foot` | 14 px | rien — le rabat sort du panneau, il n'a plus besoin de place |

## Les fichiers

Tous en place. Réduits des sources de `raw/barre/`, **recadrés sur leur alpha**
sauf `bet.png`.

| Fichier | Taille (px) | Affiché (CSS) | Rôle |
|---|---:|---:|---|
| `bet.png` | 1200 × 336 | largeur du bouton | Parchemin scellé, *Poser le pari* |
| `chest.png` | 174 × 168 | 117 × 113 | Coffre, ancré à droite de *Boutique* |
| `horn.png` | 246 × 152 | 264 × 163 | Corne, ancrée à droite de *Lancer la course*, sort du panneau |
| `glow.png` | 512 × 512 | 295 × 295 | Halo de braise derrière le pavillon de la corne |
| `coins.png` | 360 × 112 | — | **Pas encore posé** (voir plus bas) |

`bet.png` est le seul **non recadré** : le CSS le cale sur des fractions
mesurées sur l'image entière — le sceau finit à 35 % de la largeur, le rouleau
de droite commence à 87 %, l'axe du rouleau passe à 28 % de la hauteur.
Recadrer casserait ces calages.

`glow.png` vient d'un rendu sur **fond noir** : son alpha est la luminance de ce
rendu, calculée à la réduction. Surtout pas de `mix-blend-mode: screen` sur
l'image d'origine — le survol pose un `transform` sur le bouton (`.btn:hover`),
ce qui isole un contexte d'empilement ; hors de la boîte du bouton le halo n'a
alors plus que du transparent comme fond, `screen` sur du noir rend le noir, et
le carré noir réapparaît. La règle générale : **pas de blend sur un élément qui
déborde de son parent**, l'alpha est le seul moyen fiable.

Il ne s'allume que quand la course peut partir (`.bp-start:not(:disabled)`), à
0,75 d'opacité, 1 au survol — le seul signal d'état de la barre.

`coins.png` est réduit mais pas branché : les pièces étaient prévues pour coudre
le coffre à la dalle de la barre, or il n'y a pas de dalle peinte sous les
boutons, et posées seules sur le fond du panneau elles font tache. À reprendre
si la barre gagne un fond peint.

### Le débordement ne doit pas faire défiler la page

Le halo de la corne passe le bord de la fenêtre d'une soixantaine de pixels et
ouvrait une barre de défilement horizontale sur du vide. Deux règles, dans
`index.css`, et **les deux sont nécessaires** :

```css
:root { overflow-x: hidden; }  /* coupe la propagation de l'overflow de body vers la fenêtre */
body  { overflow-x: clip; }    /* retire le halo de la zone de débordement défilable */
```

`hidden` seul sur la racine ne suffit pas : il bloque le défilement à la souris
mais laisse le défilement **programmatique**, et le `scrollIntoView` d'un clic
décalait toute la page de 73 px vers la droite — le HUD passait en x négatif et
l'e2e 08/C1 tombait. `clip` sur `body` supprime le débordement au lieu de le
cacher, et la coupe tombe au bord de la fenêtre, jamais au bord d'un cadre :
aucune couture visible, quelle que soit la largeur.

## Recette pour un objet de plus

1. Détourer la source, la déposer dans `docs/proto4/raw/barre/`.
2. Réduire, recadrée sur l'alpha, à deux fois la taille d'affichage :
   `python3 -c "from PIL import Image; im=Image.open(SRC); im.crop(im.getbbox()).resize((W,H), Image.LANCZOS).save(DST, optimize=True)"`
3. Ajouter au bouton les deux `<span>` (`-art` en `aria-hidden`, `-label`).
4. Copier le bloc `.bp-shop-art` / `.bp-shop-label` du CSS et n'ajuster que
   `width`, `aspect-ratio`, l'ancrage (`left`/`right` + `bottom`) et le `padding`
   du libellé.
5. Vérifier au navigateur **en 1440 et en 900** : c'est en une colonne que les
   débordements se cognent.
