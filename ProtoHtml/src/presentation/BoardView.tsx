/**
 * Affiche l'état du Plateau issu du Core. Ne valide jamais un placement :
 * les refus viennent de `placementRefusal` / `exitChangeRefusal` (ADR-0003).
 *
 * `U1` — compteurs d'Âmes et de Sbires par Tuile.
 * `U11` — l'Escalier affiche sa progression sur le Plateau.
 * `U14` — les Espaces non constructibles (`B11`) se distinguent des Espaces libres.
 * `U9` — cliquer un hexagone voisin de la Tuile sélectionnée oriente sa Sortie.
 * `U6` — déplacements interpolés entre deux Espaces.
 * `U7` — étiquettes « +x » / « −n » sur les mouvements de Ressources.
 */
import { key, type HexCoord } from '../core/hex/hexCoord'
import { cornersToPoints, exitMarker, hexCorners, hexToPixel, type Point } from '../core/hex/layout'
import { isBlocked } from '../core/rules/encounter'
import { tileType, tracksProgress } from '../core/rules/recipes'
import { totalStock } from '../core/rules/storage'
import type { EntityState, GameState, ResourceId } from '../core/rules/types'
import type { Floater, Ghost, MoveAnim } from './useAnimation'

const SIZE = 46
const DOT = 5.4

type Props = {
  state: GameState
  selected: HexCoord | undefined
  placeable: (coord: HexCoord) => boolean
  /** Clés des Espaces voisins de la Tuile en cours de câblage (`U9`). */
  wireTargets: readonly string[]
  moves: Map<number, MoveAnim>
  ghosts: readonly Ghost[]
  floaters: readonly Floater[]
  t: number
  onSpaceClick: (coord: HexCoord) => void
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Petit décalage en couronne pour que les entités d'une même Tuile restent distinctes. */
const clusterOffset = (index: number, count: number): Point => {
  if (count <= 1) return { x: 0, y: 0 }
  const ring = Math.min(count, 7)
  const angle = (2 * Math.PI * index) / ring - Math.PI / 2
  const radius = count <= 3 ? 8 : 12
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.75 }
}

