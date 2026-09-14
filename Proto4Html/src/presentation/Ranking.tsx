import { betType, type Settlement } from '../core/rules/bets'
import { ranking, type RaceState } from '../core/rules/race'
import { soulColor } from './souls'
import { HUD } from './texts'

interface Props {
  race: RaceState
  settlement: Settlement | null
  money: number
  continueLabel: string
  onContinue: () => void
  /** Referme la modale pour regarder la table ; l'onglet « Gains » la rouvre. */
  onClose?: () => void
}

export function Ranking({ race, settlement, money, continueLabel, onContinue, onClose }: Props) {
  const ranked = ranking(race)
  const net = settlement ? settlement.returned - settlement.staked : 0
  return (
    <section className="ranking" aria-label={HUD.raceResult}>
      <h2>{HUD.raceResult}</h2>
      <h3>Classement final</h3>
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
      {settlement && settlement.bets.length > 0 && (
        <div className="settlement">
          <h3>Bilan des paris</h3>
          <ul>
            {settlement.bets.map((b) => (
              <li key={b.id} className={`bet bet-${b.status}`}>
                <span className="bet-type">{betType(b.type).label}</span>
                <span className="bet-targets">{b.souls.map((id) => race.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' › ' : ', ')}</span>
                <span className="bet-status">{b.status === 'won' ? `+${b.payout - b.stake}` : `−${b.stake}`}</span>
              </li>
            ))}
          </ul>
          <p className={'settlement-net ' + (net >= 0 ? 'good' : 'bad')}>
            {net >= 0 ? `Gain net +${net}` : `Perte nette −${Math.abs(net)}`} · argent : {money}
          </p>
        </div>
      )}
      {settlement && settlement.bets.length === 0 && <p className="muted small">Aucun pari sur cette course.</p>}
      <div className="ranking-actions">
        <button type="button" className="btn btn-primary" onClick={onContinue} autoFocus>{continueLabel}</button>
        {onClose && (
          <button type="button" className="btn" onClick={onClose}>
            {HUD.seeTable}
          </button>
        )}
      </div>
    </section>
  )
}
