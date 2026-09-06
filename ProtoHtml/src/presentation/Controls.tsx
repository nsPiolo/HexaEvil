/**
 * Catalogue de pose (`T6`, `T7`), déroulé pas-à-pas (`U5`) et rechargement de
 * la configuration sans recompiler (`G4`).
 */
import { useState } from 'react'
import { DIRECTION_NAMES, directionName } from '../core/hex/hexCoord'
import { tileType } from '../core/rules/recipes'
import type { GameState, TileTypeId } from '../core/rules/types'

type Props = {
  state: GameState
  pendingType: TileTypeId
  pendingExits: readonly number[]
  selectedIsTile: boolean
  canUndo: boolean
  configText: string
  configError: string | undefined
  onPendingType: (id: TileTypeId) => void
  onToggleExit: (direction: number) => void
  onStep: () => void
  onRound: () => void
  onUndo: () => void
  onReset: () => void
  onApplyConfig: (text: string) => boolean
  onConfigText: (text: string) => void
}

export const Controls = ({
  state,
  pendingType,
  pendingExits,
  selectedIsTile,
  canUndo,
  configText,
  configError,
  onPendingType,
  onToggleExit,
  onStep,
  onRound,
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
          Sorties de la prochaine pose :{' '}
          <strong>{pendingExits.length === 0 ? 'aucune' : pendingExits.map(directionName).join(', ')}</strong>
          {selectedIsTile && ' — désélectionne la Tuile pour les régler'}
        </p>
        <div className="exits">
          {DIRECTION_NAMES.map((name, direction) => (
            <button
              key={name}
              type="button"
              className={`exit ${pendingExits.includes(direction) ? 'exit--on' : ''}`}
              disabled={selectedIsTile}
              onClick={() => onToggleExit(direction)}
            >
              {name}
            </button>
          ))}
        </div>
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
