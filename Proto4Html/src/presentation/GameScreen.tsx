import { useEffect, useMemo, useState } from 'react'
import { config, shop } from '../core/config'
import { circleArt } from './art'
import { betType, bettingClosed, slotCount } from '../core/rules/bets'
import { ranking } from '../core/rules/race'
import { BetPanel, EMPTY_DRAFT, toggleDraftSoul, type BetDraft } from './BetPanel'
import { demonRankAtRace } from './demon'
import { Board } from './Board'
import { HelpPanel } from './HelpPanel'
import { Inventory } from './Inventory'
import { MoneyGauge } from './MoneyGauge'
import { Ranking } from './Ranking'
import { ShopPanel } from './ShopPanel'
import { OpponentSlot, PhaseStrip, PlayerSlot } from './PlaySlots'
import { CIRCLES, HELP, HUD, RACE, fill } from './texts'
import { betBase, canBetNow, circleOf, itemName, previewNext, stakedOpen, useRace, type RaceUi, type SessionCarry } from './useRace'

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

/** Un champ de saisie a-t-il le focus ? Les raccourcis clavier s'effacent alors. */
function typing(): boolean {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

/**
 * Disposition (spec 08/C1, C2) : une rangée haute pour le HUD (cercle · fil d'Ariane · pièces),
 * puis la table en trois zones empilées, pleine largeur : zone haute (adversaire, ou boutique en
 * préparation), plateau, zone basse (dés du joueur, ou panneau de paris). Les panneaux sont dans
 * le flux : ils ne recouvrent jamais le plateau ni le HUD.
 */
export function GameScreen({ carry, speed, onFinished, onMenu }: Props) {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const circleCfg = config.run.circles[circle - 1] ?? config.run.circles[config.run.circles.length - 1]!
  const { ui, auto, setAuto, shopUnlocked, level, actions } = useRace({ carry, soulCount: circleCfg.souls, lanes: circleCfg.lanes, blocked: circleCfg.blocked, speed })
  const [betsOpen, setBetsOpen] = useState(true)
  const [shopOpen, setShopOpen] = useState(false)
  const [artefactsOpen, setArtefactsOpen] = useState(false)
  /** Page d'aide (règles du jeu) : consultation pure, ouverte depuis le HUD. */
  const [helpOpen, setHelpOpen] = useState(false)
  /** Récapitulatif du dernier tour (le journal a été retiré : on garde de quoi reconstituer une cause). */
  const [recapOpen, setRecapOpen] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  /** La séquence de révélation des gains ne se joue qu'à la première ouverture de la modale. */
  const [resultsSeen, setResultsSeen] = useState(false)
  /** Brouillon de ticket partagé entre le panneau de paris et le plateau (spec 03/C2). */
  const [draft, setDraft] = useState<BetDraft>(EMPTY_DRAFT)
  /** Âme survolée (chip, dé Âme, carte de la file, jeton) : allumée partout. */
  const [hoverSoul, setHoverSoul] = useState<number | null>(null)
  const step = stepOf(ui)
  const isBoss = raceInCircle === config.run.racesPerCircle
  const ordinal = CIRCLES[circle - 1]?.ordinal ?? `${circle}e`
  const rank = demonRankAtRace(carry.raceIndex)
  const price = circleCfg.price
  const staked = stakedOpen(ui.bets)
  const racesLeft = config.run.racesPerCircle - raceInCircle
  // Parier : la phase le permet et aucune âme n'a franchi le seuil (sinon le panneau l'écrit et ferme chips et jetons).
  const betOpen = canBetNow(ui) && !bettingClosed(ui.race)
  const prep = ui.phase === 'prep'
  const finished = ui.phase === 'finished'
  const shopShown = prep && shopOpen
  const betsShown = !finished && betsOpen

  // Ouverture exclusive : la boutique prend l'écran seule, piste et paris masqués, pour que
  // l'achat soit un moment à part. Elle remplace la cohabitation des deux panneaux que
  // prévoyait 08/C2 — le plateau en bandeau entre les deux donnait trois choses à lire.
  // On sort de la boutique par ses propres boutons (Fermer, Aller aux paris).
  const openBets = (): void => {
    setBetsOpen(true)
    setShopOpen(false)
  }
  const openShop = (): void => {
    if (!prep) return
    actions.openShop() // tire la vitrine si la boutique est débloquée ; sinon l'état vide s'affiche
    setShopOpen(true)
    setBetsOpen(false)
  }

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
  // Boutique ouverte sur l'état vide : dès le premier pari posé, la vitrine apparaît sans re-clic.
  useEffect(() => {
    if (shopOpen && shopUnlocked && ui.vitrine === null) actions.openShop()
  }, [shopOpen, shopUnlocked, ui.vitrine, actions])
  // Fin de course : le classement et le bilan des paris s'ouvrent en modale, après une
  // respiration pour laisser voir le dernier déplacement. « Voir la table » la referme,
  // la poignée « Gains » la rouvre.
  useEffect(() => {
    if (ui.phase !== 'finished') {
      setResultsOpen(false)
      return
    }
    const t = setTimeout(() => setResultsOpen(true), (config.animation.pauseMs * 2) / speed)
    return () => clearTimeout(t)
  }, [ui.phase, speed])
  useEffect(() => {
    if (resultsOpen) setResultsSeen(true)
  }, [resultsOpen])
  // Raccourcis clavier (spec 02/C4) : P bascule les paris, B la boutique (en préparation), sauf dans un champ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing()) return
      if (e.key === 'p' || e.key === 'P') {
        if (ui.phase === 'finished') return
        e.preventDefault()
        if (betsOpen) setBetsOpen(false)
        else openBets()
      } else if ((e.key === 'b' || e.key === 'B') && ui.phase === 'prep') {
        e.preventDefault()
        if (shopOpen) setShopOpen(false)
        else openShop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const lastEvent = useMemo(() => {
    const entries = ui.log.filter((e) => e.source !== 'shop' && e.source !== 'bet')
    return entries[entries.length - 1]?.text ?? ''
  }, [ui.log])
  // Dernier tour joué : les déplacements (joueur, adversaire, artefacts) du tour le plus récent où quelqu'un a bougé.
  const recap = useMemo(() => {
    const moves = ui.log.filter((e) => e.source === 'player' || e.source === 'opponent' || e.source === 'artefact')
    const last = moves[moves.length - 1]?.turn
    return last === undefined ? { turn: null, entries: [] } : { turn: last, entries: moves.filter((e) => e.turn === last) }
  }, [ui.log])
  // Départage montré (05/C6) : à la fin, les colonnes où deux âmes classées à la suite se départagent par le couloir.
  const tieColumns = useMemo(() => {
    if (ui.phase !== 'finished') return []
    const ranked = ranking(ui.race)
    return ranked.filter((r, i) => i > 0 && ranked[i - 1]!.soul.position === r.soul.position && ranked[i - 1]!.soul.lane !== r.soul.lane).map((r) => r.soul.position)
  }, [ui.phase, ui.race])
  const bettedSouls = useMemo(() => new Set(ui.bets.filter((b) => b.status === 'open').flatMap((b) => [...b.souls])), [ui.bets])

  const activeSoul = ui.phase === 'resolving' || ui.phase === 'opponent' ? (ui.lastResult?.move.soul ?? null) : null
  const preview = useMemo(() => previewNext(ui), [ui])
  const n = ui.inventory.artefacts.length

  // Sélection d'âmes sur le plateau : panneau de paris ouvert et pari possible.
  const draftSlots = slotCount(betType(draft.type), ui.race.souls.length)
  const selection = betsShown && betOpen ? { souls: draft.souls, max: draftSlots, onToggle: (id: number) => setDraft((d) => toggleDraftSoul(d, id, draftSlots)) } : null

  const tabBets = staked > 0 && betOpen ? fill(HUD.tabBetsStaked, { n: ui.bets.length, staked }) : fill(HUD.tabBets, { n: ui.bets.length })

  return (
    <div className={'table' + (betsShown ? ' bets-open' : '') + (shopShown ? ' shop-open' : '')} style={{ ['--step' as string]: `${config.animation.stepMs / speed}ms`, ['--gauge-ms' as string]: `${config.animation.gaugeMs / speed}ms`, ['--dice-ms' as string]: `${config.animation.diceMs / speed}ms`, ['--circle-bg' as string]: `url('/circles/${circleArt(circle)}/bg.jpg')`, ['--circle-bet-bg' as string]: `url('/circles/${circleArt(circle)}/bet-bg.jpg')` }}>
      {/* Rangée haute réservée au HUD (spec 08/C1) : rien ne la recouvre, quel que soit l'état des panneaux. */}
      <header className="topbar-game" data-testid="hud-row">
        <div className="hud hud-left" data-testid="hud-left">
          <span className="hud-big">{fill(HUD.circle, { ordinal })}</span>
          <span>{isBoss ? fill(HUD.bossRace, { n: raceInCircle, total: config.run.racesPerCircle }) : fill(HUD.race, { n: HUD.raceOrdinals[raceInCircle - 1] ?? raceInCircle, total: config.run.racesPerCircle })}</span>
          <span className="muted small">{fill(HUD.demon, { rank: rank.name })}</span>
        </div>
        <ol className="steps" aria-label="Étapes" data-testid="steps">
          {HUD.steps.map((label, i) => (
            <li key={label} className={'step' + (i < step ? ' step-done' : '') + (i === step ? ' step-current' : '')} aria-current={i === step ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
        <div className="hud hud-right" data-testid="hud-right">
          <div className="hud-money">
            <span className="hud-big money">{fill(HUD.coins, { n: ui.money })}</span>
            <button type="button" className="hud-link" onClick={() => setArtefactsOpen(true)}>
              {fill(HUD.artefacts, { n, s: n > 1 ? 's' : '' })}
            </button>
          </div>
          <MoneyGauge money={ui.money} price={price} staked={staked} />
          <span className="hud-tools">
            <button type="button" className={'chip' + (auto ? ' chip-on' : '')} onClick={() => setAuto(!auto)} title="Mode test : enchaîne les tours tout seul">
              auto
            </button>
            <button type="button" className="btn-stone btn-stone-sm" data-testid="help-open" onClick={() => setHelpOpen(true)}>
              {HELP.open}
            </button>
            <button type="button" className="btn-stone btn-stone-sm" onClick={onMenu}>
              {HUD.menu}
            </button>
          </span>
        </div>
      </header>

      {/* La table : zone haute · plateau · zone basse, en pleine largeur */}
      <main className="felt">
        <div className={'zone zone-top' + (shopShown ? ' zone-open' : '')} data-testid="drawer-shop" data-state={shopShown ? 'open' : 'closed'}>
          {/* Plus de poignée « Boutique » au-dessus de la piste : on y entre par le bouton du
              pied du panneau de paris, et par le raccourci B. Une porte, pas deux. */}
          {shopShown && (
            <div className="panel panel-shop">
              {/* Les trois sorties ramènent aux paris. Depuis que la boutique masque le reste,
                  la croix ne peut plus se contenter de la refermer : elle laisserait l'écran
                  sans aucun panneau. */}
              <ShopPanel
                vitrine={ui.vitrine ?? []}
                unlocked={shopUnlocked}
                money={ui.money}
                price={price}
                staked={staked}
                raceIndex={ui.raceIndex}
                inventory={ui.inventory}
                pending={ui.pendingPurchase}
                onBuy={(id, target) => actions.buy(id, target ?? null)}
                onCancel={actions.cancelPurchase}
                onReroll={actions.rerollVitrine}
                onLeave={openBets}
                onGoToBets={openBets}
                onClose={openBets}
              />
              {shopUnlocked && <Inventory inventory={ui.inventory} lateBetCharges={ui.lateBetCharges} compact />}
            </div>
          )}
          {!prep && <OpponentSlot ui={ui} />}
        </div>

        {/* Boutique ouverte : ni piste ni paris. Démontés plutôt que masqués en CSS — un
            `display: none` laisse les boutons dans l'ordre de tabulation. */}
        {!shopShown && (
        <div className="board-wrap">
          <Board race={ui.race} lastResult={ui.lastResult} activeSoul={activeSoul} highlightSoul={hoverSoul} onHoverSoul={setHoverSoul} preview={preview} selection={selection} bettedSouls={bettedSouls} tieColumns={tieColumns} />
          <p className="last-event" aria-live="polite">
            <span>{lastEvent}</span>
            {recap.turn !== null && (
              <button type="button" className="recap-btn" onClick={() => setRecapOpen(true)} title={RACE.recapTitle}>
                {RACE.recap}
              </button>
            )}
          </p>
        </div>
        )}

        {!shopShown && (
        <div className={'zone zone-bottom' + (betsShown ? ' zone-open' : '')} data-testid="drawer-bets" data-state={betsShown ? 'open' : 'closed'}>
          <PhaseStrip phase={ui.phase} />
          {!finished && !betsShown && (
            <button type="button" className="handle handle-bottom" data-testid="tab-bets" onClick={openBets} title={fill(HUD.tabShortcut, { key: 'P' })}>
              {tabBets}
            </button>
          )}
          {finished && !resultsOpen && (
            <button type="button" className="handle handle-bottom handle-results" data-testid="tab-results" onClick={() => setResultsOpen(true)} title={HUD.tabResults}>
              {HUD.results}
            </button>
          )}
          {betsShown ? (
            <div className="panel panel-bets">
              <BetPanel
                race={ui.race}
                money={ui.money}
                price={price}
                bets={ui.bets}
                open={betOpen}
                phase={ui.phase}
                level={level}
                roll={ui.roll}
                lateBet={ui.inventory.artefacts.includes('lateBet') ? { charges: ui.lateBetCharges, active: ui.lateBetOpen } : null}
                onUseLateBet={actions.useLateBet}
                onPlace={actions.placeBet}
                {...(prep ? { onCancel: actions.cancelBet } : {})}
                baseFor={(type) => betBase(type, ui.inventory)}
                draft={draft}
                onDraftChange={setDraft}
                highlightSoul={hoverSoul}
                onHoverSoul={setHoverSoul}
                onStart={actions.startRace}
                onOpenShop={openShop}
                onClose={() => setBetsOpen(false)}
              />
            </div>
          ) : (
            <PlayerSlot
              ui={ui}
              speed={speed}
              preview={preview}
              highlightSoul={hoverSoul}
              onHoverSoul={setHoverSoul}
              onStart={actions.startRace}
              onRoll={() => void actions.rollDice()}
              onPickSoul={actions.pickSoulDie}
              onPickDistance={actions.pickDistanceDie}
              onReset={actions.resetPairing}
              onResolve={() => void actions.resolve()}
              onPairDice={actions.pairDice}
              onRemoveCombinations={actions.removeCombinations}
              onSetCombinations={actions.setCombinations}
            />
          )}
        </div>
        )}
      </main>

      {/* Fin de course : classement et bilan des paris en modale, poignée « Gains » pour la rouvrir */}
      {finished && resultsOpen && (
        <div className="popup-backdrop" onClick={() => setResultsOpen(false)} role="presentation">
          <div className="popup popup-wide" role="dialog" aria-label={HUD.raceResult} data-testid="results-modal" onClick={(e) => e.stopPropagation()}>
            <Ranking race={ui.race} settlement={ui.settlement} money={ui.money} price={price} racesLeft={racesLeft} speed={speed} animate={!resultsSeen} continueLabel={HUD.nextRace} onContinue={() => onFinished(ui)} onClose={() => setResultsOpen(false)} />
          </div>
        </div>
      )}

      {/* Récapitulatif du dernier tour (recommandation §4.7 : reconstituer la cause d'un état) */}
      {recapOpen && (
        <div className="popup-backdrop" onClick={() => setRecapOpen(false)} role="presentation">
          <div className="popup" role="dialog" aria-label={RACE.recapTitle} onClick={(e) => e.stopPropagation()}>
            <h2>{RACE.recapTitle}</h2>
            {recap.turn === null ? (
              <p className="muted">{RACE.recapEmpty}</p>
            ) : (
              <>
                <p className="muted small">{fill(RACE.recapTurn, { n: recap.turn })}</p>
                <ul>
                  {recap.entries.map((e) => (
                    <li key={e.id} className={`log-entry log-${e.source}`}>
                      {e.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button type="button" className="btn" onClick={() => setRecapOpen(false)}>
              {HUD.close}
            </button>
          </div>
        </div>
      )}

      {/* Page d'aide (règles du jeu) : index à gauche, section à droite */}
      {helpOpen && (
        <div className="popup-backdrop" onClick={() => setHelpOpen(false)} role="presentation">
          <div className="popup popup-help" role="dialog" aria-label={HELP.title} data-testid="help-modal" onClick={(e) => e.stopPropagation()}>
            <HelpPanel onClose={() => setHelpOpen(false)} />
          </div>
        </div>
      )}

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
