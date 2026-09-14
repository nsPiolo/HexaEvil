import { useMemo, useState } from 'react'
import { config } from '../core/config'
import { BET_TYPES, TIER_LABEL, betRefusal, betType, betUnlocked, bettingClosed, currentMultiplier, fmtMultiplier, potentialPayout, raceProgress, slotCount, type Bet, type BetTier, type BetTypeId } from '../core/rules/bets'
import { isInBetZone, type RaceState } from '../core/rules/race'
import type { Phase } from './useRace'
import { rankOfLevel } from './demon'
import { soulColor } from './souls'
import { BETS, fill } from './texts'

interface Props {
  race: RaceState
  money: number
  bets: readonly Bet[]
  /** Peut-on poser un pari en ce moment ? */
  open: boolean
  phase: Phase
  /** Niveau du stagiaire : les types de paris au-dessus sont affichés verrouillés. */
  level: number
  /** Œil du parieur : null si non possédé. */
  lateBet: { charges: number; active: boolean } | null
  onUseLateBet: () => void
  onPlace: (type: BetTypeId, souls: readonly number[], stake: number) => string | null
  /** Cote de base d'un type, artefacts compris. */
  baseFor: (type: BetTypeId) => number
  /** En préparation : lancer la course et ouvrir la boutique depuis le panneau. */
  onStart?: () => void
  onOpenShop?: () => void
  onClose?: () => void
}

const TIERS: readonly BetTier[] = ['simple', 'intermediate', 'advanced']
const NUMERALS = ['I', 'II', 'III', 'IV'] as const

