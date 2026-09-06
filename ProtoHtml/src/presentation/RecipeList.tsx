/**
 * `U15` — les Recettes d'un type de Bâtiment. Utilisé pour la Tuile inspectée
 * comme pour celle qu'on s'apprête à poser : on choisit au catalogue en sachant
 * ce que le Bâtiment consomme et produit, sans avoir à l'avoir déjà posé.
 */
import { progressPerTick, recipesFor } from '../core/rules/recipes'
import type { GameConfig, Side, TileTypeDef } from '../core/rules/types'
import { describeRecipe } from './labels'

const SIDES: readonly Side[] = ['player', 'demon']

export const RecipeList = ({ config, type }: { config: GameConfig; type: TileTypeDef }) => {
  const rows = SIDES.flatMap((side) =>
    recipesFor(type, side).map((recipe, i) => ({ side, recipe, key: `${side}-${i}` })),
  )

  if (rows.length === 0) {
    return <p className="inspector__hint">Aucune Recette : cette Tuile ne fait que convoyer.</p>
  }

  return (
    <ul className="recipes">
      {rows.map(({ side, recipe, key }) => (
        <li key={key} className={`recipe recipe--${side}`}>
          <span className="recipe__side">{side === 'player' ? 'Âmes' : 'Sbires'}</span>
          <span className="recipe__body">{describeRecipe(config, recipe)}</span>
          <span className="recipe__ticks">
            {recipe.ticks} Tick{recipe.ticks > 1 ? 's' : ''}
            {recipe.progress !== undefined && <em> · {progressPerTick(recipe).toFixed(2)}/Tick</em>}
          </span>
        </li>
      ))}
    </ul>
  )
}
