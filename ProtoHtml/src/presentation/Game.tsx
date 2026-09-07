import { key } from '../core/hex/hexCoord'
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
            placeable={(coord) => game.buildable.has(key(coord))}
            wireTargets={game.wireTargets}
            moves={anim.moves}
            ghosts={anim.ghosts}
            floaters={anim.floaters}
            t={anim.t}
            onSpaceClick={game.clickSpace}
          />
          {game.notice && <p className="app__notice">{game.notice}</p>}
          <p className="app__legend">
            {game.moveFrom
              ? `Déplacement de (${game.moveFrom.q},${game.moveFrom.r}) : clique l’Espace de destination. « Déplacer » à nouveau pour annuler.`
              : game.wiring
                ? `Orientation de (${game.wiring.q},${game.wiring.r}) : clique un hexagone voisin pour y envoyer le flux.` +
                  (game.exitsLeftToDesignate > 1
                    ? ` Encore ${game.exitsLeftToDesignate} Sorties à désigner.`
                    : '')
                : state.action === undefined && state.phase === 'placement'
                  ? game.pendingType !== undefined
                    ? 'Clique un Espace posable pour y poser la Tuile choisie, puis un voisin pour orienter sa Sortie.'
                    : 'Main vide : pioche, déplace une Tuile, ou passe ton tour.'
                  : game.canEditExits
                    ? 'Tuile sélectionnée : « Éditer » dans le panneau pour régler ses Sorties.'
                    : 'Clique une Tuile pour l’inspecter.'}
          </p>
        </section>

        <aside className="app__side">
          <MetricsPanel state={state} />
          <Controls
            state={state}
            ticksThisRound={game.ticksThisRound}
            pendingType={game.pendingType}
            actions={game.actions}
            canUndo={game.canUndo}
            playing={game.playing}
            speed={game.speed}
            configText={game.configText}
            configError={game.configError}
            onPendingType={game.setPendingType}
            onDraw={game.draw}
            onPass={game.pass}
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
            exitsLeft={game.exitsLeftToDesignate}
            canEdit={game.canEditExits}
            editRefusal={game.editRefusal}
            onToggleWiring={game.toggleWiring}
            canMove={game.canMoveSelected}
            moving={game.moveFrom !== undefined}
            onToggleMove={game.toggleMove}
          />
          <LogView log={state.log} />
        </aside>
      </main>
    </div>
  )
}
