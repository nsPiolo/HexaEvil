/**
 * L'échelle des mises d'un cercle (GDD §4.2). Les jetons du cercle 1 sont dans
 * `economy.stakes` ; ils grandissent ensuite de `stakeGrowthPerCircle` par cercle, comme les
 * prix de la boutique, pour que les revenus suivent des prix de sortie qui grimpent.
 *
 * Le plus petit jeton ne dépasse jamais l'avance de course du cercle : un joueur qui arrive
 * sans un sou peut toujours poser le pari minimum avec la seule avance du stagiaire.
 *
 * Le noyau accepte n'importe quelle mise positive (`betRefusal`) : cette échelle est l'offre
 * faite à l'écran, pas une règle de validité.
 */
import type { RaceConfig } from '../config/schema'
import { allowanceAtCircle } from './allowance'
import { growWithCircle } from './growth'

export function stakesAtCircle(economy: RaceConfig['economy'], circle: number): number[] {
  const allowance = allowanceAtCircle(economy, circle)
  const grown = economy.stakes.map((base) => growWithCircle(base, circle, economy.stakeGrowthPerCircle))
  grown[0] = Math.min(grown[0] ?? allowance, allowance)
  // L'arrondi ou le plafond peuvent faire se rejoindre deux jetons : on ne propose pas deux fois le même.
  return grown.filter((v, i) => i === 0 || v > grown[i - 1]!)
}
