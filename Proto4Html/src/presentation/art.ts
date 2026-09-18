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
 * Cadenas peint (docs/proto4/raw/lock.png, détouré et réduit) : il illustre les objets encore
 * scellés dans la Collection. Une image plutôt qu'un emoji 🔒, dont le rendu change d'un
 * système à l'autre et jure avec les cartes peintes.
 */
export const LOCK_ART = '/menu/lock.webp'
