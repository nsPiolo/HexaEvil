/**
 * Une partie complète — GDD §3 (`S1`), §6 (`B*`), §7 (`D*`), §9 (`J*`).
 *
 * Écrit comme un **générateur** : la séquence `S1` se lit alors linéairement, de
 * haut en bas, et chaque décision humaine est un `yield`. Les démons répondent
 * aux mêmes questions sans interrompre le flux (§12).
 *
 * Le moteur ne connaît rien de l'affichage : il émet des étapes (`U2`) que la
 * présentation rejoue dans le temps.
 */

import { aiCoin, aiMulligan, aiReward, aiRerolls, aiTarget, aiTurn, type AiSettings } from '../ai/ai'
import { drawHand, mulligan, type DrawState } from '../cards/deck'
import { compareHands, evaluateHand } from '../cards/hands'
import { bestOfThree, compareDice, type BestHand } from '../dice/combinations'
import { flip, oppositeValue, throwDie } from '../dice/dice'
import type { CircleConfig, GameConfig } from '../config/schema'
import type { Answer, Ask, TurnAction } from './asks'
import type { Rng } from './random'
import type { CoinSide, TraceStep } from './trace'
import type { Card, DiceHand, Die, Face, FaceEffectId, HandRank, PhaseId, RewardId } from './types'

export interface MatchParticipant {
  readonly index: number
  readonly name: string
  readonly isHuman: boolean
  readonly deck: readonly Card[]
  readonly dice: readonly Die[]
  readonly ai: AiSettings | null
}

/** État visible en continu par l'affichage, hors animation. */
export interface MatchLive {
  readonly circle: number
  readonly names: readonly string[]
  readonly isCircleFinal: boolean
  pot: number
  chips: number[]
  /** `J5` : jetons **donnés** en phase de don. C'est l'argent. */
  given: number[]
  /** `F10` : argent et forge gagnés par des effets de face, hors barème. */
  bonusMoney: number[]
  bonusForge: number[]
  out: number[]
  offered: RewardId[]
  owned: Map<RewardId, number>
  phase: PhaseId | null
  round: number
  maxRerolls: number
}

export interface MatchResult {
  readonly ranking: readonly number[]
  readonly money: readonly number[]
  /** `F10` : à ajouter au run par-dessus l'argent des jetons donnés. */
  readonly bonusMoney: readonly number[]
  readonly bonusForge: readonly number[]
  readonly rounds: number
  readonly throws: number
  readonly humanWon: boolean
}

export type Yielded = { readonly t: 'step'; readonly step: TraceStep } | { readonly t: 'ask'; readonly ask: Ask }

interface Ctx {
  readonly cfg: GameConfig
  readonly circleIndex: number
  readonly circle: CircleConfig
  readonly participants: readonly MatchParticipant[]
  readonly rng: Rng
  readonly live: MatchLive
  readonly usedFlip: Set<number>
  readonly usedSet42: Set<number>
  /** `B8` : « premier jet de la phase » — donc une seule fois par phase, pas par manche. */
  readonly usedExtra: Set<number>
  lastDuelWinner: number
  rounds: number
  throws: number
}

export function createLive(
  circle: CircleConfig,
  participants: readonly MatchParticipant[],
  isCircleFinal: boolean,
  maxRerolls: number,
): MatchLive {
  return {
    circle: circle.n,
    names: participants.map((p) => p.name),
    isCircleFinal,
    pot: circle.pot,
    chips: participants.map(() => 0),
    given: participants.map(() => 0),
    bonusMoney: participants.map(() => 0),
    bonusForge: participants.map(() => 0),
    out: [],
    offered: [],
    owned: new Map(),
    phase: null,
    round: 0,
    maxRerolls,
  }
}

const at = <T>(list: readonly T[], i: number): T => {
  const v = list[i]
  if (v === undefined) throw new Error(`index ${i} hors bornes`)
  return v
}

/* ------------------------------------------------------------- Programme */

