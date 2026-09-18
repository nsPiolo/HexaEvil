# Écran de jeu — images à générer (Gemini), cercle par cercle

Pendant du menu ([`prompts-menu.md`](prompts-menu.md)), pour l'**écran de jeu** :
`Proto4Html/src/presentation/GameScreen.tsx` et la section « Écran de jeu : la
table » de `src/index.css`. Quatre images, deux propres au cercle et deux
partagées :

| Fichier | Emplacement | Fond | Sélecteur CSS | Rôle |
|---|---|---|---|---|
| `bg.jpg` | `public/circles/<NN>-<nom>/` | opaque | `.table` | Le décor du cercle, derrière tout |
| `bet-bg.jpg` | `public/circles/<NN>-<nom>/` | opaque | `.panel-bets .bet-panel` | Le fond du panneau de paris |
| `boss.webp` | `public/circles/<NN>-<nom>/` | transparent | `.dialogue-portrait` | Le portrait du boss, pour la scène qui précède sa course |
| `frame.webp` | `public/table/` | transparent | `.felt` | La dalle de pierre qui porte le plateau et les dés |
| `shop.webp` | `public/table/` | transparent | `.panel-shop` | Le parchemin de la boutique |
| `tier.webp` · `tier-on.webp` | `public/table/` | transparent | `.tier` | Les dalles du choix de registre de pari |

Le cadre et le parchemin sont **partagés par les neuf cercles** (`public/table/`),
seuls le décor, le guichet et le portrait du boss sont propres à un cercle
(`public/circles/`). Le
jour où un cercle mérite sa propre pierre, il suffira de déplacer le fichier.
Les rendus bruts restent dans `docs/proto4/raw/` (traçabilité IA,
`docs/STEAM_AI_DISCLOSURE.md`).

Cercle 1 = **Limbes** (`run.circles[0]` dans `config/race.json`) : boss Charon,
âmes Homère, Virgile, Aristote, Platon, Socrate. Chez Dante, les Limbes n'ont
aucun châtiment physique : un crépuscule gris, des soupirs, et le Noble Château
aux sept murs où les justes d'avant le Christ discutent pour l'éternité. C'est
le seul cercle **sans feu** — la chaleur vient des torches et des lampes à
huile, jamais de la lave. Les huit autres cercles reprennent les mêmes quatre
images avec un autre univers (voir « Décliner aux autres cercles » en fin de
fichier).

## Direction artistique commune

Le paragraphe suivant est repris **mot pour mot** dans chaque prompt, c'est lui
qui fait tenir les neuf cercles ensemble :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art.

## Ce que le concept fourni garde et ce qu'il faut écarter

Le concept du cercle 1 donne la bonne ambiance (bibliothèque voûtée, brume,
torches chaudes contre pierre froide, ocre du parchemin). En revanche :

- **Aucun texte dans les images.** Gemini écrit du faux français ; tous les
  libellés, prix, cotes et noms sont du HTML posé par-dessus.
- **Aucun élément d'interface peint** : pas de cartes de boutique, pas de
  boutons, pas de jetons d'âmes, pas de jauge, pas de médailles de philosophes.
  Ce sont des composants React ; une carte peinte dans le fond ferait doublon et
  ne bougerait pas avec le contenu.
- **Aucun assemblage** : les quatre images ne se recouvrent pas dans le fichier.
  Le parchemin ne doit pas déborder sur le cadre de pierre, c'est le CSS qui
  l'ouvre et le referme par-dessus.
- **Le centre reste calme.** Tout ce qui est détaillé au milieu sera caché par
  le plateau ou illisible sous le texte.

## Contraste : le texte passe avant le décor

L'écran de jeu est dense (colonnes de paris, listes de combinaisons, chiffres).
Partout où du texte est posé (centre du cadre, corps du parchemin, fond du
panneau de paris), la peinture doit rester **sourde et peu contrastée** :
valeurs proches, pas de haute lumière, pas de motif net. Les effets vont sur
les **bords**, là où il n'y a rien à lire.

## Transparence : fond noir, détourage à l'édition

