import { useState } from 'react'
import { shop } from '../core/config'
import type { ShopItem } from '../core/shop/items'
import type { Inventory as Inv, PurchaseTarget } from '../core/shop/shop'
import { FaceChip } from './Inventory'
import { priceFor } from './useRace'

interface Props {
  vitrine: readonly ShopItem[]
  money: number
  raceIndex: number
  inventory: Inv
  pending: string | null
  onBuy: (id: string, target?: PurchaseTarget) => string | null
  onCancel: () => void
  onReroll: () => void
  onLeave: () => void
  onClose?: () => void
}

const KIND_LABEL = { artefact: 'Artefact', die: 'Dé', forge: 'Forge' } as const
const RARITY_LABEL = { common: 'commun', rare: 'rare', legendary: 'légendaire' } as const

export function ShopPanel({ vitrine, money, raceIndex, inventory, pending, onBuy, onCancel, onReroll, onLeave, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const pendingItem = pending ? vitrine.find((i) => i.id === pending) ?? null : null
  const hintValue = pendingItem?.kind === 'forge' ? pendingItem.target : null
  const artefactsFull = inventory.artefacts.length >= shop.artefactSlots

  const attempt = (id: string, target?: PurchaseTarget): void => {
    setError(onBuy(id, target))
  }

  return (
    <section className="shop" aria-label="Boutique">
      <header className="bp-head">
        <div>
          <h2 className="serif">Boutique</h2>
          <p className="muted">Paris posés : ce qui reste est à dépenser… ou à garder.</p>
        </div>
        <span className="money">
          {money} <span className="money-unit">pièces</span>
        </span>
        {onClose && (
          <button type="button" className="bp-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        )}
      </header>

      {pendingItem && (
        <div className="shop-target">
          <h3>
            {pendingItem.name} — {pendingItem.kind === 'die' ? 'quel dé remplacer ?' : 'quelle face forger ?'}
          </h3>
          <div className="shop-dice">
            {inventory.dice.map((d, di) => (
              <div key={di} className="shop-die">
                <span className="inv-die-name">
                  n°{di + 1} · {d.name}
                </span>
                {pendingItem.kind === 'die' ? (
                  <button type="button" className="btn" onClick={() => attempt(pendingItem.id, { dieIndex: di })}>
                    Remplacer ce dé ({d.faces.map((f) => (f.value > 0 ? `+${f.value}` : f.value)).join(' ')})
                  </button>
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
          {vitrine.length === 0 && <p className="muted">Vitrine vide.</p>}
          {vitrine.map((item) => {
            const price = priceFor(item, raceIndex)
            const blocked = money < price || (item.kind === 'artefact' && artefactsFull)
            return (
              <article key={item.id} className={`shop-item kind-${item.kind} rarity-${item.rarity}`}>
                <header>
                  <span className="shop-kind">{KIND_LABEL[item.kind]}</span>
                  <span className={`shop-rarity rarity-${item.rarity}`}>{RARITY_LABEL[item.rarity]}</span>
                </header>
                <h3>{item.name}</h3>
                <p className="small">{item.description}</p>
                {item.kind === 'die' && (
                  <p className="shop-faces-preview">
                    {item.faces.map((v, i) => (
                      <FaceChip key={i} face={{ value: v, effect: null, altered: null }} />
                    ))}
                  </p>
                )}
                <footer>
                  <span className={'shop-price' + (money < price ? ' shop-price-over' : '')}>{price} pièces</span>
                  <button type="button" className="btn btn-primary" disabled={blocked} onClick={() => attempt(item.id)} title={item.kind === 'artefact' && artefactsFull ? 'Emplacements pleins' : undefined}>
                    Acheter
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
