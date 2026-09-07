/** Vue SVG du Plateau — règles U1, U2, U3, U10, U16. */

import { hexKey } from '../core/hex/hexCoord'
import { cornersToPoints, hexCorners, hexToPixel } from '../core/hex/layout'
import { viewBoard } from '../core/rules/derived'
import { colorHex } from './labels'
import type { GameApi } from './useGame'
import type { HexCoord } from '../core/hex/hexCoord'
import type { PreviewResult } from './preview'

const SIZE = 34

interface Props {
  readonly api: GameApi
  readonly hovered: HexCoord | null
  readonly selected: HexCoord | null
  readonly preview: PreviewResult | null
  readonly onHover: (at: HexCoord | null) => void
  readonly onClick: (at: HexCoord) => void
}

/**
 * Textures des Tuiles. Elles servent une seule chose : qu'on distingue au premier
 * coup d'œil une Tuile posée d'un Espace vide, sans avoir à lire les chiffres.
 * Le fond des Espaces est peint en semi-transparent (`--space-alpha`) pour rester
 * en arrière-plan.
 */
function Textures() {
  return (
    <defs>
      <pattern id="tex-player" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#16324f" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#2e86de" strokeWidth="2.4" opacity="0.55" />
      </pattern>
      <pattern id="tex-demon" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="8" height="8" fill="#431a17" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#e05a4a" strokeWidth="2.4" opacity="0.5" />
      </pattern>
      <pattern id="tex-neutral" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="#2b2f33" />
        <circle cx="3.5" cy="3.5" r="1.3" fill="#8d9aa5" opacity="0.55" />
      </pattern>
      <pattern id="tex-blocked" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#0d1015" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#242a33" strokeWidth="2.2" />
      </pattern>
      <filter id="tile-lift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#05070a" floodOpacity="0.75" />
      </filter>
    </defs>
  )
}

