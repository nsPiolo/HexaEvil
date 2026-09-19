/**
 * Recherche des graines de référence de la boutique (`e2e/seeds.ts`).
 *
 * La vitrine est tirée sur la graine de la course, dans tout le catalogue en mode e2e : élargir
 * `config/shop.json` change donc ce que chaque graine donne, et les tests 04 et 12 tombent. Cet
 * outil rejoue exactement le tirage de `useRace` (`generateVitrine` + `sortByRisk`, grade levé)
 * et rend la première graine qui satisfait les contraintes écrites dans `e2e/seeds.ts`.
 *
 *     npx vite-node sim/findseed.ts shop
 *     npx vite-node sim/findseed.ts mask
 *
 * Les contraintes visent à redonner le MÊME trio d'objets qu'avant : les attentes des tests
 * restent alors lisibles d'une version du catalogue à l'autre, et seule la graine bouge.
 */
import { config, shop } from '../src/core/config'
import { defaultInventory, effectivePrice, generateVitrine } from '../src/core/shop/shop'
import { riskOf, sortByRisk, type ShopItem } from '../src/core/shop/items'
import { seededRng } from '../src/core/rules/rng'

const ALL = shop.items.map((i) => i.id)
const INVENTORY = defaultInventory(config)
const price = (it: ShopItem): number => effectivePrice(it, 1, shop.priceGrowthPerCircle)

/** La vitrine de la première ouverture, au cercle 1, telle que l'écran la présente. */
function vitrine(seed: number): ShopItem[] {
  return sortByRisk(generateVitrine(shop, INVENTORY, ALL, seededRng(seed), Number.POSITIVE_INFINITY))
}

/**
 * `SHOP_SEED` : trois objets triés sûr / ambitieux / danger ; un dé à remplacer, sûr, sous le
 * seuil de confirmation et payable à 67 ; un artefact ambitieux entre 68 et 95 ; un objet à
 * contrepartie ; rien sous 16. Le trio visé est celui d'origine (Limbes, Verrou, Explosive).
 */
function shopOk(v: readonly ShopItem[]): boolean {
  const [safe, bold, danger] = v
  if (v.length !== shop.slots || !safe || !bold || !danger) return false
  if (v.map(riskOf).join(',') !== 'safe,bold,danger') return false
  if (safe.kind !== 'die' || safe.mode !== 'replace') return false
  const [ps, pb] = [price(safe), price(bold)]
  if (ps >= shop.confirmThreshold || ps > 67) return false
  if (bold.kind !== 'artefact' || pb <= 67 || pb > 95) return false
  if (!danger.warning) return false
  if (Math.min(...v.map(price)) < 16) return false
  return safe.id === 'limbes' && bold.id === 'verrouDeMinos' && danger.id === 'explosive'
}

/** `MASK_SEED` : un masque qui marque une âme, à 50 ou moins, et le moins cher de la vitrine. */
function maskOk(v: readonly ShopItem[]): boolean {
  if (v.length !== shop.slots) return false
  const mask = v.find((it) => it.kind === 'personality' && it.personality !== null)
  if (!mask || mask.id !== 'masqueResolu') return false
  const p = price(mask)
  return p <= 50 && v.every((it) => it === mask || price(it) > p)
}

const WANTED = { shop: shopOk, mask: maskOk }
const which = (process.argv[2] ?? 'shop') as keyof typeof WANTED
const ok = WANTED[which]
if (!ok) throw new Error(`graine inconnue : ${which} (shop ou mask)`)

const LIMIT = 1_000_000
for (let seed = 1; seed < LIMIT; seed++) {
  const v = vitrine(seed)
  if (!ok(v)) continue
  console.log(`${which} : graine ${seed} — ${v.map((it) => `${it.name} ${price(it)} [${riskOf(it)}]`).join(' | ')}`)
  process.exit(0)
}
console.error(`aucune graine sous ${LIMIT} : relâcher les contraintes de ${which}Ok`)
process.exit(1)