export const BoardView = ({
  state,
  selected,
  placeable,
  wireTargets,
  moves,
  ghosts,
  floaters,
  t,
  onSpaceClick,
}: Props) => {
  const centers = state.spaces.map((coord) => ({ coord, p: hexToPixel(coord, SIZE) }))
  const xs = centers.map((c) => c.p.x)
  const ys = centers.map((c) => c.p.y)
  const pad = SIZE * 1.15
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const height = Math.max(...ys) - minY + pad

  const wireable = new Set(wireTargets)
  const counts = new Map<string, { player: number; demon: number }>()
  const groups = new Map<string, EntityState[]>()
  for (const e of state.entities) {
    const k = key(e.space)
    const c = counts.get(k) ?? { player: 0, demon: 0 }
    c[e.side] += 1
    counts.set(k, c)
    const group = groups.get(k) ?? []
    group.push(e)
    groups.set(k, group)
  }

  const resourceGlyph = (id: ResourceId): string =>
    state.config.resources.find((r) => r.id === id)?.glyph ?? '◆'

  /** Position à l'écran d'une entité, interpolée si elle se déplace ce Tick. */
  const entityPoint = (entity: EntityState): Point => {
    const move = moves.get(entity.id)
    const group = groups.get(key(entity.space)) ?? []
    const offset = clusterOffset(group.indexOf(entity), group.length)
    if (!move) {
      const base = hexToPixel(entity.space, SIZE)
      return { x: base.x + offset.x, y: base.y + offset.y }
    }
    const from = hexToPixel(move.from, SIZE)
    const to = hexToPixel(move.to, SIZE)
    return { x: lerp(from.x, to.x, t) + offset.x * t, y: lerp(from.y, to.y, t) + offset.y * t }
  }

  return (
    <svg className="board" viewBox={`${minX} ${minY} ${width} ${height}`} role="grid" aria-label="Plateau">
      {centers.map(({ coord, p }) => {
        const k = key(coord)
        const tile = state.tiles[k]
        const type = tile ? tileType(state.config, tile.typeId) : undefined
        const here = counts.get(k)
        const isSelected = selected !== undefined && key(selected) === k
        const canPlace = tile === undefined && placeable(coord)
        const isWireTarget = wireable.has(k)
        const blocked = tile === undefined && isBlocked(state, coord)
        const stored = tile ? totalStock(tile.input) + totalStock(tile.output) : 0

        const classes = [
          'cell',
          tile ? `cell--${tile.owner}` : blocked ? 'cell--blocked' : 'cell--free',
          canPlace && !isWireTarget ? 'cell--placeable' : '',
          isWireTarget ? 'cell--wire' : '',
          isSelected ? 'cell--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <g
            key={k}
            className={classes}
            role="gridcell"
            aria-label={`Espace ${coord.q}, ${coord.r}${
              type ? ` — ${type.name}` : blocked ? ' — non constructible' : ' — libre'
            }`}
            onClick={() => onSpaceClick(coord)}
          >
            <polygon points={cornersToPoints(hexCorners(p, SIZE - 2))} />

            {tile?.exits.map((exit) => (
              <polygon key={exit} className="cell__exit" points={cornersToPoints(exitMarker(p, SIZE - 2, exit))} />
            ))}

            {type && (
              <text x={p.x} y={p.y - 8} className="cell__glyph">
                {type.glyph}
              </text>
            )}

            {blocked && (
              <text x={p.x} y={p.y + 4} className="cell__blocked" aria-hidden="true">
                ✖
              </text>
            )}

            {type && tracksProgress(type) && (
              <text x={p.x} y={p.y + SIZE * 0.22} className="cell__progress">
                {state.progress}
                <tspan className="cell__progress-target">/{state.config.stairwayTarget}</tspan>
              </text>
            )}

            {stored > 0 && (
              <text x={p.x + SIZE * 0.5} y={p.y - SIZE * 0.44} className="cell__stock">
                ◆{stored}
              </text>
            )}

            {here && (here.player > 0 || here.demon > 0) && (
              <text x={p.x} y={p.y + SIZE * 0.58} className="cell__entities">
                {here.player > 0 && <tspan className="cell__souls">◉{here.player}</tspan>}
                {here.player > 0 && here.demon > 0 && ' '}
                {here.demon > 0 && <tspan className="cell__minions">◈{here.demon}</tspan>}
              </text>
            )}

            <text x={p.x} y={p.y + SIZE * 0.82} className="cell__coord">
              {coord.q},{coord.r}
            </text>
          </g>
        )
      })}

      {/* Entités en cours de disparition : elles s'effacent sur place (D6, D16). */}
      <g className="ghosts">
        {ghosts.map((ghost) => {
          const p = hexToPixel(ghost.coord, SIZE)
          return (
            <circle
              key={`ghost-${ghost.id}`}
              className={`entity entity--${ghost.side} entity--ghost`}
              cx={p.x}
              cy={p.y}
              r={DOT * (1 + t)}
              opacity={1 - t}
            />
          )
        })}
      </g>

      {/* Les entités elles-mêmes, position interpolée (U6). */}
      <g className="entities">
        {state.entities.map((entity) => {
          const p = entityPoint(entity)
          const busy = entity.production !== undefined
          return (
            <g key={entity.id} className={`entity-group entity-group--${entity.side}`}>
              <circle
                className={`entity entity--${entity.side} ${busy ? 'entity--busy' : ''}`}
                cx={p.x}
                cy={p.y}
                r={DOT}
              />
              {entity.carrying && (
                <text className="entity__load" x={p.x + DOT + 1.5} y={p.y + 3}>
                  {resourceGlyph(entity.carrying)}
                </text>
              )}
            </g>
          )
        })}
      </g>

      {/* Étiquettes temporaires « +x » / « −n » (U7). */}
      <g className="floaters">
        {floaters.map((floater) => {
          const p = hexToPixel(floater.coord, SIZE)
          return (
            <text
              key={floater.id}
              className={`floater floater--${floater.kind}`}
              x={p.x}
              y={p.y - 14 - floater.slot * 14 - floater.age * 22}
              opacity={1 - floater.age * floater.age}
            >
              {floater.text}
            </text>
          )
        })}
      </g>
    </svg>
  )
}
