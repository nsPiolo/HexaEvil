/** Réserves d'un Bâtiment (`R3`, `R4` : capacité illimitée). Opérations pures. */
import type { ResourceId, Stock } from './types'

export const isEmptyStock = (stock: Stock): boolean =>
  Object.values(stock).every((qty) => qty <= 0)

export const stockEntries = (stock: Stock): [ResourceId, number][] =>
  Object.entries(stock).filter(([, qty]) => qty > 0)

export const totalStock = (stock: Stock): number =>
  Object.values(stock).reduce((sum, qty) => sum + Math.max(0, qty), 0)

/** Vrai si `stock` contient au moins `needed` (`P2` : toutes les Ressources IN). */
export const hasAll = (stock: Stock, needed: Stock): boolean =>
  Object.entries(needed).every(([id, qty]) => (stock[id] ?? 0) >= qty)

/** Retire `needed` de `target` (mutation locale au moteur). */
export const removeFrom = (target: Record<ResourceId, number>, needed: Stock): void => {
  for (const [id, qty] of Object.entries(needed)) {
    const left = (target[id] ?? 0) - qty
    if (left > 0) target[id] = left
    else delete target[id]
  }
}

/** Ajoute `added` dans `target`. */
export const addTo = (target: Record<ResourceId, number>, added: Stock): void => {
  for (const [id, qty] of Object.entries(added)) {
    target[id] = (target[id] ?? 0) + qty
  }
}

/** Retire une unité de `id`, ou lève si absente. */
export const removeOne = (target: Record<ResourceId, number>, id: ResourceId): void =>
  removeFrom(target, { [id]: 1 })

/** La première Ressource disponible, pour le ramassage au départ (`D12`). */
export const firstAvailable = (stock: Stock): ResourceId | undefined =>
  stockEntries(stock)[0]?.[0]
