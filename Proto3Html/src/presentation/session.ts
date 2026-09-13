/**
 * Session de jeu : le run, la partie en cours, et la file d'étapes à rejouer.
 *
 * Objet **mutable** avec abonnement, plutôt qu'un état React immuable : le
 * moteur est un générateur, il a sa propre continuation, et la recopier à
 * chaque étape n'apporterait rien. La présentation ne fait que lire (ADR-0003).
 */

import { settingsFor } from '../core/ai/ai'
import { peekUid, restoreUid } from '../core/cards/deck'
import type { GameConfig, ShopOptionId } from '../core/config/schema'
import type { Answer, Ask } from '../core/rules/asks'
import { autoAnswer } from '../core/rules/autoplay'
import { autoShop } from '../core/rules/autoshop'
import type { MatchDriver } from '../core/rules/match'
import { createRng, type Rng } from '../core/rules/random'
import {
  createRun,
  currentCircle,
  finishMatch,
  HUMAN,
  buyBonus,
  openShopOption,
  rollShopOffers,
  startMatch,
  type MatchOutcome,
  type RunState,
  type ShopSession,
} from '../core/rules/run'
import type { TraceStep } from '../core/rules/trace'
import type { RewardId } from '../core/rules/types'
import { circleCleared, type Bubble } from './dialogues'
import { addStats, clearSave, writeSave, type SavedRun } from './storage'

export interface Snapshot {
  readonly pot: number
  readonly chips: readonly number[]
}

/** `transition` : l'écran de fin de Cercle, entre la victoire et la boutique. */
export type Screen = 'match' | 'transition' | 'shop' | 'dead' | 'won'

export class Session {
  readonly cfg: GameConfig
  rng: Rng
  run: RunState
  driver: MatchDriver | null = null
  queue: TraceStep[] = []
  /** État visible **après** chaque étape, pour interpoler pot et piles. */
  after: Snapshot[] = []
  cursor = 0
  speed = 1
  /** `U17` : le joueur est remplacé par la machine, pour regarder jouer. */
  autoPilot = false
  screen: Screen = 'match'
  outcome: MatchOutcome | null = null
  shop: ShopSession | null = null
  shopError: string | null = null
  /** Les bulles de l'écran de fin de Cercle, vides le reste du temps. */
  bubbles: Bubble[] = []
  private resultApplied = false
  private readonly listeners = new Set<() => void>()

  constructor(cfg: GameConfig, saved?: SavedRun | null) {
    this.cfg = cfg
    this.rng = createRng(cfg.seed)
    this.run = createRun(cfg)
    if (saved) {
      this.restore(saved)
      rollShopOffers(this.run, this.rng)
      // La reprise remet le joueur dans la boutique, jamais au milieu d'une
      // rencontre : c'est le point de sauvegarde que fixe la spéc.
      this.screen = 'shop'
    } else {
      this.beginMatch()
    }
  }

  private restore(saved: SavedRun): void {
    this.rng.setState(saved.rngState)
    restoreUid(saved.nextUid)
    this.run.circleIndex = saved.circleIndex
    this.run.wins = saved.wins
    this.run.matchesPlayed = saved.matchesPlayed
    this.run.money = saved.money
    this.run.forgePoints = saved.forgePoints
    this.run.deck = saved.deck.map((c) => ({ ...c }))
    this.run.dice = saved.dice.map((d) => ({ faces: d.faces.map((f) => ({ ...f })) }))
    this.run.bestCircle = saved.bestCircle
    this.run.lastMoney = saved.lastMoney
    this.run.totalMoney = saved.totalMoney
    // `A8` : les bonus font partie du run, donc de la sauvegarde.
    this.run.bonuses = [...saved.bonuses]
  }

