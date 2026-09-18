/**
 * Où trouver les images d'un cercle dans `public/circles/` (voir docs/proto4/prompts-cercles.md).
 * Partagé par la table de jeu (décors) et par la scène du boss (décor + portrait).
 */

/**
 * Dossier d'images de chaque cercle. Les neuf premiers sont les cercles de Dante, les six
 * suivants le mode démon (GDD §8.1) — eux ne sont pas dans `config/race.json`, les décors se
 * préparent avant le contenu.
 */
export const CIRCLE_ART: readonly string[] = [
  '01-limbes', '02-luxure', '03-gourmandise', '04-avarice', '05-colere',
  '06-heresie', '07-violence', '08-fraude', '09-trahison', '10-fonds-marins',
  '11-falaise', '12-ville', '13-montagne', '14-ciel', '15-paradis',
]

/** Le Paradis sert du quinzième cercle à l'infini : au-delà, on rejoue le dernier décor peint. */
export const circleArt = (circle: number): string => CIRCLE_ART[Math.min(Math.max(circle, 1), CIRCLE_ART.length) - 1]!

/** Décor du cercle, aussi utilisé comme fond de la scène du boss. */
export const circleBg = (circle: number): string => `/circles/${circleArt(circle)}/bg.jpg`

/**
 * Portrait du boss d'un cercle, pour la scène qui précède sa course. Les quinze sont peints,
 * sur le même canevas et à la même largeur que les portraits du stagiaire : les deux se
 * remplacent au même endroit sans que le personnage saute.
 */
export const bossPortrait = (circle: number): string => `/circles/${circleArt(circle)}/boss.webp`

/**
 * Vignette d'un objet de la boutique (artefact, dé ou opération de forge), nommée par son id
 * dans `config/shop.json` : `public/objets/<id>.webp`. Les dessins arrivent au fur et à mesure ;
 * `ItemArt` sert le point d’interrogation tant que le fichier manque, il n’y a rien à déclarer ici.
 */
export const itemArt = (id: string): string => `/objets/${id}.webp`

/**
 * Marqueur peint d'une case du plateau, nommé par son type : les trois `SpecialCellKind`
 * (`gold`, `trap`, `boost`), la `tribune` posée par le joueur et la case `blocked`. Comme
 * pour les vignettes d'objets, le nom du fichier EST la clé, il n'y a rien à déclarer.
 */
export const cellArt = (kind: string): string => `/table/cases/${kind}.webp`

/** Les éboulis peints : plusieurs dessins pour la même case bloquée. */
export const BLOCKED_ART = ['blocked', 'blocked2', 'blocked3', 'blocked4'] as const

/**
 * Éboulis d'une case bloquée, tiré de sa position.
 *
 * Une piste en compte jusqu'à six par terrain, et le même tas répété six fois se lit comme un
 * motif d'interface plutôt que comme de la roche. Le tirage est donc déterministe, pour la
 * même raison que l'inclinaison des dés (`dieTilt`) : une image retirée au hasard à chaque
 * rendu ferait changer les éboulis à chaque déplacement d'âme, sur un décor qui, lui, ne
 * bouge pas de la course.
 */
export function blockedArt(column: number, lane: number): string {
  const n = Math.sin(column * 12.9898 + lane * 78.233) * 43758.5453
  const i = Math.floor((n - Math.floor(n)) * BLOCKED_ART.length)
  return cellArt(BLOCKED_ART[i] ?? BLOCKED_ART[0])
}

/**
 * Braseros qui jalonnent la spirale de la carte : allumé pour une course déjà courue, éteint
 * pour celles qui restent. Les deux sont dessinés sur le même canevas, la vasque exactement au
 * même endroit — c'est ce qui permet de les échanger sans que le repère saute, et pourquoi
 * `install-art.py map` les réduit sans les recadrer.
 *
 * Ancrage : centre de la vasque dans l'image, en fraction du canevas (mesuré sur `step_off`,
 * dont la partie opaque se limite justement à la vasque). Le brasero se pose sur le point de
 * la spirale par ce centre-là, pas par le milieu de son cadre, sinon la flamme le tirerait
 * vers le haut.
 */
export const STEP_ART = {
  on: '/map/step_on.webp',
  off: '/map/step_off.webp',
  ratio: 418 / 371,
  cx: 186 / 371,
  cy: 310.5 / 418,
} as const

/**
 * Cadenas peint (docs/proto4/raw/lock.png, détouré et réduit) : il illustre les objets encore
 * scellés dans la Collection. Une image plutôt qu'un emoji 🔒, dont le rendu change d'un
 * système à l'autre et jure avec les cartes peintes.
 */
export const LOCK_ART = '/menu/lock.webp'
