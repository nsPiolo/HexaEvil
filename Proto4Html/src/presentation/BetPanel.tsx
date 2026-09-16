import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { config } from '../core/config'
import { BET_TYPES, TIER_LABEL, betRefusal, betType, betUnlocked, bettingClosed, currentMultiplier, evaluateBet, fmtMultiplier, potentialPayout, raceProgress, slotCount, type Bet, type BetTier, type BetTypeId } from '../core/rules/bets'
import { isInBetZone, ranking, type RaceState, type Roll } from '../core/rules/race'
import type { Phase } from './useRace'
import { LockBadge, lockTitle } from './LockBadge'
import { MoneyGauge } from './MoneyGauge'
import { fmtDistance, soulColor } from './souls'
import { BETS, BET_LIVE, fill } from './texts'

/** Brouillon de ticket : type choisi et âmes désignées. Partagé avec le plateau (spec 03/C2). */
export interface BetDraft {
  type: BetTypeId
  souls: number[]
}

export const EMPTY_DRAFT: BetDraft = { type: 'winner', souls: [] }

/** Ajoute ou retire une âme du brouillon, sans dépasser `slots` : même règle pour les chips et les jetons. */
export function toggleDraftSoul(draft: BetDraft, id: number, slots: number): BetDraft {
  if (draft.souls.includes(id)) return { ...draft, souls: draft.souls.filter((x) => x !== id) }
  if (draft.souls.length >= slots) return draft
  return { ...draft, souls: [...draft.souls, id] }
}

interface Props {
  race: RaceState
  money: number
  /** Prix du cercle, pour la jauge. */
  price: number
  bets: readonly Bet[]
  /** Peut-on poser un pari en ce moment ? */
  open: boolean
  phase: Phase
  /** Niveau du stagiaire : les types de paris au-dessus sont affichés verrouillés. */
  level: number
  /** Vitesse des animations : la confirmation « Pari posé » est mise à l'échelle. */
  speed: number
  /** Dés lancés (Œil du parieur) : rappelés en tête, puisque le panneau recouvre la zone des dés. */
  roll?: Roll | null
  /** Œil du parieur : null si non possédé. */
  lateBet: { charges: number; active: boolean } | null
  onUseLateBet: () => void
  onPlace: (type: BetTypeId, souls: readonly number[], stake: number) => string | null
  /** Retrait d'un pari (préparation seulement) : absent = pas d'annulation possible. */
  onCancel?: (id: number) => string | null
  /** Cote de base d'un type, artefacts compris. */
  baseFor: (type: BetTypeId) => number
  /** Brouillon contrôlé par l'écran (sélection d'âmes sur le plateau) ; sinon état interne. */
  draft?: BetDraft
  onDraftChange?: (draft: BetDraft) => void
  /** Survol croisé chip ↔ jeton du plateau. */
  highlightSoul?: number | null
  onHoverSoul?: (id: number | null) => void
  /** En préparation : lancer la course et ouvrir la boutique depuis le panneau. */
  onStart?: () => void
  onOpenShop?: () => void
  onClose?: () => void
}

const TIERS: readonly BetTier[] = ['simple', 'intermediate', 'advanced']
const NUMERALS = ['I', 'II', 'III'] as const

/**
 * Jetons peints (`public/table/chips/`), un par palier de mise. `economy.stakes` est libre :
 * au-delà de quatre mises, les visuels se répètent — la valeur reste portée par le chiffre.
 */
const CHIP_ART = ['/table/chips/chip-1.webp', '/table/chips/chip-2.webp', '/table/chips/chip-3.webp', '/table/chips/chip-4.webp'] as const
const chipArt = (v: number): string => CHIP_ART[Math.max(0, config.economy.stakes.indexOf(v)) % CHIP_ART.length] as string
/** La mise la plus forte, la seule qui prenne feu dans le logement. */
const HOTTEST_STAKE = Math.max(...config.economy.stakes)
const STAKE_MIME = 'application/x-sinnersbet-stake'
function readStake(e: DragEvent): number | null {
  const raw = e.dataTransfer.getData(STAKE_MIME)
  return /^\d+$/.test(raw) ? Number(raw) : null
}

