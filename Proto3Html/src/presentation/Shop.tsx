/** Boutique entre deux parties (`A1`) et inspecteurs de deck et de dés (`U9`, `U10`). */

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
  engraveOne: 'Vous choisissez le dé, la face et la valeur.',
  engraveAll: 'Une face sur chacun des trois dés.',
}

const NEEDED: Partial<Record<ShopOptionId, number>> = { removeTwo: 2, removeOne: 1, plusOneTwo: 2, clone: 1 }

export function Shop({ session }: { session: Session }) {
  const run = session.run
  const ladder = [...new Set(run.cfg.circles.map((c) => c.dieFaces))].sort((a, b) => a - b)
  const options = Object.keys(run.cfg.shop) as ShopOptionId[]

  return (
    <div className="shop">
      <div className="shop__head">
        <h2>Boutique</h2>
        <div className="shop__wallet">
          <span>
            <strong>{run.money}</strong> d’argent
          </span>
          <span>
            <strong>{run.forgePoints}</strong> point{run.forgePoints > 1 ? 's' : ''} de forge
          </span>
          <span>
            deck : <strong>{run.deck.length}</strong> cartes
          </span>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => session.beginMatch()}>
          Partie suivante
        </button>
      </div>

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
                className={`option ${blocked ? 'option--blocked' : ''}`}
                disabled={blocked !== null}
                onClick={() => session.openShop(id)}
              >
                <span className="option__title">{OPTION_LABEL[id]}</span>
                <span className="option__help">{OPTION_HELP[id]}</span>
                <span className="option__cost">
                  {cost} {currency === 'money' ? 'd’argent' : `point${cost > 1 ? 's' : ''} de forge`}
                </span>
                {blocked && <span className="option__blocked">{blocked}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="inspectors">
        <div className="inspector-card">
          <h3>Vos dés</h3>
          {run.dice.map((die, i) => (
            <div key={i} className="inspector-row">
              <span>Dé {i + 1}</span>
              <DieInspector die={die} engraved={engravedFaces(die, run.cfg.dice.startingFaces, ladder)} />
            </div>
          ))}
        </div>
        <div className="inspector-card">
          <h3>Votre deck</h3>
          <DeckSummary deck={run.deck} />
        </div>
      </div>
    </div>
  )
}

function DeckSummary({ deck }: { deck: readonly Card[] }) {
  const byValue = new Map<number, number>()
  const bySuit = new Map<Suit, number>()
  for (const c of deck) {
    byValue.set(c.value, (byValue.get(c.value) ?? 0) + 1)
    bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1)
  }
  const values = [...byValue.entries()].sort((a, b) => a[0] - b[0])
  return (
    <>
      <div className="deck-row">
        {values.map(([v, n]) => (
          <span key={v} className={`deck-chip ${n > 4 ? 'deck-chip--many' : ''}`}>
            {cardValueLabel(v)} <em>×{n}</em>
          </span>
        ))}
      </div>
      <div className="deck-row">
        {[...bySuit.entries()].map(([s, n]) => (
          <span key={s} className="deck-chip">
            {SUIT_SYMBOL[s]} <em>×{n}</em>
          </span>
        ))}
      </div>
    </>
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
                : `Dé ${dieIndex + 1} — le graveur ne propose que ces valeurs.`}
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
          <div className="inspector inspector--interactive">
            {active.faces.map((f, i) => (
              <button
                key={i}
                type="button"
                className="inspector__face inspector__face--btn"
                onClick={() => {
                  setFace(i)
                  setOffers(engraveOptions(run, dieIndex as number, i, session.rng))
                }}
              >
                {f.value}
                {f.effect && <em className="inspector__effect">{EFFECT_SYMBOL[f.effect]}</em>}
              </button>
            ))}
          </div>
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
          {(['diamonds', 'hearts', 'spades', 'clubs'] as Suit[]).map((s) => (
            <button key={s} type="button" className={`btn ${suit === s ? 'btn--primary' : ''}`} onClick={() => setSuit(s)}>
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
