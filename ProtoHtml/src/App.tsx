import { BoardView } from './presentation/BoardView'
import { Controls } from './presentation/Controls'
import { LogView } from './presentation/LogView'
import { MetricsPanel } from './presentation/MetricsPanel'
import { TileInspector } from './presentation/TileInspector'
import { useGame } from './presentation/useGame'

export default function App() {
  const game = useGame()
  const { state } = game

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
            onSelect={game.select}
            onPlace={game.place}
          />
        </section>

        <aside className="app__side">
          <MetricsPanel state={state} />
          <Controls
            state={state}
            pendingType={game.pendingType}
            pendingExits={game.pendingExits}
            selectedIsTile={game.selectedTile !== undefined}
            canUndo={game.canUndo}
            configText={game.configText}
            configError={game.configError}
            onPendingType={game.setPendingType}
            onToggleExit={game.toggleExit}
            onStep={game.step}
            onRound={game.round}
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
            exitRefusalFor={game.exitRefusalFor}
            pendingType={game.pendingType}
            pendingExits={game.pendingExits}
          />
          <LogView log={state.log} />
        </aside>
      </main>
    </div>
  )
}