export function* matchProgram(ctx: Ctx): Generator<Yielded, MatchResult, Answer> {
  const step = function* (s: TraceStep): Generator<Yielded, void, Answer> {
    yield { t: 'step', step: s }
  }

  yield* step({
    kind: 'matchStart',
    circle: ctx.circle.n,
    names: ctx.live.names,
    pot: ctx.live.pot,
    isCircleFinal: ctx.live.isCircleFinal,
  })

  const firstSeriesOffered: RewardId[] = []

  for (const [si, series] of ctx.cfg.battleSeries.entries()) {
    // `B2` : n batailles → n + 1 récompenses. `B3b` : le 2e tirage exclut les
    // quatre proposées à la première série, prises ou non.
    const excluded = new Set<RewardId>(firstSeriesOffered)
    const pool = ctx.cfg.rewards
      .filter((r) => !excluded.has(r.id))
      .filter((r) => !ctx.live.owned.has(r.id))
      // `B3e` : une récompense qui n'a d'effet qu'à trois n'est pas proposée en duel.
      .filter((r) => !(r.needsThree === true && ctx.participants.length < 3))
      .map((r) => r.id)
    const offered = ctx.rng.shuffle([...pool]).slice(0, series.duels + 1)
    ctx.live.offered = offered
    if (si === 0) firstSeriesOffered.push(...offered)
    yield* step({ kind: 'rewardsDrawn', series: si, offered: [...offered] })

    for (let d = 0; d < series.duels; d++) {
      const winner = yield* cardDuel(ctx, si, d, series.duels)
      ctx.lastDuelWinner = winner
      yield* takeReward(ctx, winner)
    }

    yield* dicePhase(ctx, series.phase)
  }

  // Classement : ordre de sortie, puis les survivants du moins riche au plus riche.
  const ranking = [...ctx.live.out]
  const rest = ctx.participants
    .map((p) => p.index)
    .filter((i) => !ranking.includes(i))
    .sort((a, b) => at(ctx.live.chips, a) - at(ctx.live.chips, b))
  ranking.push(...rest)

  const human = ctx.participants.find((p) => p.isHuman)
  const humanWon = human !== undefined && ranking[0] === human.index
  yield* step({ kind: 'matchEnd', ranking, money: [...ctx.live.given], humanWon })

  return {
    ranking,
    money: [...ctx.live.given],
    bonusMoney: [...ctx.live.bonusMoney],
    bonusForge: [...ctx.live.bonusForge],
    rounds: ctx.rounds,
    throws: ctx.throws,
    humanWon,
  }
}

/* ---------------------------------------------------- Bataille de cartes */

function* cardDuel(
  ctx: Ctx,
  series: number,
  index: number,
  total: number,
): Generator<Yielded, number, Answer> {
  const size = ctx.circle.cards
  const cards = ctx.cfg.cards
  yield { t: 'step', step: { kind: 'duelStart', series, index, total, handSize: size } }

  // `C5` : deck remélangé entièrement au début de chaque bataille.
  const states: DrawState[] = ctx.participants.map((p) => drawHand(p.deck, size, ctx.rng))
  yield { t: 'step', step: { kind: 'duelDraw', hands: states.map((s) => [...s.hand]) } }

  // `C3`/`C6` : deux passes de changement, simultanées et cachées.
  // `C3b` : **passer clôt ses changements** pour toute la bataille.
  const passed = new Set<number>()
  for (let pass = 1; pass <= cards.mulligans; pass++) {
    const swaps: number[] = []
    for (const p of ctx.participants) {
      if (passed.has(p.index)) {
        swaps.push(0)
        continue
      }
      const st = at(states, p.index)
      let wanted: readonly number[]
      if (p.isHuman) {
        const answer = yield {
          t: 'ask',
          ask: {
            kind: 'mulligan',
            who: p.index,
            pass,
            total: cards.mulligans,
            hand: [...st.hand],
            rank: evaluateHand(st.hand, cards),
          },
        }
        wanted = answer.kind === 'mulligan' ? answer.swap : []
      } else {
        wanted = aiMulligan(st.hand, st.pile, cards, p.ai?.topN ?? 1, ctx.rng)
      }
      if (wanted.length === 0) passed.add(p.index)
      states[p.index] = mulligan(st, wanted, ctx.rng)
      swaps.push(wanted.length)
    }
    yield {
      t: 'step',
      step: { kind: 'duelMulligan', pass, swaps, hands: states.map((s) => [...s.hand]) },
    }
  }

  const ranks: HandRank[] = states.map((s) => evaluateHand(s.hand, cards))
  yield {
    t: 'step',
    step: { kind: 'duelReveal', hands: states.map((s) => [...s.hand]), ranks: [...ranks] },
  }

  // `C7`/`C10` : meilleure main ; départage au pile ou face entre les seuls ex æquo en tête.
  let leaders: number[] = [0]
  for (let i = 1; i < ranks.length; i++) {
    const c = compareHands(at(ranks, i), at(ranks, at(leaders, 0)))
    if (c < 0) leaders = [i]
    else if (c === 0) leaders.push(i)
  }
  const winner = yield* breakTie(ctx, leaders, 'mains de cartes à égalité')
  yield {
    t: 'step',
    step: { kind: 'duelWon', who: winner, category: at(ranks, winner).category },
  }
  return winner
}

/* --------------------------------------------------------- Récompenses */

