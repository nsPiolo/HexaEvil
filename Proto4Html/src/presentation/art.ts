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
 * Cercles dont le portrait du boss est peint (`public/circles/<dossier>/boss.webp`, même
 * cadrage et même largeur que les portraits du stagiaire). Les autres jouent la scène sans
 * portrait : le décor et les bulles suffisent en attendant le dessin.
 */
const BOSS_ART: ReadonlySet<number> = new Set([1])

/** Portrait du boss d'un cercle, ou `undefined` tant qu'il n'est pas peint. */
export const bossPortrait = (circle: number): string | undefined => (BOSS_ART.has(circle) ? `/circles/${circleArt(circle)}/boss.webp` : undefined)
