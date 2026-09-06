/**
 * `U2` / `U3` — panneau de détail d'une Tuile sélectionnée : Recettes, entités
 * présentes avec l'avancement de leur production, réserves, Sorties et
 * tourniquet. C'est l'outil d'observation du proto : tout ce qui explique le
 * comportement d'un réseau doit être lisible ici.
 */
import { DIRECTION_NAMES, directionName, type HexCoord } from '../core/hex/hexCoord'
import { progressPerTick, recipesFor, tileType } from '../core/rules/recipes'
import { stockEntries } from '../core/rules/storage'
import type { EntityState, GameState, RecipeDef, Side, Stock, TileState } from '../core/rules/types'

const resourceName = (state: GameState, id: string): string =>
  state.config.resources.find((r) => r.id === id)?.name ?? id

const resourceGlyph = (state: GameState, id: string): string =>
  state.config.resources.find((r) => r.id === id)?.glyph ?? '?'

const StockLine = ({ state, label, stock }: { state: GameState; label: string; stock: Stock }) => {
  const entries = stockEntries(stock)
  return (
    <div className="stock">
      <span className="stock__label">{label}</span>
      {entries.length === 0 ? (
        <span className="stock__empty">vide</span>
      ) : (
        <span className="stock__items">
          {entries.map(([id, qty]) => (
            <span key={id} className="stock__item" title={resourceName(state, id)}>
              {resourceGlyph(state, id)} {qty}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

const describeRecipe = (state: GameState, recipe: RecipeDef): string => {
  const ins = recipe.consumesSelf
    ? "l'entité elle-même"
    : stockEntries(recipe.in ?? {})
        .map(([id, qty]) => `${qty} × ${resourceName(state, id)}`)
        .join(' + ') || 'rien'
  const outs = [
    ...stockEntries(recipe.out ?? {}).map(([id, qty]) => `${qty} × ${resourceName(state, id)}`),
    ...(recipe.progress !== undefined
      ? [`${recipe.progress >= 0 ? '+' : ''}${recipe.progress} progression`]
      : []),
  ].join(' + ')
  return `${ins} → ${outs}`
}

/** Pourquoi cette entité ne produit pas — l'information de débogage clé (`U2`). */
const idleReason = (state: GameState, tile: TileState, entity: EntityState): string => {
  const type = tileType(state.config, tile.typeId)
  if (recipesFor(type, entity.side).length === 0) return 'aucune Recette pour son camp'
  if (entity.carrying !== undefined) return `porte ${resourceName(state, entity.carrying)} (P1)`
  if (entity.producedHere) return 'a déjà produit ici (P1)'
  return 'réserve d’entrée insuffisante (P2)'
}

const EntityRow = ({ state, tile, entity }: { state: GameState; tile: TileState; entity: EntityState }) => {
  const type = tileType(state.config, tile.typeId)
  const recipe = entity.production ? type.recipes?.[entity.production.recipeIndex] : undefined
  return (
    <li className={`inspector__entity inspector__entity--${entity.side}`}>
      <span className="inspector__entity-id">
        {entity.side === 'player' ? '◉' : '◈'} #{entity.id}
      </span>
      <span className="inspector__entity-state">
        {entity.production && recipe ? (
          <>
            production {entity.production.ticksDone}/{recipe.ticks} Ticks
          </>
        ) : (
          <>inactif — {idleReason(state, tile, entity)}</>
        )}
      </span>
      <span className="inspector__entity-load">
        {entity.carrying ? `${resourceGlyph(state, entity.carrying)} ${resourceName(state, entity.carrying)}` : '—'}
      </span>
    </li>
  )
}

type Props = {
  state: GameState
  coord: HexCoord | undefined
  tile: TileState | undefined
  onToggleExit: (direction: number) => void
  exitRefusalFor: (direction: number) => string | undefined
  pendingType: string
  pendingExits: readonly number[]
}

export const TileInspector = ({
  state,
  coord,
  tile,
  onToggleExit,
  exitRefusalFor,
  pendingType,
  pendingExits,
}: Props) => {
  if (!coord) {
    return (
      <section className="inspector inspector--empty">
        <p>
          Clique une Tuile pour l’inspecter : Recettes, entités présentes et avancement de leur
          production, réserves, Sorties.
        </p>
        <p className="inspector__hint">
          Sans sélection, les boutons de direction règlent les Sorties de la <strong>prochaine</strong> pose
          (« {tileType(state.config, pendingType).name} » :{' '}
          {pendingExits.length === 0 ? 'aucune' : pendingExits.map(directionName).join(', ')}).
        </p>
      </section>
    )
  }

  if (!tile) {
    return (
      <section className="inspector">
        <header className="inspector__head">
          <h2>Espace ({coord.q},{coord.r})</h2>
          <span className="inspector__owner">libre</span>
        </header>
        <p className="inspector__hint">Aucune Tuile ici. Choisis un type au catalogue et clique pour poser.</p>
      </section>
    )
  }

  const type = tileType(state.config, tile.typeId)
  const entities = state.entities
    .filter((e) => e.space.q === coord.q && e.space.r === coord.r)
    .sort((a, b) => a.id - b.id)
  const editable = state.phase === 'placement' && tile.owner === 'player'
  const bySide: Side[] = ['player', 'demon']

  return (
    <section className="inspector">
      <header className="inspector__head">
        <h2>
          {type.glyph} {type.name} ({coord.q},{coord.r})
        </h2>
        <span className={`inspector__owner inspector__owner--${tile.owner}`}>{tile.owner}</span>
      </header>

      <div className="inspector__block">
        <h3>Sorties {editable ? '' : '(non modifiables hors phase de pose)'}</h3>
        <div className="exits">
          {DIRECTION_NAMES.map((name, direction) => {
            const active = tile.exits.includes(direction)
            const refusal = editable ? exitRefusalFor(direction) : 'phase de pose uniquement (T5)'
            return (
              <button
                key={name}
                type="button"
                className={`exit ${active ? 'exit--on' : ''}`}
                disabled={!editable || (refusal !== undefined && !active)}
                title={refusal ?? (active ? 'Retirer cette Sortie' : 'Désigner cette Sortie')}
                onClick={() => onToggleExit(direction)}
              >
                {name}
              </button>
            )
          })}
        </div>
        <p className="inspector__meta">
          {type.maxExits === 0
            ? 'Ce type n’autorise aucune Sortie : on y livre, on y meurt (T4, D6).'
            : `${tile.exits.length}/${type.maxExits} Sortie(s) — tourniquet en position ${
                tile.exits.length > 0 ? tile.roundRobin % tile.exits.length : 0
              } (D8, D9)`}
        </p>
      </div>

      {(type.recipes?.length ?? 0) > 0 && (
        <div className="inspector__block">
          <h3>Recettes</h3>
          <ul className="recipes">
            {bySide.flatMap((side) =>
              recipesFor(type, side).map((recipe, i) => (
                <li key={`${side}-${i}`} className={`recipe recipe--${side}`}>
                  <span className="recipe__side">{side === 'player' ? 'Âmes' : 'Sbires'}</span>
                  <span className="recipe__body">{describeRecipe(state, recipe)}</span>
                  <span className="recipe__ticks">
                    {recipe.ticks} Tick{recipe.ticks > 1 ? 's' : ''}
                    {recipe.progress !== undefined && (
                      <em> · {progressPerTick(recipe).toFixed(2)}/Tick</em>
                    )}
                  </span>
                </li>
              )),
            )}
          </ul>
          <p className="inspector__meta">Productions terminées ici : {tile.productionsDone}</p>
        </div>
      )}

      <div className="inspector__block">
        <h3>Réserves</h3>
        <StockLine state={state} label="Entrée" stock={tile.input} />
        <StockLine state={state} label="Sortie" stock={tile.output} />
      </div>

      <div className="inspector__block">
        <h3>Présents ({entities.length})</h3>
        {entities.length === 0 ? (
          <p className="inspector__hint">Personne sur cette Tuile.</p>
        ) : (
          <ul className="inspector__entities">
            {entities.map((e) => (
              <EntityRow key={e.id} state={state} tile={tile} entity={e} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