export function BetPanel({ race, money, bets, open, phase, level, lateBet, onUseLateBet, onPlace, baseFor, onStart, onOpenShop, onClose }: Props) {
  const [type, setType] = useState<BetTypeId>('winner')
  const [tier, setTier] = useState<BetTier>('simple')
  const [souls, setSouls] = useState<number[]>([])
  const [stake, setStake] = useState<number>(config.economy.stakes[0] ?? 5)
  const [error, setError] = useState<string | null>(null)

  const prep = phase === 'prep'
  const closed = bettingClosed(race)
  const def = betType(type)
  const slots = slotCount(def, race.souls.length)
  const progress = raceProgress(race)
  const decay = config.economy.decay
  const multOf = (id: BetTypeId): number => currentMultiplier(baseFor(id), progress, decay)
  const unlock = config.economy.betUnlockLevel
  const isLocked = (id: BetTypeId): boolean => !betUnlocked(id, level, unlock)
  const lockedBadge = (id: BetTypeId): string => fill(BETS.lockedBadge, { rank: rankOfLevel(unlock[id]).name })
  const mult = multOf(type)
  const refusal = useMemo(() => betRefusal(race, type, souls, stake, money, bets), [race, type, souls, stake, money, bets])
  const missing = Math.max(0, slots - souls.length)
  const net = potentialPayout(stake, mult) - stake

  /** Fourchette de cotes des types ouverts d'un palier, pour l'onglet ; « verrouillé » si aucun. */
  const range = (t: BetTier): string => {
    const m = BET_TYPES.filter((b) => b.tier === t && !isLocked(b.id)).map((b) => multOf(b.id))
    if (m.length === 0) return BETS.tierLocked
    const lo = Math.min(...m)
    const hi = Math.max(...m)
    return lo === hi ? fmtMultiplier(lo) : `${fmtMultiplier(lo)} – ${fmtMultiplier(hi)}`
  }

  const changeTier = (t: BetTier): void => {
    setTier(t)
    const first = BET_TYPES.find((b) => b.tier === t && !isLocked(b.id))
    if (first && betType(type).tier !== t) changeType(first.id)
  }
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

  // Ligne d'état du pied : ce qu'il manque, ou le refus, ou le résumé du pari prêt.
  let status: string
  let statusKind = ''
  if (error) {
    status = error
    statusKind = 'bad'
  } else if (!open) {
    status = race.finished ? 'Course terminée : les paris sont réglés.' : closed ? `Une âme a dépassé le seuil de ${Math.round(race.track.betThresholdRatio * 100)} % : plus de pari.` : phase === 'pairing' ? 'Les dés sont lancés : les paris reprennent au prochain tour.' : 'Paris suspendus pendant la résolution.'
  } else if (missing > 0) {
    status = `Choisis encore ${missing} âme${missing > 1 ? 's' : ''}.`
  } else if (refusal) {
    status = refusal
    statusKind = 'bad'
  } else {
    status = `${def.label} · mise ${stake} à ${fmtMultiplier(mult)}.`
    statusKind = 'good'
  }

  return (
    <section className="bet-panel" aria-label="Paris">
      <header className="bp-head">
        <div>
          <h2 className="serif">Poser un pari</h2>
          <p className="muted">
            {prep ? 'Au moins un pari pour lancer la course.' : open ? 'Dernier moment pour parier ce tour.' : status}
            {progress > 0 && open && <> Cotes décotées : course à {Math.round(progress * 100)} %.</>}
          </p>
        </div>
        <span className="money">
          {money} <span className="money-unit">pièces</span>
        </span>
        {onClose && (
          <button type="button" className="bp-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        )}
      </header>

      <div className="bp-body">
        {!open && phase === 'pairing' && !closed && lateBet && (
          <button type="button" className="btn btn-artefact" disabled={lateBet.charges <= 0} onClick={onUseLateBet}>
            Œil du parieur : parier après le lancer ({lateBet.charges} charge{lateBet.charges > 1 ? 's' : ''})
          </button>
        )}
        {open && phase === 'pairing' && <p className="hint small">Œil du parieur actif : tu paries en connaissant tes dés.</p>}

        <h3 className="bp-section">
          <span className="numeral">{NUMERALS[0]}</span> Type de pari
        </h3>
        <div className="tiers" role="tablist">
          {TIERS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tier === t} className={'tier' + (tier === t ? ' tier-on' : '')} disabled={!open || BET_TYPES.every((b) => b.tier !== t || isLocked(b.id))} onClick={() => changeTier(t)}>
              <span className="tier-name">{TIER_LABEL[t]}</span>
              <span className="tier-range">{range(t)}</span>
            </button>
          ))}
        </div>
        <ul className="types">
          {BET_TYPES.filter((b) => b.tier === tier).map((b) => {
            const locked = isLocked(b.id)
            return (
              <li key={b.id}>
                <button type="button" className={'type' + (type === b.id ? ' type-on' : '') + (locked ? ' type-locked' : '')} disabled={!open || locked} onClick={() => changeType(b.id)} aria-pressed={type === b.id} title={locked ? fill(BETS.locked, { rank: rankOfLevel(unlock[b.id]).name }) : undefined}>
                  <span className="type-text">
                    <span className="type-name">{b.label}</span>
                    <span className="type-desc">{b.description}</span>
                  </span>
                  {locked ? <span className="lock-badge">🔒 {lockedBadge(b.id)}</span> : <span className="mult-badge serif">{fmtMultiplier(multOf(b.id))}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <h3 className="bp-section">
          <span className="numeral">{NUMERALS[1]}</span> {def.ordered && slots > 1 ? 'Âmes, dans l’ordre' : slots > 1 ? 'Âmes' : 'Âme'}
          <span className="bp-count">
            {souls.length}/{slots}
          </span>
        </h3>
        <div className="bet-slots">
          {Array.from({ length: slots }, (_, i) => {
            const id = souls[i]
            const label = def.slots?.[i] ?? (def.ordered ? `${i + 1}` : null)
            return (
              <button key={i} type="button" className={'slot' + (id !== undefined ? ' slot-filled' : '')} style={id !== undefined ? { ['--soul' as string]: soulColor(id) } : undefined} onClick={() => id !== undefined && toggleSoul(id)} disabled={id === undefined || !open} title={id !== undefined ? 'Retirer' : ''}>
                {label && <span className="slot-tag">{label}</span>}
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
              <button key={s.id} type="button" className={'chip soul-chip' + (picked ? ' chip-on' : '')} style={{ ['--soul' as string]: soulColor(s.id) }} disabled={!open || (!picked && souls.length >= slots)} onClick={() => toggleSoul(s.id)} title={zone ? 'A dépassé le seuil de pari' : `case ${s.position}`}>
                <span className="lane-dot" style={{ background: soulColor(s.id) }} />
                {s.name}
                {zone && <span className="chip-zone">{Math.round(race.track.betThresholdRatio * 100)} %</span>}
              </button>
            )
          })}
        </div>

        <h3 className="bp-section">
          <span className="numeral">{NUMERALS[2]}</span> Mise
        </h3>
        <div className="bet-stakes">
          {config.economy.stakes.map((v) => (
            <button key={v} type="button" className={'chip' + (stake === v ? ' chip-on' : '')} disabled={!open || v > money} onClick={() => setStake(v)}>
              {v}
            </button>
          ))}
        </div>

        <h3 className="bp-section">
          <span className="numeral">{NUMERALS[3]}</span> Paris posés
          <span className="bp-count">{bets.length}</span>
        </h3>
        <BetList race={race} bets={bets} />
      </div>

      <footer className="bp-foot">
        <div className={'bp-status ' + statusKind}>
          <span>{status}</span>
          <span className="bp-gain serif">{open && missing === 0 && !refusal ? `+${net}` : '—'}</span>
        </div>
        <div className="bp-actions">
          <button type="button" className="btn btn-primary" disabled={!open || refusal !== null} onClick={place}>
            Poser le pari
          </button>
          {prep && onOpenShop && (
            <button type="button" className="btn btn-gold" disabled={bets.length === 0} onClick={onOpenShop} title={bets.length === 0 ? 'Pose d’abord un pari' : undefined}>
              Boutique
            </button>
          )}
        </div>
        {prep && onStart && (
          <button type="button" className="btn bp-start" disabled={bets.length === 0} onClick={onStart}>
            {bets.length === 0 ? 'Lancer la course — pose d’abord un pari' : 'Lancer la course'}
          </button>
        )}
      </footer>
    </section>
  )
}

/** Liste des paris posés, avec leur état. Utilisée dans le panneau de paris et sur la table. */
export function BetList({ race, bets, compact }: { race: RaceState; bets: readonly Bet[]; compact?: boolean }) {
  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`
  if (bets.length === 0) return <p className="muted small">Aucun pari pour cette course.</p>
  return (
    <ul className={'bets' + (compact ? ' bets-compact' : '')}>
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
            {b.turn > 0 && !compact && <span className="muted"> · tour {b.turn}</span>}
          </span>
          <span className="bet-status">
            {b.status === 'open' && (compact ? `+${potentialPayout(b.stake, b.multiplier) - b.stake} si gagné` : 'en cours')}
            {b.status === 'won' && `gagné +${b.payout - b.stake}`}
            {b.status === 'lost' && `perdu −${b.stake}`}
          </span>
        </li>
      ))}
    </ul>
  )
}
