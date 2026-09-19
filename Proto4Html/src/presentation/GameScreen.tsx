import { useEffect, useMemo, useRef, useState } from 'react'
import { config, shop } from '../core/config'
import { circleAt, isBeyondWritten } from '../core/rules/circles'
import type { SpecialCellKind } from '../core/config/schema'
import { stakesAtCircle } from '../core/rules/stakes'
import { circleArt } from './art'
import { betType, bettingClosed, slotCount } from '../core/rules/bets'
import { ranking } from '../core/rules/race'
import { BetPanel, EMPTY_DRAFT, toggleDraftSoul, type BetDraft } from './BetPanel'
import { Board } from './Board'
import { HelpPanel } from './HelpPanel'
import { Inventory } from './Inventory'
import { MoneyGauge } from './MoneyGauge'
import { Ranking } from './Ranking'
import { ShopPanel } from './ShopPanel'
import { OpponentSlot, PhaseStrip, PlayerSlot } from './PlaySlots'
import { HELP, HUD, ITEMS, RACE, UI, fill, ordinalOf } from './texts'
import { MARKER_KINDS, betBase, bettedSouls as bettedSoulsOf, bossPowerText, canBetNow, circleOf, freeCharges, has, itemName, markerCount, maxStake, previewNext, rollsBeforeSleep, stakedOpen, useRace, type RaceUi, type SessionCarry } from './useRace'