function* takeReward(ctx: Ctx, who: number): Generator<Yielded, void, Answer> {
  if (ctx.live.offered.length === 0) return
  const p = at(ctx.participants, who)
  let id: RewardId
  if (p.isHuman) {
    const answer = yield { t: 'ask', ask: { kind: 'reward', who, offered: [...ctx.live.offered] } }
    id = answer.kind === 'reward' ? answer.id : (at(ctx.live.offered, 0) as RewardId)
  } else {
    id = aiReward(ctx.live.offered, p.ai as AiSettings, ctx.rng)
  }
  if (!ctx.live.offered.includes(id)) id = at(ctx.live.offered, 0)
  ctx.live.offered = ctx.live.offered.filter((r) => r !== id)
  ctx.live.owned.set(id, who)
  yield {
    t: 'step',
    step: { kind: 'rewardTaken', who, id, remaining: [...ctx.live.offered] },
  }

  // `B5`/`B6` : un don s'applique **au moment où il est pris**. Les jetons
  // viennent du pot tant qu'il en reste, puis de la réserve du donneur — ce qui
  // en fait deux récompenses différentes selon la série où on la gagne.
  const spec = ctx.cfg.rewards.find((r) => r.id === id)
  if (spec?.source === 'potThenOwner') {
    const candidates = ctx.participants.map((x) => x.index).filter((i) => i !== who)
    let target: number
    if (candidates.length === 1) target = at(candidates, 0)
    else if (p.isHuman) {
      const answer = yield {
        t: 'ask',
        ask: { kind: 'rewardTarget', who, id, candidates: [...candidates] },
      }
      target = answer.kind === 'rewardTarget' ? answer.target : at(candidates, 0)
    } else {
      target = aiTarget(candidates, ctx.live.chips)
    }

    const wanted = spec.amount ?? 0
    const { fromPot, fromOwner } = drawChips(ctx, who, wanted)
    ctx.live.chips[target] = at(ctx.live.chips, target) + fromPot + fromOwner
    // `J5` : l'argent ne compte que les jetons donnés **pendant la phase de don**.
    // Se délester ici accélère la victoire mais ne rapporte rien — c'est la même
    // tension vitesse/argent que partout ailleurs.
    yield {
      t: 'step',
      step: {
        kind: 'rewardApplied',
        id,
        owner: who,
        target,
        amount: fromPot + fromOwner,
        fromPot,
        fromOwner,
        pot: ctx.live.pot,
        chips: [...ctx.live.chips],
      },
    }

    // `B15` : donner à un adversaire, c'est en donner la moitié à l'autre.
    if (ctx.live.owned.get('splitGive') === who) {
      const half = Math.floor((fromPot + fromOwner) / 2)
      for (const other of candidates) {
        if (other === target || half <= 0) continue
        const side = drawChips(ctx, who, half)
        const total = side.fromPot + side.fromOwner
        if (total <= 0) continue
        ctx.live.chips[other] = at(ctx.live.chips, other) + total
        yield {
          t: 'step',
          step: {
            kind: 'sideGift',
            from: who,
            to: other,
            amount: total,
            pot: ctx.live.pot,
            chips: [...ctx.live.chips],
          },
        }
      }
    }
  }

  // `B8` : `setRerolls` demande une valeur, et s'applique à **tout le monde**.
  if (id === 'setRerolls') {
    const options = [1, 2, 3]
    let value: number
    if (p.isHuman) {
      const answer = yield { t: 'ask', ask: { kind: 'chooseRerolls', who, options } }
      value = answer.kind === 'chooseRerolls' ? answer.value : ctx.cfg.dice.defaultMaxRerolls
    } else {
      value = aiRerolls(p.ai as AiSettings, options)
    }
    ctx.live.maxRerolls = value
    yield {
      t: 'step',
      step: { kind: 'rewardSetting', who, id, detail: `${value} relance${value > 1 ? 's' : ''} maximum pour tous` },
    }
  }
}

/** `B6` : on prélève dans le pot tant qu'il en reste, puis dans sa réserve. */
function drawChips(ctx: Ctx, from: number, wanted: number): { fromPot: number; fromOwner: number } {
  const fromPot = Math.min(wanted, ctx.live.pot)
  const fromOwner = Math.min(wanted - fromPot, at(ctx.live.chips, from))
  ctx.live.pot -= fromPot
  ctx.live.chips[from] = at(ctx.live.chips, from) - fromOwner
  return { fromPot, fromOwner }
}

/* ------------------------------------------------------------- Pile ou face */

function* coinBetween(ctx: Ctx, a: number, b: number, reason: string): Generator<Yielded, number, Answer> {
  const humanIndex = [a, b].find((i) => at(ctx.participants, i).isHuman)
  const chooser = humanIndex ?? null
  let side: CoinSide
  if (chooser !== null) {
    const answer = yield { t: 'ask', ask: { kind: 'coin', who: chooser, candidates: [a, b], reason } }
    side = answer.kind === 'coin' ? answer.side : 'pile'
  } else {
    side = aiCoin(ctx.rng)
  }
  const result: CoinSide = ctx.rng.next() < 0.5 ? 'pile' : 'face'
  const caller = chooser ?? a
  const other = caller === a ? b : a
  const winner = result === side ? caller : other
  yield {
    t: 'step',
    step: { kind: 'coinFlip', chooser, side, result, candidates: [a, b], winner, reason },
  }
  return winner
}

