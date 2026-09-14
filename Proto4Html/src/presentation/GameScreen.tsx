import { useEffect, useMemo, useState } from 'react'
import { config, shop } from '../core/config'
import { BetPanel } from './BetPanel'
import { demonRankAtRace } from './demon'
import { Board } from './Board'
import { Inventory } from './Inventory'
import { Ranking } from './Ranking'
import { ShopPanel } from './ShopPanel'
import { OpponentSlot, PlayerSlot } from './PlaySlots'
import { CIRCLES, HUD, fill } from './texts'
import { betBase, canBetNow, circleOf, itemName, useRace, type RaceUi, type SessionCarry } from './useRace'

interface Props {
  carry: SessionCarry
  speed: number
  onFinished: (ui: RaceUi) => void
  onMenu: () => void
}

type Step = 0 | 1 | 2 | 3

/** Fil d'Ariane imprimé sur la table : Pari · Boutique · Course · Gains. */
function stepOf(ui: RaceUi): Step {
  if (ui.phase === 'finished') return 3
  if (ui.phase !== 'prep') return 2
  return ui.bets.length === 0 ? 0 : 1
}

export function GameScreen({ carry, speed, onFinished, onMenu }: Props) {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const circleCfg = config.run.circles[circle - 1] ?? config.run.circles[config.run.circles.length - 1]!
  const { ui, auto, setAuto, shopUnlocked, level, actions } = useRace({ carry, soulCount: circleCfg.souls, lanes: circleCfg.lanes, blocked: circleCfg.blocked, speed })
  const [betsOpen, setBetsOpen] = useState(true)
  const [shopOpen, setShopOpen] = useState(false)
  const [artefactsOpen, setArtefactsOpen] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const step = stepOf(ui)
  const isBoss = raceInCircle === config.run.racesPerCircle
  const ordinal = CIRCLES[circle - 1]?.ordinal ?? `${circle}e`
  const rank = demonRankAtRace(carry.raceIndex)

  // La boutique disparaît dès que la course est lancée ; le panneau de paris se replie quand on ne peut plus parier.
  useEffect(() => {
    if (ui.phase !== 'prep') setShopOpen(false)
  }, [ui.phase])
  // Le panneau de paris s'ouvre tout seul une fois, en préparation, et se replie quand parier
  // devient impossible. Il ne se rouvre jamais de lui-même : c'est au joueur de le demander
  // (l'Œil du parieur est une demande explicite, on l'ouvre alors).
  useEffect(() => {
    if (ui.phase !== 'prep') setBetsOpen(false)
  }, [ui.phase])
  useEffect(() => {
    if (ui.lateBetOpen) setBetsOpen(true)
  }, [ui.lateBetOpen])
  // Fin de course : le classement et le bilan des paris s'ouvrent en modale, après une
  // respiration pour laisser voir le dernier déplacement. « Voir la table » la referme,
  // l'onglet « Gains » la rouvre.
  useEffect(() => {
    if (ui.phase !== 'finished') {
      setResultsOpen(false)
      return
    }
    const t = setTimeout(() => setResultsOpen(true), (config.animation.pauseMs * 2) / speed)
    return () => clearTimeout(t)
  }, [ui.phase, speed])

  const lastEvent = useMemo(() => {
    const entries = ui.log.filter((e) => e.source !== 'shop' && e.source !== 'bet')
    return entries[entries.length - 1]?.text ?? ''
  }, [ui.log])

  // Paris à droite, boutique à gauche : les deux peuvent rester ouverts, on passe de l'un à l'autre librement.
  const openShop = (): void => {
    if (actions.openShop()) setShopOpen(true)
  }
  const activeSoul = ui.phase === 'resolving' || ui.phase === 'opponent' ? (ui.lastResult?.move.soul ?? null) : null
  const n = ui.inventory.artefacts.length

  return (
    <div className="table" style={{ ['--step' as string]: `${config.animation.stepMs / speed}ms` }}>
      {/* Overlays */}
      <div className="hud hud-left">
        <span className="hud-big">{fill(HUD.circle, { ordinal })}</span>
        <span>{isBoss ? fill(HUD.bossRace, { n: raceInCircle, total: config.run.racesPerCircle }) : fill(HUD.race, { n: HUD.raceOrdinals[raceInCircle - 1] ?? raceInCircle, total: config.run.racesPerCircle })}</span>
        <span className="muted small">{fill(HUD.price, { price: circleCfg.price })}</span>
        <span className="muted small">{fill(HUD.demon, { rank: rank.name })}</span>
      </div>
      <div className="hud hud-right">
        <span className="hud-big money">{fill(HUD.coins, { n: ui.money })}</span>
        <button type="button" className="hud-link" onClick={() => setArtefactsOpen(true)}>
          {fill(HUD.artefacts, { n, s: n > 1 ? 's' : '' })}
        </button>
        <span className="hud-tools">
          <button type="button" className={'chip' + (auto ? ' chip-on' : '')} onClick={() => setAuto(!auto)} title="Mode test : enchaîne les tours tout seul">
            auto
          </button>
          <button type="button" className="chip" onClick={onMenu}>
            {HUD.menu}
          </button>
        </span>
      </div>

      {/* Fil d'Ariane imprimé sur la table */}
      <ol className="steps" aria-label="Étapes">
        {HUD.steps.map((label, i) => (
          <li key={label} className={'step' + (i < step ? ' step-done' : '') + (i === step ? ' step-current' : '')} style={{ ['--i' as string]: i }}>
            {label}
          </li>
        ))}
      </ol>

      {/* Onglet boutique (panneau venant de la gauche), seulement en préparation */}
      {ui.phase === 'prep' && !shopOpen && (
        <button type="button" className="tab tab-left" disabled={!shopUnlocked} onClick={openShop} title={shopUnlocked ? undefined : 'Pose d’abord un pari initial'}>
          {HUD.shop}
        </button>
      )}
      <div className={'drawer drawer-left drawer-shop' + (shopOpen && ui.phase === 'prep' ? ' drawer-open' : '')} aria-hidden={!shopOpen}>
        {ui.vitrine && (
          <ShopPanel vitrine={ui.vitrine} money={ui.money} raceIndex={ui.raceIndex} inventory={ui.inventory} pending={ui.pendingPurchase} onBuy={(id, target) => actions.buy(id, target ?? null)} onCancel={actions.cancelPurchase} onReroll={actions.rerollVitrine} onLeave={() => { setShopOpen(false); setBetsOpen(true) }} onClose={() => setShopOpen(false)} />
        )}
        <Inventory inventory={ui.inventory} lateBetCharges={ui.lateBetCharges} compact />
      </div>

      {/* La table */}
      <main className="felt">
        <OpponentSlot ui={ui} />
        <div className="board-wrap">
          <Board race={ui.race} lastResult={ui.lastResult} activeSoul={activeSoul} />
          <p className="last-event" aria-live="polite">{lastEvent}</p>
        </div>
        <PlayerSlot ui={ui} onStart={actions.startRace} onRoll={() => void actions.rollDice()} onPickSoul={actions.pickSoulDie} onPickDistance={actions.pickDistanceDie} onReset={actions.resetPairing} onResolve={() => void actions.resolve()} />
      </main>

      {/* Fin de course : classement et bilan des paris en modale, onglet « Gains » pour la rouvrir */}
      {ui.phase === 'finished' && !resultsOpen && (
        <button type="button" className="tab tab-right" onClick={() => setResultsOpen(true)}>
          {HUD.results}
        </button>
      )}
      {ui.phase === 'finished' && resultsOpen && (
        <div className="popup-backdrop" onClick={() => setResultsOpen(false)} role="presentation">
          <div className="popup popup-wide" role="dialog" aria-label={HUD.raceResult} onClick={(e) => e.stopPropagation()}>
            <Ranking race={ui.race} settlement={ui.settlement} money={ui.money} continueLabel={HUD.nextRace} onContinue={() => onFinished(ui)} onClose={() => setResultsOpen(false)} />
          </div>
        </div>
      )}

      {/* Onglet paris (panneau venant de la droite : la piste reste dégagée à gauche, dans le sens de la course) */}
      {ui.phase !== 'finished' && !betsOpen && (
        <button type="button" className="tab tab-right" onClick={() => setBetsOpen(true)}>
          {HUD.bets} ({ui.bets.length})
        </button>
      )}
      <div className={'drawer drawer-right' + (betsOpen && ui.phase !== 'finished' ? ' drawer-open' : '')} aria-hidden={!betsOpen}>
        <BetPanel race={ui.race} money={ui.money} bets={ui.bets} open={canBetNow(ui)} phase={ui.phase} level={level} lateBet={ui.inventory.artefacts.includes('lateBet') ? { charges: ui.lateBetCharges, active: ui.lateBetOpen } : null} onUseLateBet={actions.useLateBet} onPlace={actions.placeBet} baseFor={(type) => betBase(type, ui.inventory)} onStart={actions.startRace} onOpenShop={openShop} onClose={() => setBetsOpen(false)} />
      </div>

      {/* Popup artefacts */}
      {artefactsOpen && (
        <div className="popup-backdrop" onClick={() => setArtefactsOpen(false)} role="presentation">
          <div className="popup" role="dialog" aria-label="Artefacts actifs" onClick={(e) => e.stopPropagation()}>
            <h2>Artefacts actifs</h2>
            {n === 0 && <p className="muted">Aucun artefact. La boutique en propose entre les paris et la course.</p>}
            <ul>
              {ui.inventory.artefacts.map((id) => (
                <li key={id}>
                  <strong>{itemName(id)}</strong>
                  {id === 'lateBet' && <span className="muted"> · {ui.lateBetCharges}/{config.artefacts.lateBet.chargesPerCircle} charge ce cercle</span>}
                  <p className="small muted">{shop.items.find((i) => i.id === id)?.description}</p>
                </li>
              ))}
            </ul>
            <button type="button" className="btn" onClick={() => setArtefactsOpen(false)}>
              {HUD.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
