/** Libellés partagés entre le catalogue et l'inspecteur. Aucune règle ici. */
import { stockEntries } from '../core/rules/storage'
import type { GameConfig, RecipeDef, ResourceId } from '../core/rules/types'

export const resourceName = (config: GameConfig, id: ResourceId): string =>
  config.resources.find((r) => r.id === id)?.name ?? id

export const resourceGlyph = (config: GameConfig, id: ResourceId): string =>
  config.resources.find((r) => r.id === id)?.glyph ?? '◆'

/** « 1 × Basalte brut → 2 × Basalte dégrossi », ou « l'entité elle-même » (`X3`). */
export const describeRecipe = (config: GameConfig, recipe: RecipeDef): string => {
  const ins = recipe.consumesSelf
    ? "l'entité elle-même"
    : stockEntries(recipe.in ?? {})
        .map(([id, qty]) => `${qty} × ${resourceName(config, id)}`)
        .join(' + ') || 'rien'
  const outs = [
    ...stockEntries(recipe.out ?? {}).map(([id, qty]) => `${qty} × ${resourceName(config, id)}`),
    ...(recipe.progress !== undefined
      ? [`${recipe.progress >= 0 ? '+' : ''}${recipe.progress} progression`]
      : []),
  ].join(' + ')
  return `${ins} → ${outs}`
}