/** `C10` : on répète tant qu'il reste plus d'un candidat. */
function* breakTie(ctx: Ctx, candidates: readonly number[], reason: string): Generator<Yielded, number, Answer> {
  let remaining = [...candidates]
  while (remaining.length > 1) {
    const a = at(remaining, 0)
    const b = at(remaining, 1)
    const winner = yield* coinBetween(ctx, a, b, reason)
    remaining = [winner, ...remaining.slice(2)]
  }
  return at(remaining, 0)
}

/* ------------------------------------------------------------ Phase de dés */

function activeIndices(ctx: Ctx, phase: PhaseId): number[] {
  const all = ctx.participants.map((p) => p.index)
  if (phase === 'charge') return all
  return all.filter((i) => at(ctx.live.chips, i) > 0)
}

function* dicePhase(ctx: Ctx, phase: PhaseId): Generator<Yielded, void, Answer> {
  ctx.live.phase = phase
  ctx.live.round = 0
  ctx.usedExtra.clear()

  // `D7` : le meneur de la première manche est le vainqueur de la dernière
  // bataille de cartes qui précède la phase.
  let leader = ctx.cfg.rules.firstLeader === 'lastCardDuelWinner' ? ctx.lastDuelWinner : 0
  const actives0 = activeIndices(ctx, phase)
  if (!actives0.includes(leader)) leader = at(actives0, 0)

  yield {
    t: 'step',
    step: { kind: 'phaseStart', phase, leader, pot: ctx.live.pot, chips: [...ctx.live.chips] },
  }

  // `D10f` : sortir de la répartition **sans aucun jeton**, c'est avoir déjà
  // terminé la phase de don (`D10c`) — donc gagner la partie sans la jouer, et
  // sans gagner un centime (`J5`). C'est la cupidité contre la survie à l'état pur.
  if (phase === 'discharge') {
    let zeros = ctx.participants.map((p) => p.index).filter((i) => at(ctx.live.chips, i) === 0)
    // Plusieurs participants peuvent sortir de la répartition à zéro **en même
    // temps**. Ils sont premiers ex æquo : c'est un départage (`C9`), surtout
    // pas l'ordre des index — sinon le joueur 0 gagne gratuitement.
    while (zeros.length > 0) {
      const first = yield* breakTie(ctx, zeros, 'sortis de la répartition sans jeton')
      ctx.live.out.push(first)
      yield {
        t: 'step',
        step: { kind: 'out', who: first, place: ctx.live.out.length, chips: [...ctx.live.chips] },
      }
      zeros = zeros.filter((i) => i !== first)
    }
  }

  const maxThrows = ctx.live.maxRerolls + 1
  let safety = 0
  for (;;) {
    if (safety++ > 500) break
    const actives = activeIndices(ctx, phase)
    if (phase === 'charge' && ctx.live.pot <= 0) break
    if (phase === 'discharge' && actives.length < 2) break
    if (!actives.includes(leader)) leader = at(actives, 0)

    ctx.live.round++
    ctx.rounds++
    const start = actives.indexOf(leader)
    const order = [...actives.slice(start), ...actives.slice(0, start)]
    yield { t: 'step', step: { kind: 'roundStart', phase, round: ctx.live.round, leader, order: [...order] } }

    const hands: (DiceHand | null)[] = ctx.participants.map(() => null)
    const faceEffects: (readonly (FaceEffectId | null)[])[] = ctx.participants.map(() => [])
    let leaderThrows = maxThrows
    for (const [k, who] of order.entries()) {
      // `D4` : le meneur plafonne le nombre de jets des autres.
      const cap = k === 0 || !ctx.cfg.rules.leaderCapsThrows ? maxThrows : leaderThrows
      const turn = yield* takeTurn(ctx, who, cap, phase, k === 0)
      hands[who] = turn.hand
      faceEffects[who] = turn.effects
      if (k === 0) leaderThrows = turn.throws
    }

    yield* resolveRound(ctx, phase, hands, order, faceEffects)

    const stillActive = activeIndices(ctx, phase)
    const idx = ctx.participants.map((p) => p.index)
    const from = idx.indexOf(leader)
    let nextLeader = leader
    for (let i = 1; i <= idx.length; i++) {
      const cand = at(idx, (from + i) % idx.length)
      if (stillActive.includes(cand)) {
        nextLeader = cand
        break
      }
    }
    leader = ctx.cfg.rules.leaderRotates ? nextLeader : leader
  }

  yield { t: 'step', step: { kind: 'phaseEnd', phase, pot: ctx.live.pot, chips: [...ctx.live.chips] } }
  ctx.live.phase = null
}

