/**
 * Un cercle par son numéro, au-delà de la liste écrite comprise (GDD §8.1).
 *
 * `config/race.json` décrit quinze cercles : les neuf de Dante, puis la montée du mode démon
 * jusqu'au paradis. Le jeu ne s'y arrête pas — le quinzième se rejoue indéfiniment, son décor
 * compris (`CIRCLE_ART`, presentation/art.ts), avec un prix de sortie qui monte à chaque tour.
 * Tout ce qui a besoin d'un cercle passe par ici plutôt que d'indexer `run.circles` à la main,
 * sans quoi le jeu s'arrêterait au quinzième.
 */
import type { CircleConfig, RaceConfig } from '../config/schema'

/** Le cercle est-il au-delà de ceux qui sont écrits dans la configuration ? */
export function isBeyondWritten(run: RaceConfig['run'], circle: number): boolean {
  return circle > run.circles.length
}

/**
 * Configuration du cercle `circle` (1 = les Limbes). Au-delà du dernier écrit, c'est ce dernier
 * qui revient, avec son prix multiplié par `beyondPriceGrowth` à chaque tour supplémentaire et
 * arrondi à la cinquantaine pour rester lisible à l'écran.
 */
export function circleAt(run: RaceConfig['run'], circle: number): CircleConfig {
  const written = run.circles[circle - 1]
  if (written) return written
  const last = run.circles[run.circles.length - 1]!
  const over = circle - run.circles.length
  return { ...last, price: Math.round((last.price * run.beyondPriceGrowth ** over) / 50) * 50 }
}
