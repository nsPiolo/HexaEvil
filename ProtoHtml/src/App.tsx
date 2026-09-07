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

/**
 * Le texte du fichier, relu **à chaque rendu**. Il ne doit pas être figé dans un
 * `useState` : le Fast Refresh de Vite conserve l'état des hooks quand le module
 * est rechargé, donc une modification de `config/gameplay.json` resterait
 * invisible pour la partie en cours — un piège vicieux quand tout le réglage vit
 * dans ce fichier (`G1`, `G4`).
 */
const fileText = (): string => JSON.stringify(rawGameplay, null, 2)

export default function App() {
  const shipped = fileText()
  /** Texte corrigé à la main sur l'écran d'erreur ; sinon, celui du fichier. */
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)
  const text = draft ?? shipped
  const state = useMemo(() => boot(text), [text, attempt])
  const setText = setDraft

  // `key` : une modification du fichier remonte le jeu, donc relance la partie
  // avec les nouvelles valeurs (germe comprise, `A8`).
  if (state.ok) return <Game key={text} config={state.config} configText={text} />

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
            setDraft(undefined)
            setAttempt((a) => a + 1)
          }}
        >
          Revenir au fichier livré
        </button>
      </div>
    </div>
  )
}