interface TurnOutcome {
  readonly hand: DiceHand
  readonly throws: number
  /** `F10` : effets des faces visibles en fin de tour. */
  readonly effects: readonly (FaceEffectId | null)[]
}

function* takeTurn(
  ctx: Ctx,
  who: number,
  maxThrows: number,
  phase: PhaseId,
  isLeader: boolean,
): Generator<Yielded, TurnOutcome, Answer> {
  const p = at(ctx.participants, who)
  const faces = ctx.circle.dieFaces
  const combos = ctx.cfg.combinations
  const valuePlus1 = ctx.live.owned.get('valuePlus1') === who

  // `B8` : « Un dé en plus » n'ajoute un dé qu'au **premier jet de la phase**.
  const extra = ctx.live.owned.get('extraDie') === who && !ctx.usedExtra.has(who)
  const dice: Die[] = extra ? [...p.dice, at(p.dice, p.dice.length - 1)] : [...p.dice]
  let extraPending = extra

  let values: number[] | null = null
  let faceIdx: number[] = new Array<number>(dice.length).fill(-1)
  let throwNo = 0
  let best: BestHand | null = null
  /** `F10` : un dé ne se relance gratuitement qu'une fois par jet. */
  const usedFree = new Set<number>()

  const effectAt = (i: number): FaceEffectId | null => {
    const fi = faceIdx[i] ?? -1
    if (fi < 0) return null
    return (at(dice, i).faces[fi] as Face | undefined)?.effect ?? null
  }
  const effectsNow = (): (FaceEffectId | null)[] => dice.map((_, i) => effectAt(i))
  /** `F10` (`wild`) : la face vaut aussi la valeur de son opposée. */
  const altsNow = (): (number | null)[] =>
    dice.map((_, i) => (effectAt(i) === 'wild' ? oppositeValue(at(dice, i), faceIdx[i] as number) : null))
  const evaluate = (): BestHand => bestOfThree(values as number[], faces, combos, valuePlus1, altsNow())

  /** `F10` (`payAll`) : chaque apparition donne un jeton du pot à tout le monde. */
  function* payAll(): Generator<Yielded, void, Answer> {
    const hits = effectsNow().filter((e) => e === 'payAll').length
    for (let h = 0; h < hits; h++) {
      let served = 0
      for (const q of ctx.participants) {
        if (ctx.live.pot <= 0) break
        ctx.live.pot -= 1
        ctx.live.chips[q.index] = at(ctx.live.chips, q.index) + 1
        served++
      }
      if (served === 0) break
      yield {
        t: 'step',
        step: {
          kind: 'faceBonus',
          who,
          effect: 'payAll',
          amount: served,
          detail: `${served} jeton${served > 1 ? 's' : ''} du pot répartis`,
          pot: ctx.live.pot,
          chips: [...ctx.live.chips],
        },
      }
    }
  }

  for (;;) {
    const canFlip = ctx.live.owned.get('flipDie') === who && !ctx.usedFlip.has(who) && values !== null
    const canSet42 = ctx.live.owned.get('set42') === who && !ctx.usedSet42.has(who) && throwNo < maxThrows
    const freeRerolls =
      values === null ? [] : dice.map((_, i) => i).filter((i) => effectAt(i) === 'freeReroll' && !usedFree.has(i))
    if (throwNo >= maxThrows && !canFlip && freeRerolls.length === 0) break

    let action: TurnAction
    if (p.isHuman) {
      const answer = yield {
        t: 'ask',
        ask: {
          kind: 'turn',
          context: {
            who,
            phase,
            values: values ? [...values] : null,
            hand: best?.hand ?? null,
            kept: best ? [...best.indices] : [],
            effects: effectsNow(),
            freeRerolls,
            throwNo,
            maxThrows,
            isLeader,
            canFlip,
            canSet42,
            diceCount: dice.length,
          },
        },
      }
      action = answer.kind === 'turn' ? answer.action : { type: 'stop' }
    } else {
      action =
        throwNo >= maxThrows && freeRerolls.length === 0
          ? { type: 'stop' }
          : aiTurn(
              {
                dice,
                values,
                alts: values ? altsNow() : null,
                freeRerolls,
                throwNo,
                maxThrows,
                faces,
                combos,
                topN: p.ai?.topN ?? 1,
              },
              ctx.rng,
            )
    }

    if (action.type === 'freeReroll') {
      const i = action.dieIndex
      if (!values || !freeRerolls.includes(i)) continue
      usedFree.add(i)
      const t = throwDie(at(dice, i), ctx.rng)
      values[i] = t.value
      faceIdx[i] = t.faceIndex
      best = evaluate()
      yield {
        t: 'step',
        step: {
          kind: 'throw',
          who,
          throwNo,
          maxThrows,
          values: [...values],
          rolled: dice.map((_, k) => k === i),
          kept: [...best.indices],
          effects: effectsNow(),
          hand: best.hand,
          via: 'freeReroll',
        },
      }
      yield* payAll()
      continue
    }

    if (action.type === 'flip') {
      if (!canFlip || !values) continue
      const i = action.dieIndex
      const fi = faceIdx[i] ?? -1
      if (fi < 0) continue // valeur imposée par `set42` : pas de dos à lire
      const flipped = flip(at(dice, i), fi)
      const from = at(values, i)
      values[i] = flipped.value
      faceIdx[i] = flipped.faceIndex
      ctx.usedFlip.add(who)
      best = evaluate()
      yield {
        t: 'step',
        step: {
          kind: 'flipUsed',
          who,
          dieIndex: i,
          from,
          to: flipped.value,
          effects: effectsNow(),
          hand: best.hand,
        },
      }
      continue
    }

    // `D5` : on s'arrête quand on veut, **après** avoir vu ses dés.
    if (action.type === 'stop') {
      if (values === null) continue
      break
    }

    if (throwNo >= maxThrows) break

    const useSet42 = action.useSet42 && canSet42
    const n = dice.length
    const rolled = new Array<boolean>(n).fill(false)
    const nextValues: number[] = values ? [...values] : new Array<number>(n).fill(0)

    if (useSet42) {
      // `B11` : deux dés fixés sur 4 et 2, le reste lancé, jet définitif.
      nextValues[0] = 4
      nextValues[1] = 2
      faceIdx[0] = -1
      faceIdx[1] = -1
      rolled[0] = true
      rolled[1] = true
      for (let i = 2; i < n; i++) {
        const t = throwDie(at(dice, i), ctx.rng)
        nextValues[i] = t.value
        faceIdx[i] = t.faceIndex
        rolled[i] = true
      }
      ctx.usedSet42.add(who)
    } else {
      for (let i = 0; i < n; i++) {
        if (values !== null && (action.keep[i] ?? false)) continue
        const t = throwDie(at(dice, i), ctx.rng)
        nextValues[i] = t.value
        faceIdx[i] = t.faceIndex
        rolled[i] = true
      }
    }

    throwNo++
    ctx.throws++
    usedFree.clear()
    values = nextValues
    best = evaluate()
    yield {
      t: 'step',
      step: {
        kind: 'throw',
        who,
        throwNo,
        maxThrows,
        values: [...values],
        rolled: [...rolled],
        kept: [...best.indices],
        effects: effectsNow(),
        hand: best.hand,
        via: useSet42 ? 'set42' : extraPending ? 'extraDie' : 'normal',
      },
    }
    yield* payAll()

    if (extraPending) {
      // `B12b` : le dé en plus a fait son office, le jeu en écarte un tout seul.
      extraPending = false
      ctx.usedExtra.add(who)
      const before = [...values]
      const dropped = chooseDrop(values, best.indices)
      dice.splice(dropped, 1)
      values.splice(dropped, 1)
      faceIdx.splice(dropped, 1)
      best = evaluate()
      yield {
        t: 'step',
        step: {
          kind: 'dropDie',
          who,
          before,
          dropped,
          values: [...values],
          effects: effectsNow(),
          hand: best.hand,
        },
      }
    }

    if (useSet42) break
  }

  if (!values || !best) {
    // Un tour sans aucun jet ne peut pas exister : on lance d'office.
    const forced = dice.map((d) => throwDie(d, ctx.rng))
    const forcedValues: number[] = forced.map((f) => f.value)
    values = forcedValues
    faceIdx = forced.map((f) => f.faceIndex)
    throwNo++
    ctx.throws++
    best = evaluate()
    yield {
      t: 'step',
      step: {
        kind: 'throw',
        who,
        throwNo,
        maxThrows,
        values: [...forcedValues],
        rolled: forcedValues.map(() => true),
        kept: [...best.indices],
        effects: effectsNow(),
        hand: best.hand,
        via: 'normal',
      },
    }
    yield* payAll()
  }

  // `B13` : un adversaire qui termine sur un 4-2-1 relance tout, une fois.
  const guard = ctx.live.owned.get('reroll421')
  if (guard !== undefined && guard !== who && best.hand.id === '421') {
    const before = [...values]
    const forced = dice.map((d) => throwDie(d, ctx.rng))
    values = forced.map((f) => f.value)
    faceIdx = forced.map((f) => f.faceIndex)
    ctx.throws++
    best = evaluate()
    yield {
      t: 'step',
      step: {
        kind: 'forcedReroll',
        who,
        owner: guard,
        before,
        values: [...values],
        kept: [...best.indices],
        effects: effectsNow(),
        hand: best.hand,
      },
    }
    yield* payAll()
  }

  // `F10` : les effets qui se comptent **en fin de lancers**.
  const finalEffects = effectsNow()
  const moneyFaces = finalEffects.filter((e) => e === 'money').length
  if (moneyFaces > 0) {
    const all = moneyFaces === dice.length
    const gain = all ? 10 : moneyFaces
    ctx.live.bonusMoney[who] = at(ctx.live.bonusMoney, who) + gain
    yield {
      t: 'step',
      step: {
        kind: 'faceBonus',
        who,
        effect: 'money',
        amount: gain,
        detail: all ? 'tous les dés au symbole : +10 d’argent' : `+${gain} d’argent`,
        pot: ctx.live.pot,
        chips: [...ctx.live.chips],
      },
    }
  }
  const forgeFaces = finalEffects.filter((e) => e === 'forge').length
  if (forgeFaces >= ctx.cfg.dice.faceEffects.forgeThreshold) {
    ctx.live.bonusForge[who] = at(ctx.live.bonusForge, who) + 1
    yield {
      t: 'step',
      step: {
        kind: 'faceBonus',
        who,
        effect: 'forge',
        amount: 1,
        detail: `${forgeFaces} symboles visibles : +1 point de forge`,
        pot: ctx.live.pot,
        chips: [...ctx.live.chips],
      },
    }
  }

  yield { t: 'step', step: { kind: 'turnEnd', who, hand: best.hand, throws: throwNo } }
  return { hand: best.hand, throws: throwNo, effects: finalEffects }
}