interface Props {
  carry: SessionCarry
  /** Objets débloqués, vivier de la vitrine (core/shop/unlocks.ts). */
  unlocked: readonly string[]
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
 * puis deux dalles empilées. La dalle de course porte la zone adverse et le plateau ; la dalle
 * du guichet porte les dés du joueur, ou le panneau de paris. La boutique, elle, remplace les
 * deux. Les panneaux sont dans le flux : ils ne recouvrent jamais le plateau ni le HUD.
 *
 * Deux dalles et non une seule boîte : leurs largeurs se règlent séparément (la piste gagne à
 * être large, le guichet non) et la hauteur restante va à la course, qui grandit sans se
 * creuser de vide à l'intérieur. Les nombres sont dans `.table` (`--slab-*`).
 */
export function GameScreen({ carry, unlocked, speed, onFinished, onMenu }: Props) {
  const { circle, raceInCircle } = circleOf(carry.raceIndex)
  const circleCfg = circleAt(config.run, circle)
  // Les jetons grandissent avec le cercle, le premier restant à portée de l'avance (rules/stakes.ts).
  const stakes = useMemo(() => stakesAtCircle(config, circle), [circle])
  /**
   * Cinquième jeton, réservé aux cercles au-delà des écrits : tout le solde d'un coup. Les
   * quatre paliers suivent désormais la courbe des prix, mais ils restent une offre fixe ; une
   * bourse qui a pris de l'avance sur eux n'aurait plus rien à faire de son surplus. `null`
   * jusqu'au quinzième : là, l'échelle suffit, et un All-in au premier cercle n'est pas un pari,
   * c'est un jet de dé sur toute la partie.
   */
  const beyondWritten = isBeyondWritten(config.run, circle)
  const { ui, auto, setAuto, shopUnlocked, level, actions } = useRace({ carry, unlocked, soulCount: circleCfg.souls, lanes: circleCfg.lanes, terrains: circleCfg.terrains, speed })
  const [betsOpen, setBetsOpen] = useState(true)
  const [shopOpen, setShopOpen] = useState(false)
  const [artefactsOpen, setArtefactsOpen] = useState(false)
  /** Page d'aide (règles du jeu) : consultation pure, ouverte depuis le HUD. */
  const [helpOpen, setHelpOpen] = useState(false)
  /** Récapitulatif du dernier tour (le journal a été retiré : on garde de quoi reconstituer une cause). */
  const [recapOpen, setRecapOpen] = useState(false)
  /** Refus du dernier objet déclenché à la main (Fiole, Élan, Verrou, Pièce, Tribune). */
  const [itemError, setItemError] = useState<string | null>(null)
  /** Tribune infernale : la pose est ouverte tant qu'elle n'a pas eu lieu, en préparation. */
  const MARKER_NAME: Readonly<Record<string, string>> = { trap: ITEMS.pit, boost: ITEMS.springboard, tar: ITEMS.tar }
  const placingTribune = ui.phase === 'prep' && has(ui.inventory, 'tribuneInfernale') && !ui.tribunePlaced
  // Bornes du stagiaire : deux poses avant la course, chacune d'un type choisi ici.
  const [markerKind, setMarkerKind] = useState<SpecialCellKind>('trap')
  const markersLeft = markerCount(ui.inventory) - ui.race.markers
  const placingMarkers = ui.phase === 'prep' && has(ui.inventory, 'bornes') && markersLeft > 0
  /** Pièce à deux faces : jetable une fois, après le premier lancer, sur des paris ouverts. */
  const canDouble = ui.phase === 'pairing' && ui.race.turn === 1 && has(ui.inventory, 'pieceADeuxFaces') && !ui.doubledStakes && ui.bets.some((b) => b.status === 'open')
  const [resultsOpen, setResultsOpen] = useState(false)
  /** La séquence de révélation des gains ne se joue qu'à la première ouverture de la modale. */
  const [resultsSeen, setResultsSeen] = useState(false)
  /** Brouillon de ticket partagé entre le panneau de paris et le plateau (spec 03/C2). */
  const [draft, setDraft] = useState<BetDraft>(EMPTY_DRAFT)
  /** Âme survolée (chip, dé Âme, carte de la file, jeton) : allumée partout. */
  const [hoverSoul, setHoverSoul] = useState<number | null>(null)
  const step = stepOf(ui)
  const isBoss = raceInCircle === config.run.racesPerCircle
  // Le pouvoir du boss ne s'applique qu'à sa course : il est annoncé sur la carte, il est rappelé ici tant qu'elle dure.
  const bossPower = isBoss ? bossPowerText(circle) : null
  const ordinal = ordinalOf(circle)
  const price = circleCfg.price
  const staked = stakedOpen(ui.bets)
  const racesLeft = config.run.racesPerCircle - raceInCircle
  // Parier : la phase le permet et aucune âme n'a franchi le seuil (sinon le panneau l'écrit et ferme chips et jetons).
  const betOpen = canBetNow(ui) && !bettingClosed(ui.race)
  const prep = ui.phase === 'prep'
  // Valeur du jeton All-in : ce que le joueur peut vraiment payer au guichet, taxe de Ploutos comprise.
  const allIn = beyondWritten ? maxStake(ui.money, ui.boss, prep) : null
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
  /**
   * Modalité de la dernière interaction. Espace est la touche qui **active** un bouton : celui
   * qu'on vient d'atteindre au clavier doit garder la main, sinon naviguer au clavier deviendrait
   * impossible dans l'écran de course. Mais on apparie à la souris, et un clic laisse le focus
   * sur le dé cliqué — sans cette distinction, le raccourci ne servirait jamais après un clic.
   *
   * `:focus-visible` ne suffit pas : appuyer sur une touche suffit à le faire basculer à vrai
   * sur l'élément focalisé, donc il vaut déjà vrai au moment où on lit l'événement. On retient
   * donc nous-mêmes comment le focus a été posé : au pointeur, ou à la navigation clavier.
   */
  const keyboardNav = useRef(false)
  useEffect(() => {
    const byPointer = (): void => {
      keyboardNav.current = false
    }
    const byKeyboard = (e: KeyboardEvent): void => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyboardNav.current = true
    }
    window.addEventListener('pointerdown', byPointer, true)
    window.addEventListener('keydown', byKeyboard, true)
    return () => {
      window.removeEventListener('pointerdown', byPointer, true)
      window.removeEventListener('keydown', byKeyboard, true)
    }
  }, [])

