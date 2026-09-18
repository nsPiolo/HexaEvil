# Boss de cercle — portraits à générer (Gemini)

Les quinze boss, un par cercle. Juste avant la troisième course, le boss se présente
dans le décor du cercle : portrait à gauche, bulles de parchemin à droite
(`prompts-cercles.md` §5). **Les quinze sont déjà peints** — ce document sert à en
refaire un quand il ne convient plus, pas à repartir de zéro.

| Où | Fichier | Canevas |
|---|---|---|
| Rendu brut | `docs/proto4/raw/demons/<n>_<univers>.jpeg` | 4:5, généré à 2K |
| Détouré à la main | `docs/proto4/raw/demons/png2/<n>_<univers>.png` | 1856 × 2304, alpha |
| Dans le jeu | `Proto4Html/public/circles/<NN>-<nom>/boss.webp` | 700 px de large |

Le numéro donne le cercle, pas le nom du dossier : `10_mer` → `10-fonds-marins`,
`12_villes` → `12-ville`, `13_neige` → `13-montagne`, `14_vent` → `14-ciel`,
`15_ange` → `15-paradis`.

## La contrainte qui prime : cohabiter

Un boss refait sera vu **à côté des quatorze autres**, inchangés. La direction
artistique ci-dessous n'est donc pas un choix libre : elle décrit ce que sont
réellement les images existantes, pour qu'un portrait neuf ne détonne pas. En
particulier, ce **n'est pas** la DA de speed-painting des décors et des objets — les
boss sont des illustrations de personnage lissées, pas des esquisses texturées.

Trois constantes lues sur les quinze portraits :

- **buste coupé à la poitrine**, de face ou presque, la tête dans le tiers supérieur ;
- **le bas du vêtement se dissout** en coups de pinceau lâches, il n'est jamais coupé
  net — c'est ce qui fait que le portrait se pose sans cadre ;
- **les yeux sont lumineux**, ambre le plus souvent, blancs pour les damnés.

Le registre glisse le long des cercles : mythologique aux premiers (Charon, Cerbère,
le Minotaure), **administratif** à partir de la Fraude — Géryon est en chemise et
cravate, le Guichetier en manches de lustrine, l'Ange en chemise de bureau.
C'est le fil du jeu : l'enfer est une agence de paris.

## Fond violet, même raison que les objets

Même convention que [`prompts-objets.md`](prompts-objets.md) : fond **`#2A1240`**,
uni, à détourer ensuite. Les portraits existants sont sur blanc ; un portrait refait
sur violet se détourera mieux, et son liseré résiduel sera sombre donc invisible une
fois posé sur le décor assombri de la scène de dialogue.

- **aucun violet, magenta ou pourpre sur le personnage** — c'est la couleur-clé ;
- **pas de noir pur** : les plis les plus sombres du vêtement restent en brun chaud ou
  gris-bleu, plus clairs que le fond ;
- **une lumière de bord froide** sur les épaules et les cheveux, discrète — assez pour
  détacher la silhouette, pas au point de faire un contour de sticker : ces portraits
  sont lissés, un liseré dur les trahirait ;
- **rien qui flotte** à côté du personnage, ni fumée ni coup de pinceau détaché.

## Le squelette de prompt

Seule la **phrase de boss** change d'un portrait à l'autre :

