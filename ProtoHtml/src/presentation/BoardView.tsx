/**
 * Affiche l'état du Plateau issu du Core. Ne valide jamais un placement :
 * les refus viennent de `placementRefusal` / `exitChangeRefusal` (ADR-0003).
 *
 * `U1` — chaque Tuile montre le nombre d'Âmes et de Sbires qui s'y trouvent.
 */
import { key, type HexCoord } from '../core/hex/hexCoord'
import { cornersToPoints, exitMarker, hexCorners, hexToPixel } from '../core/hex/layout'
import { tileType } from '../core/rules/recipes'
import { totalStock } from '../core/rules/storage'
import type { GameState } from '../core/rules/types'

const SIZE = 46

type Props = {
  state: GameState
  selected: HexCoord | undefined
  placeable: (coord: HexCoord) => boolean
  onSelect: (coord: HexCoord) => void
  onPlace: (coord: HexCoord) => void
}

export const BoardView = ({ state, selected, placeable, onSelect, onPlace }: Props) => {
  const centers = state.spaces.map((coord) => ({ coord, p: hexToPixel(coord, SIZE) }))
  const xs = centers.map((c) => c.p.x)
  const ys = centers.map((c) => c.p.y)
  const pad = SIZE * 1.15
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const height = Math.max(...ys) - minY + pad

  const counts = new Map<string, { player: number; demon: number }>()
  for (const e of state.entities) {
    const k = key(e.space)
    const c = counts.get(k) ?? { player: 0, demon: 0 }
    c[e.side] += 1
    counts.set(k, c)
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
        const stored = tile ? totalStock(tile.input) + totalStock(tile.output) : 0

        const classes = [
          'cell',
          tile ? `cell--${tile.owner}` : 'cell--free',
          canPlace ? 'cell--placeable' : '',
          isSelected ? 'cell--selected' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <g
            key={k}
            className={classes}
            role="gridcell"
            aria-label={`Espace ${coord.q}, ${coord.r}${type ? ` — ${type.name}` : ' — libre'}`}
            onClick={() => (tile ? onSelect(coord) : canPlace ? onPlace(coord) : onSelect(coord))}
          >
            <polygon points={cornersToPoints(hexCorners(p, SIZE - 2))} />

            {tile?.exits.map((exit) => (
              <polygon key={exit} className="cell__exit" points={cornersToPoints(exitMarker(p, SIZE - 2, exit))} />
            ))}

            {type && (
              <text x={p.x} y={p.y - 4} className="cell__glyph">
                {type.glyph}
              </text>
            )}

            {stored > 0 && (
              <text x={p.x + SIZE * 0.52} y={p.y - SIZE * 0.42} className="cell__stock">
                ◆{stored}
              </text>
            )}

            {here && (here.player > 0 || here.demon > 0) && (
              <text x={p.x} y={p.y + SIZE * 0.38} className="cell__entities">
                {here.player > 0 && <tspan className="cell__souls">◉{here.player}</tspan>}
                {here.player > 0 && here.demon > 0 && ' '}
                {here.demon > 0 && <tspan className="cell__minions">◈{here.demon}</tspan>}
              </text>
            )}

            <text x={p.x} y={p.y + SIZE * 0.74} className="cell__coord">
              {coord.q},{coord.r}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
