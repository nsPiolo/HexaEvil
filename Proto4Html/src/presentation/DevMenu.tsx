import { useState } from 'react'
import { config } from '../core/config'
import { DEV } from './texts'
import { type SessionCarry } from './useRace'

interface Props {
  /** État courant du run s'il y en a un (pour préremplir et garder l'inventaire). */
  carry: SessionCarry | null
  onApply: (carry: SessionCarry) => void
  onClose: () => void
}

/** Menu de développement : solde de pièces et saut à un cercle. Ouvert par le bouton « dev » ou Ctrl+Maj+D. */
export function DevMenu({ carry, onApply, onClose }: Props) {
  const per = config.run.racesPerCircle
  const [money, setMoney] = useState(String(carry?.money ?? config.economy.startingMoney))
  const [circle, setCircle] = useState(carry ? Math.floor(carry.raceIndex / per) + 1 : 1)
  const [race, setRace] = useState(carry ? (carry.raceIndex % per) + 1 : 1)
  const parsed = Number(money)
  const valid = Number.isFinite(parsed) && parsed >= 0

  return (
    <div className="popup-backdrop" onClick={onClose} role="presentation">
      <form
        className="popup dev-menu"
        role="dialog"
        aria-label={DEV.title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onApply({
            money: Math.round(parsed),
            inventory: carry?.inventory ?? { artefacts: [], dice: [] },
            raceIndex: (circle - 1) * per + (race - 1),
            lateBetCharges: carry?.lateBetCharges ?? 0,
          })
        }}
      >
        <h2>{DEV.title}</h2>
        <p className="muted small">{DEV.hint}</p>
        <label className="dev-field">
          <span>{DEV.money}</span>
          <input type="number" min={0} step={1} value={money} onChange={(e) => setMoney(e.target.value)} autoFocus />
        </label>
        <label className="dev-field">
          <span>{DEV.circle}</span>
          <select value={circle} onChange={(e) => setCircle(Number(e.target.value))}>
            {config.run.circles.map((c, i) => (
              <option key={c.name} value={i + 1}>
                {i + 1} — {c.name} ({c.price} pièces, {c.souls} âmes)
              </option>
            ))}
          </select>
        </label>
        <label className="dev-field">
          <span>{DEV.race}</span>
          <select value={race} onChange={(e) => setRace(Number(e.target.value))}>
            {Array.from({ length: per }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1 === per ? DEV.bossRace : `${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <div className="ranking-actions">
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {DEV.apply}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {DEV.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
