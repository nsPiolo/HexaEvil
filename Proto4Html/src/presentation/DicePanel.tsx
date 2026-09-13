import { config } from '../core/config'
import { isPairingComplete, type RaceState } from '../core/rules/race'
import type { RaceUi } from './useRace'
import { fmtDistance, soulColor } from './souls'

interface Props {
  ui: RaceUi
  onRoll: () => void
  onPickSoul: (i: number) => void
  onPickDistance: (i: number) => void
  onReset: () => void
  onAutoPair: () => void
  onResolve: () => void
}

function soulName(race: RaceState, id: number | undefined): string {
  return id === undefined ? '?' : (race.souls[id]?.name ?? `#${id}`)
}

export function DicePanel({ ui, onRoll, onPickSoul, onPickDistance, onReset, onAutoPair, onResolve }: Props) {
  const { phase, roll, race, combinations, selectedSoulDie, resolvingIndex, opponentRoll } = ui
  const pairing = phase === 'pairing'
  const rolling = phase === 'rolling'
  const complete = roll !== null && isPairingComplete(roll, combinations)
  const orderOfSoul = (i: number): number => combinations.findIndex((c) => c.soulDie === i)
  const orderOfDist = (i: number): number => combinations.findIndex((c) => c.distanceDie === i)
  const soulCount = roll?.soul.length ?? config.dice.soulDice
  const distCount = roll?.distance.length ?? config.dice.distanceDice
  const unused = soulCount - distCount

  const hint = (): string => {
    switch (phase) {
      case 'idle': return `Tour ${race.turn} — lancez les dés.`
      case 'rolling': return 'Les dés roulent…'
      case 'pairing':
        if (complete) return 'Ordre fixé. Résolvez, ou réinitialisez pour changer.'
        if (selectedSoulDie !== null) return 'Choisissez maintenant un dé Distance à lui associer.'
        return `Cliquez un dé Âme, puis un dé Distance. L'ordre des associations est l'ordre de résolution (${combinations.length}/${distCount})${unused > 0 ? ` — ${unused} dé Âme rester${unused > 1 ? 'ont' : 'a'} inutilisé${unused > 1 ? 's' : ''}` : ''}.`
      case 'resolving': return 'Résolution de vos combinaisons…'
      case 'opponent': return "Tour de l'adversaire…"
      case 'finished': return 'Course terminée.'
    }
  }

  return (
    <section className="dice-panel" aria-label="Dés">
      <p className="hint">{hint()}</p>

      <div className="dice-group">
        <h3>Dés Âme</h3>
        <div className="dice-row">
          {Array.from({ length: soulCount }, (_, i) => {
            const id = roll?.soul[i]
            const order = orderOfSoul(i)
            const cls = ['die', 'die-soul']
            if (rolling) cls.push('die-rolling')
            if (selectedSoulDie === i) cls.push('die-selected')
            if (order >= 0) cls.push('die-paired')
            if (complete && order < 0) cls.push('die-unused')
            if (phase === 'resolving' && resolvingIndex !== null && combinations[resolvingIndex]?.soulDie === i) cls.push('die-resolving')
            return (
              <button
                key={i}
                type="button"
                className={cls.join(' ')}
                disabled={!pairing || order >= 0}
                onClick={() => onPickSoul(i)}
                style={id !== undefined && !rolling ? { ['--soul' as string]: soulColor(id) } : undefined}
              >
                {rolling || id === undefined ? '?' : soulName(race, id)}
                {order >= 0 && <span className="die-order">{order + 1}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="dice-group">
        <h3>Dés Distance</h3>
        <div className="dice-row">
          {Array.from({ length: distCount }, (_, i) => {
            const d = roll?.distance[i]
            const order = orderOfDist(i)
            const cls = ['die', 'die-dist']
            if (rolling) cls.push('die-rolling')
            if (order >= 0) cls.push('die-paired')
            if (d !== undefined && d < 0) cls.push('die-neg')
            if (pairing && selectedSoulDie !== null && order < 0) cls.push('die-target')
            if (phase === 'resolving' && resolvingIndex !== null && combinations[resolvingIndex]?.distanceDie === i) cls.push('die-resolving')
            return (
              <button key={i} type="button" className={cls.join(' ')} disabled={!pairing || selectedSoulDie === null || order >= 0} onClick={() => onPickDistance(i)}>
                {rolling || d === undefined ? '?' : fmtDistance(d)}
                {order >= 0 && <span className="die-order">{order + 1}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {roll && combinations.length > 0 && (
        <ol className="combos">
          {combinations.map((c, i) => {
            const id = roll.soul[c.soulDie]
            const d = roll.distance[c.distanceDie]
            const dup = combinations.findIndex((o) => roll.soul[o.soulDie] === id) !== i
            return (
              <li key={i} className={(resolvingIndex === i ? 'combo-active ' : '') + (dup ? 'combo-dup' : '')}>
                <span className="combo-soul" style={{ color: id !== undefined ? soulColor(id) : undefined }}>{soulName(race, id)}</span>
                <span className="combo-dist">{d !== undefined ? fmtDistance(d) : '?'}</span>
                {dup && <span className="combo-note">cumulé avec la précédente</span>}
              </li>
            )
          })}
        </ol>
      )}

      <div className="dice-group dice-opponent">
        <h3>Adversaire</h3>
        <div className="dice-row">
          {phase === 'opponent' && !opponentRoll && (
            <>
              <span className="die die-soul die-rolling die-small">?</span>
              <span className="die die-dist die-rolling die-small">?</span>
            </>
          )}
          {opponentRoll && (
            <>
              <span className="die die-soul die-small" style={{ ['--soul' as string]: soulColor(opponentRoll.soul[0] ?? 0) }}>{soulName(race, opponentRoll.soul[0])}</span>
              <span className={'die die-dist die-small' + ((opponentRoll.distance[0] ?? 0) < 0 ? ' die-neg' : '')}>{fmtDistance(opponentRoll.distance[0] ?? 0)}</span>
            </>
          )}
          {phase !== 'opponent' && !opponentRoll && <span className="muted small">Joue après vous : {config.opponent.rollsPerTurn} paire{config.opponent.rollsPerTurn > 1 ? 's' : ''} de dés, résolue{config.opponent.rollsPerTurn > 1 ? 's' : ''} séparément.</span>}
        </div>
      </div>

      <div className="actions">
        {phase === 'idle' && <button type="button" className="btn btn-primary" onClick={onRoll}>Lancer les dés</button>}
        {pairing && (
          <>
            <button type="button" className="btn btn-primary" disabled={!complete} onClick={onResolve}>Résoudre</button>
            <button type="button" className="btn" onClick={onAutoPair}>Associer dans l'ordre</button>
            <button type="button" className="btn" disabled={combinations.length === 0} onClick={onReset}>Réinitialiser</button>
          </>
        )}
      </div>
    </section>
  )
}
