/**
 * Choix et évaluation des Recettes (`R1`, `R5`, `P2`).
 * Aucune valeur de gameplay ici : tout vient de la configuration.
 */
import { hasAll } from './storage'
import type { GameConfig, RecipeDef, Side, Stock, TileTypeDef, TileTypeId } from './types'

export const tileType = (config: GameConfig, id: TileTypeId): TileTypeDef => {
  const type = config.tileTypes.find((t) => t.id === id)
  if (!type) throw new Error(`Type de Tuile inconnu : ${id}`)
  return type
}

/** Les Recettes d'un type de Tuile ouvertes à `side` (`T2`, `R5`). */
export const recipesFor = (type: TileTypeDef, side: Side): RecipeDef[] => {
  if (!type.recipes) return []
  // Une Tuile de camp n'est exploitable que par ce camp ; une Tuile neutre
  // (l'`Escalier`) trie ses Recettes par le `side` porté par chaque Recette.
  if (type.side !== 'neutral' && type.side !== side) return []
  return type.recipes.filter((r) => (r.side ?? type.side) === side || r.side === undefined)
}

/** Progression par Tick, critère de tri de l'`Escalier` (`R5`). */
export const progressPerTick = (recipe: RecipeDef): number =>
  (recipe.progress ?? 0) / recipe.ticks

/**
 * `R5` — parmi les Recettes du camp de l'entité, retient celle dont les IN sont
 * disponibles et qui rapporte le plus de progression par Tick. À progression
 * égale (bâtiments de production ordinaires), la première déclarée gagne.
 * Retourne l'index dans `type.recipes`, ou `undefined` si aucune n'est jouable.
 */
export const chooseRecipeIndex = (
  type: TileTypeDef,
  side: Side,
  input: Stock,
): number | undefined => {
  const all = type.recipes ?? []
  const open = new Set(recipesFor(type, side))
  let best: number | undefined
  let bestScore = -Infinity
  for (let i = 0; i < all.length; i++) {
    const recipe = all[i]!
    if (!open.has(recipe)) continue
    if (recipe.in && !hasAll(input, recipe.in)) continue // P2
    const score = progressPerTick(recipe)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** Vrai si `resource` est un IN d'une Recette de `side` sur ce type (`D10`). */
export const acceptsAsInput = (type: TileTypeDef, side: Side, resource: string): boolean =>
  recipesFor(type, side).some((r) => r.in !== undefined && (r.in[resource] ?? 0) > 0)
