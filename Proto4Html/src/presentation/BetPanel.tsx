import { useMemo, useState } from 'react'
import { config } from '../core/config'
import { BET_TYPES, TIER_LABEL, betRefusal, betType, bettingClosed, currentMultiplier, fmtMultiplier, potentialPayout, raceProgress, slotCount, type Bet, type BetTier, type BetTypeId } from '../core/rules/bets'
import { isInBetZone, type RaceState } from '../core/rules/race'
import type { Phase } from './useRace'
import { soulColor } from './souls'

interface Props {
  race: RaceState
  money: number
  bets: readonly Bet[]
  /** Peut-on poser un pari en ce moment ? */
  open: boolean
  phase: Phase
  /** Œil du parieur : null si non possédé. */
  lateBet: { charges: number; active: boolean } | null
  onUseLateBet: () => void
  onPlace: (type: BetTypeId, souls: readonly number[], stake: number) => string | null
}

const TIERS: readonly BetTier[] = ['simple', 'intermediate', 'advanced']

export function BetPanel({ race, money, bets, open, phase, lateBet, onUseLateBet, onPlace }: Props) {
  const initialPhase = phase === 'betting'
  const closed = bettingClosed(race)
  const [type, setType] = useState<BetTypeId>('winner')
  const [souls, setSouls] = useState<number[]>([])
  const [stake, setStake] = useState<number>(config.economy.stakes[0] ?? 5)
  const [error, setError] = useState<string | null>(null)

  const def = betType(type)
  const slots = slotCount(def, race.souls.length)
  const base = config.economy.multipliers[type]
  const progress = raceProgress(race)
  const mult = currentMultiplier(base, progress, config.economy.decay)
  const refusal = useMemo(() => betRefusal(race, type, souls, stake, money, bets), [race, type, souls, stake, money, bets])
  // On n'affiche le refus qu'une fois les âmes désignées, pour ne pas crier avant que le joueur ait fini.
  const message = error ?? (souls.length >= slots ? refusal : null)

  const changeType = (id: BetTypeId): void => {
    setType(id)
    setSouls([])
    setError(null)
  }
  const toggleSoul = (id: number): void => {
    setError(null)
    setSouls((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < slots ? [...prev, id] : prev))
  }
  const place = (): void => {
    const err = onPlace(type, souls, stake)
    setError(err)
    if (!err) setSouls([])
  }

  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`

  return (
    <section className="bet-panel" aria-label="Paris">
      <div className="bet-head">
        <h3>Paris</h3>
        <span className="money" aria-label="Argent">
          {money} <span className="money-unit">pièces</span>
        </span>
      </div>

      {race.finished && <p className="muted small">Course terminée : les paris sont réglés.</p>}
      {!race.finished && closed && <p className="muted small">Une âme a dépassé le seuil de {Math.round(race.track.betThresholdRatio * 100)} % : plus de pari sur cette course.</p>}
      {!race.finished && !closed && !open && phase === 'pairing' && (
        <div className="late-bet">
          <p className="muted small">Les dés sont lancés : les paris reprennent au prochain tour.</p>
          {lateBet && (
            <button type="button" className="btn btn-artefact" disabled={lateBet.charges <= 0} onClick={onUseLateBet} title="Œil du parieur">
              Œil du parieur : parier après le lancer ({lateBet.charges} charge{lateBet.charges > 1 ? 's' : ''})
            </button>
          )}
        </div>
      )}
      {!race.finished && !closed && !open && phase !== 'pairing' && <p className="muted small">Les paris sont suspendus pendant la résolution.</p>}
      {open && phase === 'pairing' && <p className="hint small">Œil du parieur actif : vous pariez en connaissant vos dés.</p>}
      {open && initialPhase && <p className="hint small">Paris initiaux : au moins un, autant que vous voulez, puis lancez la course.</p>}

      <label className="bet-field">
        <span className="bet-label">Type</span>
        <select value={type} onChange={(e) => changeType(e.target.value as BetTypeId)} disabled={!open}>
          {TIERS.map((tier) => (
            <optgroup key={tier} label={TIER_LABEL[tier]}>
              {BET_TYPES.filter((t) => t.tier === tier).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {fmtMultiplier(currentMultiplier(config.economy.multipliers[t.id], progress, config.economy.decay))}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="muted small bet-desc">
        {def.description}
        {progress > 0 && <> Cote de base {fmtMultiplier(base)}, décotée à {fmtMultiplier(mult)} : course avancée à {Math.round(progress * 100)} %.</>}
      </p>

      <div className="bet-field">
        <span className="bet-label">
          {def.ordered ? 'Âmes, dans l’ordre' : slots > 1 ? 'Âmes' : 'Âme'} ({souls.length}/{slots})
        </span>
        <div className="bet-slots">
          {Array.from({ length: slots }, (_, i) => {
            const id = souls[i]
            const label = def.slots?.[i] ?? (def.ordered ? `${i + 1}` : '·')
            return (
              <button
                key={i}
                type="button"
                className={'slot' + (id !== undefined ? ' slot-filled' : '')}
                style={id !== undefined ? { ['--soul' as string]: soulColor(id) } : undefined}
                onClick={() => id !== undefined && toggleSoul(id)}
                disabled={id === undefined || !open}
                title={id !== undefined ? 'Retirer' : ''}
              >
                <span className="slot-tag">{label}</span>
                {id !== undefined ? soulName(id) : '—'}
              </button>
            )
          })}
        </div>
        <div className="bet-souls">
          {race.souls.map((s) => {
            const zone = isInBetZone(race.track, s.position)
            const picked = souls.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                className={'chip soul-chip' + (picked ? ' chip-on' : '')}
                style={{ ['--soul' as string]: soulColor(s.id) }}
                disabled={!open || (!picked && souls.length >= slots)}
                onClick={() => toggleSoul(s.id)}
                title={zone ? 'A dépassé le seuil de pari' : `case ${s.position}`}
              >
                <span className="lane-dot" style={{ background: soulColor(s.id) }} />
                {s.name}
                {zone && <span className="chip-zone">{Math.round(race.track.betThresholdRatio * 100)} %</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bet-field">
        <span className="bet-label">Mise</span>
        <div className="bet-stakes">
          {config.economy.stakes.map((v) => (
            <button key={v} type="button" className={'chip' + (stake === v ? ' chip-on' : '')} disabled={!open || v > money} onClick={() => setStake(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="bet-summary">
        <span>
          Mise {stake} {fmtMultiplier(mult)} → <strong>{potentialPayout(stake, mult)}</strong> si gagné
          <span className="muted"> (net +{potentialPayout(stake, mult) - stake})</span>
        </span>
        <button type="button" className="btn btn-primary" disabled={!open || refusal !== null} onClick={place}>
          Parier
        </button>
      </div>
      <p className={'bet-refusal small' + (message ? ' bet-refusal-on' : '')}>{message ?? ''}</p>

      <div className="bet-list">
        <h3>Paris posés ({bets.length})</h3>
        {bets.length === 0 && <p className="muted small">Aucun pari pour cette course.</p>}
        <ul>
          {bets.map((b) => (
            <li key={b.id} className={`bet bet-${b.status}`}>
              <span className="bet-type">{betType(b.type).label}</span>
              <span className="bet-targets">
                {b.souls.map((id, i) => (
                  <span key={id}>
                    {i > 0 && <span className="muted">{betType(b.type).ordered ? ' › ' : ', '}</span>}
                    <span style={{ color: soulColor(id) }}>{soulName(id)}</span>
                  </span>
                ))}
              </span>
              <span className="bet-stake">
                {b.stake} {fmtMultiplier(b.multiplier)}
                {b.turn > 0 && <span className="muted"> · tour {b.turn}</span>}
              </span>
              <span className="bet-status">
                {b.status === 'open' && 'en cours'}
                {b.status === 'won' && `gagné +${b.payout}`}
                {b.status === 'lost' && `perdu −${b.stake}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