export function BetPanel({ race, money, price, bets, open, phase, level, speed, roll = null, lateBet, onUseLateBet, onPlace, onCancel, baseFor, draft, onDraftChange, highlightSoul, onHoverSoul, onStart, onOpenShop, onClose }: Props) {
  const [localDraft, setLocalDraft] = useState<BetDraft>(EMPTY_DRAFT)
  const d = draft ?? localDraft
  const setDraft = onDraftChange ?? setLocalDraft
  const { type, souls } = d
  const [tier, setTier] = useState<BetTier>('simple')
  const [stake, setStake] = useState<number>(config.economy.stakes[0] ?? 5)
  const [error, setError] = useState<string | null>(null)
  /** Confirmation transitoire après une pose (spec 08/C4). */
  const [placed, setPlaced] = useState<string | null>(null)
  /** Liste des paris posés : accordéon au-dessus du pied, ouvert par défaut (spec 08/C4). */
  const [listOpen, setListOpen] = useState(true)

  useEffect(() => {
    if (placed === null) return
    const t = setTimeout(() => setPlaced(null), config.animation.betConfirmMs / speed)
    return () => clearTimeout(t)
  }, [placed, speed])

  const prep = phase === 'prep'
  const closed = bettingClosed(race)
  const def = betType(type)
  const slots = slotCount(def, race.souls.length)
  const progress = raceProgress(race)
  const decay = config.economy.decay
  const multOf = (id: BetTypeId): number => currentMultiplier(baseFor(id), progress, decay)
  const unlock = config.economy.betUnlockLevel
  const isLocked = (id: BetTypeId): boolean => !betUnlocked(id, level, unlock)
  const mult = multOf(type)
  const refusal = useMemo(() => betRefusal(race, type, souls, stake, money, bets), [race, type, souls, stake, money, bets])
  const missing = Math.max(0, slots - souls.length)
  const net = potentialPayout(stake, mult) - stake
  const staked = bets.filter((b) => b.status === 'open').reduce((s, b) => s + b.stake, 0)
  const ready = open && missing === 0 && !refusal
  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`

  /** Fourchette de cotes des types ouverts d'un palier, pour l'onglet ; « verrouillé » si aucun. */
  const range = (t: BetTier): string => {
    const m = BET_TYPES.filter((b) => b.tier === t && !isLocked(b.id)).map((b) => multOf(b.id))
    if (m.length === 0) return BETS.tierLocked
    const lo = Math.min(...m)
    const hi = Math.max(...m)
    return lo === hi ? fmtMultiplier(lo) : `${fmtMultiplier(lo)} – ${fmtMultiplier(hi)}`
  }

  const changeType = (id: BetTypeId): void => {
    setDraft({ type: id, souls: [] })
    setError(null)
  }
  const changeTier = (t: BetTier): void => {
    setTier(t)
    const first = BET_TYPES.find((b) => b.tier === t && !isLocked(b.id))
    if (first && betType(type).tier !== t) changeType(first.id)
  }
  const toggleSoul = (id: number): void => {
    setError(null)
    setDraft(toggleDraftSoul(d, id, slots))
  }
  const place = (): void => {
    const err = onPlace(type, souls, stake)
    setError(err)
    if (!err) {
      setPlaced(fill(BETS.placed, { type: def.label, souls: souls.map(soulName).join(def.ordered ? ' › ' : ', '), stake, net }))
      setDraft({ ...d, souls: [] })
    }
  }

  // Mise : glisser un jeton dans le logement, ou le cliquer (même alternative que l'appariement des dés).
  const [dragStake, setDragStake] = useState<number | null>(null)
  const [overSocket, setOverSocket] = useState(false)
  const chooseStake = (v: number): void => {
    setStake(v)
    setError(null)
  }
  const startStakeDrag = (v: number) => (e: DragEvent): void => {
    e.dataTransfer.setData(STAKE_MIME, String(v))
    e.dataTransfer.effectAllowed = 'move'
    setDragStake(v)
  }
  const endStakeDrag = (): void => {
    setDragStake(null)
    setOverSocket(false)
  }
  const allowStakeDrop = (e: DragEvent): void => {
    const v = dragStake ?? readStake(e)
    if (v === null || v > money) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!overSocket) setOverSocket(true)
  }
  const dropStake = (e: DragEvent): void => {
    e.preventDefault()
    const v = dragStake ?? readStake(e)
    if (v !== null && v <= money) chooseStake(v)
    endStakeDrag()
  }

  // Ligne d'état du pied : ce qu'il manque, ou le refus, ou le ticket prêt (gain + solde après mise).
  let status: string
  let statusKind = ''
  if (error) {
    status = error
    statusKind = 'bad'
  } else if (!open) {
    status = race.finished ? 'Course terminée : les paris sont réglés.' : closed ? `Une âme a dépassé le seuil de ${Math.round(race.track.betThresholdRatio * 100)} % : plus de pari.` : phase === 'pairing' ? 'Les dés sont lancés : les paris reprennent au prochain tour.' : 'Paris suspendus pendant la résolution.'
  } else if (missing > 0) {
    status = `Choisis encore ${missing} âme${missing > 1 ? 's' : ''} — dans le panneau ou en cliquant les jetons du plateau.`
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
        <div className="bp-title">
          <h2 className="serif">Poser un pari</h2>
          <p className="muted">
            {prep ? 'Au moins un pari pour lancer la course.' : open ? 'Dernier moment pour parier ce tour.' : status}
            {progress > 0 && open && <> Cotes décotées : course à {Math.round(progress * 100)} %.</>}
          </p>
          {roll && phase === 'pairing' && <p className="small bp-dice">{fill(BETS.diceSeen, { souls: roll.soul.map((id) => soulName(id)).join(' · '), dist: roll.distance.map(fmtDistance).join(' / ') })}</p>}
        </div>
        <button type="button" className="bp-count-btn" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} aria-controls="bp-placed" title={BETS.placedToggle} data-testid="bets-count">
          <span key={bets.length} className="bp-count-pop">{fill(BETS.placedCount, { n: bets.length })}</span>
        </button>
        <div className="bp-money">
          <span className="money">
            {money} <span className="money-unit">pièces</span>
          </span>
          <MoneyGauge money={money} price={price} staked={staked} />
        </div>
        {onClose && (
          <button type="button" className="bp-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        )}
      </header>

      {!open && phase === 'pairing' && !closed && lateBet && (
        <div className="bp-late">
          <button type="button" className="btn btn-artefact" disabled={lateBet.charges <= 0} onClick={onUseLateBet}>
            Œil du parieur : parier après le lancer ({lateBet.charges} charge{lateBet.charges > 1 ? 's' : ''})
          </button>
        </div>
      )}
      {open && phase === 'pairing' && <p className="hint small bp-late">Œil du parieur actif : tu paries en connaissant tes dés.</p>}

      {/* Sections en colonnes côte à côte (spec 08/C2) : type · âmes · mise. */}
      <div className="bp-body">
        <div className="bp-col">
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
                  <button type="button" className={'type' + (type === b.id ? ' type-on' : '') + (locked ? ' type-locked' : '')} disabled={!open || locked} onClick={() => changeType(b.id)} aria-pressed={type === b.id} title={locked ? lockTitle(unlock[b.id]) : undefined}>
                    <span className="type-text">
                      <span className="type-name">{b.label}</span>
                      <span className="type-desc">{b.description}</span>
                    </span>
                    {locked ? <LockBadge level={unlock[b.id]} /> : <span className="mult-badge serif">{fmtMultiplier(multOf(b.id))}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="bp-col">
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
                <button key={i} type="button" className={'bet-slot' + (id !== undefined ? ' bet-slot-filled' : '')} style={id !== undefined ? { ['--soul' as string]: soulColor(id) } : undefined} onClick={() => id !== undefined && toggleSoul(id)} disabled={id === undefined || !open} title={id !== undefined ? 'Retirer' : ''} aria-label={id === undefined ? BETS.emptySlot : undefined}>
                  {label && <span className="bet-slot-tag">{label}</span>}
                  {id !== undefined && <span className="lane-dot" style={{ background: soulColor(id) }} />}
                  {/* Vide, l'emplacement ne montre que le vortex ; le span reste pour tenir la hauteur. */}
                  <span className="bet-slot-name">{id !== undefined ? soulName(id) : ''}</span>
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
                  className={'chip soul-chip' + (picked ? ' chip-on' : '') + (highlightSoul === s.id ? ' chip-hot' : '')}
                  style={{ ['--soul' as string]: soulColor(s.id) }}
                  disabled={!open || zone || (!picked && souls.length >= slots)}
                  onClick={() => toggleSoul(s.id)}
                  onMouseEnter={() => onHoverSoul?.(s.id)}
                  onMouseLeave={() => onHoverSoul?.(null)}
                  onFocus={() => onHoverSoul?.(s.id)}
                  onBlur={() => onHoverSoul?.(null)}
                  title={zone ? BETS.overThreshold : `case ${s.position}`}
                >
                  <span className="lane-dot" style={{ background: soulColor(s.id) }} />
                  {s.name}
                  {zone && <span className="chip-zone">{Math.round(race.track.betThresholdRatio * 100)} %</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bp-col">
          <h3 className="bp-section">
            <span className="numeral">{NUMERALS[2]}</span> Mise
          </h3>
          <div className="stake-zone">
            {/* Le logement : cible du dépôt, et socle du jeton en cours. Le chiffre reste du texte. */}
            <div
              className={'stake-socket' + (dragStake !== null ? ' stake-socket-armed' : '') + (overSocket ? ' stake-socket-over' : '')}
              data-testid="stake-socket"
              onDragOver={open ? allowStakeDrop : undefined}
              onDragLeave={() => overSocket && setOverSocket(false)}
              onDrop={open ? dropStake : undefined}
            >
              {/* Les flammes ne saluent que le tapis maximum : le feu dit « tu joues gros », pas « tu as choisi ». */}
              {stake === HOTTEST_STAKE && <span className="stake-flames" aria-hidden="true" />}
              <span key={stake} className="stake-chip stake-chip-active" style={{ backgroundImage: `url(${chipArt(stake)})` }} aria-hidden="true">
                {stake}
              </span>
            </div>
            <div className="stake-tray" role="group" aria-label={BETS.trayLabel}>
              {config.economy.stakes.map((v) => {
                const chosen = v === stake
                const tooRich = v > money
                return (
                  <button
                    key={v}
                    type="button"
                    className={'stake-chip' + (chosen ? ' stake-chip-gone' : '') + (dragStake === v ? ' stake-chip-dragging' : '')}
                    style={chosen ? undefined : { backgroundImage: `url(${chipArt(v)})` }}
                    draggable={open && !tooRich && !chosen}
                    onDragStart={startStakeDrag(v)}
                    onDragEnd={endStakeDrag}
                    disabled={!open || tooRich}
                    aria-pressed={chosen}
                    aria-label={chosen ? String(v) : undefined}
                    title={tooRich ? fill(BETS.tooRich, { n: money }) : chosen ? BETS.chipChosen : BETS.chipHint}
                    onClick={() => chooseStake(v)}
                  >
                    {chosen ? null : v}
                  </button>
                )
              })}
            </div>
          </div>
          {ready && (
            <div className="bp-ticket" aria-live="polite">
              <span className="bp-ticket-gain good">{fill(BETS.gain, { net, mult: fmtMultiplier(mult).slice(1) })}</span>
              <span className="bp-ticket-after muted">{fill(BETS.after, { n: money - stake })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Paris posés : accordéon au-dessus du pied, piloté par le compteur de l'en-tête. */}
      <section id="bp-placed" className="bp-placed" hidden={!listOpen} aria-label="Paris posés">
        <BetList race={race} bets={bets} live={!prep} {...(onCancel ? { onCancel } : {})} />
      </section>

      <footer className="bp-foot">
        {placed ? (
          <div className="bp-status bp-placed-msg good" role="status" data-testid="bet-placed">
            <span>✓ {placed}</span>
          </div>
        ) : (
          <div className={'bp-status ' + statusKind}>
            <span>{status}</span>
          </div>
        )}
        <div className="bp-actions">
          <button type="button" className="btn btn-primary" disabled={!open || refusal !== null} onClick={place}>
            Poser le pari
          </button>
          {prep && onOpenShop && (
            <button type="button" className="btn btn-gold" onClick={onOpenShop} title={bets.length === 0 ? 'La boutique n’ouvre sa caisse qu’après un premier pari' : undefined}>
              Boutique
            </button>
          )}
          {prep && onStart && (
            <button type="button" className="btn bp-start" disabled={bets.length === 0} onClick={onStart}>
              {bets.length === 0 ? 'Lancer la course — pose d’abord un pari' : 'Lancer la course'}
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}

/** Liste des paris posés, avec leur état. Utilisée dans le panneau de paris et sur la table. */
export function BetList({ race, bets, compact, live, onCancel }: { race: RaceState; bets: readonly Bet[]; compact?: boolean; /** En course : état provisoire de chaque pari ouvert d'après les positions actuelles. */ live?: boolean; onCancel?: (id: number) => string | null }) {
  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`
  if (bets.length === 0) return <p className="muted small">Aucun pari pour cette course.</p>
  const provisional = live && race.souls.some((s) => s.position > 0) ? ranking(race) : null
  return (
    <ul className={'bets' + (compact ? ' bets-compact' : '') + (onCancel ? ' bets-cancellable' : '')}>
      {bets.map((b) => {
        const onTrack = provisional && b.status === 'open' ? evaluateBet(b, provisional) : null
        return (
          <li key={b.id} className={`bet bet-${b.status}` + (onTrack === null ? '' : onTrack ? ' bet-on-track' : ' bet-at-risk')} data-live={onTrack === null ? undefined : onTrack ? 'on-track' : 'at-risk'}>
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
              {b.status === 'open' && onTrack === null && (compact ? `+${potentialPayout(b.stake, b.multiplier) - b.stake} si gagné` : `+${potentialPayout(b.stake, b.multiplier) - b.stake} si gagné`)}
              {b.status === 'open' && onTrack !== null && (
                <span className="bet-live" title={BET_LIVE.title}>
                  {onTrack ? BET_LIVE.onTrack : BET_LIVE.atRisk} <span className="muted">· {BET_LIVE.provisional}</span>
                </span>
              )}
              {b.status === 'won' && `gagné +${b.payout - b.stake}`}
              {b.status === 'lost' && `perdu −${b.stake}`}
            </span>
            {onCancel && b.status === 'open' && (
              <button type="button" className="bet-cancel" onClick={() => onCancel(b.id)} title={fill(BETS.cancelTitle, { stake: b.stake })}>
                {BETS.cancel}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
