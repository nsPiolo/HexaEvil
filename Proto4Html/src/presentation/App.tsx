/**
 * Routeur d'écrans et orchestration du run (interface.md) :
 * splash → menu → (intro) → jeu ↔ dialogues de transition → fin.
 * Le jeu (GameScreen) joue une rencontre ; ici on enchaîne les rencontres, les
 * cercles, le prix à payer, la sauvegarde et les statistiques.
 */
import { useCallback, useEffect, useState } from 'react'
import { config, shop } from '../core/config'
import { defaultInventory, findItem } from '../core/shop/shop'
import type { ShopItem } from '../core/shop/items'
import { allIds, drawUnlock, lockedItems, unlockedIds, unlockedItems } from '../core/shop/unlocks'
import { circleAt } from '../core/rules/circles'
import { randomSeed, seededRng } from '../core/rules/rng'
import { circleBg } from './art'
import { bossAnnounce, bossIntro, circleFailure, circleSuccess, rankOfLevel, spokenBy } from './demon'
import { DevMenu } from './DevMenu'
import { Dialogue } from './Dialogue'
import { GameScreen } from './GameScreen'
import { MapScreen } from './MapScreen'
import { CollectionScreen, DebtScreen, EndScreen, Menu, OptionsScreen, Splash, StatsScreen, UnlockScreen } from './Screens'
import { clearRun, loadOptions, loadRun, loadStats, loadUnlocks, saveOptions, saveRun, saveUnlocks, updateStats, type Options, type RunSave, type Stats } from './storage'
import { DEV, INTRO, MENU, fill, type Line } from './texts'
import { carryOut, circleOf, fullCharges, type RaceUi, type SessionCarry } from './useRace'
import { e2eMode, e2eStart } from './urlParams'

type Screen =
  | { kind: 'splash' }
  | { kind: 'menu' }
  | { kind: 'stats' }
  | { kind: 'collection' }
  | { kind: 'options' }
  | { kind: 'intro' }
  | { kind: 'map'; carry: SessionCarry }
  | { kind: 'game'; carry: SessionCarry; key: number }
  | { kind: 'dialogue'; lines: readonly Line[]; then: Screen; skip?: string; background?: string }
  | { kind: 'unlock'; item: ShopItem; remaining: number; then: Screen }
  | { kind: 'debt'; carry: SessionCarry; price: number; borrow: number; circle: number }
  | { kind: 'end'; end: 'gameover' | 'escape'; price: number; money: number; carry?: SessionCarry }

function toSave(carry: SessionCarry, bestCircle: number): RunSave {
  return { ...carry, bestCircle, savedAt: Date.now() }
}

/** Paramètre d'un objet de boutique, par son id. */
function itemParam(id: string, key: string, fallback: number): number {
  return findItem(shop, id).params[key] ?? fallback
}

/**
 * Prix réellement dû pour un cercle : celui de la config, plus les intérêts de la Dette
 * infernale contractée au cercle précédent (artefacts.md n°20).
 */
function priceDue(base: number, carry: SessionCarry): number {
  return base + Math.round((carry.debt ?? 0) * itemParam('detteInfernale', 'interest', 1.5))
}

/**
 * Somme que la Dette infernale accepte de prêter : ce qui manque, plafonné à une part du prix,
 * et une seule fois par run. Zéro si l'emprunt ne suffirait pas à payer — on ne prête pas pour rien.
 */
function loanOffer(carry: SessionCarry, price: number): number {
  if (!carry.inventory.artefacts.includes('detteInfernale') || carry.debtUsed) return 0
  const missing = price - carry.money
  const cap = Math.floor(price * itemParam('detteInfernale', 'maxRatio', 0.5))
  return missing > 0 && missing <= cap ? missing : 0
}

/**
 * Mode e2e (`?e2e=1`, spec 07/T2) : nouveau run lancé directement sur l'écran de jeu, sans
 * splash ni intro, sauvegarde effacée, vitesse ×4. `?money=` et `?race=` règlent le départ.
 * Le catalogue y est entièrement déblocable (voir `unlocked` plus bas) : les graines de
 * référence de `e2e/seeds.ts` tirent leur vitrine dans les seize objets.
 */
