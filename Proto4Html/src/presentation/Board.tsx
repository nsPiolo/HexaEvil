import type { RaceState, MoveResult } from '../core/rules/race'
import { fmtDistance, soulColor } from './souls'

interface Props {
  race: RaceState
  lastResult: MoveResult | null
  /** Âme dont c'est le déplacement en cours (surbrillance). */
  activeSoul: number | null
}

/** Écart vertical entre deux jetons empilés sur la même case, en pixels. */
const STACK_GAP = 22

export function Board({ race, lastResult, activeSoul }: Props) {
  const { track } = race
  const cols = Array.from({ length: track.totalCells }, (_, i) => i)
  const swapped = lastResult?.collision?.kind === 'swap' ? lastResult.collision.with : null
  const jumped = lastResult?.collision?.kind === 'jump' ? lastResult.collision.over : []

  // Plusieurs âmes sur la même case (départ, dernière case) : on les empile.
  const occupants = new Map<number, number[]>()
  for (const s of race.souls) occupants.set(s.position, [...(occupants.get(s.position) ?? []), s.id])

  const cellClass = (c: number): string => {
    const k = ['cell']
    if (c === 0) k.push('cell-start')
    if (c >= track.betThresholdColumn && c < track.columns) k.push('cell-betzone')
    if (c === track.columns) k.push('cell-finish')
    if (c >= track.columns) k.push('cell-after')
    return k.join(' ')
  }

  return (
    <section className="board" style={{ ['--cells' as string]: track.totalCells }} aria-label="Plateau de course">
      <div className="cells cells-head">
        {cols.map((c) => (
          <div key={c} className={cellClass(c) + ' head'}>
            {c === 0 ? 'Départ' : c === track.betThresholdColumn ? '60 %' : c === track.columns ? 'Arrivée' : c}
          </div>
        ))}
      </div>
      <div className="cells track">
        {cols.map((c) => (
          <div key={c} className={cellClass(c)} />
        ))}
        {race.souls.map((soul) => {
          const stack = occupants.get(soul.position) ?? [soul.id]
          const index = stack.indexOf(soul.id)
          const offset = (index - (stack.length - 1) / 2) * STACK_GAP
          const isActive = activeSoul === soul.id
          const isLast = lastResult?.move.soul === soul.id
          const tokenClass = ['token']
          if (isActive) tokenClass.push('token-active')
          if (isLast && lastResult?.blockedAtStart) tokenClass.push('token-blocked')
          if (swapped === soul.id) tokenClass.push('token-swapped')
          if (jumped.includes(soul.id)) tokenClass.push('token-jumped')
          if (soul.finishOrder !== null) tokenClass.push('token-finished')
          return (
            <div
              key={soul.id}
              className={tokenClass.join(' ')}
              style={{
                left: `calc(${soul.position} * (100% / var(--cells)))`,
                transform: `translateY(${offset}px)`,
                ['--soul' as string]: soulColor(soul.id),
              }}
              title={soul.name}
            >
              <span className="token-body">{soul.name.slice(0, 2)}</span>
              {isLast && lastResult && (
                <span key={`${race.turn}-${lastResult.from}-${lastResult.to}`} className={'bubble' + (lastResult.move.source === 'opponent' ? ' bubble-opp' : '')}>
                  {fmtDistance(lastResult.move.distance)}
                  {lastResult.blockedAtStart && ' ✕'}
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
            <span className="lane-pos">case {soul.position}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
