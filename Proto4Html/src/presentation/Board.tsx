import { isBlocked, type MoveResult, type RaceState } from '../core/rules/race'
import { fmtDistance, soulColor } from './souls'

interface Props {
  race: RaceState
  lastResult: MoveResult | null
  /** Âme dont c'est le déplacement en cours (surbrillance). */
  activeSoul: number | null
}

/** Écart vertical entre deux jetons empilés sur la même case, en pixels ; taille d'un jeton. */
const STACK_GAP = 22
const TOKEN = 32
const SINGLE_LANE_HEIGHT = 150

/**
 * Plateau : `columns` colonnes × `lanes` couloirs. Le couloir 0 (prioritaire) est dessiné
 * EN BAS, au plus près du joueur. Les cases bloquées sont hachurées. Les âmes qui partagent
 * une case (départ, dernière case) s'empilent visuellement.
 */
export function Board({ race, lastResult, activeSoul }: Props) {
  const { track } = race
  const cols = Array.from({ length: track.totalCells }, (_, i) => i)
  const lanes = track.lanes
  const rows = Array.from({ length: lanes }, (_, r) => lanes - 1 - r) // couloir affiché par ligne, du haut vers le bas
  const swapped = lastResult?.collision?.kind === 'swap' ? lastResult.collision.with : null
  const jumped = lastResult?.collision?.kind === 'jump' ? lastResult.collision.over : []
  const stackGap = STACK_GAP
  // Hauteur d'un couloir : assez pour empiler les âmes qui partagent une case au départ.
  const perLane = Math.ceil(race.souls.length / lanes)
  const laneHeight = Math.max(56, TOKEN + (perLane - 1) * STACK_GAP + 16)
  const trackHeight = lanes > 1 ? lanes * laneHeight : SINGLE_LANE_HEIGHT

  // Plusieurs âmes sur la même case (départ, dernière case) : on les empile.
  const occupants = new Map<string, number[]>()
  for (const s of race.souls) {
    const k = `${s.position}:${s.lane}`
    occupants.set(k, [...(occupants.get(k) ?? []), s.id])
  }

  const cellClass = (c: number, lane: number | null): string => {
    const k = ['cell']
    if (c === 0) k.push('cell-start')
    if (c >= track.betThresholdColumn && c < track.columns) k.push('cell-betzone')
    if (c === track.columns) k.push('cell-finish')
    if (c >= track.columns) k.push('cell-after')
    if (lane !== null && isBlocked(track, c, lane)) k.push('cell-blocked')
    return k.join(' ')
  }

  return (
    <section className="board" style={{ ['--cells' as string]: track.totalCells, ['--lanes' as string]: lanes }} aria-label="Plateau de course">
      <div className="cells cells-head">
        {cols.map((c) => (
          <div key={c} className={cellClass(c, null) + ' head'}>
            {c === 0 ? 'Départ' : c === track.betThresholdColumn ? `${Math.round(track.betThresholdRatio * 100)} %` : c === track.columns ? 'Arrivée' : c}
          </div>
        ))}
      </div>
      <div className="cells track" style={{ height: `${trackHeight}px` }}>
        {rows.map((lane) =>
          cols.map((c) => (
            <div key={`${lane}-${c}`} className={cellClass(c, lane)} title={isBlocked(track, c, lane) ? `Case bloquée (colonne ${c}, couloir ${lane + 1})` : undefined}>
              {isBlocked(track, c, lane) && <span className="cell-blocked-mark" aria-hidden="true">✕</span>}
            </div>
          )),
        )}
        {race.souls.map((soul) => {
          const stack = occupants.get(`${soul.position}:${soul.lane}`) ?? [soul.id]
          const index = stack.indexOf(soul.id)
          const offset = (index - (stack.length - 1) / 2) * stackGap
          const isActive = activeSoul === soul.id
          const isLast = lastResult?.move.soul === soul.id
          const tokenClass = ['token']
          if (isActive) tokenClass.push('token-active')
          if (isLast && lastResult?.blockedAtStart) tokenClass.push('token-blocked')
          if (swapped === soul.id) tokenClass.push('token-swapped')
          if (jumped.includes(soul.id)) tokenClass.push('token-jumped')
          if (soul.finishOrder !== null) tokenClass.push('token-finished')
          const row = lanes - 1 - soul.lane
          return (
            <div
              key={soul.id}
              className={tokenClass.join(' ')}
              style={{
                left: `calc(${soul.position} * (100% / var(--cells)))`,
                top: `calc(${row} * (100% / var(--lanes)))`,
                transform: `translateY(${offset}px)`,
                ['--soul' as string]: soulColor(soul.id),
              }}
              title={lanes > 1 ? `${soul.name} · couloir ${soul.lane + 1}` : soul.name}
            >
              <span className="token-body">{soul.name.slice(0, 2)}</span>
              {isLast && lastResult && (
                <span key={`${race.turn}-${lastResult.from}-${lastResult.to}-${lastResult.toLane}`} className={'bubble' + (lastResult.move.source === 'opponent' ? ' bubble-opp' : '')}>
                  {fmtDistance(lastResult.move.distance)}
                  {lastResult.blockedAtStart && ' ✕'}
                  {lastResult.detour !== null && ' ↕'}
                  {lastResult.collision?.kind === 'jump' && ' ↷'}
                  {lastResult.collision?.kind === 'swap' && ' ⇄'}
                  {lastResult.crossedFinish && ' 🏁'}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <ul className="legend" aria-label="Âmes en course">
        {race.souls.map((soul) => (
          <li key={soul.id} className={activeSoul === soul.id ? 'legend-active' : ''}>
            <span className="lane-dot" style={{ background: soulColor(soul.id) }} />
            <span style={{ color: soulColor(soul.id) }}>{soul.name}</span>
            <span className="lane-pos">
              case {soul.position}
              {lanes > 1 && ` · c${soul.lane + 1}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
