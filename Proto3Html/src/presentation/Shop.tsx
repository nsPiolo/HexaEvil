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
} from '../core/rules/run'
import type { Card, Suit } from '../core/rules/types'
import { CardView, DieInspector } from './bits'
import { cardValueLabel, EFFECT_HELP, EFFECT_LABEL, EFFECT_SYMBOL, SUIT_LABEL, SUIT_SYMBOL } from './labels'
import type { Session } from './session'

const OPTION_LABEL: Record<ShopOptionId, string> = {
  removeTwo: 'Retirer deux cartes',
  plusOneTwo: 'Ajouter +1 à deux cartes',
  clone: 'Cloner une carte',
  removeOne: 'Retirer une carte',
  recolor: 'Redéfinir la couleur de 5 cartes',
  engraveOne: 'Graver une face d’un dé',
  engraveAll: 'Graver une face de chaque dé',
}

const OPTION_HELP: Record<ShopOptionId, string> = {
  removeTwo: 'Parmi 10 cartes tirées au hasard dans votre deck.',
  plusOneTwo: 'Parmi 10 cartes tirées au hasard. Un As ne peut pas monter.',
  clone: 'Parmi 10 cartes tirées au hasard : le deck grossit d’une carte.',
  removeOne: 'Parmi 10 cartes tirées au hasard.',
  recolor: '5 cartes tirées au hasard, la couleur est choisie après les avoir vues.',
  engraveOne: 'Vous choisissez le dé, la face et ce qu’on y grave.',
  engraveAll: 'Une face sur chacun de vos dés.',
}

const NEEDED: Partial<Record<ShopOptionId, number>> = { removeTwo: 2, removeOne: 1, plusOneTwo: 2, clone: 1 }

const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export function Shop({ session }: { session: Session }) {
  const run = session.run
  const options = Object.keys(run.cfg.shop) as ShopOptionId[]

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

      {session.shop ? (
        <ShopDetail session={session} />
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
        <DiceList session={session} />
        <div className="inspector-card">
          <h3>Votre deck — {run.deck.length} cartes</h3>
          <DeckList deck={run.deck} />
        </div>
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

/** Les dés, toutes faces listées ; survoler une face éclaire son opposée (`F2`). */
function DiceList({ session }: { session: Session }) {
  const run = session.run
  const ladder = [...new Set(run.cfg.circles.map((c) => c.dieFaces))].sort((a, b) => a - b)
  const [hover, setHover] = useState<{ die: number; face: number } | null>(null)
  return (
    <div className="inspector-card">
      <h3>Vos dés</h3>
      {run.dice.map((die, i) => (
        <div key={i} className="inspector-row">
          <span className="inspector-row__name">Dé {i + 1}</span>
          <DieInspector
            die={die}
            engraved={engravedFaces(die, run.cfg.dice.startingFaces, ladder)}
            hovered={hover?.die === i ? hover.face : null}
            onHover={(face) => setHover(face === null ? null : { die: i, face })}
          />
        </div>
      ))}
      <p className="inspector-card__note">Survolez une face : son opposée s’allume — c’est elle que « Retourner un dé » révèle.</p>
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

function ShopDetail({ session }: { session: Session }) {
  const shop = session.shop
  const run = session.run
  const [picked, setPicked] = useState<number[]>([])
  const [suit, setSuit] = useState<Suit>('spades')
  const [orders, setOrders] = useState<EngraveOrder[]>([])
  const [face, setFace] = useState<number | null>(null)
  const [pickedDie, setPickedDie] = useState<number | null>(null)
  const [offers, setOffers] = useState<EngraveOption[]>([])
  const ladder = [...new Set(run.cfg.circles.map((c) => c.dieFaces))].sort((a, b) => a - b)
  if (!shop) return null

  const isEngrave = shop.option === 'engraveOne' || shop.option === 'engraveAll'
  if (isEngrave) {
    const total = shop.option === 'engraveOne' ? 1 : run.dice.length
    const dieIndex = shop.option === 'engraveOne' ? (pickedDie ?? null) : orders.length
    const done = orders.length >= total
    const active = dieIndex !== null && dieIndex < run.dice.length ? run.dice[dieIndex] : null

    return (
      <div className="shop__detail">
        <p className="shop__hint">
          {done
            ? 'Prêt à graver.'
            : dieIndex === null
              ? 'Choisissez le dé à graver.'
              : face === null
                ? `Dé ${dieIndex + 1} — choisissez la face à remplacer.`
                : `Dé ${dieIndex + 1} — le graveur ne propose que ceci.`}
        </p>

        {shop.option === 'engraveOne' && dieIndex === null && (
          <div className="actions">
            {run.dice.map((_, i) => (
              <button key={i} type="button" className="btn" onClick={() => setPickedDie(i)}>
                Dé {i + 1}
              </button>
            ))}
          </div>
        )}

        {active && !done && face === null && (
          <DieInspector
            die={active}
            engraved={engravedFaces(active, run.cfg.dice.startingFaces, ladder)}
            onPick={(i) => {
              setFace(i)
              setOffers(engraveOptions(run, dieIndex as number, i, session.rng))
            }}
          />
        )}

        {active && !done && face !== null && (
          <div className="offers">
            {offers.length === 0 && <p className="shop__hint">Rien à proposer sur cette face.</p>}
            {offers.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`offer ${o.kind === 'effect' ? 'offer--special' : ''}`}
                onClick={() => {
                  const order = { dieIndex: dieIndex as number, faceIndex: face, option: o }
                  setOrders(shop.option === 'engraveOne' ? [order] : [...orders, order])
                  setFace(null)
                  setOffers([])
                }}
              >
                {o.kind === 'effect' ? (
                  <>
                    <span className="offer__value">{active.faces[face]?.value}</span>
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
                      La face passe de {active.faces[face]?.value} à {o.value}. Son effet éventuel est conservé.
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="actions">
          {done && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                session.runShopAction(() => applyEngrave(run, shop.option as 'engraveOne' | 'engraveAll', orders))
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
