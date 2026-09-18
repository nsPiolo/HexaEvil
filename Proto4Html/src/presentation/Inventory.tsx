import { config } from '../core/config'
import { fmtFace, type Face } from '../core/rules/dice'
import type { Inventory as Inv } from '../core/shop/shop'
import { ItemArt } from './ItemArt'
import { itemName } from './useRace'

/** Un signe par effet de face forgée : il se lit sur le dé, au lancer comme dans l'inventaire. */
const EFFECT_ICON: Record<NonNullable<Face['effect']>, string> = {
  gold: '✦',
  betSeal: '♠',
  mirror: '⧉',
  willOWisp: '✧',
  momentum: '»',
  leap: '⤴',
  explosive: '✸',
  magnet: '⊃',
  freeze: '❄',
}

export function FaceChip({ face, dim }: { face: Face; dim?: boolean }) {
  const cls = ['face']
  if (face.altered) cls.push('face-altered')
  if (face.value < 0) cls.push('face-neg')
  if (dim) cls.push('face-dim')
  return (
    <span className={cls.join(' ')} title={face.altered ? itemName(face.altered) : undefined}>
      {fmtFace(face)}
      {face.effect && <span className="face-effect">{EFFECT_ICON[face.effect]}</span>}
    </span>
  )
}

interface Props {
  inventory: Inv
  lateBetCharges: number
  compact?: boolean
}

/** Ce que le joueur possède : artefacts et dés, visible en boutique et pendant la course. */
export function Inventory({ inventory, lateBetCharges, compact }: Props) {
  return (
    <section className={'inventory' + (compact ? ' inventory-compact' : '')} aria-label="Inventaire">
      <div className="inv-group">
        <span className="bet-label">Artefacts ({inventory.artefacts.length}/{5})</span>
        <div className="inv-items">
          {inventory.artefacts.length === 0 && <span className="muted small">aucun</span>}
          {inventory.artefacts.map((id) => (
            <span key={id} className="inv-artefact" title={id}>
              <ItemArt id={id} className="inv-art" />
              {itemName(id)}
              {id === 'lateBet' && (
                <span className="artefact-charges">
                  {' '}
                  {lateBetCharges}/{config.artefacts.lateBet.chargesPerCircle}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="inv-group">
        <span className="bet-label">Dés Distance</span>
        <div className="inv-items">
          {inventory.dice.map((d, i) => (
            <span key={i} className="inv-die">
              <span className="inv-die-name">{d.name}</span>
              {d.faces.map((f, j) => (
                <FaceChip key={j} face={f} />
              ))}
              {d.costPerUse > 0 && <span className="muted small"> −{d.costPerUse}/usage</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
