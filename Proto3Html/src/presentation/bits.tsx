/** Briques d'affichage : carte, dé, pile de jetons, récompense. */

import type { Card, Die, DiceHand, RewardId } from '../core/rules/types'
import { cardValueLabel, REWARD_HELP, REWARD_LABEL, SUIT_SYMBOL } from './labels'

export function CardView({
  card,
  hidden,
  marked,
  onClick,
}: {
  card: Card
  hidden?: boolean | undefined
  marked?: boolean | undefined
  onClick?: (() => void) | undefined
}) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds'
  if (hidden) return <div className="card card--hidden" aria-label="carte cachée" />
  const cls = ['card', red ? 'card--red' : 'card--black', marked ? 'card--marked' : '', onClick ? 'card--clickable' : '']
  return (
    <button type="button" className={cls.join(' ')} onClick={onClick} disabled={!onClick}>
      <span className="card__value">{cardValueLabel(card.value)}</span>
      <span className="card__suit">{SUIT_SYMBOL[card.suit]}</span>
    </button>
  )
}

export function DieView({
  value,
  rolling,
  kept,
  dimmed,
  onClick,
  title,
}: {
  value: number
  rolling?: boolean | undefined
  kept?: boolean | undefined
  dimmed?: boolean | undefined
  onClick?: (() => void) | undefined
  title?: string | undefined
}) {
  const cls = [
    'die',
    rolling ? 'die--rolling' : '',
    kept ? 'die--kept' : '',
    dimmed ? 'die--dimmed' : '',
    onClick ? 'die--clickable' : '',
    value >= 100 ? 'die--tiny' : value >= 10 ? 'die--small' : '',
  ]
  return (
    <button type="button" className={cls.join(' ')} onClick={onClick} disabled={!onClick} title={title}>
      {value}
    </button>
  )
}

export function HandBadge({ hand }: { hand: DiceHand | null }) {
  if (!hand) return <span className="badge badge--muted">—</span>
  const cls = hand.rank <= 2 ? 'badge badge--gold' : hand.rank >= 5 ? 'badge badge--muted' : 'badge'
  return (
    <span className={cls}>
      {hand.chipValue} <span className="badge__unit">jetons</span>
    </span>
  )
}

export function Chips({ amount, delta }: { amount: number; delta?: number | undefined }) {
  return (
    <span className="chips">
      <span className="chips__icon" aria-hidden="true" />
      <span className="chips__value">{amount}</span>
      {delta !== undefined && delta !== 0 && (
        <span className={`chips__delta ${delta > 0 ? 'chips__delta--up' : 'chips__delta--down'}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  )
}

export function RewardCard({
  id,
  owner,
  ownerName,
  onClick,
}: {
  id: RewardId
  owner?: number | undefined
  ownerName?: string | undefined
  onClick?: (() => void) | undefined
}) {
  const taken = owner !== undefined
  return (
    <button
      type="button"
      className={`reward ${taken ? 'reward--taken' : ''} ${onClick ? 'reward--clickable' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="reward__title">{REWARD_LABEL[id]}</span>
      <span className="reward__help">{REWARD_HELP[id]}</span>
      {taken && <span className="reward__owner">pris par {ownerName}</span>}
    </button>
  )
}

/** `U9` : l'inspecteur de dés — les faces gravées mises en évidence. */
export function DieInspector({ die, engraved }: { die: Die; engraved: readonly number[] }) {
  return (
    <div className="inspector">
      {die.faces.map((face, i) => (
        <span key={i} className={`inspector__face ${engraved.includes(i) ? 'inspector__face--engraved' : ''}`}>
          {face}
        </span>
      ))}
    </div>
  )
}