function e2eScreen(): Screen | null {
  if (!e2eMode()) return null
  const { money, raceIndex } = e2eStart()
  clearRun()
  const carry: SessionCarry = { money: money ?? config.economy.startingMoney, inventory: defaultInventory(config), raceIndex: raceIndex ?? 0, lateBetCharges: 0 }
  return { kind: 'game', carry, key: 1 }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => e2eScreen() ?? { kind: 'splash' })
  const [options, setOptions] = useState<Options>(() => (e2eMode() ? { ...loadOptions(), speed: e2eStart().speed } : loadOptions()))
  const [stats, setStats] = useState<Stats>(loadStats)
  const [save, setSave] = useState<RunSave | null>(loadRun)
  /**
   * Objets descellés, méta-progression conservée entre les runs (`core/shop/unlocks.ts`).
   * En mode e2e, tout le catalogue est ouvert : les graines de référence restent valables.
   */
  const [unlocked, setUnlocked] = useState<readonly string[]>(() => (e2eMode() ? allIds(shop) : unlockedIds(shop, loadUnlocks())))
  const [gameKey, setGameKey] = useState(0)
  const [devOpen, setDevOpen] = useState(false)

  useEffect(() => saveOptions(options), [options])

  // Menu développeur : Ctrl+Maj+D (ou Cmd+Maj+D), en plus du petit bouton « dev ».
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setDevOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toMenu = useCallback(() => setScreen({ kind: 'menu' }), [])

  /** Le joueur quitte une fin : le run est clos pour de bon, la sauvegarde effacée. */
  const endRun = useCallback((): void => {
    clearRun()
    setSave(null)
    toMenu()
  }, [toMenu])

  const startGame = useCallback((carry: SessionCarry): void => {
    setGameKey((k) => k + 1)
    setScreen({ kind: 'game', carry, key: gameKey + 1 })
  }, [gameKey])

  /**
   * Lancement d'une course depuis la carte. La dernière course d'un cercle est celle du boss :
   * il se présente d'abord, dans le décor du cercle (`bossIntro`, demon.ts).
   */
  const launchRace = (carry: SessionCarry): void => {
    const { circle, raceInCircle } = circleOf(carry.raceIndex)
    if (raceInCircle < config.run.racesPerCircle) {
      startGame(carry)
      return
    }
    setScreen({ kind: 'dialogue', lines: bossIntro(circle), then: { kind: 'game', carry, key: gameKey + 1 }, skip: MENU.skip, background: circleBg(circle) })
  }

  /** Entre deux courses : la carte des neuf cercles, d'où le joueur lance la course suivante. Pas de carte avant la toute première course : l'intro suffit. */
  const toMap = useCallback((carry: SessionCarry): void => {
    if (carry.raceIndex === 0) startGame(carry)
    else setScreen({ kind: 'map', carry })
  }, [startGame])

  const newRun = (): void => {
    setStats(updateStats((s) => ({ ...s, attempts: s.attempts + 1 })))
    const carry: SessionCarry = { money: config.economy.startingMoney, inventory: defaultInventory(config), raceIndex: 0, lateBetCharges: 0 }
    const s = toSave(carry, 1)
    saveRun(s)
    setSave(s)
    // `spokenBy` pose le portrait du grade 0 sur chaque réplique : l'intro est le seul dialogue qui ne passe pas par demon.ts.
    const intro = spokenBy(INTRO, rankOfLevel(0)).map((l) => ({ ...l, text: fill(l.text, { money: config.economy.startingMoney, allowance: config.economy.raceAllowance }) }))
    setScreen({ kind: 'dialogue', lines: intro, then: { kind: 'game', carry, key: gameKey + 1 }, skip: MENU.skipIntro })
  }

  /** État du run visible à l'écran, sinon la sauvegarde. */
  const currentCarry = (): SessionCarry | null => {
    if (screen.kind === 'map' || screen.kind === 'game') return screen.carry
    if (screen.kind === 'dialogue' && (screen.then.kind === 'map' || screen.then.kind === 'game')) return screen.then.carry
    return save ? { money: save.money, inventory: save.inventory, raceIndex: save.raceIndex, lateBetCharges: save.lateBetCharges } : null
  }

  /** Menu développeur : on repart au début de la course choisie, avec le solde demandé, inventaire conservé. */
  const devApply = (c: SessionCarry): void => {
    const carry: SessionCarry = c.inventory.dice.length > 0 ? c : { ...c, inventory: defaultInventory(config) }
    const s = toSave(carry, circleOf(carry.raceIndex).circle)
    saveRun(s)
    setSave(s)
    setDevOpen(false)
    toMap(carry)
  }

  const continueRun = (): void => {
    if (!save) return
    toMap({ money: save.money, inventory: save.inventory, raceIndex: save.raceIndex, lateBetCharges: save.lateBetCharges })
  }

  /** Fin d'une rencontre : statistiques, sauvegarde, puis dialogue de boss, transition de cercle ou course suivante. */
  const onRaceFinished = (ui: RaceUi): void => {
    const carry = carryOut(ui)
    const finished = ui.raceIndex
    const { circle, raceInCircle } = circleOf(finished)
    const circleCfg = circleAt(config.run, circle)
    const staked = ui.settlement?.staked ?? 0
    const returned = ui.settlement?.returned ?? 0
    setStats(
      updateStats((s) => ({
        ...s,
        races: s.races + 1,
        moneyWon: s.moneyWon + returned,
        moneySpent: s.moneySpent + staked + ui.tally.spent,
        bestBet: Math.max(s.bestBet, ui.tally.bestBet),
        bestCircle: Math.max(s.bestCircle, circle),
      })),
    )

    const persist = (c: SessionCarry, best: number): void => {
      const s = toSave(c, best)
      saveRun(s)
      setSave(s)
    }

    if (raceInCircle < config.run.racesPerCircle) {
      persist(carry, circle)
      const next: Screen = { kind: 'map', carry }
      if (raceInCircle === config.run.racesPerCircle - 1) {
        setScreen({ kind: 'dialogue', lines: bossAnnounce(circle), then: next })
      } else {
        toMap(carry)
      }
      return
    }

    // Fin de cercle : le prix est dû, intérêts d'une dette précédente compris.
    const price = priceDue(circleCfg.price, carry)
    if (carry.money < price) {
      // Dette infernale : une fois par run, le stagiaire avance le manquant — cher.
      const borrow = loanOffer(carry, price)
      if (borrow > 0) {
        setScreen({ kind: 'debt', carry, price, borrow, circle })
        return
      }
      clearRun()
      setSave(null)
      setScreen({ kind: 'dialogue', lines: circleFailure(circle), then: { kind: 'end', end: 'gameover', price, money: carry.money } })
      return
    }
    payCircle(carry, circle, price, 0)
  }

  /**
   * Prix du cercle réglé : la dette précédente est soldée (ses intérêts étaient dans `price`),
   * une nouvelle dette éventuelle est notée pour le cercle suivant, et un objet se descelle.
   */
  const payCircle = (carry: SessionCarry, circle: number, price: number, borrowed: number): void => {
    const paid: SessionCarry = {
      ...carry,
      money: carry.money + borrowed - price,
      lateBetCharges: fullCharges(carry.inventory),
      // Le Marteau d'Héphaïstos réarme sa forge offerte à chaque cercle.
      forgeFreeUsed: false,
      debt: borrowed,
      debtUsed: carry.debtUsed || borrowed > 0,
    }
    const persist = (c: SessionCarry, best: number): void => {
      const s = toSave(c, best)
      saveRun(s)
      setSave(s)
    }
    // Le run continue toujours : au-delà du dernier cercle écrit, le paradis se rejoue (circles.ts).
    persist(paid, circle + 1)

    // Le prix payé descelle un objet du catalogue, définitivement (core/shop/unlocks.ts). Un
    // cercle raté n'en descelle aucun : on n'arrive ici qu'avec le prix réglé.
    const gained = drawUnlock(shop, unlocked, seededRng(randomSeed()))
    let remaining = 0
    if (gained) {
      const next = [...unlocked, gained.id]
      remaining = shop.items.length - next.length
      setUnlocked(next)
      saveUnlocks(next)
    }
    /** La révélation s'intercale entre le dialogue de fin de cercle et la suite. */
    const reveal = (then: Screen): Screen => (gained ? { kind: 'unlock', item: gained, remaining, then } : then)

    if (circle === config.run.escapeCircle) {
      // Neuvième cercle payé : l'évasion est acquise, mais le joueur peut rester et monter (GDD §5.3).
      setStats(updateStats((s) => ({ ...s, escapes: s.escapes + 1 })))
      setScreen({ kind: 'dialogue', lines: circleSuccess(circle), then: reveal({ kind: 'end', end: 'escape', price, money: paid.money, carry: paid }) })
      return
    }
    setScreen({ kind: 'dialogue', lines: circleSuccess(circle), then: reveal({ kind: 'map', carry: paid }) })
  }

  const renderScreen = () => {
    switch (screen.kind) {
      case 'splash':
        return <Splash onDone={toMenu} />
      case 'menu':
        return (
          <Menu
            canContinue={save !== null}
            onContinue={continueRun}
            onNewRun={newRun}
            onStats={() => setScreen({ kind: 'stats' })}
            onCollection={() => setScreen({ kind: 'collection' })}
            onOptions={() => setScreen({ kind: 'options' })}
          />
        )
      case 'stats':
        return <StatsScreen stats={stats} onBack={toMenu} />
      case 'collection':
        return <CollectionScreen items={unlockedItems(shop, unlocked)} lockedCount={lockedItems(shop, unlocked).length} onBack={toMenu} />
      case 'debt':
        return (
          <DebtScreen
            price={screen.price}
            money={screen.carry.money}
            borrow={screen.borrow}
            interest={Math.round(screen.borrow * itemParam('detteInfernale', 'interest', 1.5))}
            onBorrow={() => payCircle(screen.carry, screen.circle, screen.price, screen.borrow)}
            onRefuse={() => {
              clearRun()
              setSave(null)
              setScreen({ kind: 'dialogue', lines: circleFailure(screen.circle), then: { kind: 'end', end: 'gameover', price: screen.price, money: screen.carry.money } })
            }}
          />
        )
      case 'options':
        return <OptionsScreen options={options} onChange={setOptions} onBack={toMenu} />
      case 'intro':
        return null
      case 'dialogue':
        return (
          <Dialogue
            lines={screen.lines}
            {...(screen.skip === undefined ? {} : { skipLabel: screen.skip })}
            {...(screen.background === undefined ? {} : { background: screen.background })}
            onDone={() => {
              const then = screen.then
              if (then.kind === 'game') startGame(then.carry)
              else setScreen(then)
            }}
          />
        )
      case 'unlock':
        return (
          <UnlockScreen
            item={screen.item}
            remaining={screen.remaining}
            onDone={() => {
              const then = screen.then
              if (then.kind === 'game') startGame(then.carry)
              else setScreen(then)
            }}
          />
        )
      case 'map':
        return <MapScreen carry={screen.carry} onLaunch={() => launchRace(screen.carry)} onMenu={toMenu} />
      case 'game':
        return <GameScreen key={screen.key} carry={screen.carry} unlocked={unlocked} speed={options.speed} onFinished={onRaceFinished} onMenu={toMenu} />
      case 'end': {
        const carry = screen.carry
        return (
          <EndScreen kind={screen.end} price={screen.price} money={screen.money} {...(carry === undefined ? {} : { onContinue: () => toMap(carry) })} onBack={endRun} />
        )
      }
    }
  }

  const dev = (
    <>
      {screen.kind !== 'splash' && (
        <button type="button" className="dev-open" onClick={() => setDevOpen(true)} title="Menu développeur (Ctrl+Maj+D)">
          {DEV.open}
        </button>
      )}
      {devOpen && <DevMenu carry={currentCarry()} onApply={devApply} onClose={() => setDevOpen(false)} />}
    </>
  )

  return (
    <>
      {renderScreen()}
      {dev}
    </>
  )
}
