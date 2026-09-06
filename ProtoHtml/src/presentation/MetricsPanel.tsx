/**
 * `K1`-`K5` — métriques permanentes. Le proto sert à comparer deux réglages :
 * ces nombres sont son résultat, pas un habillage.
 */
import { livingEntities, progressPerSoulSpent, reserveLeft, totalSpent } from '../core/rules/encounter'
import type { GameState } from '../core/rules/types'

const OUTCOME: Record<string, string> = {
  victory: 'L’Escalier est achevé. 🏆',
  defeat: 'Plus une seule Âme — l’Escalier reste inachevé. 💀',
}

export const MetricsPanel = ({ state }: { state: GameState }) => {
  const target = state.config.stairwayTarget
  const pct = Math.min(100, Math.round((state.progress / target) * 100))
  const spent = totalSpent(state, 'player')

  return (
    <section className="metrics">
      <div className="metrics__progress">
        <div className="metrics__progress-head">
          <span>Escalier</span>
          <strong>
            {state.progress} / {target}
          </strong>
        </div>
        <div className="bar">
          <div className="bar__fill" style={{ width: `${pct}%` }} />
        </div>
        {state.outcome !== 'ongoing' && <p className="metrics__outcome">{OUTCOME[state.outcome]}</p>}
      </div>

      <dl className="metrics__grid">
        <div>
          <dt>Manche</dt>
          <dd>
            {state.round} · Tick {state.tick}
          </dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>
            {state.phase === 'placement'
              ? state.placedThisRound
                ? 'pose faite'
                : 'à toi de poser'
              : state.phase === 'running'
                ? `${state.ticksLeftInRound} Tick(s) restants`
                : 'terminée'}
          </dd>
        </div>
        <div>
          <dt>Âmes en réserve</dt>
          <dd>
            {reserveLeft(state, 'player')} / {state.config.soulBudget}
          </dd>
        </div>
        <div>
          <dt>Âmes vivantes</dt>
          <dd>{livingEntities(state, 'player')}</dd>
        </div>
        <div>
          <dt>Progression / Âme</dt>
          <dd className="metrics__kpi">{spent === 0 ? '—' : progressPerSoulSpent(state).toFixed(2)}</dd>
        </div>
        <div>
          <dt>Sbires (réserve · vivants)</dt>
          <dd>
            {reserveLeft(state, 'demon')} · {livingEntities(state, 'demon')}
          </dd>
        </div>
      </dl>

      <div className="metrics__spend">
        <h3>Âmes dépensées : {spent}</h3>
        <ul>
          <li>
            <span>livrées à l’Escalier</span>
            <strong>{state.spent.player.delivered}</strong>
          </li>
          <li>
            <span>déplacement impossible (D6)</span>
            <strong>{state.spent.player.blocked}</strong>
          </li>
          <li>
            <span>retour en arrière (D16)</span>
            <strong>{state.spent.player.backtrack}</strong>
          </li>
        </ul>
      </div>

      <div className="metrics__spend">
        <h3>Ponction du démon</h3>
        <ul>
          <li>
            <span>appliquée</span>
            <strong>{state.drain.applied}</strong>
          </li>
          <li>
            <span>absorbée par le plancher à 0 (R8)</span>
            <strong>{state.drain.absorbed}</strong>
          </li>
        </ul>
      </div>
    </section>
  )
}
