/** Briques d'affichage : carte, dé, jetons, tuile de récompense, jeton de donneur. */

import type { Card, Die, DiceHand, FaceEffectId, RewardId } from '../core/rules/types'
import { cardValueLabel, EFFECT_LABEL, EFFECT_SYMBOL, REWARD_HELP, REWARD_LABEL, SUIT_SYMBOL } from './labels'

export function CardView({
  card,
  hidden,
  marked,
  entering,
  leaving,
  slot,
  onClick,
}: {
  card: Card
  hidden?: boolean | undefined
  marked?: boolean | undefined
  /** Vient d'arriver du deck : elle glisse depuis la pioche. */
  entering?: boolean | undefined
  /** Vient d'être échangée : elle glisse vers le bas avant de disparaître. */
  leaving?: boolean | undefined
  /** Case d'origine d'une carte qui part : elle sort **hors flux**, sans
   * décaler la main, et exactement là où la remplaçante arrive. */
  slot?: number | undefined
  onClick?: (() => void) | undefined
}) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds'
  const motion = leaving ? 'card--leaving' : entering ? 'card--entering' : ''
  const style = leaving ? ({ '--slot': slot ?? 0 } as React.CSSProperties) : undefined
  if (hidden) return <div className={`card card--hidden ${motion}`} style={style} aria-label="carte cachée" />
  const cls = [
    'card',
    red ? 'card--red' : 'card--black',
    marked ? 'card--marked' : '',
    onClick ? 'card--clickable' : '',
    motion,
  ]
  return (
    <button type="button" className={cls.join(' ')} style={style} onClick={onClick} disabled={!onClick}>
      <span className="card__value">{cardValueLabel(card.value)}</span>
      <span className="card__suit">{SUIT_SYMBOL[card.suit]}</span>
    </button>
  )
}

/** Le deck posé dos visible dans la zone de chaque participant. */
export function DeckPile() {
  return (
    <div className="deckpile" aria-label="deck">
      <span />
      <span />
      <span />
    </div>
  )
}

