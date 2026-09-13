/** Boutique entre deux rencontres (`A1`) — spéc. interface, « Boutique ». */

import { useState } from 'react'
import type { ShopOptionId } from '../core/config/schema'
import { engravedFaces } from '../core/dice/dice'
import {
  applyEngrave,
  applyShopCards,
  canPlusOne,
  engraveOptions,
  shopBlockedReason,
  shopCost,
  type EngraveOption,
  type EngraveOrder,
  type MatchOutcome,
  type ShopSession,
} from '../core/rules/run'
import type { Card, Suit } from '../core/rules/types'
import { CardView, DieInspector, RewardTile } from './bits'
import { cardValueLabel, EFFECT_HELP, EFFECT_LABEL, EFFECT_SYMBOL, SUIT_LABEL, SUIT_SYMBOL } from './labels'
import type { Session } from './session'

const OPTION_LABEL: Record<ShopOptionId, string> = {
  buyBonus: 'Acheter un bonus',
  removeTwo: 'Retirer deux cartes',
  plusOneTwo: 'Ajouter +1 à deux cartes',
  clone: 'Cloner une carte',
  removeOne: 'Retirer une carte',
  recolor: 'Redéfinir la couleur de 5 cartes',
  engraveOne: 'Graver une face d’un dé',
  engraveAll: 'Graver une face de chaque dé',
}

const OPTION_HELP: Record<ShopOptionId, string> = {
  buyBonus: 'Il rejoint votre réserve pour tout le run. Vous en miserez deux à chaque rencontre.',
  removeTwo: 'Parmi 10 cartes tirées au hasard dans votre deck.',
  plusOneTwo: 'Parmi 10 cartes tirées au hasard. Un As ne peut pas monter.',
  clone: 'Parmi 10 cartes tirées au hasard : le deck grossit d’une carte.',
  removeOne: 'Parmi 10 cartes tirées au hasard.',
  recolor: '5 cartes tirées au hasard, la couleur est choisie après les avoir vues.',
  engraveOne: 'Vous choisissez la face, puis ce qu’on y grave.',
  engraveAll: 'Une face sur chacun de vos dés.',
}

const NEEDED: Partial<Record<ShopOptionId, number>> = { removeTwo: 2, removeOne: 1, plusOneTwo: 2, clone: 1 }

const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

/**
 * `U35` : l'état d'une gravure en cours **vit au-dessus** de la boutique, parce
 * que la face se choisit dans le panneau « Vos dés », en bas de l'écran. Le dé
 * n'a plus à être demandé : il est déjà écrit à côté de chaque rangée de faces.
 */
interface Engraving {
  readonly option: 'engraveOne' | 'engraveAll' | null
  readonly orders: readonly EngraveOrder[]
  readonly total: number
  readonly target: { readonly die: number; readonly face: number } | null
  readonly offers: readonly EngraveOption[]
  readonly canPick: (die: number) => boolean
  readonly pickFace: (die: number, face: number) => void
}

