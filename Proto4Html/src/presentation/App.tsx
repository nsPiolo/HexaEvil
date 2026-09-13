import { config } from '../core/config'
import { Board } from './Board'
import { DicePanel } from './DicePanel'
import { Log } from './Log'
import { Ranking } from './Ranking'
import { BetPanel } from './BetPanel'
import { ShopPanel } from './ShopPanel'
import { Inventory } from './Inventory'
import { SPEEDS, betBase, canBetNow, circleOf, useRace } from './useRace'

const PHASE_LABEL = {
  betting: 'Paris initiaux',
  shop: 'Boutique',
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
  const { circle, raceInCircle } = circleOf(ui.raceIndex)
  const hasLateBet = ui.inventory.artefacts.includes('lateBet')

  return (
    <div className="app" style={{ ['--step' as string]: `${config.animation.stepMs / speed}ms` }}>
      <header className="topbar">
        <div>
          <h1>Damned Race Bet <span className="muted">— proto 4</span></h1>
          <p className="muted small">
            {config.souls.count} âmes · {config.track.columns} cases + {config.track.cellsAfterFinish} après l'arrivée · dés Distance {config.dice.distanceFaces.join('/')} · adversaire {config.opponent.rollsPerTurn} paire{config.opponent.rollsPerTurn > 1 ? 's' : ''}/tour · graine {ui.seed}
          </p>
        </div>
        <div className="topbar-right">
          <span className="money money-top" title="Argent">{ui.money} <span className="money-unit">pièces</span></span>
          <span className="phase">Cercle {circle} · course {raceInCircle}/{config.run.racesPerCircle}</span>
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
          <button type="button" className="btn" onClick={actions.resetSession} title={`Remet l'argent à ${config.economy.startingMoney}`}>Recommencer</button>
        </div>
      </header>

      <Inventory inventory={ui.inventory} lateBetCharges={ui.lateBetCharges} compact />

      <Board race={ui.race} lastResult={ui.lastResult} activeSoul={activeSoul} />

      <div className="bottom">
        {ui.phase === 'finished' ? (
          <Ranking race={ui.race} settlement={ui.settlement} money={ui.money} onNewRace={actions.newRace} />
        ) : ui.phase === 'shop' ? (
          <ShopPanel
            vitrine={ui.vitrine}
            money={ui.money}
            raceIndex={ui.raceIndex}
            inventory={ui.inventory}
            pending={ui.pendingPurchase}
            onBuy={(id, target) => actions.buy(id, target ?? null)}
            onCancel={actions.cancelPurchase}
            onReroll={actions.rerollVitrine}
            onLeave={actions.leaveShop}
          />
        ) : (
          <DicePanel
            ui={ui}
            onBegin={actions.openShop}
            onRoll={() => void actions.rollDice()}
            onPickSoul={actions.pickSoulDie}
            onPickDistance={actions.pickDistanceDie}
            onReset={actions.resetPairing}
            onResolve={() => void actions.resolve()}
          />
        )}
        <BetPanel
          race={ui.race}
          money={ui.money}
          bets={ui.bets}
          open={canBetNow(ui)}
          phase={ui.phase}
          lateBet={hasLateBet ? { charges: ui.lateBetCharges, active: ui.lateBetOpen } : null}
          onUseLateBet={actions.useLateBet}
          onPlace={actions.placeBet}
          baseFor={(type) => betBase(type, ui.inventory)}
        />
        <Log entries={ui.log} />
      </div>
    </div>
  )
}
