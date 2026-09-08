/**
 * Session de jeu : le run, la partie en cours, et la file d'étapes à rejouer.
 *
 * Objet **mutable** avec abonnement, plutôt qu'un état React immuable : le
 * moteur est un générateur, il a sa propre continuation, et la recopier à
 * chaque étape n'apporterait rien. La présentation ne fait que lire (ADR-0003).
 */

import { settingsFor } from '../core/ai/ai'
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
  openShopOption,
  startMatch,
  type MatchOutcome,
  type RunState,
  type ShopSession,
} from '../core/rules/run'
import type { TraceStep } from '../core/rules/trace'

export interface Snapshot {
  readonly pot: number
  readonly chips: readonly number[]
}

export type Screen = 'match' | 'shop' | 'dead' | 'won'

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
  private resultApplied = false
  private readonly listeners = new Set<() => void>()

  constructor(cfg: GameConfig) {
    this.cfg = cfg
    this.rng = createRng(cfg.seed)
    this.run = createRun(cfg)
    this.beginMatch()
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

  /** Variation en cours par participant, pour les étiquettes flottantes (`U3`). */
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
    this.screen = 'match'
    this.driver = startMatch(this.run, this.rng)
    this.queue = []
    this.after = []
    this.cursor = 0
    this.push(this.driver.steps)
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
    if (this.screen === 'shop') {
      autoShop(this.run, this.rng)
      this.beginMatch()
      return
    }
    if (this.screen !== 'match') return
    const ask = this.ask
    if (!ask || !this.driver) return
    const settings = { ...settingsFor(this.cfg.ai, 0, this.run.circleIndex), topN: 1 }
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

  /** Fin d'animation : c'est seulement là qu'on encaisse le résultat de la partie. */
  private settle(): void {
    const result = this.driver?.result
    if (!result || this.resultApplied) return
    this.resultApplied = true
    this.outcome = finishMatch(this.run, result)
    this.screen = this.run.status === 'dead' ? 'dead' : this.run.status === 'won' ? 'won' : 'shop'
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
    try {
      fn()
      this.shop = null
      this.shopError = null
    } catch (e) {
      this.shopError = e instanceof Error ? e.message : String(e)
    }
    this.emit()
  }

  restart(): void {
    this.run = createRun(this.cfg, this.run.bestCircle)
    this.beginMatch()
  }
}