/**
 * `B12b` : on n'écarte jamais un dé retenu, donc la main du jet est préservée.
 * Entre les candidats restants on jette **la plus grosse valeur** : les petites
 * (1, 2, 4) sont celles qui construisent un 4-2-1 ou un 1-1-x aux relances.
 */
function chooseDrop(values: readonly number[], kept: readonly number[]): number {
  let choice = -1
  for (let i = 0; i < values.length; i++) {
    if (kept.includes(i)) continue
    if (choice < 0 || (values[i] as number) > (values[choice] as number)) choice = i
  }
  return choice >= 0 ? choice : values.length - 1
}

function* resolveRound(
  ctx: Ctx,
  phase: PhaseId,
  hands: readonly (DiceHand | null)[],
  order: readonly number[],
  faceEffects: readonly (readonly (FaceEffectId | null)[])[],
): Generator<Yielded, void, Answer> {
  const players = order.filter((i) => hands[i] !== null)
  let bestGroup: number[] = []
  let worstGroup: number[] = []
  for (const i of players) {
    const h = hands[i] as DiceHand
    if (bestGroup.length === 0) bestGroup = [i]
    else {
      const c = compareDice(h, hands[at(bestGroup, 0)] as DiceHand)
      if (c < 0) bestGroup = [i]
      else if (c === 0) bestGroup.push(i)
    }
    if (worstGroup.length === 0) worstGroup = [i]
    else {
      const c = compareDice(h, hands[at(worstGroup, 0)] as DiceHand)
      if (c > 0) worstGroup = [i]
      else if (c === 0) worstGroup.push(i)
    }
  }

  const best = yield* breakTie(ctx, bestGroup, 'meilleure main à égalité')
  const worstCandidates = worstGroup.filter((i) => i !== best)
  const worst =
    worstCandidates.length === 0
      ? best
      : yield* breakTie(ctx, worstCandidates, 'pire main à égalité')

  const bestHand = hands[best] as DiceHand
  // `B14` et `F10` : la récompense `takeLess` **et** chaque face `takeLess`
  // visible retirent un jeton à ce qu'encaisse la pire main, jamais sous 1.
  const cuts =
    (ctx.live.owned.get('takeLess') === worst ? 1 : 0) +
    (faceEffects[worst] ?? []).filter((e) => e === 'takeLess').length
  const base = cuts > 0 ? Math.max(1, bestHand.chipValue - cuts) : bestHand.chipValue
  let amount = 0
  if (phase === 'charge') {
    // `D9a` : la pire main prend, dans le pot, la valeur de la meilleure.
    amount = Math.min(base, ctx.live.pot)
    ctx.live.pot -= amount
    ctx.live.chips[worst] = at(ctx.live.chips, worst) + amount
  } else if (best !== worst) {
    // `D10a`/`D10b` : la meilleure donne à la pire, plafonné par ce qu'elle a.
    amount = Math.min(base, at(ctx.live.chips, best))
    ctx.live.chips[best] = at(ctx.live.chips, best) - amount
    ctx.live.chips[worst] = at(ctx.live.chips, worst) + amount
    ctx.live.given[best] = at(ctx.live.given, best) + amount
  }

  yield {
    t: 'step',
    step: {
      kind: 'roundResult',
      phase,
      best,
      worst,
      base,
      amount,
      pot: ctx.live.pot,
      chips: [...ctx.live.chips],
      hands: hands.map((h) => h),
    },
  }

  // `B15` : donner à un adversaire, c'est en donner la moitié à l'autre.
  if (phase === 'discharge' && ctx.live.owned.get('splitGive') === best && amount > 0) {
    const half = Math.floor(amount / 2)
    for (const other of order) {
      if (other === best || other === worst || half <= 0) continue
      if (ctx.live.out.includes(other)) continue
      const give = Math.min(half, at(ctx.live.chips, best))
      if (give <= 0) break
      ctx.live.chips[best] = at(ctx.live.chips, best) - give
      ctx.live.chips[other] = at(ctx.live.chips, other) + give
      ctx.live.given[best] = at(ctx.live.given, best) + give
      yield {
        t: 'step',
        step: {
          kind: 'sideGift',
          from: best,
          to: other,
          amount: give,
          pot: ctx.live.pot,
          chips: [...ctx.live.chips],
        },
      }
    }
  }

  // `B16` : la nénette fait circuler un jeton par adversaire, même en perdant.
  if (ctx.live.owned.has('nenetteGift')) {
    for (const i of order) {
      const h = hands[i]
      if (!h || h.id !== 'nenette') continue
      const candidates = order.filter((o) => o !== i && !ctx.live.out.includes(o))
      const targets: number[] = []
      if (phase === 'charge') {
        // Chaque adversaire prend un jeton **du pot** : autant de moins à ramasser.
        for (const t of candidates) {
          if (ctx.live.pot <= 0) break
          ctx.live.pot -= 1
          ctx.live.chips[t] = at(ctx.live.chips, t) + 1
          targets.push(t)
        }
      } else {
        for (const t of candidates) {
          if (at(ctx.live.chips, i) <= 0) break
          ctx.live.chips[i] = at(ctx.live.chips, i) - 1
          ctx.live.chips[t] = at(ctx.live.chips, t) + 1
          ctx.live.given[i] = at(ctx.live.given, i) + 1
          targets.push(t)
        }
      }
      if (targets.length === 0) continue
      yield {
        t: 'step',
        step: {
          kind: 'nenetteGift',
          who: i,
          targets: [...targets],
          amount: 1,
          source: phase === 'charge' ? 'pot' : 'owner',
          pot: ctx.live.pot,
          chips: [...ctx.live.chips],
        },
      }
    }
  }

  if (phase === 'discharge') {
    // `D10c`/`D10d` : à 0 jeton on a terminé, et le premier à 0 gagne.
    for (const i of order) {
      if (at(ctx.live.chips, i) === 0 && !ctx.live.out.includes(i)) {
        ctx.live.out.push(i)
        yield {
          t: 'step',
          step: { kind: 'out', who: i, place: ctx.live.out.length, chips: [...ctx.live.chips] },
        }
      }
    }
  }
}