export function Shop({ session }: { session: Session }) {
  const run = session.run
  const shop = session.shop
  // `A9` : le deck ne se travaille plus que sur **3 options tirées au sort**
  // par visite ; les gravures, elles, sont toujours là.
  const options: ShopOptionId[] = [...run.offers.deck, 'engraveOne', 'engraveAll']

  const [orders, setOrders] = useState<EngraveOrder[]>([])
  const [target, setTarget] = useState<{ die: number; face: number } | null>(null)
  // L'offre est mémorisée par face : re-cliquer une face déjà vue ne **retire
  // pas** une nouvelle proposition, sinon on relancerait le graveur à volonté.
  const [offerCache, setOfferCache] = useState<Record<string, EngraveOption[]>>({})
  const [lastShop, setLastShop] = useState<ShopSession | null>(null)

  // Chaque achat ouvert repart d'un état vierge.
  if (lastShop !== shop) {
    setLastShop(shop)
    setOrders([])
    setTarget(null)
    setOfferCache({})
  }

  const engraveOption =
    shop && (shop.option === 'engraveOne' || shop.option === 'engraveAll') ? shop.option : null
  const total = engraveOption === 'engraveAll' ? run.dice.length : 1
  const placed = new Set(orders.map((o) => o.dieIndex))
  const complete = orders.length >= total

  const engraving: Engraving = {
    option: engraveOption,
    orders,
    total,
    target,
    offers: target ? (offerCache[`${target.die}:${target.face}`] ?? []) : [],
    canPick: (die) => engraveOption !== null && !complete && !placed.has(die),
    pickFace: (die, face) => {
      const key = `${die}:${face}`
      if (!offerCache[key]) {
        setOfferCache({ ...offerCache, [key]: engraveOptions(run, die, face, session.rng) })
      }
      setTarget({ die, face })
    },
  }

  const chooseOffer = (option: EngraveOption): void => {
    if (!target) return
    setOrders([...orders, { dieIndex: target.die, faceIndex: target.face, option }])
    setTarget(null)
  }

  return (
    <div className="shop">
      <header className="shop__head">
        <h2>Boutique</h2>
        <p className="shop__lead">Ce que vous emportez au Cercle suivant se décide ici.</p>
        <button type="button" className="btn btn--primary btn--big" onClick={() => session.beginMatch()}>
          Lancer la rencontre suivante
        </button>
      </header>

      {session.outcome && <MatchGains outcome={session.outcome} />}

      {session.shopError && <div className="shop__error">{session.shopError}</div>}

      {!shop && <BonusPanel session={session} />}

      {shop ? (
        engraveOption ? (
          <EngravePanel session={session} engraving={engraving} onChoose={chooseOffer} complete={complete} />
        ) : (
          <CardPanel session={session} shop={shop} />
        )
      ) : (
        <div className="shop__grid">
          {options.map((id) => {
            const { cost, currency } = shopCost(run, id)
            const blocked = shopBlockedReason(run, id)
            return (
              <button
                key={id}
                type="button"
                className={`wares ${blocked ? 'wares--blocked' : ''}`}
                disabled={blocked !== null}
                onClick={() => session.openShop(id)}
              >
                <span className={`wares__cost ${currency === 'forge' ? 'wares__cost--forge' : ''}`}>
                  <strong>{cost}</strong>
                  <em>{currency === 'money' ? 'pièces' : 'forge'}</em>
                </span>
                <span className="wares__body">
                  <span className="wares__title">{OPTION_LABEL[id]}</span>
                  <span className="wares__help">{OPTION_HELP[id]}</span>
                  {blocked && <span className="wares__blocked">{blocked}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="inspectors">
        <DiceList session={session} engraving={engraving} />
        <div className="inspector-card">
          <h3>Votre deck — {run.deck.length} cartes</h3>
          <DeckList deck={run.deck} />
        </div>
      </div>
    </div>
  )
}

/**
 * `A9`/`A8` : la réserve de bonus du joueur, et les deux que le marchand
 * propose cette fois-ci. C'est la seule progression qui se voit d'une rencontre
 * à l'autre autrement que par le deck et les dés.
 */
function BonusPanel({ session }: { session: Session }) {
  const run = session.run
  const { cost } = shopCost(run, 'buyBonus')
  const affordable = run.money >= cost
  return (
    <div className="bonuses">
      <p className="bonuses__lead">
        Votre réserve est acquise : vous en miserez {run.cfg.bonusPick} à chaque rencontre, et vous les
        retrouverez à la suivante — même si un adversaire les a utilisés.
      </p>
      <div className="bonuses__row">
        <span className="bonuses__label">Vos bonus ({run.bonuses.length})</span>
        {run.bonuses.map((id, i) => (
          <RewardTile key={id} id={id} index={i} />
        ))}
      </div>
      <div className="bonuses__row">
        <span className="bonuses__label">Le marchand propose</span>
        {run.offers.bonuses.length === 0 && <span className="bonuses__none">plus rien à vendre</span>}
        {run.offers.bonuses.map((id, i) => (
          <span key={id} className="bonuses__buy">
            <RewardTile id={id} index={i} />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!affordable}
              onClick={() => session.buyBonus(id)}
            >
              {cost} pièces
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Ce que la rencontre vient de rapporter. Sans cette ligne, la prime de victoire
 * (`J9`) et le point de forge (`J7`) arrivent en silence : la bourse a changé,
 * on ne sait pas pourquoi.
 */
function MatchGains({ outcome }: { outcome: MatchOutcome }) {
  return (
    <div className="gains">
      <span>
        <strong>+{outcome.money}</strong> pièce{outcome.money > 1 ? 's' : ''} sur cette rencontre
      </span>
      {outcome.winBonus > 0 && <span>dont {outcome.winBonus} de prime de victoire</span>}
      {outcome.forgeGained > 0 && (
        <span className="gains__forge">
          <strong>+{outcome.forgeGained}</strong> point de forge
        </span>
      )}
    </div>
  )
}

/** L'offre du graveur, une fois la face désignée en bas de l'écran. */
function EngravePanel({
  session,
  engraving,
  onChoose,
  complete,
}: {
  session: Session
  engraving: Engraving
  onChoose: (option: EngraveOption) => void
  complete: boolean
}) {
  const run = session.run
  const target = engraving.target
  const die = target ? run.dice[target.die] : null
  const current = die && target ? die.faces[target.face] : null
  const remaining = engraving.total - engraving.orders.length

  return (
    <div className="shop__detail">
      <p className="shop__hint">
        {complete
          ? 'Prêt à graver.'
          : target && current
            ? `Dé ${target.die + 1}, face ${current.value} — le graveur ne propose que ceci.`
            : `Cliquez la face à graver dans « Vos dés », en bas. ${
                remaining > 1 ? `Encore ${remaining} dés à graver.` : ''
              }`}
      </p>

      {engraving.orders.length > 0 && (
        <div className="engrave-list">
          {engraving.orders.map((o, i) => {
            const face = run.dice[o.dieIndex]?.faces[o.faceIndex]
            return (
              <span key={i} className="engrave-list__item">
                Dé {o.dieIndex + 1} · {face?.value} →{' '}
                {o.option.kind === 'effect'
                  ? `${EFFECT_SYMBOL[o.option.effect]} ${EFFECT_LABEL[o.option.effect]}`
                  : `valeur ${o.option.value}`}
              </span>
            )
          })}
        </div>
      )}

      {target && current && !complete && (
        <div className="offers">
          {engraving.offers.length === 0 && <p className="shop__hint">Rien à proposer sur cette face.</p>}
          {engraving.offers.map((o, i) => (
            <button
              key={i}
              type="button"
              className={`offer ${o.kind === 'effect' ? 'offer--special' : ''}`}
              onClick={() => onChoose(o)}
            >
              {o.kind === 'effect' ? (
                <>
                  <span className="offer__value">{current.value}</span>
                  <span className="offer__symbol">{EFFECT_SYMBOL[o.effect]}</span>
                  <span className="offer__label">{EFFECT_LABEL[o.effect]}</span>
                  <span className="offer__help">{EFFECT_HELP[o.effect]}</span>
                </>
              ) : (
                <>
                  <span className="offer__value">{o.value}</span>
                  <span className="offer__symbol">→</span>
                  <span className="offer__label">Changer la valeur</span>
                  <span className="offer__help">
                    La face passe de {current.value} à {o.value}. Son effet éventuel est conservé.
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="actions">
        {complete && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() =>
              session.runShopAction(() =>
                applyEngrave(run, engraving.option as 'engraveOne' | 'engraveAll', engraving.orders),
              )
            }
          >
            Graver
          </button>
        )}
        <button type="button" className="btn" onClick={() => session.closeShop()}>
          Annuler
        </button>
      </div>
    </div>
  )
}

/** Les dés, toutes faces listées ; survoler une face éclaire son opposée (`F2`). */
function DiceList({ session, engraving }: { session: Session; engraving: Engraving }) {
  const run = session.run
  const ladder = [...new Set(run.cfg.circles.map((c) => c.dieFaces))].sort((a, b) => a - b)
  const [hover, setHover] = useState<{ die: number; face: number } | null>(null)
  const active = engraving.option !== null
  return (
    <div className={`inspector-card ${active ? 'inspector-card--calling' : ''}`}>
      <h3>Vos dés{active ? ' — cliquez la face à graver' : ''}</h3>
      {run.dice.map((die, i) => {
        const pickable = engraving.canPick(i)
        const pending = engraving.orders.filter((o) => o.dieIndex === i).map((o) => o.faceIndex)
        return (
          <div key={i} className={`inspector-row ${active && !pickable ? 'inspector-row--off' : ''}`}>
            <span className="inspector-row__name">Dé {i + 1}</span>
            <DieInspector
              die={die}
              engraved={engravedFaces(die, run.cfg.dice.startingFaces, ladder)}
              hovered={hover?.die === i ? hover.face : null}
              onHover={(face) => setHover(face === null ? null : { die: i, face })}
              onPick={pickable ? (face) => engraving.pickFace(i, face) : undefined}
              pending={pending}
              selected={engraving.target?.die === i ? engraving.target.face : null}
            />
          </div>
        )
      })}
      <p className="inspector-card__note">
        Survolez une face : son opposée s’allume — c’est elle que « Retourner un dé » révèle.
      </p>
    </div>
  )
}

/** Le deck sur quatre lignes, une par couleur, dans l'ordre des valeurs. */
function DeckList({ deck }: { deck: readonly Card[] }) {
  return (
    <div className="decklist">
      {SUIT_ORDER.map((suit) => {
        const cards = deck.filter((c) => c.suit === suit).sort((a, b) => a.value - b.value)
        const red = suit === 'hearts' || suit === 'diamonds'
        return (
          <div key={suit} className="decklist__row">
            <span className={`decklist__suit ${red ? 'decklist__suit--red' : ''}`} title={SUIT_LABEL[suit]}>
              {SUIT_SYMBOL[suit]}
            </span>
            <span className="decklist__cards">
              {cards.length === 0 && <em className="decklist__empty">aucune</em>}
              {cards.map((c) => (
                <span key={c.uid} className={`decklist__card ${red ? 'decklist__card--red' : ''}`}>
                  {cardValueLabel(c.value)}
                </span>
              ))}
            </span>
            <span className="decklist__count">{cards.length}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Les achats qui manipulent le deck : on choisit parmi les cartes tirées (`A3`). */
function CardPanel({ session, shop }: { session: Session; shop: ShopSession }) {
  const run = session.run
  const [picked, setPicked] = useState<number[]>([])
  const [suit, setSuit] = useState<Suit>('spades')

  const need = NEEDED[shop.option] ?? 0
  const toggle = (uid: number) =>
    setPicked((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : p.length >= need ? p : [...p, uid]))
  const ready = shop.option === 'recolor' ? true : picked.length === need

  return (
    <div className="shop__detail">
      <p className="shop__hint">
        {shop.option === 'recolor'
          ? 'Ces 5 cartes prendront la couleur que vous choisissez.'
          : `Choisissez ${need} carte${need > 1 ? 's' : ''} parmi les ${shop.cards.length} tirées.`}
      </p>
      <div className="hand hand--interactive">
        {shop.cards.map((card) => {
          const forbidden = shop.option === 'plusOneTwo' && !canPlusOne(run, card)
          return (
            <CardView
              key={card.uid}
              card={card}
              marked={picked.includes(card.uid)}
              onClick={forbidden || shop.option === 'recolor' ? undefined : () => toggle(card.uid)}
            />
          )
        })}
      </div>
      {shop.option === 'recolor' && (
        <div className="actions">
          {SUIT_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${suit === s ? 'btn--primary' : ''}`}
              onClick={() => setSuit(s)}
            >
              {SUIT_SYMBOL[s]} {SUIT_LABEL[s]}
            </button>
          ))}
        </div>
      )}
      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!ready}
          onClick={() =>
            session.runShopAction(() =>
              applyShopCards(run, shop, shop.option === 'recolor' ? { uids: [], suit } : { uids: picked }),
            )
          }
        >
          Valider
        </button>
        <button type="button" className="btn" onClick={() => session.closeShop()}>
          Annuler
        </button>
      </div>
    </div>
  )
}