export function BoardView({ api, hovered, selected, preview, onHover, onClick }: Props) {
  const { config, state, supplied, critical, legal, playback } = api

  // U16 : pendant l'animation on affiche le Plateau de l'étape, pas l'état final.
  const tiles = playback.playing ? playback.tiles : state.tiles
  const spaces = playback.playing ? playback.spaces : state.spaces
  const view = playback.playing ? viewBoard(config, tiles) : api.view

  const playableKeys = new Set(playback.playing ? [] : legal.map((m) => hexKey(m.at)))
  const pixels = spaces.map((s) => ({ space: s, p: hexToPixel(s.at, SIZE) }))
  const xs = pixels.map((e) => e.p.x)
  const ys = pixels.map((e) => e.p.y)
  const pad = SIZE * 1.7
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const width = Math.max(...xs) - minX + pad
  const height = Math.max(...ys) - minY + pad

  const previewByKey = new Map<string, number | null>()
  if (preview?.ok && !playback.playing) {
    for (const line of preview.damaged) previewByKey.set(hexKey(line.at), line.after)
    for (const line of preview.destroyed) previewByKey.set(hexKey(line.at), null)
  }

  // U17 : le fantôme n'apparaît que sur l'Espace survolé, s'il est jouable.
  const ghostKey = hovered !== null && !playback.playing ? hexKey(hovered) : null
  const ghost = preview?.ok === true ? preview : null

  return (
    <svg
      className={playback.playing ? 'board playing' : 'board'}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      role="img"
      aria-label="Plateau hexagonal"
      onMouseLeave={() => onHover(null)}
    >
      <Textures />
      {pixels.map(({ space, p }) => {
        const key = hexKey(space.at)
        const tile = view.byKey.get(key)
        const points = cornersToPoints(hexCorners(p, SIZE - 1.5))
        const isPlayable = playableKeys.has(key)
        const isHovered = hovered !== null && hexKey(hovered) === key
        const isSelected = selected !== null && hexKey(selected) === key
        const previewed = previewByKey.has(key)
        const previewValue = previewByKey.get(key)

        const def = tile ? view.defOf(tile) : null
        const realForce = tile ? view.forceOf(tile) : 0
        const shields = tile ? view.shieldsOf(tile) : 0
        const auraDelta = tile && def ? realForce - (def.force + tile.placementBonus - tile.damage) : 0

        // U16 : force interpolée pendant l'étape, valeur réelle au repos.
        const animated = tile ? playback.displayedForce.get(tile.uid) : undefined
        const shownForce = animated ?? realForce
        const delta = tile ? playback.deltas.get(tile.uid) : undefined
        const isDying = tile !== undefined && playback.dying.has(tile.uid)
        const isFocus = tile !== undefined && playback.focusUid === tile.uid

        const isNeutral = tile !== undefined && tile.side === 'neutral'
        const isSupplied = tile !== undefined && tile.side !== 'neutral' && supplied[tile.side].has(tile.uid)
        const isCritical = tile !== undefined && tile.side !== 'neutral' && critical[tile.side].has(tile.uid)

        const classes = ['space']
        if (space.blocked) classes.push('blocked')
        if (isPlayable) classes.push('playable')
        if (isHovered) classes.push('hovered')
        if (isSelected) classes.push('selected')
        if (previewed) classes.push(previewValue === null ? 'preview-kill' : 'preview-hit')
        if (isDying) classes.push('dying')
        if (isFocus) classes.push('focus')
        if (delta !== undefined) classes.push(delta < 0 ? 'hit' : 'healed')

        return (
          <g
            key={key}
            className={classes.join(' ')}
            onMouseEnter={() => onHover(space.at)}
            onClick={() => onClick(space.at)}
          >
            {/* U1 : la Couleur de l'Espace. Elle est peinte en semi-transparent
                SUR un fond clair, ce qui la délave vers le pastel — la réduire
                directement sur le fond sombre de la page l'aurait assombrie. */}
            {space.blocked ? (
              <polygon points={points} className="space-fill" fill="url(#tex-blocked)" />
            ) : (
              <>
                <polygon points={points} className="space-base" />
                <polygon points={points} className="space-fill" fill={colorHex(config.colors, space.color)} />
              </>
            )}
            {tile && def && (
              <g className="tile-group">
                {/* Texture pleine + ombre portée : la Tuile se lit comme posée PAR-DESSUS. */}
                <polygon
                  points={cornersToPoints(hexCorners(p, SIZE - 7))}
                  className={`tile side-${tile.side}${isNeutral ? '' : isSupplied ? ' supplied' : ' cut'}`}
                  fill={`url(#tex-${tile.side})`}
                />
                {isCritical && (
                  <polygon points={cornersToPoints(hexCorners(p, SIZE - 4))} className="critical-link" />
                )}
                <text x={p.x} y={p.y - 9} className="tile-id">
                  {tile.typeId}
                </text>
                {/* U2 : force dérivée, animée pendant la résolution. */}
                <text x={p.x} y={p.y + 8} className="tile-force">
                  {previewed && previewValue !== undefined
                    ? previewValue === null
                      ? '✕'
                      : `${realForce}→${previewValue}`
                    : shownForce}
                  {auraDelta !== 0 && !previewed && delta === undefined ? (
                    <tspan className="aura">{` (${auraDelta > 0 ? '+' : ''}${auraDelta})`}</tspan>
                  ) : null}
                </text>
                {shields > 0 && (
                  <text x={p.x} y={p.y + 21} className="tile-shields">
                    {'◈'.repeat(Math.min(shields, 4))}
                    {shields > 4 ? `×${shields}` : ''}
                  </text>
                )}
                {/* Étiquette flottante « −5 » / « +2 », le temps de l'étape. */}
                {delta !== undefined && delta !== 0 && (
                  <text x={p.x + SIZE * 0.62} y={p.y - SIZE * 0.34} className={delta < 0 ? 'float-delta down' : 'float-delta up'}>
                    {delta > 0 ? `+${delta}` : delta}
                  </text>
                )}
                {isDying && (
                  <text x={p.x} y={p.y + 4} className="skull">
                    ✕
                  </text>
                )}
              </g>
            )}
            {/* U17 : fantôme — la Tuile telle qu'elle sera si on la pose ici. */}
            {!tile && ghost && ghostKey === key && (
              <g className={`ghost${ghost.survives ? '' : ' doomed'}`}>
                <polygon
                  points={cornersToPoints(hexCorners(p, SIZE - 7))}
                  className="ghost-tile"
                  fill={`url(#tex-${ghost.side})`}
                />
                <text x={p.x} y={p.y - 9} className="ghost-id">
                  {ghost.typeId}
                </text>
                <text x={p.x} y={p.y + 8} className="ghost-force">
                  {ghost.placedForce}
                  {ghost.placementBonus > 0 && (
                    <tspan className="ghost-bonus">{` (+${ghost.placementBonus})`}</tspan>
                  )}
                </text>
                {ghost.placedShields > 0 && (
                  <text x={p.x} y={p.y + 21} className="ghost-shields">
                    {'◈'.repeat(Math.min(ghost.placedShields, 4))}
                    {ghost.placedShields > 4 ? `×${ghost.placedShields}` : ''}
                  </text>
                )}
                {!ghost.survives && (
                  <text x={p.x + SIZE * 0.58} y={p.y - SIZE * 0.3} className="ghost-doom">
                    ✕
                  </text>
                )}
                {ghost.survives && !ghost.supplied && (
                  <text x={p.x + SIZE * 0.58} y={p.y - SIZE * 0.3} className="ghost-cut">
                    ⛌
                  </text>
                )}
              </g>
            )}
            {!tile && !space.blocked && !(ghost && ghostKey === key) && (
              <text x={p.x} y={p.y + 4} className="coord">
                {space.at.q},{space.at.r}
              </text>
            )}
            <polygon points={points} className="outline" />
          </g>
        )
      })}
    </svg>
  )
}
