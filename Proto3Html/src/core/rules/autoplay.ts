/**
 * Pilote automatique — répond aux questions du moteur à la place d'un humain.
 *
 * Sert deux usages : les tests d'intégration, et le **mode lot** (`M1`, `U14`)
 * qui joue des runs entiers sans affichage. Le joueur automatique utilise la
 * même IA que les démons : il ne joue donc **pas** la cupidité (`D12`), qui
 * reste une décision proprement humaine.
 */

import { aiCoin, aiReward, aiRerolls, aiTarget, aiTurn, settingsFor, type AiSettings } from '../ai/ai'
import type { GameConfig } from '../config/schema'
import type { Answer, Ask } from './asks'
import type { MatchDriver, MatchParticipant } from './match'
import type { Rng } from './random'

export interface AutoContext {
  readonly cfg: GameConfig
  readonly circleIndex: number
  readonly participants: readonly MatchParticipant[]
  readonly chips: readonly number[]
  readonly rng: Rng
  /** Niveau du joueur automatique. Par défaut celui du Cercle, comme les démons. */
  readonly settings?: AiSettings | undefined
}

export function autoAnswer(ask: Ask, ctx: AutoContext): Answer {
  const cfg = ctx.cfg
  const circle = cfg.circles[ctx.circleIndex]
  if (!circle) throw new Error('Cercle introuvable')
  const settings: AiSettings = ctx.settings ?? settingsFor(cfg.ai, 0, ctx.circleIndex)

  switch (ask.kind) {
    case 'mulligan': {
      // Le pilote ne voit pas la pile restante : il joue sans changer, ce qui
      // est le comportement neutre (`C15` autorise la passe).
      return { kind: 'mulligan', swap: [] }
    }
    case 'coin':
      return { kind: 'coin', side: aiCoin(ctx.rng) }
    case 'reward':
      return { kind: 'reward', id: aiReward(ask.offered, settings, ctx.rng) }
    case 'rewardTarget':
      return { kind: 'rewardTarget', target: aiTarget(ask.candidates, ctx.chips) }
    case 'chooseRerolls':
      return { kind: 'chooseRerolls', value: aiRerolls(settings, ask.options) }
    case 'turn': {
      const p = ctx.participants[ask.context.who]
      if (!p) throw new Error('participant introuvable')
      // `B8` : « Un dé en plus » ajoute un dé au participant pour la phase.
      const dice = [...p.dice]
      while (dice.length < ask.context.diceCount) dice.push(dice[dice.length - 1] as (typeof dice)[number])
      const action = aiTurn(
        {
          dice,
          values: ask.context.values,
          hand: ask.context.hand,
          throwNo: ask.context.throwNo,
          maxThrows: ask.context.maxThrows,
          faces: circle.dieFaces,
          combos: cfg.combinations,
          topN: settings.topN,
        },
        ctx.rng,
      )
      return { kind: 'turn', action }
    }
  }
}

/** Joue une partie entière sans affichage, et renvoie la trace complète. */
export function autoPlay(driver: MatchDriver, ctx: Omit<AutoContext, 'chips'>) {
  const steps = [...driver.steps]
  let guard = 0
  while (driver.ask && !driver.result) {
    if (guard++ > 100_000) throw new Error('pilote automatique bloqué')
    const answer = autoAnswer(driver.ask, { ...ctx, chips: driver.live.chips })
    driver.advance(answer)
    steps.push(...driver.steps)
  }
  return { steps, result: driver.result }
}
