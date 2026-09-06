/**
 * Démarrage : la configuration livrée est validée **avant** de monter le jeu.
 * Si elle est invalide, on affiche l'erreur et on laisse la corriger sur place
 * plutôt que de planter sur une page blanche (`G1`, `G4`).
 */
import { useMemo, useState } from 'react'
import rawGameplay from '../config/gameplay.json'
import { parseConfig } from './core/config/load'
import type { GameConfig } from './core/rules/types'
import { Game } from './presentation/Game'

type Boot = { ok: true; config: GameConfig } | { ok: false; error: string }

const boot = (text: string): Boot => {
  try {
    return { ok: true, config: parseConfig(JSON.parse(text)) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

const shippedText = JSON.stringify(rawGameplay, null, 2)

export default function App() {
  const [text, setText] = useState(shippedText)
  const [attempt, setAttempt] = useState(0)
  // Ne revalide qu'à la demande : on ne veut pas d'erreur à chaque frappe.
  const state = useMemo(() => boot(text), [attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.ok) return <Game config={state.config} configText={text} />

  return (
    <div className="app app--boot">
      <header className="app__header">
        <div>
          <h1>Enfers — proto « l’Escalier »</h1>
          <p className="app__subtitle">
            La configuration ne peut pas être chargée. Corrige-la ci-dessous puis recharge.
          </p>
        </div>
      </header>
      <p className="controls__error">{state.error}</p>
      <textarea
        className="config-editor config-editor--boot"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="controls__row">
        <button type="button" onClick={() => setAttempt((a) => a + 1)}>
          Recharger
        </button>
        <button
          type="button"
          onClick={() => {
            setText(shippedText)
            setAttempt((a) => a + 1)
          }}
        >
          Revenir au fichier livré
        </button>
      </div>
    </div>
  )
}
