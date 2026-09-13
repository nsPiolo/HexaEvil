import { config } from '../core/config'
import { Board } from './Board'
import { DicePanel } from './DicePanel'
import { Log } from './Log'
import { Ranking } from './Ranking'
import { SPEEDS, useRace } from './useRace'

const PHASE_LABEL = {
  idle: 'À vous de lancer',
  rolling: 'Lancer',
  pairing: 'Associations',
  resolving: 'Résolution',
  opponent: 'Adversaire',
  finished: 'Terminé',
} as const

export default function App() {
  const { ui, speed, setSpeed, auto, setAuto, actions } = useRace()
  const activeSoul = ui.phase === 'resolving' || ui.phase === 'opponent' ? (ui.lastResult?.move.soul ?? null) : null

  return (
    <div className="app" style={{ ['--step' as string]: `${config.animation.stepMs / speed}ms` }}>
      <header className="topbar">
        <div>
          <h1>Damned Race Bet <span className="muted">— proto 4, étape 1 : la course</span></h1>
          <p className="muted small">
            {config.souls.count} âmes · {config.track.columns} cases + {config.track.cellsAfterFinish} après l'arrivée · dés Distance {config.dice.distanceFaces.join('/')} · adversaire {config.opponent.rollsPerTurn} paire{config.opponent.rollsPerTurn > 1 ? 's' : ''}/tour · graine {ui.seed}
          </p>
        </div>
        <div className="topbar-right">
          <span className={`phase phase-${ui.phase}`}>Tour {ui.race.turn} · {PHASE_LABEL[ui.phase]}</span>
          <div className="speed" role="group" aria-label="Vitesse">
            {SPEEDS.map((s) => (
              <button key={s} type="button" className={'chip' + (speed === s ? ' chip-on' : '')} onClick={() => setSpeed(s)}>×{s}</button>
            ))}
          </div>
          <button type="button" className={'chip' + (auto ? ' chip-on' : '')} onClick={() => setAuto(!auto)} title="Enchaîne les tours en associant les dés dans l'ordre">
            Auto {auto ? 'on' : 'off'}
          </button>
          <button type="button" className="btn" onClick={actions.newRace}>Nouvelle course</button>
        </div>
      </header>

      <Board race={ui.race} lastResult={ui.lastResult} activeSoul={activeSoul} />

      <div className="bottom">
        {ui.phase === 'finished' ? (
          <Ranking race={ui.race} onNewRace={actions.newRace} />
        ) : (
          <DicePanel
            ui={ui}
            onRoll={() => void actions.rollDice()}
            onPickSoul={actions.pickSoulDie}
            onPickDistance={actions.pickDistanceDie}
            onReset={actions.resetPairing}
            onAutoPair={actions.autoPair}
            onResolve={() => void actions.resolve()}
          />
        )}
        <Log entries={ui.log} />
      </div>
    </div>
  )
}
