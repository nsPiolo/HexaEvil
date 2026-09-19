import { useEffect, useState, type PointerEvent } from 'react'
import { shop } from '../core/config'
import { riskOf, sortByRisk, type ShopItem } from '../core/shop/items'
import { artefactSlotsAt, findItem, maxAlteredFaces, resaleValue } from '../core/shop/shop'
import type { Inventory as Inv, PurchaseTarget } from '../core/shop/shop'
import type { Soul } from '../core/rules/race'
import { soulColor } from './souls'
import { personalityEffect, personalityName } from './messages'
import { PersonalityMark } from './PersonalityMark'
import { FaceChip } from './Inventory'
import { ItemArt } from './ItemArt'
import { MoneyGauge } from './MoneyGauge'
import { BOARD, HUD, ITEM_KINDS, RARITIES, SHOP, UI, fill } from './texts'
import { dieName } from './messages'
import { priceFor, rerollCostFor } from './useRace'

interface Props {
  vitrine: readonly ShopItem[]
  /** Âmes de la course : un masque se pose sur l'une d'elles, choisie ici (GDD §6.5). */
  souls: readonly Soul[]
  /** Faux tant qu'aucun pari n'est posé : la vitrine laisse place à un état vide narratif (spec 02/C2). */
  unlocked: boolean
  money: number
  /** Prix du cercle et mises en cours, pour la jauge. */
  price: number
  staked: number
  raceIndex: number
  inventory: Inv
  /** Marteau d'Héphaïstos : la forge offerte du cercle est-elle encore disponible ? */
  forgeFree: boolean
  /** Grade du stagiaire : il ouvre des emplacements d'artefacts et des faces de forge. */
  level: number
  /** Revente d'un artefact possédé (40 % du prix). */
  onSell: (id: string) => string | null
  /** Décapage d'une face forgée : elle retrouve sa valeur d'origine. */
  onDecap: (dieIndex: number, faceIndex: number) => string | null
  pending: string | null
  onBuy: (id: string, target?: PurchaseTarget) => string | null
  onCancel: () => void
  onReroll: () => void
  onLeave: () => void
  onGoToBets: () => void
  onClose?: () => void
}


