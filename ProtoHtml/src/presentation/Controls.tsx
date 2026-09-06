/**
 * Catalogue de pose (`T6`, `T7`), déroulé pas-à-pas (`U5`) et rechargement de
 * la configuration sans recompiler (`G4`).
 */
import { useState } from 'react'
import { tileType } from '../core/rules/recipes'
import type { GameState, TileTypeId } from '../core/rules/types'
import { SPEEDS, type Speed } from './useGame'

type Props = {
  state: GameState
  pendingType: TileTypeId
  canUndo: boolean
  playing: boolean
  speed: Speed
  configText: string
  configError: string | undefined
  onPendingType: (id: TileTypeId) => void
  onStep: () => void
  onRound: () => void
  onFinish: () => void
  onSpeed: (speed: Speed) => void
  onUndo: () => void
  onReset: () => void
  onApplyConfig: (text: string) => boolean
  onConfigText: (text: string) => void
}

export const Controls = ({
  state,
  pendingType,
  canUndo,
  playing,
  speed,
  configText,
  configError,
  onPendingType,
  onStep,
  onRound,
  onFinish,
  onSpeed,
  onUndo,
  onReset,
  onApplyConfig,
  onConfigText,
}: Props) => {
  const [showConfig, setShowConfig] = useState(false)
  const over = state.outcome !== 'ongoing'
  const placing = state.phase === 'placement' && !state.placedThisRound && !over

  return (
    <section className="controls">
      <div className="controls__row">
        <button type="button" onClick={onStep} disabled={over}>
          1 Tick
        </button>
        <button type="button" onClick={onRound} disabled={over}>
          Manche ({state.config.ticksPerRound} Ticks)
        </button>
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          Annuler
        </button>
        <button type="button" onClick={onReset}>
          Rejouer
        </button>
      </div>

      <div className="controls__row controls__row--speed">
        <span className="controls__label">Vitesse</span>
        {(Object.keys(SPEEDS) as Speed[]).map((name) => (
          <button
            key={name}
            type="button"
            className={`speed ${speed === name ? 'speed--on' : ''}`}
            onClick={() => onSpeed(name)}
          >
            {name}
          </button>
        ))}
        <button type="button" onClick={onFinish} disabled={over} title="Dérouler la partie entière">
          Fin
        </button>
      </div>
      {playing && <p className="controls__hint">Lecture en cours…</p>}

      <div className="controls__block">
        <h3>Catalogue {placing ? '' : '— pose indisponible'}</h3>
        <div className="catalog">
          {state.config.catalog.map((id) => {
            const type = tileType(state.config, id)
            return (
              <button
                key={id}
                type="button"
                className={`catalog__item ${pendingType === id ? 'catalog__item--on' : ''}`}
                disabled={!placing}
                onClick={() => onPendingType(id)}
                title={`${type.name} — ${type.maxExits} Sortie(s) max`}
              >
                <span className="catalog__glyph">{type.glyph}</span>
                <span className="catalog__name">{type.name}</span>
              </button>
            )
          })}
        </div>
        <p className="controls__hint">
          La Tuile est posée <strong>sans Sortie</strong> : clique ensuite un hexagone voisin pour
          l’orienter.
        </p>
      </div>

      <div className="controls__block">
        <button type="button" className="controls__toggle" onClick={() => setShowConfig((s) => !s)}>
          {showConfig ? '▾' : '▸'} Configuration ({state.config.tileTypes.length} types de Tuile)
        </button>
        {showConfig && (
          <>
            <p className="controls__hint">
              Un seul fichier règle tout le gameplay (`config/gameplay.json`). Le recharger relance la
              Rencontre.
            </p>
            <textarea
              className="config-editor"
              spellCheck={false}
              value={configText}
              onChange={(e) => onConfigText(e.target.value)}
            />
            <div className="controls__row">
              <button type="button" onClick={() => onApplyConfig(configText)}>
                Recharger et relancer
              </button>
            </div>
            {configError && <p className="controls__error">{configError}</p>}
          </>
        )}
      </div>
    </section>
  )
}
