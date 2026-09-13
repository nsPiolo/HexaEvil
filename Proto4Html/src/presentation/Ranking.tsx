import { ranking, type RaceState } from '../core/rules/race'
import { soulColor } from './souls'

export function Ranking({ race, onNewRace }: { race: RaceState; onNewRace: () => void }) {
  const ranked = ranking(race)
  return (
    <section className="ranking" aria-label="Classement">
      <h2>Classement final</h2>
      <p className="muted">Établi après la résolution complète du tour {race.turn}.</p>
      <ol>
        {ranked.map(({ soul, rank }, i) => (
          <li key={soul.id} className={rank <= 3 ? `podium podium-${rank}` : ''} style={{ animationDelay: `${i * 120}ms` }}>
            <span className="rank">{rank}</span>
            <span className="rank-dot" style={{ background: soulColor(soul.id) }} />
            <span className="rank-name">{soul.name}</span>
            <span className="rank-pos">
              case {soul.position}
              {soul.finishOrder !== null && <span className="muted"> · arrivée n°{soul.finishOrder}</span>}
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-primary" onClick={onNewRace}>Nouvelle course</button>
    </section>
  )
}