export function ShopPanel({ vitrine, souls, unlocked, money, price, staked, raceIndex, inventory, forgeFree, level, onSell, onDecap, pending, onBuy, onCancel, onReroll, onLeave, onGoToBets, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  /** Objet dont le bouton affiche « Confirmer » (spec 04/C4) ; retombe seul après confirmResetMs. */
  const [confirming, setConfirming] = useState<string | null>(null)
  const pendingItem = pending ? vitrine.find((i) => i.id === pending) ?? null : null
  const slots = artefactSlotsAt(shop, level)
  const artefactsFull = inventory.artefacts.length >= slots
  const maxAltered = maxAlteredFaces(shop, level)
  const rerollCost = rerollCostFor(inventory)
  const sorted = sortByRisk(vitrine)

  useEffect(() => {
    if (confirming === null) return
    const t = setTimeout(() => setConfirming(null), shop.confirmResetMs)
    return () => clearTimeout(t)
  }, [confirming])

  const attempt = (id: string, target?: PurchaseTarget): void => {
    setConfirming(null)
    setError(onBuy(id, target))
  }

  /** Premier clic sur un achat important : on demande confirmation ; second clic : on achète. */
  const clickBuy = (item: ShopItem, itemPrice: number): void => {
    const needsConfirm = itemPrice >= shop.confirmThreshold || item.warning !== null
    if (needsConfirm && confirming !== item.id) {
      setConfirming(item.id)
      return
    }
    attempt(item.id)
  }

  /** Un clic ailleurs qu'on le bouton en attente annule la confirmation. */
  const onPointerDown = (e: PointerEvent<HTMLElement>): void => {
    if (confirming === null) return
    const target = e.target as HTMLElement
    if (!target.closest(`[data-confirm="${confirming}"]`)) setConfirming(null)
  }

  const header = (
    <header className="bp-head">
      <div>
        <h2 className="serif">{HUD.shop}</h2>
        <p className="muted">{unlocked ? UI.shop.afterBets : UI.shop.till}</p>
      </div>
      <div className="bp-money">
        <span className="money">
          {money} <span className="money-unit">pièces</span>
        </span>
        <MoneyGauge money={money} price={price} staked={staked} />
      </div>
      {onClose && (
        <button type="button" className="bp-close" onClick={onClose} aria-label={HUD.close}>
          ×
        </button>
      )}
    </header>
  )

  if (!unlocked) {
    return (
      <section className="shop" aria-label={HUD.shop}>
        {header}
        <div className="shop-empty">
          <p>{SHOP.emptyState}</p>
          <button type="button" className="btn btn-primary" onClick={onGoToBets}>
            {SHOP.goToBets}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="shop" aria-label={HUD.shop} onPointerDown={onPointerDown}>
      {header}

      {pendingItem && (
        <div className="shop-target">
          <h3>
            {pendingItem.name} —{' '}
            {pendingItem.kind === 'artefact'
              ? SHOP.replaceArtefact
              : pendingItem.kind === 'personality'
                ? pendingItem.personality === null
                  ? SHOP.pickSoulStrip
                  : SHOP.pickSoul
                : pendingItem.kind === 'die'
                  ? UI.shop.pickDie
                  : UI.shop.pickFace}
          </h3>
          {/* Emplacements pleins : on choisit l'artefact sacrifié. Il est détruit, pas revendu. */}
          {pendingItem.kind === 'artefact' && (
            <>
              <p className="small muted">{SHOP.replaceArtefactWarning}</p>
              <div className="shop-artefacts">
                {inventory.artefacts.map((id) => (
                  <button key={id} type="button" className="btn" onClick={() => attempt(pendingItem.id, { dieIndex: 0, replaceArtefact: id })}>
                    {findItem(shop, id).name}
                  </button>
                ))}
              </div>
            </>
          )}
          {/* Masque : on choisit l'âme. Celles qui portent déjà quelque chose le disent —
              poser un masque dessus remplace, le masque brisé ne peut viser qu'elles. */}
          {pendingItem.kind === 'personality' && (
            <>
              <p className="small muted">{pendingItem.personality === null ? SHOP.stripWarning : SHOP.markWarning}</p>
              <div className="shop-souls">
                {souls.map((soul) => {
                  const worn = inventory.personalities[soul.id] ?? null
                  const strip = pendingItem.personality === null
                  const refused = strip ? worn === null : worn === pendingItem.personality
                  return (
                    <button
                      key={soul.id}
                      type="button"
                      className="btn shop-soul"
                      disabled={refused}
                      style={{ ['--soul' as string]: soulColor(soul.id) }}
                      onClick={() => attempt(pendingItem.id, { dieIndex: 0, soul: soul.id })}
                      title={worn ? fill(BOARD.personality, { name: personalityName(worn), effect: personalityEffect(worn) }) : undefined}
                    >
                      <span className="shop-soul-name">{soul.name}</span>
                      <span className="small muted">
                        {worn ? (
                          <>
                            <PersonalityMark personality={worn} /> {personalityName(worn)}
                          </>
                        ) : (
                          SHOP.soulPlain
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {pendingItem.kind === 'die' && <p className="small muted">{SHOP.compare}</p>}
          {pendingItem.kind !== 'artefact' && pendingItem.kind !== 'personality' && (
          <div className="shop-dice">
            {inventory.dice.map((d, di) => (
              <div key={di} className="shop-die">
                <span className="inv-die-name">
                  n°{di + 1} · {dieName(d.kind)}
                </span>
                {pendingItem.kind === 'die' ? (
                  <>
                    <span className="shop-compare">
                      <span className="shop-faces-preview">
                        {d.faces.map((f, fi) => (
                          <FaceChip key={fi} face={f} />
                        ))}
                      </span>
                      <span className="shop-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="shop-faces-preview shop-faces-new">
                        {pendingItem.faces.map((v, fi) => (
                          <FaceChip key={fi} face={{ value: v, effect: null, altered: null }} />
                        ))}
                      </span>
                    </span>
                    <button type="button" className="btn" onClick={() => attempt(pendingItem.id, { dieIndex: di })}>
                      {SHOP.replace}
                    </button>
                  </>
                ) : (
                  <div className="shop-faces">
                    {d.faces.map((f, fi) => (
                      <button
                        key={fi}
                        type="button"
                        className="face-btn"
                        disabled={!!f.altered}
                        title={f.altered ? UI.shop.alreadyForged : undefined}
                        onClick={() => attempt(pendingItem.id, { dieIndex: di, faceIndex: fi })}
                      >
                        <FaceChip face={f} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
          {pendingItem.kind === 'forge' && <p className="small muted">{fill(SHOP.forgeLimit, { n: maxAltered })}</p>}
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
        </div>
      )}

      {!pendingItem && (inventory.artefacts.length > 0 || inventory.dice.some((d) => d.faces.some((f) => f.altered))) && (
        /* Atelier : ce que le joueur possède déjà et peut défaire — revendre un artefact
           (artefacts.md) ou décaper une face forgée (forge.md). Séparé de la vitrine : on n'y
           achète rien de neuf, on fait de la place. */
        <details className="shop-workshop">
          <summary>
            {fill(SHOP.workshop, { n: inventory.artefacts.length, slots })}
          </summary>
          {inventory.artefacts.length > 0 && (
            <div className="shop-artefacts">
              {inventory.artefacts.map((id) => {
                const back = resaleValue(shop, priceFor(findItem(shop, id), raceIndex, inventory, false))
                return (
                  <button key={id} type="button" className="btn" onClick={() => setError(onSell(id))} title={fill(SHOP.sellTitle, { back })}>
                    {fill(SHOP.sell, { name: findItem(shop, id).name, back })}
                  </button>
                )
              })}
            </div>
          )}
          <div className="shop-dice">
            {inventory.dice.map((d, di) =>
              d.faces.some((f) => f.altered) ? (
                <div key={di} className="shop-die">
                  <span className="inv-die-name">
                    n°{di + 1} · {dieName(d.kind)}
                  </span>
                  <div className="shop-faces">
                    {d.faces.map((f, fi) =>
                      f.altered ? (
                        <button key={fi} type="button" className="face-btn" onClick={() => setError(onDecap(di, fi))} title={fill(SHOP.decapTitle, { cost: shop.forge.decapCost })}>
                          <FaceChip face={f} />
                        </button>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </details>
      )}

      {!pendingItem && (
        <div className="vitrine">
          {sorted.length === 0 && <p className="muted shop-empty-vitrine">{SHOP.emptyVitrine}</p>}
          {sorted.map((item) => {
            const itemPrice = priceFor(item, raceIndex, inventory, forgeFree)
            const blocked = money < itemPrice || (item.kind === 'artefact' && artefactsFull)
            const risk = riskOf(item)
            const confirm = confirming === item.id
            return (
              <article key={item.id} className={`shop-item kind-${item.kind} rarity-${item.rarity} risk-${risk}`}>
                <div className={`shop-risk risk-${risk}`} title={SHOP.riskTitle[risk]}>
                  {SHOP.risk[risk]}
                </div>
                <header>
                  <span className="shop-kind">{ITEM_KINDS[item.kind]}</span>
                  <span className={`shop-rarity rarity-${item.rarity}`}>{RARITIES[item.rarity]}</span>
                  {/* Emplacement réservé au LockBadge (déblocage par rang, à venir avec les personnalités). */}
                </header>
                <div className="shop-body">
                  <ItemArt id={item.id} className="shop-art" />
                  <div className="shop-text">
                    <h3>{item.name}</h3>
                    <p className="small">{item.description}</p>
                  </div>
                </div>
                {item.warning && <p className="small shop-warning">⚠ {item.warning}</p>}
                {item.kind === 'die' && (
                  <p className="shop-faces-preview">
                    {item.faces.map((v, i) => (
                      <FaceChip key={i} face={{ value: v, effect: null, altered: null }} />
                    ))}
                  </p>
                )}
                <footer>
                  <span className={'shop-price' + (money < itemPrice ? ' shop-price-over' : '')}>
                    <span className="shop-price-n">{itemPrice}</span> pièces
                  </span>
                  <button
                    type="button"
                    className={'btn btn-primary' + (confirm ? ' btn-confirm' : '')}
                    data-confirm={item.id}
                    data-state={confirm ? 'confirm' : 'buy'}
                    disabled={blocked}
                    onClick={() => clickBuy(item, itemPrice)}
                    title={item.kind === 'artefact' && artefactsFull ? UI.shop.slotsFull : confirm ? SHOP.confirmTitle : undefined}
                  >
                    {confirm ? fill(SHOP.confirm, { price: itemPrice }) : SHOP.buy}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <p className={'bet-refusal small' + (error ? ' bet-refusal-on' : '')}>{error ?? ''}</p>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onLeave}>
          Retour aux paris
        </button>
        <button type="button" className="btn" disabled={money < rerollCost || !!pendingItem} onClick={onReroll}>
          Renouveler la vitrine ({rerollCost})
        </button>
      </div>
    </section>
  )
}
