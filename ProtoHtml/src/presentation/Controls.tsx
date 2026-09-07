/**
 * Catalogue de pose (`T6`, `T7`), déroulé pas-à-pas (`U5`) et rechargement de
 * la configuration sans recompiler (`G4`).
 */
import { useState } from 'react'
import { tileType } from '../core/rules/recipes'
import { RecipeList } from './RecipeList'
import type { GameState, RoundAction, TileTypeId } from '../core/rules/types'
import { SPEEDS, type Speed } from './useGame'

type Props = {
  state: GameState
  ticksThisRound: number
  pendingType: TileTypeId | undefined
  actions: readonly RoundAction[]
  canUndo: boolean
  playing: boolean
  speed: Speed
  configText: string
  configError: string | undefined
  onPendingType: (id: TileTypeId) => void
  onDraw: () => void
  onPass: () => void
  onStep: () => void
  onRound: () => void
  onFinish: () => void
  onSpeed: (speed: Speed) => void
  onUndo: () => void
  onReset: () => void
  onApplyConfig: (text: string) => boolean
  onConfigText: (text: string) => void
}

const ACTION_LABELS: Record<RoundAction, string> = {
  place: 'pose',
  draw: 'pioche',
  move: 'déplacement',
  pass: 'tour passé',
}

export const Controls = ({
  state,
  ticksThisRound,
  pendingType,
  actions,
  canUndo,
  playing,
  speed,
  configText,
  configError,
  onPendingType,
  onDraw,
  onPass,
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
  const canAct = actions.length > 0
  const picked = pendingType === undefined ? undefined : tileType(state.config, pendingType)

  return (
    <section className="controls">
      <div className="controls__row">
        <button type="button" onClick={onStep} disabled={over}>
          1 Tick
        </button>
        <button type="button" onClick={onRound} disabled={over}>
          Manche ({ticksThisRound} Tick{ticksThisRound > 1 ? 's' : ''})
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
        <h3>
          Action de la Manche
          <span className="controls__action-state">
            {over
              ? '—'
              : state.action !== undefined
                ? `dépensée : ${ACTION_LABELS[state.action]}`
                : state.phase === 'placement'
                  ? 'à jouer'
                  : 'Manche en cours'}
          </span>
        </h3>
        <div className="controls__row">
          <button type="button" onClick={onDraw} disabled={!actions.includes('draw')}>
            Piocher ({state.deck.length})
          </button>
          <button type="button" onClick={onPass} disabled={!actions.includes('pass')}>
            Passer
          </button>
        </div>
        <p className="controls__hint">
          Une seule action par Manche : poser, piocher, déplacer une Tuile, ou passer (A1).
          Réorganiser les Sorties reste gratuit. Une Tuile est piochée
          <strong> automatiquement</strong> à chaque tour, tant que la main n’est pas pleine (A7).
        </p>
      </div>

      <div className="controls__block">
        <h3>
          Main ({state.hand.length}/{state.config.handMax})
          <span className="controls__action-state" title="Germe du tirage — recopie-la en configuration pour rejouer cette partie">
            germe {state.seed}
          </span>
        </h3>
        {state.hand.length === 0 ? (
          <p className="controls__hint">
            Main vide : pioche pour reprendre des Tuiles ({state.deck.length} en pioche).
          </p>
        ) : (
          <div className="catalog">
            {[...new Set(state.hand)].map((id) => {
              const type = tileType(state.config, id)
              const count = state.hand.filter((h) => h === id).length
              return (
                <button
                  key={id}
                  type="button"
                  className={`catalog__item ${pendingType === id ? 'catalog__item--on' : ''}`}
                  disabled={!canAct}
                  onClick={() => onPendingType(id)}
                  title={`${type.name} — ${type.maxExits} Sortie(s) max`}
                >
                  <span className="catalog__glyph">{type.glyph}</span>
                  <span className="catalog__name">{type.name}</span>
                  {count > 1 && <span className="catalog__count">×{count}</span>}
                </button>
              )
            })}
          </div>
        )}
        {picked && (
          <div className="catalog__detail">
            <h4>
              {picked.glyph} {picked.name}
              <span className="catalog__exits">
                {picked.maxExits} Sortie{picked.maxExits > 1 ? 's' : ''} max
              </span>
            </h4>
            <RecipeList config={state.config} type={picked} />
          </div>
        )}
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
