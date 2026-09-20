import { useEffect, useState, type ReactNode } from 'react'
import { config } from '../core/config'
import { betType, type Settlement } from '../core/rules/bets'
import { ranking, type RaceState } from '../core/rules/race'
import { MoneyGauge } from './MoneyGauge'
import { soulColor } from './souls'
import { BET_TYPE_TEXTS, HUD, RESULTS, UI, fill } from './texts'

interface Props {
  race: RaceState
  settlement: Settlement | null
  /** Solde après règlement des paris (avant paiement du prix du cercle). */
  money: number
  /** Prix du cercle et courses restantes dans ce cercle, pour la jauge (spec 06/C2). */
  price: number
  racesLeft: number
  speed: number
  /** Personnalités des âmes (GDD §6.5) : leur signe suit le nom dans le classement. */
  /** Vrai à la première ouverture : les tickets se révèlent un à un ; faux ensuite (tout révélé). */
  animate: boolean
  continueLabel: string
  onContinue: () => void
  /** Referme la modale pour regarder la table ; l'onglet « Gains » la rouvre. */
  onClose?: () => void
}

/** Délai entre deux lignes du classement (cascade), à vitesse ×1. */
const CASCADE_MS = 120

const ordinal = (n: number): string => (n === 1 ? '1er' : `${n}e`)

/**
 * Ordre de franchissement de l'arrivée (spec 08/C6) : mentionné seulement quand il diffère du
 * rang, et raconté — la colonne prime (GDD §2.7), une âme passée la ligne en premier peut être
 * doublée pendant la fin du tour, et inversement.
 */
export function arrivalNote(rank: number, finishOrder: number | null): string | null {
  if (finishOrder === null || finishOrder === rank) return null
  return fill(finishOrder < rank ? RESULTS.arrivedEarlier : RESULTS.arrivedLater, { n: ordinal(finishOrder) })
}

export function Ranking({ race, settlement, money, price, racesLeft, speed, animate, continueLabel, onContinue, onClose }: Props) {
  const ranked = ranking(race)
  const bets = settlement?.bets ?? []
  // Révélation séquentielle (spec 06/C1) : `shown` = tickets déjà retournés. Initialisé une
  // fois : rouvrir la modale (animate = false) montre tout, sans rejouer.
  const [shown, setShown] = useState<number>(() => (animate ? 0 : Number.POSITIVE_INFINITY))
  const allShown = shown >= bets.length
  useEffect(() => {
    if (allShown) return
    const cascade = shown === 0 ? (ranked.length * CASCADE_MS) / speed : 0
    const t = setTimeout(() => setShown((s) => s + 1), cascade + config.animation.betRevealMs / speed)
    return () => clearTimeout(t)
  }, [shown, allShown, ranked.length, speed])
  const revealAll = (): void => setShown(Number.POSITIVE_INFINITY)

  const revealed = bets.slice(0, Math.min(shown, bets.length))
  const partialNet = revealed.reduce((s, b) => s + b.payout - b.stake, 0)
  const refund = settlement?.refund ?? 0
  const net = partialNet + (allShown ? refund : 0)
  const fmtNet = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)

  // Départage montré (spec 06/C3) : deux âmes consécutives sur la même colonne, couloirs différents.
  const rows: ReactNode[] = []
  ranked.forEach(({ soul, rank }, i) => {
    const prev = ranked[i - 1]
    if (prev && prev.soul.position === soul.position && prev.soul.lane !== soul.lane) {
      rows.push(
        <li key={`tie-${soul.id}`} className="rank-tie" style={{ animationDelay: `${(i * CASCADE_MS) / speed}ms` }}>
          {RESULTS.tieBreak}
        </li>,
      )
    }
    rows.push(
      <li key={soul.id} className={rank <= 3 ? `podium podium-${rank}` : ''} style={{ animationDelay: `${(i * CASCADE_MS) / speed}ms` }}>
        <span className="rank">{rank}</span>
        <span className="rank-dot" style={{ background: soulColor(soul.id) }} />
        <span className="rank-name">{soul.name}</span>
        <span className="rank-pos">
          case {soul.position}
          {race.track.lanes > 1 && <span className="muted"> · couloir {soul.lane + 1}</span>}
          {arrivalNote(rank, soul.finishOrder) !== null && <span className="muted rank-note"> · {arrivalNote(rank, soul.finishOrder)}</span>}
        </span>
      </li>,
    )
  })

  return (
    <section className="ranking" aria-label={HUD.raceResult} onClick={allShown ? undefined : revealAll} title={allShown ? undefined : RESULTS.skip}>
      <h2>{HUD.raceResult}</h2>
      <h3>{UI.ranking.final}</h3>
      <p className="muted">{fill(RESULTS.subtitle, { turn: race.turn })}</p>
      <ol>{rows}</ol>
      {settlement && bets.length > 0 && (
        <div className="settlement">
          <h3>{UI.ranking.tally}</h3>
          <ul>
            {bets.map((b, i) => {
              const visible = i < shown
              return (
                <li key={b.id} data-testid={`bet-ticket-${i}`} data-state={visible ? b.status : 'hidden'} className={visible ? `bet bet-${b.status} bet-revealed` : 'bet bet-hidden'} aria-hidden={!visible}>
                  <span className="bet-type">{BET_TYPE_TEXTS[b.type].label}</span>
                  <span className="bet-targets">{b.souls.map((id) => race.souls[id]?.name ?? `#${id}`).join(betType(b.type).ordered ? ' › ' : ', ')}</span>
                  <span className="bet-status">{visible ? (b.status === 'won' ? fill(UI.ticket.won, { net: b.payout - b.stake }) : fill(UI.ticket.lost, { stake: b.stake })) : RESULTS.hidden}</span>
                </li>
              )
            })}
          </ul>
          {allShown && refund > 0 && <p className="small muted">{fill(RESULTS.refund, { n: refund })}</p>}
          <p className={'settlement-net ' + (net >= 0 ? 'good' : 'bad')} aria-live="polite">
            {fill(RESULTS.net, { net: fmtNet(net) })}
          </p>
        </div>
      )}
      {settlement && bets.length === 0 && <p className="muted small">{UI.ranking.none}</p>}
      <div className="ranking-gauge">
        <MoneyGauge money={money} price={price} staked={0} racesLeft={racesLeft} />
      </div>
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
