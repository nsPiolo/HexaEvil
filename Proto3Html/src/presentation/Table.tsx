/**
 * La table de jeu, vue du joueur — spéc. interface, « Écran de jeu ».
 *
 * Le joueur est en bas, les adversaires en face. Tout ce que la partie produit
 * se pose **sur le tapis** : le pot au centre, les tuiles de récompense en
 * vrac autour, les jetons au bord de chaque zone. Rien ici ne calcule quoi que
 * ce soit — la vue ne fait que montrer ce que le moteur a déjà dit (`U2`).
 */

import type { RewardId } from '../core/rules/types'
import { ChipStack, CardView, DealerToken, DeckPile, DieView, ForgeToken, RewardTile } from './bits'
import { diceHandLabel, handLabel, PHASE_LABEL } from './labels'
import type { Snapshot } from './session'
import type { View } from './viewModel'

/** Une étape du fil d'Ariane imprimé en haut de la table. */
export interface RailStage {
  readonly key: string
  readonly label: string
  /** Nombre de blocs (batailles) à afficher, `0` pour une phase de dés. */
  readonly blocks: number
  readonly done: number
}

type Side = 'bottom' | 'left' | 'right' | 'top'

export interface TableProps {
  view: View
  frame: Snapshot
  deltas: readonly number[]
  names: readonly string[]
  humanIndex: number
  ladderSizes: Readonly<Record<number, number>>
  rail: readonly RailStage[]
  /** `U8c` : récompenses cliquables **sur le tapis**, pas redessinées ailleurs. */
  pickable?: readonly string[] | undefined
  onPick?: ((id: string) => void) | undefined
  /** `B2` : ce que le tapis montre à la place du pot — les bonus du joueur. */
  mat?: readonly RewardId[] | undefined
  /** `B2` : tuiles déjà cochées pour la mise. */
  picked?: readonly RewardId[] | undefined
  /** Les commandes du joueur, posées au-dessus de sa zone. */
  actionBar?: React.ReactNode
  /** `J7` : cette rencontre met un point de forge en jeu, il se voit sur la table. */
  forgeAtStake?: boolean | undefined
  /** Sélection de cartes dans la main du joueur, pendant un changement (`C3`). */
  cardAction?: { readonly selected: readonly number[]; readonly onCard: (index: number) => void } | undefined
  /** Sélection de dés dans la zone du joueur : garder, ou retourner (`B10`). */
  diceAction?:
    | {
        readonly mode: 'keep' | 'flip' | 'pick'
        readonly keep: readonly boolean[]
        readonly onDie: (index: number) => void
      }
    | undefined
}