  private persist(): void {
    if (this.run.status !== 'playing') {
      clearSave()
      return
    }
    writeSave({
      circleIndex: this.run.circleIndex,
      wins: this.run.wins,
      matchesPlayed: this.run.matchesPlayed,
      money: this.run.money,
      forgePoints: this.run.forgePoints,
      deck: this.run.deck.map((c) => ({ ...c })),
      dice: this.run.dice.map((d) => ({ faces: d.faces.map((f) => ({ ...f })) })),
      bonuses: [...this.run.bonuses],
      bestCircle: this.run.bestCircle,
      lastMoney: this.run.lastMoney,
      totalMoney: this.run.totalMoney,
      rngState: this.rng.getState(),
      nextUid: peekUid(),
    })
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) fn()
  }

  get names(): readonly string[] {
    return this.driver?.live.names ?? []
  }

  get idle(): boolean {
    return this.cursor >= this.queue.length
  }

  get step(): TraceStep | null {
    return this.queue[this.cursor] ?? null
  }

  get ask(): Ask | null {
    return this.idle ? (this.driver?.ask ?? null) : null
  }

  get snapshot(): Snapshot {
    const last = this.after[this.after.length - 1]
    return last ?? { pot: currentCircle(this.run).pot, chips: [] }
  }

  /** Interpolation entre l'état d'avant et celui d'après l'étape en cours. */
  frame(progress: number): Snapshot {
    if (this.idle) return this.snapshot
    const before = this.after[this.cursor - 1] ?? { pot: currentCircle(this.run).pot, chips: [] }
    const target = this.after[this.cursor] ?? before
    const mix = (a: number, b: number): number => Math.round(a + (b - a) * progress)
    return {
      pot: mix(before.pot, target.pot),
      chips: target.chips.map((c, i) => mix(before.chips[i] ?? 0, c)),
    }
  }

  /** Variation en cours par participant, pour les jetons volants (`U3`). */
  deltas(): number[] {
    if (this.idle) return []
    const before = this.after[this.cursor - 1]
    const target = this.after[this.cursor]
    if (!before || !target) return []
    return target.chips.map((c, i) => c - (before.chips[i] ?? 0))
  }

  beginMatch(): void {
    this.resultApplied = false
    this.outcome = null
    this.shop = null
    this.bubbles = []
    this.screen = 'match'
    this.driver = startMatch(this.run, this.rng)
    this.queue = []
    this.after = []
    this.cursor = 0
    this.push(this.driver.steps)
    this.emit()
  }

  /** Sortie de l'écran de fin de Cercle : on passe en boutique. */
  closeTransition(): void {
    this.bubbles = []
    this.enterShop()
    this.emit()
  }

  /** `A9` : l'offre de la boutique se tire **une fois par visite**. */
  private enterShop(): void {
    this.screen = 'shop'
    rollShopOffers(this.run, this.rng)
  }

  /** `A9` : achat d'un bonus, qui rejoint la réserve du run. */
  buyBonus(id: RewardId): void {
    try {
      buyBonus(this.run, id)
      this.shopError = null
      this.persist()
    } catch (e) {
      this.shopError = e instanceof Error ? e.message : String(e)
    }
    this.emit()
  }

  private push(steps: readonly TraceStep[]): void {
    const circle = currentCircle(this.run)
    let pot = this.after[this.after.length - 1]?.pot ?? circle.pot
    let chips = [...(this.after[this.after.length - 1]?.chips ?? this.driver?.live.names.map(() => 0) ?? [])]
    for (const s of steps) {
      if ('pot' in s && typeof s.pot === 'number') pot = s.pot
      if ('chips' in s && Array.isArray(s.chips)) chips = [...(s.chips as number[])]
      this.queue.push(s)
      this.after.push({ pot, chips: [...chips] })
    }
  }

  next(): void {
    if (this.idle) return
    this.cursor++
    if (this.idle) this.settle()
    this.emit()
  }

  skip(): void {
    this.cursor = this.queue.length
    this.settle()
    this.emit()
  }

  setSpeed(speed: number): void {
    this.speed = speed
    this.emit()
  }

  setAutoPilot(on: boolean): void {
    this.autoPilot = on
    this.emit()
  }

  /**
   * Un pas de pilote automatique. Il répond à la question en attente avec la
   * même IA que les démons — mais au niveau `expert`, pour que la démonstration
   * montre le jeu bien joué. Il ne joue **pas** la cupidité (`D12`), qui reste
   * une décision proprement humaine.
   */
  autoStep(): void {
    if (this.screen === 'transition') {
      this.closeTransition()
      return
    }
    if (this.screen === 'shop') {
      const before = this.run.money
      autoShop(this.run, this.rng)
      addStats({ moneySpent: Math.max(0, before - this.run.money) })
      this.beginMatch()
      return
    }
    if (this.screen !== 'match') return
    const ask = this.ask
    if (!ask || !this.driver) return
    const settings = { ...settingsFor(this.cfg.ai, 0, this.run.circleIndex), temperature: 0 }
    this.answer(
      autoAnswer(ask, {
        cfg: this.cfg,
        circleIndex: this.run.circleIndex,
        participants: this.driver.participants,
        chips: this.driver.live.chips,
        rng: this.rng,
        settings,
      }),
    )
  }

  /** Ce que la partie qui vient de finir ajoute au compteur de statistiques. */
  private tally(won: boolean): void {
    let battles = 0
    let battlesWon = 0
    let count421 = 0
    for (const s of this.queue) {
      if (s.kind === 'duelStart') battles++
      else if (s.kind === 'duelWon' && s.who === HUMAN) battlesWon++
      else if (s.kind === 'turnEnd' && s.who === HUMAN && s.hand.id === '421') count421++
    }
    addStats({
      battles,
      battlesWon,
      count421,
      matchesWon: won ? 1 : 0,
      bestCircle: this.run.bestCircle,
      escapes: this.run.status === 'won' ? 1 : 0,
    })
  }

  /** Fin d'animation : c'est seulement là qu'on encaisse le résultat de la partie. */
  private settle(): void {
    const result = this.driver?.result
    if (!result || this.resultApplied) return
    this.resultApplied = true
    const before = currentCircle(this.run)
    this.outcome = finishMatch(this.run, result)
    this.tally(this.outcome.won)

    if (this.run.status === 'dead') this.screen = 'dead'
    else if (this.run.status === 'won') this.screen = 'won'
    else if (this.outcome.circleCleared) {
      // Fin de Cercle : le démon commente ce qui change avant la boutique.
      this.bubbles = circleCleared(before, currentCircle(this.run))
      this.screen = 'transition'
    } else this.enterShop()

    // Point de sauvegarde : la rencontre est finie, la boutique n'a pas encore
    // servi. C'est là que « Continuer » reprendra.
    this.persist()
  }

  answer(answer: Answer): void {
    if (!this.driver) return
    this.driver.advance(answer)
    this.push(this.driver.steps)
    this.emit()
  }

  /* ------------------------------------------------------------ Boutique */

  openShop(option: ShopOptionId): void {
    try {
      this.shop = openShopOption(this.run, option, this.rng)
      this.shopError = null
    } catch (e) {
      this.shopError = e instanceof Error ? e.message : String(e)
    }
    this.emit()
  }

  closeShop(): void {
    this.shop = null
    this.shopError = null
    this.emit()
  }

  runShopAction(fn: () => void): void {
    const beforeMoney = this.run.money
    try {
      fn()
      this.shop = null
      this.shopError = null
      addStats({ moneySpent: Math.max(0, beforeMoney - this.run.money) })
      this.persist()
    } catch (e) {
      this.shopError = e instanceof Error ? e.message : String(e)
    }
    this.emit()
  }
}