export function DieView({
  value,
  effect,
  rolling,
  kept,
  dimmed,
  onClick,
  title,
}: {
  value: number
  effect?: FaceEffectId | null | undefined
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
    <button
      type="button"
      className={cls.join(' ')}
      onClick={onClick}
      disabled={!onClick}
      title={effect ? `${title ?? ''} · ${EFFECT_LABEL[effect]}`.trim() : title}
    >
      {value}
      {effect && <span className="die__effect">{EFFECT_SYMBOL[effect]}</span>}
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

/** `D7` : le jeton de donneur désigne le meneur, et porte son nombre de jets. */
export function DealerToken({ throws }: { throws: number | null }) {
  return (
    <span className="dealer" title="Meneur — son nombre de jets plafonne les autres (D4)">
      <span className="dealer__disc">D</span>
      {throws !== null && <span className="dealer__count">{throws}</span>}
    </span>
  )
}

const MAX_DISCS = 9

/**
 * Une pile de jetons avec sa valeur dessous. Le transfert se **voit** : les
 * jetons qui arrivent ou partent volent depuis le centre de la table.
 */
export function ChipStack({
  amount,
  delta,
  side,
}: {
  amount: number
  delta?: number | undefined
  side: 'bottom' | 'left' | 'right' | 'top'
}) {
  const discs = Math.min(MAX_DISCS, amount)
  const flying = delta ? Math.min(6, Math.abs(delta)) : 0
  const vector: Record<string, [number, number]> = {
    bottom: [0, -120],
    top: [0, 120],
    left: [140, 0],
    right: [-140, 0],
  }
  const [fx, fy] = vector[side] ?? [0, -120]
  return (
    <div className="stack" data-side={side}>
      <div className="stack__discs">
        {Array.from({ length: discs }, (_, i) => (
          <span key={i} className="stack__disc" style={{ bottom: `${i * 4}px` }} />
        ))}
        {amount > MAX_DISCS && <span className="stack__more">+</span>}
        {Array.from({ length: flying }, (_, i) => (
          <span
            key={`fly${i}`}
            className={`stack__fly ${(delta as number) > 0 ? 'stack__fly--in' : 'stack__fly--out'}`}
            style={
              {
                '--fx': `${fx}px`,
                '--fy': `${fy}px`,
                animationDelay: `${i * 70}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <span className="stack__value">{amount}</span>
      {delta !== undefined && delta !== 0 && (
        <span className={`stack__delta ${delta > 0 ? 'stack__delta--up' : 'stack__delta--down'}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  )
}

/**
 * `J7` : le point de forge se gagne toutes les N rencontres. Quand la rencontre
 * en cours est celle-là, le jeton est **posé sur la table** : la récompense doit
 * se voir avant d'être jouée, pas se découvrir dans la boutique.
 */
export function ForgeToken() {
  return (
    <div className="forgetoken rollover__host">
      <span className="forgetoken__disc">{EFFECT_SYMBOL.forge}</span>
      <span className="forgetoken__label">1 forge en jeu</span>
      {/* `U19` : un jeton dont on ne sait pas à quoi il sert n'est qu'un décor. */}
      <span className="rollover">
        Cette rencontre rapporte <strong>un point de forge</strong>, gagnée ou perdue. Les points de forge
        ne s’achètent pas et ne servent qu’à une chose : <strong>graver vos dés</strong> en boutique — poser
        un effet sur une face, ou en changer la valeur.
      </span>
    </div>
  )
}

/**
 * Une tuile de récompense posée sur le tapis : **le titre seul**, la règle au
 * survol. Elle est un peu de travers, comme un carton qu'on aurait jeté là.
 */
export function RewardTile({
  id,
  index,
  owner,
  ownerName,
  staked,
  onClick,
}: {
  id: RewardId
  index?: number | undefined
  owner?: number | undefined
  ownerName?: string | undefined
  /** `B2` : tuile cochée pour la mise. */
  staked?: boolean | undefined
  onClick?: (() => void) | undefined
}) {
  const taken = owner !== undefined
  // Rotation déterministe : la même tuile penche toujours pareil.
  const tilt = ((index ?? 0) % 5) * 2.4 - 4.8
  const cls = [
    'tile',
    taken ? 'tile--taken' : '',
    staked ? 'tile--staked' : '',
    onClick ? 'tile--pickable' : '',
  ]
  return (
    <button
      type="button"
      className={cls.join(' ')}
      style={{ '--tilt': `${taken ? 0 : tilt}deg` } as React.CSSProperties}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="tile__title">{REWARD_LABEL[id]}</span>
      {taken && <span className="tile__owner">{ownerName}</span>}
      <span className="tile__tip">{REWARD_HELP[id]}</span>
    </button>
  )
}

/** `U9` : l'inspecteur de dés — faces gravées et effets mis en évidence. */
export function DieInspector({
  die,
  engraved,
  hovered,
  onHover,
  onPick,
  pending,
  selected,
}: {
  die: Die
  engraved: readonly number[]
  /** Face survolée : sa face opposée est mise en évidence (spéc. boutique). */
  hovered?: number | null | undefined
  onHover?: ((index: number | null) => void) | undefined
  onPick?: ((index: number) => void) | undefined
  /** `U35` : faces d'une gravure en cours d'achat, pas encore appliquée. */
  pending?: readonly number[] | undefined
  /** La face qu'on est en train de graver — celle dont l'offre est affichée. */
  selected?: number | null | undefined
}) {
  const opposite = hovered === null || hovered === undefined ? null : die.faces.length - 1 - hovered
  return (
    <div className="inspector">
      {die.faces.map((f, i) => (
        <span
          key={i}
          className={[
            'inspector__face',
            engraved.includes(i) ? 'inspector__face--engraved' : '',
            hovered === i ? 'inspector__face--hover' : '',
            opposite === i && hovered !== i ? 'inspector__face--opposite' : '',
            onPick ? 'inspector__face--btn' : '',
            pending?.includes(i) ? 'inspector__face--pending' : '',
            selected === i ? 'inspector__face--target' : '',
          ].join(' ')}
          title={f.effect ? EFFECT_LABEL[f.effect] : undefined}
          onMouseEnter={onHover ? () => onHover(i) : undefined}
          onMouseLeave={onHover ? () => onHover(null) : undefined}
          onClick={onPick ? () => onPick(i) : undefined}
        >
          {f.value}
          {f.effect && <em className="inspector__effect">{EFFECT_SYMBOL[f.effect]}</em>}
        </span>
      ))}
    </div>
  )
}