export function Table(props: TableProps) {
  const { view, names, humanIndex, frame } = props
  const foes = names.map((_, i) => i).filter((i) => i !== humanIndex)
  // Un seul adversaire s'assied en face ; deux se partagent la gauche et la
  // droite, comme le veut la spéc.
  const sideOf = (rank: number): Side => (foes.length === 1 ? 'top' : rank === 0 ? 'left' : 'right')

  return (
    <div className="table">
      <Rail stages={props.rail} current={view.timeline.stage} />

      <div className={`table__foes table__foes--${foes.length}`}>
        {foes.map((i, rank) => (
          <Seat key={i} {...props} index={i} side={sideOf(rank)} />
        ))}
      </div>

      <div className="table__center">
        <div className="table__stakes">
          <Pot view={view} frame={frame} />
          {props.forgeAtStake && <ForgeToken />}
        </div>
        <Mat
          view={view}
          pickable={props.pickable}
          mat={props.mat}
          picked={props.picked}
          onPick={props.onPick}
        />
        {view.coin && <Coin coin={view.coin} names={names} />}
      </div>

      <div className="table__me">
        {props.actionBar}
        <Seat {...props} index={humanIndex} side="bottom" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Fil d'Ariane */

function Rail({ stages, current }: { stages: readonly RailStage[]; current: string | null }) {
  const currentIndex = stages.findIndex((s) => s.key === current)
  return (
    <div className="rail" aria-label="déroulé de la partie">
      {stages.map((stage, i) => {
        const passed = currentIndex >= 0 && i < currentIndex
        const active = i === currentIndex
        return (
          <div key={stage.key} className="rail__item">
            {i > 0 && <span className="rail__link" />}
            <div className={`rail__stage ${passed ? 'rail__stage--done' : ''} ${active ? 'rail__stage--now' : ''}`}>
              <span className="rail__label">{stage.label}</span>
              {stage.blocks > 0 && (
                <span className="rail__blocks">
                  {Array.from({ length: stage.blocks }, (_, b) => (
                    <span key={b} className={`rail__block ${b < stage.done ? 'rail__block--done' : ''}`} />
                  ))}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ Sièges */

function Seat(props: TableProps & { index: number; side: Side }) {
  const { view, frame, deltas, names, index, side, humanIndex } = props
  const isHuman = index === humanIndex
  const out = view.out.includes(index)
  const active = view.activeThrower === index
  const best = view.roundOutcome?.best === index
  const worst = view.roundOutcome?.worst === index
  const slot = view.dice[index]
  const values: readonly number[] = slot?.values ?? []
  const hand = view.hands[index] ?? []
  const cardAction = isHuman ? props.cardAction : undefined
  const diceAction = isHuman ? props.diceAction : undefined
  const owned = [...view.owned.entries()].filter(([id, who]) => who === index && !view.used.has(id))

  const cls = [
    'seat',
    `seat--${side}`,
    isHuman ? 'seat--human' : 'seat--demon',
    active ? 'seat--active' : '',
    best ? 'seat--best' : '',
    worst ? 'seat--worst' : '',
    out ? 'seat--out' : '',
  ]

  return (
    <section className={cls.join(' ')}>
      <header className="seat__head">
        <span className="seat__name">{names[index]}</span>
        {view.leader === index && view.mode === 'dice' && <DealerToken throws={view.leaderThrows} />}
        {out && <span className="seat__tag seat__tag--out">sorti</span>}
      </header>

      <div className="seat__felt">
        {view.mode === 'duel' ? (
          <div className="seat__cards">
            <DeckPile />
            <div className={`hand ${cardAction ? 'hand--interactive' : ''}`}>
              {(view.leaving[index] ?? []).map(({ card, at }) => (
                <CardView key={`out${card.uid}`} card={card} hidden={!isHuman} leaving slot={at} />
              ))}
              {hand.map((card, k) => (
                <CardView
                  key={card.uid}
                  card={card}
                  hidden={!view.revealed && !isHuman}
                  entering={(view.entering[index] ?? []).includes(card.uid)}
                  marked={cardAction?.selected.includes(k)}
                  onClick={cardAction ? () => cardAction.onCard(k) : undefined}
                />
              ))}
              {view.duelWinner === index && (
                <span className="crown" title="remporte la bataille">
                  ♛
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="seat__dice">
            <DeckPile />
            <div className="dice">
              {values.map((value, k) => (
                <DieView
                  key={k}
                  value={value}
                  effect={slot?.effects[k] ?? null}
                  rolling={slot?.rolled[k] ?? false}
                  kept={diceAction && diceAction.mode !== 'flip' ? diceAction.keep[k] : undefined}
                  // `D3b` : les dés retenus par le jeu ressortent, les autres s'effacent.
                  dimmed={slot !== null && !(slot?.kept.includes(k) ?? true)}
                  onClick={diceAction ? () => diceAction.onDie(k) : undefined}
                  title={
                    diceAction?.mode === 'flip'
                      ? 'Retourner ce dé'
                      : diceAction?.mode === 'pick'
                        ? diceAction.keep[k]
                          ? 'Relancé'
                          : 'Gardé'
                        : diceAction
                          ? diceAction.keep[k]
                            ? 'Gardé'
                            : 'Sera relancé'
                          : undefined
                  }
                />
              ))}
              {values.length === 0 && <span className="dice__empty">— pas encore lancé —</span>}
            </div>
            <ChipStack amount={frame.chips[index] ?? 0} delta={deltas[index]} side={side} />
          </div>
        )}
      </div>

      {/* Imprimé sur la table : le nom de la combinaison et sa valeur. */}
      <div className="seat__print">
        {view.mode === 'dice'
          ? slot?.hand
            ? `${diceHandLabel(slot.hand)} · ${slot.hand.chipValue} jetons`
            : ''
          : view.revealed && view.ranks?.[index]
            ? handLabel(view.ranks[index]!, props.ladderSizes[hand.length] ?? 1)
            : ''}
      </div>

      {owned.length > 0 && (
        <div className="seat__tiles">
          {owned.map(([id]) => (
            <RewardTile key={id} id={id} owner={index} ownerName={names[index]} />
          ))}
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------- Pot */

function Pot({ view, frame }: { view: View; frame: Snapshot }) {
  const discs = Math.min(14, frame.pot)
  return (
    <div className="pot">
      <div className="pot__pile">
        {Array.from({ length: discs }, (_, i) => (
          <span key={i} className="pot__disc" style={{ bottom: `${i * 3}px`, left: `${(i % 3) - 1}px` }} />
        ))}
      </div>
      <span className="pot__value">{frame.pot}</span>
      <span className="pot__label">
        {view.mode === 'dice' && view.phase ? `${PHASE_LABEL[view.phase]} · manche ${view.round}` : 'jetons au pot'}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ Tapis */

function Mat({
  view,
  pickable,
  mat,
  picked,
  onPick,
}: {
  view: View
  pickable?: readonly string[] | undefined
  mat?: readonly RewardId[] | undefined
  picked?: readonly RewardId[] | undefined
  onPick?: ((id: string) => void) | undefined
}) {
  // `U8d` : les récompenses non prises quittent le tapis une fois les batailles
  // finies — elles ne joueront plus aucun rôle dans la partie.
  // `B2` : pendant la mise, le tapis montre les bonus du joueur, pas le pot.
  const offered: readonly RewardId[] = mat ?? (view.mode === 'duel' ? view.offered : [])
  if (offered.length === 0) return null
  return (
    <div className="mat">
      {offered.map((id, i) => (
        <RewardTile
          key={id}
          id={id}
          index={i}
          staked={picked?.includes(id)}
          onClick={pickable?.includes(id) && onPick ? () => onPick(id) : undefined}
        />
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- Pile ou face */

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