Même règle que pour le menu : Gemini ne rend pas de canal alpha. `frame.png` et
`shop.png` sont demandés sur **fond noir pur (#000000)**, à supprimer ensuite et
à enregistrer en PNG avec alpha — noir et non blanc, parce que la pierre claire
et le papier crème se détoureraient mal sur du blanc. Donc : pas de noir pur
dans le sujet, pas d'ombre portée ni de halo dans le rendu (ajoutés à
l'édition), bord net et fermé entre le sujet et le noir.

Les fichiers sont en **2×** (affichés à la moitié de leur taille) pour rester
nets sur écran Retina.

---

## 1. `bg.jpg` — le décor du cercle

Posé en `background: cover` sur `.table`, il tient toute la fenêtre. La table de
jeu (`.felt`, 1400 px CSS de large, centrée) le recouvre : sur un écran 1920, il
ne reste visible que **deux bandes latérales d'environ 260 px** et le haut de
l'écran. La composition doit donc porter l'intérêt dans les **tiers extérieurs**
— colonnes, torches, silhouettes, perspective qui fuit — et garder le centre
sombre et vide. L'image est rognée en haut et en bas sur les fenêtres plus
larges que 16:9 : rien d'important dans les 10 % du haut ni du bas.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. The First Circle of Hell, Limbo: the
> interior of an immense ruined library-cathedral carved in cold blue-grey
> stone, towering shelves of ancient books and scrolls receding into grey fog on
> both sides, tall vaulted arches and worn columns, a few iron wall torches and
> oil lamps casting warm amber pools of light against the cold stone, pale mist
> drifting at floor level, faint robed silhouettes of ancient philosophers
> standing still in the distance, eternal grey twilight, no fire, no lava, no
> flames on the ground, melancholy and solemn. Cinematic wide shot, horizontal
> 16:9 composition, the detail and the light sources are in the left and right
> thirds; the whole central third is a calm, dark, empty and out-of-focus area
> of fog and stone floor, left free for interface elements. No text, no letters,
> no writing, no logo, no buttons, no frame, no border, no user interface.
> 2752 × 1536 pixels.

À l'édition : assombrir le tiers central si le rendu y garde du contraste, et
vérifier qu'aucune source lumineuse ne tombe derrière la table.

---

## 2. `frame.png` — la dalle de pierre

C'est la dalle qui porte tout le jeu : plateau, dés, poignées de boutique et de
paris. Sa **hauteur varie beaucoup** (le panneau de paris ou la boutique
s'ouvrent dedans), donc le CSS l'étire en **neuf tranches** (`border-image`) :
les quatre coins et les quatre bords sont fixes, seul le centre s'étire.

`.felt` a une **largeur bloquée** (`max-width: 1400px`) et une **hauteur qui
double** selon que la boutique ou le panneau de paris est ouvert. Conséquence
qui commande tout le dessin : les bords haut et bas subissent un étirement
horizontal **constant** (donc invisible, il suffit de pré-calibrer), mais les
bords gauche et droit subissent un étirement vertical **variable de 1 à 2**. Tout
motif qui court le long des bords verticaux sera écrasé ou étiré à vue.

Découpage attendu du fichier 2400 × 1600 (le cadre est dessiné à la taille de
`.felt`, soit 1400 px CSS de large ; la finesse tient aux tranches, pas au
fichier) :

| Zone | Pixels | Rôle |
|---|---|---|
| pourtour | 100 px sur les quatre côtés | fixe : arête éclatée et son ombre de bord |
| centre | le reste | **surface de pierre unie**, étirée dans les deux sens |

La tranche est **fine** : la dalle n'a pas de cadre, juste une arête. Sur le
rendu en place, l'irrégularité de la découpe ne dépasse pas 18 px et l'ombre de
bord s'éteint en une cinquantaine — d'où une tranche de 48 px seulement,
dessinée à 16 px de bordure.

### Pierre nue, pas de gravure

Le cadre est du **mobilier**, pas un sujet. Il entoure l'écran le plus dense du
jeu (plateau, dés, combinaisons, jetons, jauge, paris) : tout motif sculpté qui
court sur sa largeur entre en concurrence avec le contenu. Trois raisons de s'en
tenir à une pierre simplement texturée :

- **Lisibilité.** Une frise nette et régulière attire l'œil sur le pourtour, là
  où il n'y a rien à lire, et le détourne du plateau.
- **DA.** Une grecque symétrique au relief propre rend un aspect « asset 3D »,
  à l'opposé du speed-painting aux coups de brosse larges qu'on vise. La pierre
  nue, elle, est entièrement peinte : c'est la matière et la lumière qui font
  l'intérêt.
- **Les neuf cercles.** Le cadre garde la même silhouette partout ; une grecque
  l'enferme dans un registre gréco-romain qui va au cercle 1 mais pas au lac
  gelé du cercle 9 ni à la boue du cercle 3.

Ce qu'on garde pour que ça ne fasse pas « boîte grise » : la **matière** (coups
de brosse, grain d'ardoise, dérives du bleu froid vers le gris chaud), une
**silhouette extérieure taillée à la main** (légèrement irrégulière, quelques
éclats aux angles), et la **lumière rasante ambrée** sur l'arête haute. Pas de
moulure, pas de frise, pas de médaillon, pas de cartouche, pas de fissure
traversante, pas de trou : une dalle épaisse et nue, sans encadrement.

Le premier essai gardait un profil mouluré à deux ressauts. À l'usage il faisait
tableau accroché au mur plutôt que table de jeu, et sa bordure épaisse mangeait
la largeur utile. La version retenue est la dalle sans cadre.

### Quatre exigences qui priment sur le joli

- La **face doit être uniforme** : une pierre sombre, mate, froide et
  **neutre**, sans grande fissure, sans veine marquée, sans motif, et surtout
  sans lavis chaud ni dégradé marqué — elle est étirée dans les deux sens et sert
  de fond de lecture aux dés et au plateau.
- Les **bords gauche et droit doivent être invariants à l'étirement vertical** :
  une arête régulière sur toute la hauteur, aucun motif répété, aucune fissure,
  aucun éclat marqué ailleurs que dans les angles.
- Les **coins doivent se ressembler** deux à deux : ils sont posés tels quels,
  un décor asymétrique trop marqué désaxerait la table.
- **Rien ne touche les bords de l'image** sauf la marge d'ombre : la dalle
  occupe environ 96 % de la largeur et de la hauteur.

Sur fond **noir** :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast between
> warm firelight and cold blue-grey rock, expressionist and textured, like a
> speed-painting concept art. A single large rectangular slab of plain cold
> blue-grey stone, seen perfectly from the front, flat, like an ancient altar
> table or a gaming table cut from one block. The thick border running all around
> is completely bare: no carving, no ornament, no greek key, no laurel, no
> medallion, no relief pattern, no inscription, no crack, no hole, nothing
> engraved anywhere. There is no frame and no moulding at all: the slab is one
> single flat face from edge to edge, with only its own thickness showing as a
> narrow darker rim where the stone was cut. The stone itself carries all the
> interest: rich painterly brushwork, a coarse
> granite and slate grain, subtle shifts from cool blue-grey to warmer stone grey,
> worn rounded outer edges with a few small chips at the corners only, hand-cut
> and slightly irregular outer silhouette. The whole face of the slab is dark,
> matte, even, calm and neutral cold grey, evenly lit with no strong gradient and
> no bright spot, a quiet dark stone texture with no crack, no vein, no pattern
> and no drawing, so that interface elements can be laid over it anywhere. A thin
> faint warm amber light grazes only the outermost top edge; everything else stays
> in cold shadow. The slab is horizontal, fills about 96 % of the image, perfectly
> centered, nothing touches the image borders. Pure flat black background
> (#000000), no drop shadow, no glow, crisp closed edges between the stone and the
> black. No text, no letters, no writing, no symbols, no user interface.
> 2400 × 1600 pixels.

À l'édition : supprimer le noir ; vérifier au tampon que toute la face de la
dalle est plate, hors liseré de bord ; **vérifier qu'une bande horizontale
prise n'importe où sur le bord gauche est identique à toutes les autres** (si
non, c'est réparable au tampon : on étire une bonne bande sur toute la hauteur) ;
ajouter l'ombre portée sous le cadre dans la marge, ou en CSS (`box-shadow`,
déjà en place sur `.felt`).

Puis **mesurer les tranches sur le fichier détouré et recadré** : `border-image-slice`
se donne en pourcentage de l'image, `bord / dimension`. Sur un cadre recadré au
plus juste, compter du bord extérieur du cadre jusqu'au début du panneau
intérieur sombre.

---

## 3. `shop.png` — le parchemin de la boutique

La boutique s'ouvre en haut de la table, sur toute la largeur (environ 1370 px
CSS), et sa hauteur dépend du nombre d'articles. **Pas de rouleaux ni de
bâtons** : une simple feuille à plat, déchirée et un peu brûlée sur ses quatre
bords. Neuf tranches, comme le cadre.

Même piège que pour le cadre, et il se déplace : la largeur est bloquée, la
hauteur varie. Les bords **haut et bas** subissent un étirement horizontal
constant, mais les bords **gauche et droit** un étirement vertical variable. Sans
rouleaux pour les tenir, ce sont donc deux **lisières déchirées** qui encaissent
cet étirement : elles doivent être fines et régulières, et sont **répétées**
(`border-image-repeat: round`) plutôt qu'étirées. Un seul grand accroc se
reconnaîtrait immédiatement en boucle.

Découpage attendu du fichier 2400 × 1000 :

| Zone | Pixels | Rôle |
|---|---|---|
| lisières haut et bas | y 0 à 100 et 900 à 1000 | fixes en épaisseur, répétées en largeur |
| lisières gauche et droite | x 0 à 100 et 2300 à 2400 | fixes en épaisseur, répétées en hauteur |
| corps | 2200 × 800 | papier crème uni, étiré dans les deux sens |

### Le corps doit être plat, y compris en lumière

C'est l'écart assumé à la DA commune : le théâtral va dans les bords brûlés, le
corps reste **uniformément éclairé**, sans direction de lumière et sans dégradé
d'un bord à l'autre. Un parchemin chaud à gauche et gris-bleu à droite, comme le
donne spontanément Gemini, pose trois problèmes : le dégradé est étiré avec le
centre, les moitiés n'ont pas le même contraste sous le texte, et le gris lit
comme une salissure. De même, pas de grands coups de brosse marqués dans le
corps : il porte les prix et les descriptions des objets.

Sur fond **noir** :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast between
> warm firelight and cold blue-grey rock, expressionist and textured, like a
> speed-painting concept art. A single flat rectangular sheet of old parchment
> lying perfectly flat and seen straight from the front, for a fantasy shop panel.
> No rolls, no scroll, no wooden rods, no curling, no folds, the sheet is
> completely flat. All four edges are torn and lightly scorched, with fine, small,
> regular and evenly spaced nicks and a thin dark brown burnt rim; the tearing is
> the same all around, with no large lobe, no deep notch and no single distinctive
> accident anywhere. The entire body of the sheet is one even, calm, bright warm
> cream colour, uniformly lit, flat lighting with no light direction, no gradient,
> no shading from one side to the other, no grey and no blue tones, only a very
> subtle fine paper grain, no stain, no mark, no drawing and no text, so that
> small text can be laid over it and stay readable everywhere. All the drama and
> the contrast are in the burnt torn edges only. The sheet is about two and a half
> times wider than tall, fills about 94 % of the image, perfectly centered,
> nothing touches the image borders. Pure flat black background (#000000), no drop
> shadow, no glow, crisp closed edges between the paper and the black. No text, no
> letters, no writing, no symbols, no user interface. 2400 × 1000 pixels.

À l'édition : supprimer le noir ; vérifier que les 100 px de chaque lisière
contiennent toute la déchirure et que le corps est franc dès la tranche
suivante ; **égaliser le corps** (une couche de crème uni en mode « couleur » à
faible opacité suffit à tuer un dégradé gauche-droite) ; comparer la valeur du
coin haut-gauche et du coin bas-droit du corps, elles doivent être identiques.

---

## 4. `bet-bg.jpg` — le fond du panneau de paris

Le panneau de paris s'ouvre en bas de la table, sur toute la largeur, en trois
colonnes (type de pari · âmes · mise) plus un en-tête et un pied. C'est **l'écran
le plus chargé en texte du jeu** : l'image est un fond d'ambiance, pas une
illustration. Elle reste opaque (posée en `cover` dans un bloc à coins arrondis),
et surtout **sombre** : valeurs basses partout, la lumière seulement dans le
quart droit, là où il n'y a que le bouton « Lancer la course ».

Format 2800 × 900 (environ 3:1), affiché 1400 × 450 CSS.

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast
> between warm firelight and cold blue-grey rock, expressionist and textured,
> like a speed-painting concept art. A very dark, very wide horizontal panel: the
> worn stone counter of an ancient betting booth in Limbo, seen from the front,
> cold dark blue-grey stone, with, in the right quarter only, a distant view
> opening onto the grey plain of Limbo — pale olive trees, drifting fog, a small
> lone robed silhouette walking away, lit by a soft warm amber glow. The left
> three quarters of the image are almost entirely dark, calm and empty stone in
> deep desaturated blue-black, barely lit, with no detail, no object and no
> pattern, so that small text stays perfectly readable over it. Very low overall
> brightness, no bright highlight outside the right quarter, no strong edge in
> the middle. Wide cinematic 3:1 composition. No text, no letters, no writing, no
> logo, no buttons, no cards, no user interface. 2800 × 900 pixels.

À l'édition : mesurer la luminance des trois quarts gauche (viser < 20 %) et
assombrir si besoin ; poser au besoin un léger dégradé sombre de gauche à droite
pour que la colonne des mises reste lisible.

---

## 5. `boss.webp` — le portrait du boss

Juste avant la troisième course d'un cercle, le boss se présente : même écran que
les dialogues du stagiaire (bulles de parchemin à droite, portrait à gauche), mais
joué **dans le décor du cercle** — `bg.jpg` passe en fond, assombri d'un voile
(`.dialogue-scene`). Les répliques du boss et celles du stagiaire se relaient dans
le même emplacement de portrait, en fondu : l'un remplace l'autre à chaque prise de
parole.

Source : un buste détouré sur le **canevas commun 976 × 1075**, le même que les
portraits du stagiaire (`docs/proto4/raw/perso/`) — c'est lui qui fait que les deux
se remplacent au même endroit sans que le personnage saute. Le canevas n'est jamais
recadré à la conversion : réduction à 700 px de large, WebP qualité 88, et c'est
tout. Les rendus bruts vivent dans `docs/proto4/raw/demons/`, leurs détourages dans
`png2/` à côté, nommés `<n>_<univers>.png` ; le numéro donne le cercle, pas le nom du
dossier (`10_mer` → `10-fonds-marins`, `12_villes` → `12-ville`, `13_neige` →
`13-montagne`, `14_vent` → `14-ciel`, `15_ange` → `15-paradis`).

La conversion n'est pas à faire à la main : `Proto4Html/scripts/install-art.py` pose les
portraits de boss **et** ceux du stagiaire au bon format et au bon endroit. Les prompts
et la marche à suivre sont dans [`prompts-boss.md`](prompts-boss.md).

Les quinze sont peints. Celui du cercle 9 est le stagiaire lui-même, promu : c'est le
même personnage que `menu/perso/stagiaire_4_boss.webp`, en costume bleu. Les cercles
10 à 15 ont leur portrait d'avance, comme leurs décors — ils n'ont pas encore de
boss dans `config/race.json`, donc pas encore de scène.

Le prompt reprend la DA commune, avec la phrase d'univers du cercle :

> Digital concept painting with wide visible brush strokes, misty and ethereal
> atmosphere, dramatic theatrical lighting with strong chromatic contrast between
> warm firelight and cold blue-grey rock, expressionist and textured, like a
> speed-painting concept art. Bust portrait of <le boss>, <deux ou trois traits du
> personnage>, facing the viewer, cut at the chest, the head in the upper third of
> the image and nothing touching the borders. Pure flat white background
> (#ffffff), no drop shadow, no glow, crisp closed edges between the character and
> the white; no pure white anywhere on the character itself. No text, no letters,
> no logo, no user interface. 976 × 1075 pixels.

---

## Décliner aux autres cercles

Les quatre prompts ne changent que par leur **phrase d'univers** ; la DA
commune, les tailles, les découpages et les contraintes de lisibilité restent
identiques. Un dossier par cercle,
`Proto4Html/public/circles/<NN>-<nom>/{bg.jpg,frame.png,shop.png,bet-bg.jpg}` :

**Les quinze décors sont en place.** La liste `CIRCLE_ART` de `GameScreen.tsx`
fait la correspondance numéro → dossier, et `circleArt()` borne au dernier : du
quinzième cercle à l'infini, c'est le Paradis qui rejoue.

| # | Cercle | Matière du décor et de la dalle | Lumière | État |
|---|---|---|---|---|
| 1 | Limbes | bibliothèque-cathédrale, pierre bleu-gris, livres | torches ambrées, crépuscule gris | **en place** (`01-limbes`) |
| 2 | [Luxure](prompts-cercle-02-luxure.md) | falaises battues par les vents, voiles arrachés | éclairs pourpres, ciel noir | **en place** (`02-luxure`) |
| 3 | [Gourmandise](prompts-cercle-03-gourmandise.md) | fosse de boue grasse, pierre suintante, os rongés | jaune malade, pluie froide | **en place** (`03-gourmandise`) |
| 4 | [Avarice](prompts-cercle-04-avarice.md) | salle au trésor effondrée, dalles d'or terni, poids | or froid, contre-jour | **en place** (`04-avarice`) |
| 5 | [Colère](prompts-cercle-05-colere.md) | marais du Styx, pierre noire immergée, roseaux | rouge sourd sous la brume | **en place** (`05-colere`) |
| 6 | [Hérésie](prompts-cercle-06-heresie.md) | nécropole de tombeaux ouverts, pierre fendue | braise blanche dans les sarcophages | **en place** (`06-heresie`) |
| 7 | [Violence](prompts-cercle-07-violence.md) | désert de sable brûlant, fleuve de sang au loin | pluie de feu, orange saturé | **en place** (`07-violence`) |
| 8 | [Fraude](prompts-cercle-08-fraude.md) | fosses concentriques de pierre, ponts, machineries | vert-de-gris, lanternes basses | **en place** (`08-fraude`) |
| 9 | [Trahison](prompts-cercle-09-trahison.md) | lac gelé du Cocyte, glace bleue, silhouettes prises | bleu glacial, aucune chaleur | **en place** (`09-trahison`) |

### Cercles 10 et suivants : le mode démon

Après le neuvième, le joueur choisit entre sortir et continuer comme démon
(GDD §5.3). S'il monte, les six cercles suivants sont **jouables** : ils sont
dans `config/race.json` comme les neuf premiers, avec leurs âmes, leurs couloirs,
leurs terrains, leur boss et leur prix. Ils quittent la cosmologie de Dante, mais
gardent la DA commune, les formats et les règles de lisibilité.

Au-delà du quinzième, le jeu ne s'arrête pas : le paradis se rejoue indéfiniment,
décor et boss compris, avec un prix de sortie qui monte à chaque tour
(`run.beyondPriceGrowth`, `src/core/rules/circles.ts`) jusqu'à ce que le joueur ne
puisse plus payer. Rien de nouveau à peindre pour ces tours-là.

| # | Cercle | Matière du décor | Lumière | Le piège propre au cercle |
|---|---|---|---|---|
| 10 | [Fonds marins](prompts-cercle-10-fonds-marins.md) | cathédrale engloutie, sable noir, algues | rais verts lointains | la dalle bleu-gris se noie dans l'eau — **en place** (`10-fonds-marins`) |
| 11 | [Falaise](prompts-cercle-11-falaise.md) | basalte noir, éboulis, chaînes pendantes | ambre sourd au pied de la paroi | roche sur roche : la table devient du décor — **en place** (`11-falaise`) |
| 12 | [Ville](prompts-cercle-12-ville.md) | rues à balcons de fer, foule, suie | lanternes basses | la foule sature tout, et une ville s'écrit — **en place** (`12-ville`) |
| 13 | [Montagne](prompts-cercle-13-montagne.md) | séracs bleus, neige de nuit, cordes gelées | lueur froide sans lune | premier décor clair : le fil d'Ariane — **en place** (`13-montagne`) |
| 14 | [Ciel](prompts-cercle-14-ciel.md) | murs de cumulonimbus, pont rompu | éclairs muets et lointains | un ciel n'a pas de tiers extérieurs — **en place** (`14-ciel`) |
| 15 | [Paradis](prompts-cercle-15-paradis.md) | gradins de nuage clair, marbre pâle | anneaux d'or sur indigo | il sert **à tous les cercles suivants** — **en place** (`15-paradis`) |

Le quinzième décor est réutilisé du cercle 15 à l'infini : c'est le seul dont la
répétition se voie, d'où sa règle propre (rien qui se passe, de la matière et
pas un motif) et le changement de repli de `CIRCLE_ART` décrit dans son fichier.

La dalle garde **la même silhouette et le même découpage** d'un cercle à l'autre
(même tranche de 48 px) : seules la matière et la lumière changent. Sinon la
table saute d'un cercle au suivant. Elle est d'ailleurs partagée par les neuf
cercles pour l'instant, dans `public/table/`.

## Après génération

1. Détourer le fond noir, enregistrer en PNG avec alpha.
2. Recadrer sur l'alpha (marge transparente supprimée), réduire, puis convertir
   en **WebP** : `cwebp -q 90 -alpha_q 100 -m 6 in.png -o out.webp`. Sur le
   cadre et le parchemin, ça fait passer 2,4 Mo à 155 Ko pour 46 dB de PSNR,
   soit un écart moyen de 1,7 sur 255 — invisible, et l'alpha reste exact.
   Les décors restent en JPEG (qualité 82, progressif).
3. Mesurer les tranches **sur le fichier final** et reporter les valeurs dans
   `src/index.css`. `border-image-slice` prend des nombres sans unité = des
   pixels de la source, plus lisibles qu'un pourcentage.
4. Ouvrir le jeu et vérifier les deux états qui changent la hauteur : panneau de
   paris ouvert, puis boutique ouverte.

### Décors en place

Les sources vivent dans `docs/proto4/raw/cercleN/`, converties en JPEG qualité 82
progressif comme le veut l'étape 2 ci-dessus, **sans redimensionner** : la
définition du dossier `public/` est celle de la source.

| Dossier | `bg.jpg` | `bet-bg.jpg` |
|---|---:|---:|
| `01-limbes` | 2752 × 1536 | 2800 × 925 |
| `02-luxure` | **1376 × 768** | 1792 × 592 |
| `03-gourmandise` | 2752 × 1536 | 1792 × 592 |
| `04-avarice` | **1376 × 768** | 1792 × 592 |
| `05-colere` | **1376 × 768** | 1792 × 592 |
| `06-heresie` | **1376 × 768** | 1792 × 592 |
| `07-violence` | **1376 × 768** | 1792 × 592 |
| `08-fraude` | **1376 × 768** | 1792 × 592 |
| `09-trahison` | **1376 × 768** | 1792 × 592 |
| `10-fonds-marins` | 2752 × 1536 | 1792 × 592 |
| `11-falaise` | 2752 × 1536 | 3584 × 1184 |
| `12-ville` | **1376 × 768** | 3584 × 1184 |
| `13-montagne` | **1376 × 768** | 1792 × 592 |
| `14-ciel` | 2752 × 1536 | 1792 × 592 |
| `15-paradis` | **1376 × 768** | 1792 × 592 |

⚠️ **Dix `bg.jpg` sur quinze sont à demi-définition** — 1376 de large au lieu des
2752 de référence, ceux en gras. Posés en `cover` sur une fenêtre de 1440 en
écran Retina, ils sont agrandis d'environ deux fois. Ça passe parce que ces
décors sont sombres, flous de nature et recouverts aux trois quarts par les
panneaux, mais c'est le lot à regénérer en 2752 × 1536 le jour où ça pique à
l'œil. **Le Paradis est le plus exposé** : c'est le seul décor clair, il sert du
quinzième cercle à l'infini, et il est dans ce lot.

Les `bet-bg.jpg` sont dans le même cas à 1792 contre 2800 de référence, en moins
visible : seule la colonne de droite du panneau laisse respirer le décor.

### Valeurs en place (cercle 1)

| Fichier | Taille finale | Tranche | Bordure CSS |
|---|---|---:|---:|
| `frame.webp` | 1600 × 1042 | 48 px | 16 px (10 px sous 760 px de large) |
| `shop.webp` | 2000 × 821 | 95 px | 34 px |
| `tier.webp`, `tier-on.webp` | 1000 × 369 | 46 px | 10 px |
| `bg.jpg` | 2752 × 1536 | — | `cover`, `background-attachment: fixed` |
| `bet-bg.jpg` | 2800 × 925 | — | `cover`, calé à droite |

### Les dalles de registre (`tier`)

Le choix Simples · Combinés · Avancés se lisait comme les paris eux-mêmes. Il passe sur une
**dalle de pierre gravée**, les paris restant des cartouches plats et sombres : la hiérarchie
se voit sans rien lire.

Les deux états sont peints dans **une seule image source** (`raw/typeparis.png`, dalle sombre
en haut, dalle claire en bas, parfaitement alignées), mais découpés en **deux fichiers**
plutôt qu'en sprite à deux rangées comme les dalles du menu : la largeur d'une colonne varie,
et seul `border-image` garde les coins chanfreinés nets — un `background-size` étiré les
aplatirait. Repos = `tier.webp`, survol **et** sélection = `tier-on.webp` ; c'est un halo doré
en `drop-shadow` qui distingue le sélectionné du survolé, parce qu'il suit la silhouette
chanfreinée là où un contour rectangulaire la trahirait.

La pierre est claire, donc l'encre est sombre. Les teintes ne sont pas choisies à l'œil :
mesurées au **98e centile de luminance** de la zone de texte (le cas défavorable réaliste, un
coup de brosse clair sous le libellé), `#0a0e12` donne 4,6:1 et `#150f04` 4,5:1 sur la dalle
au repos — AA de justesse, alors que les teintes plus chaudes qu'on aurait prises d'instinct
(`#3a2e1a`) tombaient à 3,2:1.

### Deux pièges rencontrés

- **`border-image-repeat: round` carrelle aussi la zone centrale**, pas
  seulement les bords : sur le parchemin, ça laissait une couture verticale en
  plein milieu du papier. Les deux images sont donc en `stretch`. L'étirement de
  la déchirure est indolore ici (40 px d'amplitude sur 2000 de large) ; la règle
  « déchirure fine et régulière » des prompts reste valable, c'est elle qui rend
  cet étirement invisible.
- **`box-shadow` dessine un rectangle**, qui déborde de la silhouette taillée du
  cadre. `filter: drop-shadow()` suit le contour réel. Il crée un bloc
  conteneur pour les descendants en `position: fixed` : les modales sont bien
  en dehors de `.felt`, sinon elles auraient été recadrées.

### Encre de la boutique : deux inversions de contraste

Le parchemin est clair alors que le reste du jeu est sombre — et les cartes de la
vitrine sont, elles, de l'ardoise sombre posée sur ce papier clair. Plutôt que de
reprendre chaque règle `.shop-*`, le contraste s'inverse deux fois par
**redéfinition des variables** :

1. `.panel-shop` passe `--ink`, `--muted`, `--line`, `--panel`, `--gold`,
   `--ember` et `--bad` en encre brune, pour tout ce qui se lit à même le papier
   (en-tête, jauge, boutons du pied).
2. `.panel-shop .shop-item, .panel-shop .shop-target` les repassent en clair sur
   ardoise, pour tout ce que contient une carte — y compris les pastilles de
   faces de dé et l'avertissement rouge, qui n'ont besoin d'aucune règle propre.

Un nouveau composant posé dans la boutique hérite donc de la bonne encre selon
qu'il est sur le papier ou dans une carte, sans `!important`.

Deux pièges à connaître si l'on touche à ces blocs :

- `.btn-confirm` peint son texte en `color: var(--bg)`, ce qui n'a de sens que
  sur le thème sombre. Il faut le redire dans `.panel-shop`, sinon la
  confirmation d'achat s'écrit dans la couleur de fond du thème.
- La vitrine est en `grid-template-columns: repeat(auto-fit, …)` et non
  `auto-fill` : sur toute la largeur du parchemin, `auto-fill` réserve les
  colonnes vides et tasse les quatre cartes à gauche.

Les tons vifs du thème (`--ember` à `#d4541e`) crevaient l'œil sur le papier :
les boutons d'action sont en terre cuite éteinte (`#a35f46`), les secondaires en
ardoise, comme les cartes.
