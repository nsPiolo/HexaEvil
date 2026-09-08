/**
 * Politique d'achat automatique — instrument, **pas une règle**.
 *
 * C'est la stratégie dégénérée décrite au §17 : graver les trois dés vers 4, 2
 * et 1, et cloner la plus haute carte. Elle sert au mode lot (`M1`) *et* au
 * pilote automatique de l'interface, pour que les deux mesurent la même chose.
 */

import type { Rng } from './random'
import {
  applyEngrave,
  applyShopCards,
  engraveOptions,
  openShopOption,
  shopBlockedReason,
  type EngraveOrder,
  type RunState,
} from './run'

/**
 * `maxPerDie` : combien de faces au plus on grave vers la valeur cible sur un
 * même dé. **Le défaut est 0 — on ne grave pas.** Mesuré sur 200 runs par
 * variante : clonage seul 6,5 % de runs complets, gravure saturée 2,5 %,
 * gravure modérée 0 %. Graver un dé lui **retire** des faces, or la règle
 * « meilleure combinaison de 3 parmi N » (`D1b`) récompense la polyvalence plus
 * que la garantie d'une valeur. Voir §17.
 */
export type EngravePreference = 'value' | 'effect'

export function autoShop(
  run: RunState,
  rng: Rng,
  maxPerDie = 0,
  prefer: EngravePreference = 'effect',
): void {
  const targets = [4, 2, 1]
  let guard = 0
  for (;;) {
    if (guard++ > 40) return

    if (maxPerDie > 0 && shopBlockedReason(run, 'engraveAll') === null) {
      const orders: (EngraveOrder | null)[] = run.dice.map((die, i) => {
        const target = targets[i % targets.length] as number
        const already =
          prefer === 'effect'
            ? die.faces.filter((f) => f.effect !== null).length
            : die.faces.filter((f) => f.value === target).length
        if (already >= maxPerDie) return null

        // `F11` : on ne choisit plus la valeur, on choisit **dans l'offre**.
        for (let f = 0; f < die.faces.length; f++) {
          const options = engraveOptions(run, i, f, rng)
          const wanted =
            prefer === 'effect'
              ? options.find((o) => o.kind === 'effect')
              : (options.find((o) => o.kind === 'value' && o.value === target) ??
                options.find((o) => o.kind === 'value'))
          if (wanted) return { dieIndex: i, faceIndex: f, option: wanted }
        }
        return null
      })
      if (orders.every((o) => o !== null)) {
        applyEngrave(run, 'engraveAll', orders as EngraveOrder[])
        continue
      }
    }

    if (shopBlockedReason(run, 'clone') === null) {
      const session = openShopOption(run, 'clone', rng)
      const best = [...session.cards].sort((a, b) => b.value - a.value)[0]
      if (best) {
        applyShopCards(run, session, { uids: [best.uid] })
        continue
      }
    }
    return
  }
}