  // Raccourcis clavier (spec 02/C4) : P bascule les paris, B la boutique (en préparation),
  // Espace enchaîne lancer puis résoudre — sauf dans un champ ou sur un bouton atteint au clavier.
  useEffect(() => {
    const buttonHasKeyboardFocus = (): boolean =>
      keyboardNav.current && (document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLAnchorElement)
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
      } else if (e.key === ' ' && !buttonHasKeyboardFocus()) {
        // Espace enchaîne le tour : il lance les dés, puis résout l'appariement. Les deux
        // gestes les plus répétés de la course, sur la plus grande touche, sans jamais changer
        // de main. `resolve` refuse de lui-même tant que l'appariement est incomplet.
        if (ui.phase === 'idle') {
          e.preventDefault()
          void actions.rollDice()
        } else if (ui.phase === 'pairing') {
          e.preventDefault()
          void actions.resolve()
        }
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
  const bettedSouls = useMemo(() => bettedSoulsOf(ui.bets), [ui.bets])

  const activeSoul = ui.phase === 'resolving' || ui.phase === 'opponent' ? (ui.lastResult?.move.soul ?? null) : null
  const preview = useMemo(() => previewNext(ui), [ui])
  const n = ui.inventory.artefacts.length

  // Sélection d'âmes sur le plateau : panneau de paris ouvert et pari possible.
  const draftSlots = slotCount(betType(draft.type), ui.race.souls.length)
  const selection = betsShown && betOpen ? { souls: draft.souls, max: draftSlots, onToggle: (id: number) => setDraft((d) => toggleDraftSoul(d, id, draftSlots)) } : null

  // Sommeil du contremaître : lancers restants avant que l'adversaire ne saute son tour. 0 = ce
  // tour-ci. Null quand l'artefact n'est pas dans la besace : rien ne s'affiche.
  const sleepIn = ui.opponentAsleep ? 0 : rollsBeforeSleep(ui.inventory, ui.rolls)
  const raceLabel = isBoss ? fill(HUD.bossRace, { n: raceInCircle, total: config.run.racesPerCircle }) : fill(HUD.race, { n: HUD.raceOrdinals[raceInCircle - 1] ?? raceInCircle, total: config.run.racesPerCircle })
  const tabBets = staked > 0 && betOpen ? fill(HUD.tabBetsStaked, { n: ui.bets.length, staked }) : fill(HUD.tabBets, { n: ui.bets.length })

  return (
    <div className={'table' + (betsShown ? ' bets-open' : '') + (shopShown ? ' shop-open' : '')} style={{ ['--step' as string]: `${config.animation.stepMs / speed}ms`, ['--gauge-ms' as string]: `${config.animation.gaugeMs / speed}ms`, ['--dice-ms' as string]: `${config.animation.diceMs / speed}ms`, ['--circle-bg' as string]: `url('/circles/${circleArt(circle)}/bg.jpg')`, ['--circle-bet-bg' as string]: `url('/circles/${circleArt(circle)}/bet-bg.jpg')` }}>
      {/* Rangée haute réservée au HUD (spec 08/C1) : rien ne la recouvre, quel que soit l'état des panneaux. */}
      <header className="topbar-game" data-testid="hud-row">
        <div className="hud hud-left" data-testid="hud-left">
          <span className="hud-big">{fill(HUD.circle, { ordinal })}</span>
          {/* Où l'on en est dans le cercle : un rond par course, rempli jusqu'à celle en cours, la
              dernière étant celle du boss. Le texte reste en libellé accessible et en infobulle. */}
          <ol className="circle-dots" data-testid="circle-dots" aria-label={raceLabel} title={raceLabel}>
            {Array.from({ length: config.run.racesPerCircle }, (_, i) => (
              <li key={i} className={'circle-dot' + (i < raceInCircle - 1 ? ' circle-dot-done' : '') + (i === raceInCircle - 1 ? ' circle-dot-current' : '') + (i === config.run.racesPerCircle - 1 ? ' circle-dot-boss' : '')} aria-hidden="true" />
            ))}
          </ol>
          {/* Sommeil du contremaître : sans compteur visible, le tour sauté arrive comme un
              accident. Avec lui, le joueur peut décider d'en garder un pour le bon moment. */}
          {sleepIn !== null && (
            <span className="muted small" data-testid="foreman-counter" title={UI.artefacts.sleepTitle}>
              {sleepIn === 0 ? UI.artefacts.sleepNow : fill(UI.artefacts.sleepIn, { n: sleepIn })}
            </span>
          )}
        </div>
        <ol className="steps" aria-label={UI.game.steps} data-testid="steps">
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
            <button type="button" className={'chip' + (auto ? ' chip-on' : '')} onClick={() => setAuto(!auto)} title={UI.game.autoTitle}>
              {UI.game.auto}
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

      {/* Course du boss : sa règle change la course entière, et le joueur ne doit pas avoir à
          la jouer de mémoire depuis la carte. Le bandeau la garde sous les yeux. */}
      {bossPower && (
        <div className="boss-bar" data-testid="boss-power">
          <span className="boss-bar-name">☠ {fill(HUD.bossPowerTitle, { boss: circleCfg.boss })}</span>
          <span className="boss-bar-power">{bossPower}</span>
          <span className="boss-bar-hint muted small">{HUD.bossPowerHint}</span>
        </div>
      )}

      {/* La table : deux dalles empilées, la course au-dessus, le guichet en dessous. */}
      <main className="felt-stack">
        {/* La boutique prend la place des deux dalles : tant qu’elle est ouverte, elle est seule. */}
        {shopShown && (
        <section className="slab slab-shop zone zone-top zone-open" data-testid="drawer-shop" data-state="open">
          <div className="panel panel-shop">
            {/* Les trois sorties ramènent aux paris. Depuis que la boutique masque le reste,
                la croix ne peut plus se contenter de la refermer : elle laisserait l'écran
                sans aucun panneau. */}
            <ShopPanel
              vitrine={ui.vitrine ?? []}
              souls={ui.race.souls}
              unlocked={shopUnlocked}
              money={ui.money}
              price={price}
              staked={staked}
              raceIndex={ui.raceIndex}
              inventory={ui.inventory}
              free={freeCharges(ui)}
              level={level}
              onSell={actions.sell}
              onDecap={actions.decap}
              pending={ui.pendingPurchase}
              onBuy={(id, target) => actions.buy(id, target ?? null)}
              onCancel={actions.cancelPurchase}
              onReroll={actions.rerollVitrine}
              onLeave={openBets}
              onGoToBets={openBets}
              onClose={openBets}
            />
            {shopUnlocked && <Inventory inventory={ui.inventory} lateBetCharges={ui.lateBetCharges} level={level} compact />}
          </div>
        </section>
        )}

        {/* Boutique ouverte : ni piste ni paris. Démontés plutôt que masqués en CSS — un
            `display: none` laisse les boutons dans l’ordre de tabulation. */}
        {!shopShown && (
        <section className="slab slab-race">
          {/* Plus de poignée « Boutique » au-dessus de la piste : on y entre par le bouton du
              pied du panneau de paris, et par le raccourci B. Une porte, pas deux. */}
          <div className="zone zone-top" data-testid="drawer-shop" data-state="closed">
            {!prep && <OpponentSlot ui={ui} />}
          </div>
          <div className="board-wrap">
            <Board
              race={ui.race}
              lastResult={ui.lastResult}
              activeSoul={activeSoul}
              highlightSoul={hoverSoul}
              onHoverSoul={setHoverSoul}
              preview={preview}
              selection={selection}
              bettedSouls={bettedSouls}
              personalities={ui.inventory.personalities}
              tieColumns={tieColumns}
              {...(placingTribune ? { onPlaceTribune: (c: number, l: number) => setItemError(actions.putTribune(c, l)) } : {})}
              {...(placingMarkers && !placingTribune ? { onPlaceMarker: (c: number, l: number) => setItemError(actions.putMarker(c, l, markerKind)) } : {})}
            />
            {/* Bandeau des objets à déclencher soi-même : pose de la tribune, des bornes, pièce à deux faces, refus. */}
            {(placingTribune || placingMarkers || canDouble || itemError) && (
              <p className="item-bar" aria-live="polite">
                {placingTribune && <span className="item-hint">{ITEMS.tribuneHint}</span>}
                {/* Bornes du stagiaire : on choisit le type puis la case. La tribune passe d'abord,
                    pour qu'une seule pose soit ouverte à la fois et qu'un clic ne soit pas ambigu. */}
                {placingMarkers && !placingTribune && (
                  <>
                    <span className="item-hint">{fill(ITEMS.markerHint, { n: markersLeft })}</span>
                    {MARKER_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        className={'btn btn-artefact' + (markerKind === kind ? ' btn-artefact-on' : '')}
                        data-testid={`marker-kind-${kind}`}
                        aria-pressed={markerKind === kind}
                        onClick={() => setMarkerKind(kind)}
                      >
                        {MARKER_NAME[kind]}
                      </button>
                    ))}
                  </>
                )}
                {canDouble && (
                  <button type="button" className="btn btn-artefact" onClick={() => setItemError(actions.doubleStakes())}>
                    {fill(ITEMS.double, { stake: stakedOpen(ui.bets) })}
                  </button>
                )}
                {itemError && <span className="item-error">{itemError}</span>}
              </p>
            )}
            <p className="last-event" aria-live="polite">
              <span>{lastEvent}</span>
              {recap.turn !== null && (
                <button type="button" className="recap-btn" onClick={() => setRecapOpen(true)} title={RACE.recapTitle}>
                  {RACE.recap}
                </button>
              )}
            </p>
          </div>
        </section>
        )}

        {!shopShown && (
        <section className={'slab slab-play zone zone-bottom' + (betsShown ? ' zone-open' : '')} data-testid="drawer-bets" data-state={betsShown ? 'open' : 'closed'}>
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
                stakes={stakes}
                price={price}
                bets={ui.bets}
                open={betOpen}
                phase={ui.phase}
                level={level}
                owned={ui.inventory.artefacts}
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
                allIn={allIn}
                {...(prep ? {} : { onClose: () => setBetsOpen(false) })}
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
              {...(has(ui.inventory, 'fioleDeSang') ? { onFiole: (i: number) => setItemError(actions.useFiole(i)) } : {})}
              {...(ui.inventory.dice.some((d) => d.faces.some((f) => f.effect === 'momentum')) ? { onMomentum: (i: number) => setItemError(actions.useMomentum(i)) } : {})}
              {...(has(ui.inventory, 'verrouDeMinos') ? { onLock: (i: number | null) => setItemError(actions.lockDie(i)) } : {})}
              {...(has(ui.inventory, 'bouleDeCocyte') ? { onOrb: () => setItemError(actions.useCocytus()) } : {})}
              {...(ui.inventory.dice.some((d) => d.faces.some((f) => f.effect === 'fusion')) ? { onFuse: (i: number) => setItemError(actions.fuseCombination(i)) } : {})}
              {...(has(ui.inventory, 'crochetDeCharon') ? { onHook: (id: number) => setItemError(actions.useHook(id)) } : {})}
              {...(has(ui.inventory, 'echoDuStyx') ? { onStyx: (id: number) => setItemError(actions.markStyx(id)) } : {})}
              onReset={actions.resetPairing}
              onResolve={() => void actions.resolve()}
              onPairDice={actions.pairDice}
              onRemoveCombinations={actions.removeCombinations}
              onSetCombinations={actions.setCombinations}
            />
          )}
        </section>
        )}
      </main>

      {/* Fin de course : classement et bilan des paris en modale, poignée « Gains » pour la rouvrir */}
      {finished && resultsOpen && (
        <div className="popup-backdrop" onClick={() => setResultsOpen(false)} role="presentation">
          <div className="popup popup-wide" role="dialog" aria-label={HUD.raceResult} data-testid="results-modal" onClick={(e) => e.stopPropagation()}>
            <Ranking race={ui.race} settlement={ui.settlement} money={ui.money} price={price} racesLeft={racesLeft} speed={speed} personalities={ui.inventory.personalities} animate={!resultsSeen} continueLabel={HUD.nextRace} onContinue={() => onFinished(ui)} onClose={() => setResultsOpen(false)} />
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
          <div className="popup" role="dialog" aria-label={UI.game.activeArtefacts} onClick={(e) => e.stopPropagation()}>
            <h2>{UI.game.activeArtefacts}</h2>
            {n === 0 && <p className="muted">{UI.game.noArtefact}</p>}
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
