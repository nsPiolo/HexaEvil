/** La table : batailles de cartes d'un côté, 4-21 de l'autre (`U5`, `U8`). */

import { CardView, Chips, DieView, HandBadge, RewardCard } from './bits'
import { diceHandLabel, handLabel, PHASE_LABEL } from './labels'
import type { Snapshot } from './session'
import type { View } from './viewModel'

interface SceneProps {
  view: View
  frame: Snapshot
  deltas: readonly number[]
  names: readonly string[]
  humanIndex: number
  ladderSizes: Readonly<Record<number, number>>
  /** `U8c` : récompenses cliquables **dans la bande**, plutôt que redessinées. */
  pickable?: readonly string[] | undefined
  onPick?: ((id: string) => void) | undefined
}

function Seat({
  view,
  frame,
  deltas,
  names,
  index,
  humanIndex,
  children,
  tag,
}: SceneProps & { index: number; children: React.ReactNode; tag?: string | null }) {
  const isHuman = index === humanIndex
  const out = view.out.includes(index)
  const active = view.activeThrower === index
  const best = view.roundOutcome?.best === index
  const worst = view.roundOutcome?.worst === index
  const cls = [
    'seat',
    isHuman ? 'seat--human' : 'seat--demon',
    active ? 'seat--active' : '',
    best ? 'seat--best' : '',
    worst ? 'seat--worst' : '',
    out ? 'seat--out' : '',
  ]
  return (
    <div className={cls.join(' ')}>
      <div className="seat__head">
        <span className="seat__name">{names[index]}</span>
        {tag && <span className="seat__tag">{tag}</span>}
        {out && <span className="seat__tag seat__tag--out">sorti</span>}
        <Chips amount={frame.chips[index] ?? 0} delta={deltas[index]} />
      </div>
      {children}
    </div>
  )
}

export function Scene(props: SceneProps) {
  const { view, names, humanIndex, frame } = props
  const seats = names.map((_, i) => i)

  if (view.mode === 'duel') {
    return (
      <div className="scene scene--duel">
        <div className="scene__title">
          {view.duel
            ? `Bataille ${view.duel.index + 1} / ${view.duel.total} — ${view.duel.handSize} carte${
                view.duel.handSize > 1 ? 's' : ''
              }`
            : 'Batailles de cartes'}
        </div>
        <div className="seats">
          {seats.map((i) => (
            <Seat
              {...props}
              key={i}
              index={i}
              tag={view.duelWinner === i ? 'remporte la bataille' : null}
            >
              <div className="hand">
                {(view.hands[i] ?? []).map((card) => (
                  <CardView key={card.uid} card={card} hidden={!view.revealed && i !== humanIndex} />
                ))}
              </div>
              {view.revealed && view.ranks?.[i] && (
                <div className="seat__hand-name">
                  {handLabel(view.ranks[i]!, props.ladderSizes[view.hands[i]?.length ?? 1] ?? 1)}
                </div>
              )}
            </Seat>
          ))}
        </div>
        {view.coin && <Coin coin={view.coin} names={names} />}
        <RewardStrip view={view} names={names} pickable={props.pickable} onPick={props.onPick} />
      </div>
    )
  }

  return (
    <div className="scene scene--dice">
      <div className="pot">
        <span className="pot__label">
          {view.phase ? PHASE_LABEL[view.phase] : 'Pot'} · manche {view.round}
        </span>
        <span className="pot__value">{frame.pot}</span>
        <span className="pot__unit">jetons au pot</span>
      </div>
      <div className="seats">
        {seats.map((i) => {
          const slot = view.dice[i]
          const values: readonly number[] = slot?.values ?? []
          return (
            <Seat
              {...props}
              key={i}
              index={i}
              tag={
                view.leader === i
                  ? view.leaderThrows !== null
                    ? `meneur · ${view.leaderThrows} jet${view.leaderThrows > 1 ? 's' : ''}`
                    : 'meneur'
                  : null
              }
            >
              <div className="dice">
                {values.map((value, k) => (
                  <DieView
                    key={k}
                    value={value}
                    effect={slot?.effects[k] ?? null}
                    rolling={slot?.rolled[k] ?? false}
                    // `D3b` : les dés retenus par le jeu ressortent, les autres s'effacent.
                    dimmed={slot !== null && !(slot?.kept.includes(k) ?? true)}
                  />
                ))}
                {values.length === 0 && <span className="dice__empty">— pas encore lancé —</span>}
              </div>
              <div className="seat__hand-name">
                {slot?.hand ? (
                  <>
                    {diceHandLabel(slot.hand)} <HandBadge hand={slot.hand} />
                    {values.length > 3 && <span className="seat__note"> meilleurs 3 sur {values.length}</span>}
                  </>
                ) : (
                  ''
                )}
              </div>
            </Seat>
          )
        })}
      </div>
      {view.coin && <Coin coin={view.coin} names={names} />}
      <RewardStrip view={view} names={names} compact />
    </div>
  )
}

function Coin({ coin, names }: { coin: NonNullable<View['coin']>; names: readonly string[] }) {
  return (
    <div className="coin">
      <div className={`coin__disc coin__disc--${coin.result}`}>{coin.result === 'pile' ? 'P' : 'F'}</div>
      <div className="coin__text">
        <strong>{coin.reason}</strong>
        <span>
          annoncé « {coin.side} », tombé sur « {coin.result} » → {names[coin.winner]}
        </span>
      </div>
    </div>
  )
}

function RewardStrip({
  view,
  names,
  compact,
  pickable,
  onPick,
}: {
  view: View
  names: readonly string[]
  compact?: boolean
  pickable?: readonly string[] | undefined
  onPick?: ((id: string) => void) | undefined
}) {
  const owned = [...view.owned.entries()]
  // `U8d` : une fois les batailles finies, les récompenses non prises sortent de
  // l'écran — elles ne joueront plus aucun rôle dans la partie.
  const offered = view.mode === 'duel' ? view.offered : []
  if (offered.length === 0 && owned.length === 0) return null
  return (
    <div className={`strip ${compact ? 'strip--compact' : ''}`}>
      {offered.map((id) => (
        <RewardCard
          key={id}
          id={id}
          onClick={pickable?.includes(id) && onPick ? () => onPick(id) : undefined}
        />
      ))}
      {owned.map(([id, who]) => (
        <RewardCard key={id} id={id} owner={who} ownerName={names[who]} />
      ))}
    </div>
  )
}
