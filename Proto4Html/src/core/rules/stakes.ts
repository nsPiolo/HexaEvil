/**
 * L'échelle des mises d'un cercle (GDD §4.2). Les jetons du cercle 1 sont dans
 * `economy.stakes` ; ils grandissent ensuite de `stakeGrowthPerCircle` par cercle, comme les
 * prix de la boutique, pour que les revenus suivent des prix de sortie qui grimpent.
 *
 * **Au-delà du dernier cercle écrit, la croissance change de nature.** Elle reste linéaire tant
 * que `config/race.json` décrit le cercle, puis devient géométrique au pas de
 * `beyondStakeGrowth`, comme le prix de sortie (`circleAt`, rules/circles.ts). La raison est
 * arithmétique : le prix compose à l'infini, une droite ne le rattrape jamais. Sans ce
 * changement, le plus gros jeton valait 25 fois moins que le prix au quinzième cercle et 300
 * fois moins au vingt-cinquième — la bourse pouvait grossir, elle ne pouvait plus être engagée.
 * Les deux taux étant égaux, le rapport se fige sur celui du dernier cercle écrit.
 *
 * **Tous les jetons ne sont pas offerts d'emblée** : `stakeUnlockCircle` dit à partir de quel
 * cercle chacun apparaît. Les premiers cercles n'en proposent que trois — entre 5 et 20, un
 * quatrième palier ne se choisit pas, il se subit. Le quatrième s'insère quand l'échelle s'est
 * assez écartée pour qu'il ait un sens.
 *
 * Le plus petit jeton ne dépasse jamais l'avance de course du cercle : un joueur qui arrive
 * sans un sou peut toujours poser le pari minimum avec la seule avance du stagiaire. La règle
 * vaut aussi au-delà des écrits, où elle mord — l'avance, elle, reste linéaire.
 *
 * Le noyau accepte n'importe quelle mise positive (`betRefusal`) : cette échelle est l'offre
 * faite à l'écran, pas une règle de validité. Le jeton « All-in » des cercles au-delà des
 * écrits ne passe pas par ici : il vaut la bourse du joueur, que le noyau ne connaît pas.
 */
import type { RaceConfig } from '../config/schema'
import { allowanceAtCircle } from './allowance'
import { growWithCircle } from './growth'

export function stakesAtCircle(config: RaceConfig, circle: number): number[] {
  const { economy, run } = config
  const allowance = allowanceAtCircle(economy, circle)
  const written = run.circles.length
  const over = Math.max(0, circle - written)
  const grown = economy.stakes
    .filter((_, i) => circle >= (economy.stakeUnlockCircle[i] ?? 1))
    .map((base) => {
      // Arrondi à 5 dans les deux régimes : une mise se lit d'un coup d'œil, même à quatre chiffres.
      const linear = growWithCircle(base, Math.min(circle, written), economy.stakeGrowthPerCircle)
      return over === 0 ? linear : Math.round((linear * economy.beyondStakeGrowth ** over) / 5) * 5
    })
  grown[0] = Math.min(grown[0] ?? allowance, allowance)
  // L'arrondi ou le plafond peuvent faire se rejoindre deux jetons : on ne propose pas deux fois le même.
  return grown.filter((v, i) => i === 0 || v > grown[i - 1]!)
}
