/**
 * Couleurs des jetons, une par âme (indice = id). Il en faut au moins autant que de noms
 * dans `souls.names` : les cercles les plus peuplés alignent 12 âmes, et `soulColor` boucle
 * sur la palette, donc une palette trop courte redonne la même couleur à deux concurrentes
 * de la même course. Le test `souls.test.ts` tient cette règle.
 *
 * Les huit premières sont la palette d'origine, gardée telle quelle ; les quatre suivantes
 * se logent dans les trous de la roue chromatique (citron, jade, indigo, os) et restent dans
 * la bande de l'habillage — ardoise froide, accents chauds : écart d'au moins 24 en ΔE et
 * contraste d'au moins 4,6:1 sur `--bg`. Chacune a sa face de dé peinte, dont le nom de
 * fichier EST le code hexadécimal sans le croisillon (voir SOUL_DICE).
 */
export const SOUL_COLORS = [
  '#e0a83c', // or
  '#6fa8d8', // bleu ciel
  '#4ea86a', // vert
  '#d0453c', // rouge brique
  '#b07cd8', // violet
  '#e07a9c', // rose
  '#5cc8c0', // turquoise
  '#c9a27a', // beige cuir
  '#a9c93a', // citron
  '#3fc45c', // jade
  '#6b80cf', // indigo
  '#c5ccd2', // os
] as const

export function soulColor(id: number): string {
  return SOUL_COLORS[id % SOUL_COLORS.length] ?? '#ffffff'
}

/*
 * Face de dé par âme : `public/table/dice/<couleur sans #>.webp`. Le nom du fichier EST la
 * couleur, donc ajouter une âme se résume à ajouter une entrée dans SOUL_COLORS et le
 * fichier qui va avec. Sans fichier, on teinte le dé d'os à la couleur de l'âme
 * (`background-blend-mode: color` garde le modelé de la céramique et n'en change que la
 * teinte) plutôt que de lui prêter le dé d'une autre âme.
 *
 * Cet ensemble liste les faces réellement peintes, pas la palette : c'est volontairement une
 * liste à la main, pour qu'un fichier absent se voie ici plutôt que de se deviner à
 * l'exécution. Les douze y sont, `scripts/install-art.py des` les fabrique depuis
 * `docs/proto4/raw/des`.
 *
 * Toutes les faces mesurées tiennent entre 4,7:1 et 7,3:1 avec l'encre sombre, au pixel le
 * plus sombre de la zone de texte : il n'y a pas de cas qui demande une encre claire, le CSS
 * en pose donc une seule. L'os (`c5ccd2`) est la plus claire des couleurs mais sa céramique
 * rend un gris moyen, pas un aplat — elle tombe à 4,9:1, dans le lot.
 */
export const SOUL_DICE: ReadonlySet<string> = new Set([
  'e0a83c', '6fa8d8', '4ea86a', 'd0453c', 'b07cd8', 'e07a9c',
  '5cc8c0', 'c9a27a', 'a9c93a', '3fc45c', '6b80cf', 'c5ccd2',
])

/**
 * Variables CSS d'un dé Âme : `--soul` (reprise par le halo de survol) et la face peinte si
 * l'âme en a une. Sans fichier, le dé reste celui d'os — toutes les couleurs de SOUL_COLORS
 * en ont un, donc le cas ne se présente que si l'on ajoute une âme sans son image.
 */
export function soulDieStyle(id: number): Record<string, string> {
  const color = soulColor(id)
  const hex = color.slice(1)
  return { '--soul': color, '--soul-die': SOUL_DICE.has(hex) ? `url('/table/dice/${hex}.webp')` : 'none' }
}

/*
 * Faces peintes des dés spéciaux (`docs/proto4/raw/des/<id>.png`). Même dossier et même
 * convention que les faces d'âme, mais la clé est cette fois l'id de l'objet dans
 * `config/shop.json` — celui que `DistanceDie.kind` transporte. Les dés qui n'ont pas encore
 * la leur (`fraude`, `troisiemeDe`) gardent le dé d'os, comme le dé de base.
 */
export const DIST_DICE: ReadonlySet<string> = new Set(['limbes', 'colere', 'glace', 'prodigalite'])

/**
 * Variables CSS d'un dé Distance, vides pour un dé qui n'a pas de face peinte : le dé d'os
 * de `.die` sert alors seul, sans couche à recouvrir.
 *
 * Ces faces-là sont des peintures sombres, pas la céramique claire des âmes ; le chiffre en
 * encre sombre y tomberait entre 1,9:1 et 2,5:1 au plus sombre de son emplacement. C'est
 * `.die-dist-art` qui rattrape ça côté CSS, et c'est pour ça que l'appelant a besoin de
 * savoir si la face existe — d'où `hasDistArt` plutôt qu'un simple `url(...)` ou rien.
 */
export function hasDistArt(kind: string | undefined): boolean {
  return kind !== undefined && DIST_DICE.has(kind)
}

export function distDieStyle(kind: string | undefined): Record<string, string> {
  return hasDistArt(kind) ? { '--dist-die': `url('/table/dice/${kind}.webp')` } : {}
}

/**
 * Inclinaison d'un dé, tirée de sa position. Des dés parfaitement alignés font gabarit ;
 * un angle retiré au hasard à chaque rendu ferait vibrer l'interface à chaque changement
 * d'état. L'angle est donc déterministe : même dé, même inclinaison, toute la partie.
 */
export function dieTilt(seed: number): string {
  const n = Math.sin((seed + 1) * 12.9898) * 43758.5453
  return `${((n - Math.floor(n)) * 6.4 - 3.2).toFixed(2)}deg`
}

export function fmtDistance(d: number): string {
  return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0'
}
