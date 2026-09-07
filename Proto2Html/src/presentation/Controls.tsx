/** Contrôles — règles U9 (pas-à-pas, rejeu par seed), G5 (rechargement), M4 (lots). */

import { useState } from 'react'
import type { GameApi } from './useGame'

export function Controls({ api }: { readonly api: GameApi }) {
  const { config, state, mustPass, reset, pass, stepAi, runAiTurns, runBatch, applyConfigText, playback, locked } = api
  const [seed, setSeed] = useState(String(config.seed))
  const [text, setText] = useState(api.configText)
  const [open, setOpen] = useState(false)
  const finished = state.outcome !== null || locked
  // I9 : un camp sans profil d'IA est joué à la main — la boucle ne peut pas
  // jouer pour lui, autant le dire plutôt que de s'arrêter en silence.
  const activeIsAi = config.ai[state.activeSide] !== null
  const bothAi = config.ai.player !== null && config.ai.demon !== null

  return (
    <section className="panel controls">
      <h2>Contrôles</h2>
      <div className="row">
        <button type="button" onClick={stepAi} disabled={finished || !activeIsAi}>
          Coup de l’IA
        </button>
        <button type="button" onClick={() => runAiTurns(2)} disabled={finished || !bothAi}>
          Une manche
        </button>
        <button type="button" onClick={() => runAiTurns(400)} disabled={finished || !bothAi}>
          Jusqu’à la fin
        </button>
        <button type="button" onClick={pass} disabled={finished || !mustPass}>
          Passer
        </button>
      </div>
      <p className="muted small">
        {bothAi
          ? 'Les deux camps sont pilotés par l’IA (I9) : l’enchaînement automatique est disponible.'
          : `Camp joué à la main : ${config.ai.player === null ? 'Joueur' : 'Démon'}. ` +
            'L’enchaînement automatique demande une IA des deux côtés (ai.player dans la configuration).'}
      </p>
      {/* U16 : vitesse de l'animation, et raccourci pour la couper. */}
      <div className="row speed">
        <label htmlFor="speed">Vitesse ×{playback.speed.toFixed(1)}</label>
        <input
          id="speed"
          type="range"
          min={0.25}
          max={4}
          step={0.25}
          value={playback.speed}
          onChange={(e) => playback.setSpeed(Number(e.target.value))}
        />
        <button type="button" onClick={playback.skip} disabled={!playback.playing}>
          Passer l’animation
        </button>
      </div>
      <div className="row">
        <label>
          seed{' '}
          <input value={seed} onChange={(e) => setSeed(e.target.value)} size={5} />
        </label>
        <button type="button" onClick={() => reset(Number(seed) || 0)}>
          Rejouer (U9)
        </button>
        <button type="button" onClick={() => runBatch(20)}>
          Lot de 20 (M4)
        </button>
      </div>
      <p className="muted small">
        Règles en vigueur&nbsp;: soin {config.upkeepHeal}/manche
        {config.upkeepHealsKing ? '' : ', Roi non soigné'}, main {config.handSize}, Roi{' '}
        {config.tileTypes.get('N00')?.force}/{config.tileTypes.get('N00')?.shields} boucliers.
      </p>
      <button type="button" className="link" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} Configuration (G5)
      </button>
      {open && (
        <div className="config-editor">
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={16} />
          <button
            type="button"
            onClick={() => {
              api.setConfigText(text)
              applyConfigText(text)
            }}
          >
            Recharger sans recompiler
          </button>
        </div>
      )}
    </section>
  )
}
