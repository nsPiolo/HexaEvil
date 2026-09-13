/**
 * Routeur d'écrans et orchestration du run (interface.md) :
 * splash → menu → (intro) → jeu ↔ dialogues de transition → fin.
 * Le jeu (GameScreen) joue une rencontre ; ici on enchaîne les rencontres, les
 * cercles, le prix à payer, la sauvegarde et les statistiques.
 */
import { useCallback, useEffect, useState } from 'react'
import { config } from '../core/config'
import { defaultInventory } from '../core/shop/shop'
import { Dialogue } from './Dialogue'
import { GameScreen } from './GameScreen'
import { EndScreen, Menu, OptionsScreen, Splash, StatsScreen } from './Screens'
import { clearRun, loadOptions, loadRun, loadStats, saveOptions, saveRun, updateStats, type Options, type RunSave, type Stats } from './storage'
import { BOSS_ANNOUNCE, CIRCLES, INTRO, MENU, fill, type Line } from './texts'
import { carryOut, circleOf, fullCharges, type RaceUi, type SessionCarry } from './useRace'

type Screen =
  | { kind: 'splash' }
  | { kind: 'menu' }
  | { kind: 'stats' }
  | { kind: 'options' }
  | { kind: 'intro' }
  | { kind: 'game'; carry: SessionCarry; key: number }
  | { kind: 'dialogue'; lines: readonly Line[]; then: Screen; skippable: boolean }
  | { kind: 'end'; end: 'gameover' | 'escape'; price: number; money: number }

function toSave(carry: SessionCarry, bestCircle: number): RunSave {
  return { ...carry, bestCircle, savedAt: Date.now() }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'splash' })
  const [options, setOptions] = useState<Options>(loadOptions)
  const [stats, setStats] = useState<Stats>(loadStats)
  const [save, setSave] = useState<RunSave | null>(loadRun)
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => saveOptions(options), [options])

  const toMenu = useCallback(() => setScreen({ kind: 'menu' }), [])

  const startGame = useCallback((carry: SessionCarry): void => {
    setGameKey((k) => k + 1)
    setScreen({ kind: 'game', carry, key: gameKey + 1 })
  }, [gameKey])

  const newRun = (): void => {
    setStats(updateStats((s) => ({ ...s, attempts: s.attempts + 1 })))
    const carry: SessionCarry = { money: config.economy.startingMoney, inventory: defaultInventory(config), raceIndex: 0, lateBetCharges: 0 }
    const s = toSave(carry, 1)
    saveRun(s)
    setSave(s)
    setScreen({ kind: 'dialogue', lines: INTRO.map((l) => ({ ...l, text: fill(l.text, { money: config.economy.startingMoney }) })), then: { kind: 'game', carry, key: gameKey + 1 }, skippable: true })
  }

  const continueRun = (): void => {
    if (!save) return
    startGame({ money: save.money, inventory: save.inventory, raceIndex: save.raceIndex, lateBetCharges: save.lateBetCharges })
  }

  /** Fin d'une rencontre : statistiques, sauvegarde, puis dialogue de boss, transition de cercle ou course suivante. */
  const onRaceFinished = (ui: RaceUi): void => {
    const carry = carryOut(ui)
    const finished = ui.raceIndex
    const { circle, raceInCircle } = circleOf(finished)
    const circleCfg = config.run.circles[circle - 1]!
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
      const next: Screen = { kind: 'game', carry, key: gameKey + 1 }
      if (raceInCircle === config.run.racesPerCircle - 1) {
        setScreen({ kind: 'dialogue', lines: BOSS_ANNOUNCE.map((l) => ({ ...l, text: fill(l.text, { price: circleCfg.price }) })), then: next, skippable: false })
      } else {
        startGame(carry)
      }
      return
    }

    // Fin de cercle : le prix est dû.
    const texts = CIRCLES[circle - 1] ?? CIRCLES[CIRCLES.length - 1]!
    if (carry.money < circleCfg.price) {
      clearRun()
      setSave(null)
      setScreen({ kind: 'dialogue', lines: texts.failure, then: { kind: 'end', end: 'gameover', price: circleCfg.price, money: carry.money }, skippable: false })
      return
    }
    const paid: SessionCarry = { ...carry, money: carry.money - circleCfg.price, lateBetCharges: fullCharges(carry.inventory) }
    const nextCircleCfg = config.run.circles[circle]
    if (!nextCircleCfg) {
      // Neuvième cercle payé : évasion.
      clearRun()
      setSave(null)
      setStats(updateStats((s) => ({ ...s, escapes: s.escapes + 1 })))
      setScreen({ kind: 'dialogue', lines: texts.success, then: { kind: 'end', end: 'escape', price: circleCfg.price, money: paid.money }, skippable: false })
      return
    }
    persist(paid, circle + 1)
    const lines = texts.success.map((l) => ({ ...l, text: fill(l.text, { souls: nextCircleCfg.souls, price: nextCircleCfg.price }) }))
    setScreen({ kind: 'dialogue', lines, then: { kind: 'game', carry: paid, key: gameKey + 1 }, skippable: false })
  }

  switch (screen.kind) {
    case 'splash':
      return <Splash onDone={toMenu} />
    case 'menu':
      return <Menu canContinue={save !== null} onContinue={continueRun} onNewRun={newRun} onStats={() => setScreen({ kind: 'stats' })} onOptions={() => setScreen({ kind: 'options' })} />
    case 'stats':
      return <StatsScreen stats={stats} onBack={toMenu} />
    case 'options':
      return <OptionsScreen options={options} onChange={setOptions} onBack={toMenu} />
    case 'intro':
      return null
    case 'dialogue':
      return (
        <Dialogue
          lines={screen.lines}
          {...(screen.skippable ? { skipLabel: MENU.skipIntro } : {})}
          onDone={() => {
            const then = screen.then
            if (then.kind === 'game') startGame(then.carry)
            else setScreen(then)
          }}
        />
      )
    case 'game':
      return <GameScreen key={screen.key} carry={screen.carry} speed={options.speed} onFinished={onRaceFinished} onMenu={toMenu} />
    case 'end':
      return <EndScreen kind={screen.end} price={screen.price} money={screen.money} onBack={toMenu} />
  }
}