/* ------------------------------------------------------------ Pilote */

export interface MatchDriverOptions {
  readonly cfg: GameConfig
  readonly circleIndex: number
  readonly participants: readonly MatchParticipant[]
  readonly rng: Rng
  readonly isCircleFinal: boolean
}

/**
 * Pompe le générateur jusqu'à la prochaine décision humaine, en accumulant les
 * étapes à rejouer. C'est la seule surface dont l'affichage a besoin.
 */
export class MatchDriver {
  readonly live: MatchLive
  readonly participants: readonly MatchParticipant[]
  steps: TraceStep[] = []
  ask: Ask | null = null
  result: MatchResult | null = null
  private readonly it: Generator<Yielded, MatchResult, Answer>

  constructor(opts: MatchDriverOptions) {
    const circle = at(opts.cfg.circles, opts.circleIndex)
    this.participants = opts.participants
    this.live = createLive(circle, opts.participants, opts.isCircleFinal, opts.cfg.dice.defaultMaxRerolls)
    const ctx: Ctx = {
      cfg: opts.cfg,
      circleIndex: opts.circleIndex,
      circle,
      participants: opts.participants,
      rng: opts.rng,
      live: this.live,
      usedFlip: new Set(),
      usedSet42: new Set(),
      usedExtra: new Set(),
      lastDuelWinner: 0,
      rounds: 0,
      throws: 0,
    }
    this.it = matchProgram(ctx)
  }

  /** Avance jusqu'à la prochaine question. `answer` répond à la précédente. */
  advance(answer?: Answer): void {
    this.steps = []
    this.ask = null
    let sent = answer
    for (;;) {
      const next = sent === undefined ? this.it.next() : this.it.next(sent)
      sent = undefined
      if (next.done) {
        this.result = next.value
        return
      }
      if (next.value.t === 'step') this.steps.push(next.value.step)
      else {
        this.ask = next.value.ask
        return
      }
    }
  }
}
