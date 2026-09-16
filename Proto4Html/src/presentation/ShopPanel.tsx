import { useEffect, useState, type PointerEvent } from 'react'
import { shop } from '../core/config'
import { riskOf, sortByRisk, type ShopItem } from '../core/shop/items'
import type { Inventory as Inv, PurchaseTarget } from '../core/shop/shop'
import { FaceChip } from './Inventory'
import { MoneyGauge } from './MoneyGauge'
import { SHOP, fill } from './texts'
import { priceFor } from './useRace'

interface Props {
  vitrine: readonly ShopItem[]
  /** Faux tant qu'aucun pari n'est posé : la vitrine laisse place à un état vide narratif (spec 02/C2). */
  unlocked: boolean
  money: number
  /** Prix du cercle et mises en cours, pour la jauge. */
  price: number
  staked: number
  raceIndex: number
  inventory: Inv
  pending: string | null
  onBuy: (id: string, target?: PurchaseTarget) => string | null
  onCancel: () => void
  onReroll: () => void
  onLeave: () => void
  onGoToBets: () => void
  onClose?: () => void
}

const KIND_LABEL = { artefact: 'Artefact', die: 'Dé', forge: 'Forge' } as const
const RARITY_LABEL = { common: 'commun', rare: 'rare', legendary: 'légendaire' } as const

export function ShopPanel({ vitrine, unlocked, money, price, staked, raceIndex, inventory, pending, onBuy, onCancel, onReroll, onLeave, onGoToBets, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  /** Objet dont le bouton affiche « Confirmer » (spec 04/C4) ; retombe seul après confirmResetMs. */
  const [confirming, setConfirming] = useState<string | null>(null)
  const pendingItem = pending ? vitrine.find((i) => i.id === pending) ?? null : null
  const hintValue = pendingItem?.kind === 'forge' ? pendingItem.target : null
  const artefactsFull = inventory.artefacts.length >= shop.artefactSlots
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
        <h2 className="serif">Boutique</h2>
        <p className="muted">{unlocked ? 'Paris posés : ce qui reste est à dépenser… ou à garder.' : 'Le stagiaire tient la caisse.'}</p>
      </div>
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
  )

  if (!unlocked) {
    return (
      <section className="shop" aria-label="Boutique">
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
    <section className="shop" aria-label="Boutique" onPointerDown={onPointerDown}>
      {header}

      {pendingItem && (
        <div className="shop-target">
          <h3>
            {pendingItem.name} — {pendingItem.kind === 'die' ? 'quel dé remplacer ?' : 'quelle face forger ?'}
          </h3>
          {pendingItem.kind === 'die' && <p className="small muted">{SHOP.compare}</p>}
          <div className="shop-dice">
            {inventory.dice.map((d, di) => (
              <div key={di} className="shop-die">
                <span className="inv-die-name">
                  n°{di + 1} · {d.name}
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
                        className={'face-btn' + (f.value === hintValue && !f.altered ? ' face-btn-hint' : '')}
                        disabled={!!f.altered}
                        title={f.altered ? 'Déjà forgée' : f.value === hintValue ? 'Cible conseillée' : undefined}
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
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
        </div>
      )}

      {!pendingItem && (
        <div className="vitrine">
          {sorted.length === 0 && <p className="muted shop-empty-vitrine">{SHOP.emptyVitrine}</p>}
          {sorted.map((item) => {
            const itemPrice = priceFor(item, raceIndex)
            const blocked = money < itemPrice || (item.kind === 'artefact' && artefactsFull)
            const risk = riskOf(item)
            const confirm = confirming === item.id
            return (
              <article key={item.id} className={`shop-item kind-${item.kind} rarity-${item.rarity} risk-${risk}`}>
                <div className={`shop-risk risk-${risk}`} title={SHOP.riskTitle[risk]}>
                  {SHOP.risk[risk]}
                </div>
                <header>
                  <span className="shop-kind">{KIND_LABEL[item.kind]}</span>
                  <span className={`shop-rarity rarity-${item.rarity}`}>{RARITY_LABEL[item.rarity]}</span>
                  {/* Emplacement réservé au LockBadge (déblocage par rang, à venir avec les personnalités). */}
                </header>
                <h3>{item.name}</h3>
                <p className="small">{item.description}</p>
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
                    title={item.kind === 'artefact' && artefactsFull ? 'Emplacements pleins' : confirm ? SHOP.confirmTitle : undefined}
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
        <button type="button" className="btn" disabled={money < shop.rerollCost || !!pendingItem} onClick={onReroll}>
          Renouveler la vitrine ({shop.rerollCost})
        </button>
      </div>
    </section>
  )
}