> Clean digital character illustration for a dark fantasy game, semi-realistic painted
> style, smooth blended rendering with visible brushwork only in the hair and the cloth,
> warm muted earthy palette, soft directional light from the upper left. Bust portrait
> of **\<phrase de boss\>**, facing the viewer, cut at the chest, the head in the upper
> third of the frame and nothing touching the borders, the lower edge of the clothing
> dissolving into loose ragged brush strokes. Pure flat dark violet background (#2A1240),
> perfectly even, no drop shadow, no glow or light spilling onto the background, crisp
> closed edges between the character and the background; a subtle cool edge light along
> the shoulders and the hair so the silhouette separates cleanly; no violet, purple or
> magenta anywhere on the character, and no pure black either — the darkest folds stay a
> deep warm brown or blue-grey, lighter than the background. Everything painted in the
> image belongs to that one character — no detached brush strokes, specks or floating
> fragments anywhere in the background. No text, no letters, no numbers, no logo, no
> user interface.

## Les quinze phrases de boss

Le pouvoir du boss (`run.circles[].power` dans `config/race.json`) se lit autant que
possible **dans le portrait** : Géryon tient une carte vierge parce que ses dés Âme
mentent, le Guichetier ferme un volet parce qu'il ferme un guichet par tour, le
Porte-chaînes porte les chaînes dont il entrave les âmes. C'est gratuit et ça fait
gagner une ligne de dialogue.

Un piège, vérifié à la génération : **un accessoire tenu levé va toucher le bord**. Le
modèle compose autour de l'objet dès qu'on le décrit en hauteur, décentre le buste et
laisse l'accessoire sortir du cadre — ce qui casse le recadrage au canevas commun. D'où
la formulation retenue partout : l'accessoire est tenu **à hauteur de poitrine**, et la
phrase le dit explicitement quand il est encombrant.

### Les neuf cercles de Dante

| Fichier | Cercle | Boss | Phrase de boss |
|---|---|---|---|
| `1_limbes.png` | Limbes | Charon | Charon the ferryman, an ageing horned demon with a weathered lined face and a short grey beard, long braided grey-brown dreadlocks, heavy ram horns curling back, glowing amber eyes, wearing a ragged layered brown robe hung with bone charms, old coins and a small bronze eye amulet |
| `2_luxure.png` | Luxure | Minos | Minos, judge of the lustful, a lean severe demon, unmistakably not human: two short sharp black horns rising clearly from his slicked-back black hair, pointed ears, grey-tinged skin and cold glowing amber eyes, wearing the dark tailored coat of a magistrate over a wind-torn collar, his long scaled tail coiled once over his own shoulder like a measuring rope |
| `3_gourmandise.png` | Gourmandise | Cerbère | Cerberus, a hulking three-headed hound-demon, three broad snouted heads crowded shoulder to shoulder, heavy dripping jowls, six small yellow eyes, matted grey-brown fur, a thick studded iron collar biting into the neck |
| `4_avarice.png` | Avarice | Ploutos | Plutus, a bloated demon of wealth, a wide swollen face with sagging jowls and small greedy eyes lit cold gold, thin horns half sunk into the flesh, wearing a straining brocade waistcoat hung with chains of tarnished coins, his thick fingers heavy with rings |
| `5_colere.png` | Colère | Phlégyas | Phlegyas, the boatman of the Styx marsh, a gaunt furious demon with sunken cheeks and a shaved skull, long back-swept horns, eyes burning a dull red, bare wiry shoulders streaked with black marsh mud, a frayed rope harness across his chest |
| `6_heresie.png` | Hérésie | Les Furies | the three Furies crowded shoulder to shoulder into a single bust, three lean sisters with identical hollow faces and white burning eyes, live snakes coiling through their dark hair, wearing torn grey mourning cloth, their pale skin lit from below by a chalk-white ember |
| `7_violence.png` | Violence | Le Minotaure | the Minotaur, a massive bull-headed demon, broad black muzzle and heavy curved horns scarred and chipped, small furious orange eyes, a thick neck of corded muscle, a torn leather harness across the chest, hot ash caught in the coarse fur |
| `8_fraude.png` | Fraude | Géryon | Geryon, a young clean-shaven demon in a modern grey pinstripe office shirt and a dark patterned tie, slicked dark hair, tall ridged horns, a thin knowing smile and glowing orange eyes, holding a blank white playing card between two fingers at chest height |
| `9_trahison.png` | Trahison | Le stagiaire promu | the promoted intern, a young man with untidy dark hair and tired glowing eyes, wearing a well-cut blue office suit over a white shirt, the first small horn buds just breaking through at his hairline, a thin file folder held closed against his chest |

### Les six cercles du mode démon

| Fichier | Cercle | Boss | Phrase de boss |
|---|---|---|---|
| `10_mer.png` | Fonds marins | Le Noyé | the Drowned One, a waterlogged demon risen from the sea floor, pale swollen grey-green skin, long black hair plastered flat and still streaming water, blank milky eyes, a rusted anchor chain looped around the neck, strands of dark kelp caught on the shoulders |
| `11_falaise.png` | Falaise | Le Porte-chaînes | the Chain-bearer, a broad-shouldered demon quarryman with cracked basalt-grey skin, short blunt horns and deep-set amber eyes, a heavy iron collar at the throat and several lengths of thick chain slung across the chest and hanging from the shoulders |
| `12_villes.png` | Ville | Le Guichetier | the Ticket Clerk, a narrow pinched demon in a worn ticket-office waistcoat with black sleeve garters, small round spectacles over yellow eyes, thinning hair combed flat over two stubby horns, one hand at chest height resting on a small wooden shutter he is about to pull closed, the shutter held low and entirely inside the frame |
| `13_neige.png` | Montagne | Le Givre | the Frost, a tall gaunt demon of the high mountain, skin pale blue-grey and rimed with frost, long white hair stiff with ice, thin translucent horns like icicles, eyes a cold pale glow, wearing a frozen fur-lined coat gone stiff, his breath crystallising at his lips |
| `14_vent.png` | Ciel | Le Souffle | the Breath, a lean demon of the storm, hollow-cheeked with wind-scoured grey skin, long hair and torn cloth streaming back as if blown, swept-back horns, white pupil-less eyes, a ragged high-collared coat snapping open at one shoulder |
| `15_ange.png` | Paradis | L'Ange | the Angel, a serene older official of the heavens with a smooth shaven head and blank white eyes, a thin brass halo floating above his head and small pale feathered wings behind his shoulders, wearing an immaculate cream office shirt with a neatly knotted gold tie |

## Générer

```bash
cd Proto4Html
npm run gen:boss                 # tous les portraits manquants
npm run gen:boss -- 12_villes    # seulement celui-là
npm run gen:boss -- --list       # l'état des quinze, aucun appel réseau
```

Les quinze rendus bruts étant déjà là, **rien ne part tant qu'on n'a rien supprimé** :
c'est le geste attendu. Effacer `docs/proto4/raw/demons/12_villes.jpeg` et relancer ne
refait que celui-là. Le portrait du cercle 9 n'est jamais touché tant que son fichier
est en place — il reste à ta main.

Les fichiers détourés de `demons/png/` ne sont **jamais** écrits par le script : c'est
du travail fait, il n'y a que toi qui y écris.

## Après génération

Une seule étape est à la main : **détourer le fond violet** et enregistrer en PNG avec
alpha dans `docs/proto4/raw/demons/png2/`, sous le même nom que le rendu brut. Passer
par **Décontaminer les couleurs** — le violet resté dans les cheveux et le duvet des
épaules est ce qui se voit le plus sur un portrait.

Le reste est fait par `scripts/install-art.py`, qui pose les quinze dans le jeu :

```bash
cd Proto4Html
python3 scripts/install-art.py boss            # les quinze
python3 scripts/install-art.py boss 4          # seulement le cercle 4
python3 scripts/install-art.py boss --dry-run  # ce qui serait écrit
```

Il ramène chaque PNG sur le canevas commun et l'écrit en WebP qualité 88 sous
`public/circles/<NN>-<nom>/boss.webp` — c'est lui qui connaît la correspondance entre
le numéro du cercle et le nom du dossier. Sa famille `perso` fait la même chose pour les
portraits du stagiaire (`docs/proto4/raw/perso/*.png` → `public/menu/perso/`), qui sont
déjà au canevas et n'ont donc qu'à être réduits. Le rendu sort en 4:5, plus haut que la cible,
donc il rogne **par le bas** : la tête garde sa place dans le tiers supérieur et la
coupe tombe dans l'ourlet qui se dissout déjà. Il signale au passage un buste qui
n'atteindrait pas le bord bas, ce qui le ferait flotter au-dessus du sol de la scène.

Deux contrôles qui valent la peine, parce qu'ils attrapent des défauts invisibles à
l'œil sur un portrait isolé :

- **le violet resté à l'intérieur de la silhouette.** Le détourage ne peut rien contre
  lui : quand le fond a déteint sur une chevelure claire ou un crâne chauve, c'est peint
  dans l'image. Ça se corrige en deux minutes par une Teinte/Saturation ciblée sur les
  magentas, bien plus vite qu'en régénérant — d'autant qu'une régénération oblige à
  refaire le détourage.
- **côte à côte avec un portrait voisin**, jamais seul : un portrait isolé paraît
  toujours bon, c'est la série qui révèle les écarts d'échelle et de lumière.
