import type { GameConfig } from '../core/rules/types'
import { BoardView } from './BoardView'
import { Controls } from './Controls'
import { LogView } from './LogView'
import { MetricsPanel } from './MetricsPanel'
import { TileInspector } from './TileInspector'
import { useAnimation } from './useAnimation'
import { useGame } from './useGame'

type Props = { config: GameConfig; configText: string }

export const Game = ({ config, configText }: Props) => {
  const game = useGame(config, configText)
  const { state } = game
  // L'animation ne dure jamais plus que le Tick qu'elle représente.
  const anim = useAnimation(state, Math.min(game.tickMs * 0.8, 420))

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Enfers — proto « l’Escalier »</h1>
          <p className="app__subtitle">
            Règles conformes à <code>docs/proto/GDD.md</code>. Le moteur est dans <code>src/core</code>,
            le gameplay dans <code>config/gameplay.json</code>.
          </p>
        </div>
      </header>

      <main className="app__main">
        <section className="app__board">
          <BoardView
            state={state}
            selected={game.selected}
            placeable={(coord) => game.placementRefusalAt(coord) === undefined}
            wireTargets={game.wireTargets}
            moves={anim.moves}
            ghosts={anim.ghosts}
            floaters={anim.floaters}
            t={anim.t}
            onSpaceClick={game.clickSpace}
          />
          {game.notice && <p className="app__notice">{game.notice}</p>}
          <p className="app__legend">
            {game.wiring
              ? `Orientation de (${game.wiring.q},${game.wiring.r}) : clique un hexagone voisin pour y envoyer le flux. Le mode se referme aussitôt.`
              : state.phase === 'placement' && !state.placedThisRound
                ? 'Clique un Espace libre pour y poser la Tuile choisie, puis un voisin pour orienter sa Sortie.'
                : game.canEditExits
                  ? 'Tuile sélectionnée : « Éditer » dans le panneau pour régler ses Sorties.'
                  : 'Clique une Tuile pour l’inspecter.'}
          </p>
        </section>

        <aside className="app__side">
          <MetricsPanel state={state} />
          <Controls
            state={state}
            pendingType={game.pendingType}
            canUndo={game.canUndo}
            playing={game.playing}
            speed={game.speed}
            configText={game.configText}
            configError={game.configError}
            onPendingType={game.setPendingType}
            onStep={game.step}
            onRound={game.round}
            onFinish={game.finish}
            onSpeed={game.setSpeed}
            onUndo={game.undo}
            onReset={game.reset}
            onApplyConfig={game.applyConfig}
            onConfigText={game.setConfigText}
          />
        </aside>

        <aside className="app__inspector">
          <TileInspector
            state={state}
            coord={game.selected}
            tile={game.selectedTile}
            onToggleExit={game.toggleExit}
            wiring={game.wiringSelected}
            canEdit={game.canEditExits}
            editRefusal={game.editRefusal}
            onToggleWiring={game.toggleWiring}
          />
          <LogView log={state.log} />
        </aside>
      </main>
    </div>
  )
}
