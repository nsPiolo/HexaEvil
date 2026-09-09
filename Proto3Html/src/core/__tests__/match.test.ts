import { describe, expect, it } from 'vitest'
import { settingsFor } from '../ai/ai'
import { createStartingDeck } from '../cards/deck'
import { createDie, engrave, oppositeValue, upgradeDie } from '../dice/dice'
import { bestOfThree } from '../dice/combinations'
import { createRun, engraveOptions } from '../rules/run'
import type { Die } from '../rules/types'
import { autoPlay } from '../rules/autoplay'
import { MatchDriver, type MatchParticipant } from '../rules/match'
import { createRng } from '../rules/random'
import type { TraceStep } from '../rules/trace'
import { config } from './helpers'

const cfg = config()

function play(
  seed: number,
  circleIndex = 0,
  count = 2,
  prepare?: (live: MatchDriver['live']) => void,
  playerDice?: readonly Die[],
) {
  const circle = cfg.circles[circleIndex]!
  const dice = (n: number) =>
    Array.from({ length: n }, () => upgradeDie(createDie(cfg.dice.startingFaces), circle.dieFaces))
  const participants: MatchParticipant[] = [
    {
      index: 0,
      name: 'Vous',
      isHuman: true,
      deck: createStartingDeck(cfg.cards),
      dice: playerDice ? [...playerDice] : dice(cfg.dice.playerDice),
      ai: null,
    },
  ]
  for (let d = 0; d < count - 1; d++) {
    participants.push({
      index: d + 1,
      name: cfg.ai.demons[d]?.name ?? `Démon ${d}`,
      isHuman: false,
      deck: createStartingDeck(cfg.cards),
      dice: dice(cfg.dice.demonDice),
      ai: settingsFor(cfg.ai, d, circleIndex),
    })
  }
  const rng = createRng(seed)
  const driver = new MatchDriver({ cfg, circleIndex, participants, rng, isCircleFinal: count > 2 })
  prepare?.(driver.live)
  driver.advance()
  const { steps, result } = autoPlay(driver, { cfg, circleIndex, participants, rng })
  return { steps, result: result!, participants, circle }
}

const seeds = [1, 2, 3, 7, 11, 42, 99]

describe('S1 — séquence d’une partie', () => {
  it('déroule 3 batailles, la répartition, 2 batailles, le don', () => {
    const { steps } = play(1)
    const shape = steps
      .filter((s) => s.kind === 'duelStart' || s.kind === 'phaseStart' || s.kind === 'rewardsDrawn')
      .map((s) => (s.kind === 'phaseStart' ? `phase:${s.phase}` : s.kind === 'duelStart' ? `duel${s.series}` : `tirage${s.series}`))
    expect(shape).toEqual([
      'tirage0', 'duel0', 'duel0', 'duel0',
      'phase:charge',
      'tirage1', 'duel1', 'duel1',
      'phase:discharge',
    ])
  })

  it('B2 — n batailles, n + 1 récompenses tirées', () => {
    const { steps } = play(3)
    const draws = steps.filter((s) => s.kind === 'rewardsDrawn')
    expect(draws[0]!.offered).toHaveLength(cfg.battleSeries[0]!.duels + 1)
    expect(draws[1]!.offered).toHaveLength(cfg.battleSeries[1]!.duels + 1)
  })

  it('B3b — le 2e tirage exclut les 4 récompenses proposées à la 1re série', () => {
    for (const seed of seeds) {
      const { steps } = play(seed)
      const draws = steps.filter((s) => s.kind === 'rewardsDrawn')
      const first = new Set(draws[0]!.offered)
      for (const id of draws[1]!.offered) expect(first.has(id)).toBe(false)
    }
  })

  it('B5/B6 — un don s’applique à la sélection, pas plus tard', () => {
    for (const seed of seeds) {
      const { steps } = play(seed)
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]!
        if (s.kind !== 'rewardApplied') continue
        // L'étape juste avant est forcément la prise, ou le choix de cible.
        const before = steps[i - 1]!
        expect(before.kind).toBe('rewardTaken')
        expect(s.amount).toBe(s.fromPot + s.fromOwner)
      }
    }
  })
})

describe('D9/D10 — sens et montant des transferts', () => {
  it.each(seeds)('graine %i : chaque manche respecte le barème', (seed) => {
    const { steps } = play(seed)
    let pot = 0
    let chips: number[] = []
    let potBefore = 0
    let chipsBefore: number[] = []

    for (const s of steps as TraceStep[]) {
      if (
        s.kind === 'phaseStart' ||
        s.kind === 'rewardApplied' ||
        s.kind === 'sideGift' ||
        s.kind === 'nenetteGift'
      ) {
        pot = s.pot
        chips = [...s.chips]
      }
      if (s.kind === 'roundStart') {
        potBefore = pot
        chipsBefore = [...chips]
      }
      if (s.kind === 'roundResult') {
        const best = s.hands[s.best]!
        // `B14` peut retirer 1 à ce que la pire main encaisse, jamais plus.
        expect([best.chipValue, Math.max(1, best.chipValue - 1)]).toContain(s.base)
        if (s.phase === 'charge') {
          // `D9a`/`D9b` : la pire main prend la valeur de la meilleure, plafonnée par le pot.
          expect(s.amount).toBe(Math.min(s.base, potBefore))
          expect(s.pot).toBe(potBefore - s.amount)
          expect(s.chips[s.worst]).toBe(chipsBefore[s.worst]! + s.amount)
        } else if (s.best !== s.worst) {
          // `D10a`/`D10b` : la meilleure donne à la pire, plafonné par ce qu'elle a.
          expect(s.amount).toBe(Math.min(s.base, chipsBefore[s.best]!))
          expect(s.chips[s.best]).toBe(chipsBefore[s.best]! - s.amount)
          expect(s.chips[s.worst]).toBe(chipsBefore[s.worst]! + s.amount)
        }
        pot = s.pot
        chips = [...s.chips]
      }
    }
  })

  it.each(seeds)('graine %i : J2 — les jetons sont conservés', (seed) => {
    const { steps, circle } = play(seed)
    for (const s of steps as TraceStep[]) {
      if (
        s.kind === 'roundResult' ||
        s.kind === 'phaseStart' ||
        s.kind === 'rewardApplied' ||
        s.kind === 'sideGift' ||
        s.kind === 'nenetteGift'
      ) {
        const total = s.pot + s.chips.reduce((a, b) => a + b, 0)
        expect(total).toBe(circle.pot)
      }
    }
  })

  it.each(seeds)('graine %i : la répartition se termine pot vide', (seed) => {
    const { steps } = play(seed)
    const end = steps.find((s) => s.kind === 'phaseEnd' && s.phase === 'charge')
    expect(end).toBeDefined()
    expect(end!.kind === 'phaseEnd' && end!.pot).toBe(0)
  })
})

describe('D10d/J5 — victoire et argent', () => {
  it.each(seeds)('graine %i : le premier à 0 gagne, l’argent est ce qu’on a donné', (seed) => {
    const { steps, result, participants } = play(seed)
    const firstOut = steps.find((s) => s.kind === 'out')
    expect(firstOut).toBeDefined()
    expect(result.ranking[0]).toBe(firstOut!.kind === 'out' && firstOut!.who)
    expect(result.ranking).toHaveLength(participants.length)
    expect(new Set(result.ranking).size).toBe(participants.length)

    const given = participants.map(() => 0)
    for (const s of steps as TraceStep[]) {
      if (s.kind === 'roundResult' && s.phase === 'discharge' && s.best !== s.worst) {
        given[s.best] = given[s.best]! + s.amount
      }
      // `B15`/`B16` : ces jetons-là aussi sont donnés, donc comptés (`J5`).
      if (s.kind === 'sideGift') given[s.from] = given[s.from]! + s.amount
      if (s.kind === 'nenetteGift' && s.source === 'owner') {
        given[s.who] = given[s.who]! + s.targets.length * s.amount
      }
    }
    expect(result.money).toEqual(given)
  })

  it('une partie à 3 se termine aussi, et classe les trois', () => {
    for (const seed of seeds) {
      const { result } = play(seed, 0, 3)
      expect(result.ranking).toHaveLength(3)
      expect(new Set(result.ranking).size).toBe(3)
    }
  })
})

describe('D4 — le meneur plafonne les autres', () => {
  it.each(seeds)('graine %i : personne ne lance plus que le meneur', (seed) => {
    const { steps } = play(seed)
    let leader: number | null = null
    let leaderThrows = 0
    const throwsByPlayer = new Map<number, number>()
    for (const s of steps as TraceStep[]) {
      if (s.kind === 'roundStart') {
        leader = s.leader
        leaderThrows = 0
        throwsByPlayer.clear()
      }
      if (s.kind === 'turnEnd') {
        if (s.who === leader) leaderThrows = s.throws
        else expect(s.throws).toBeLessThanOrEqual(leaderThrows)
        throwsByPlayer.set(s.who, s.throws)
      }
    }
  })
})

describe('tous les Cercles tournent', () => {
  it.each(cfg.circles.map((c, i) => [c.n, i] as const))('Cercle %i', (_n, i) => {
    const { result, circle } = play(5, i, 2)
    expect(result.ranking).toHaveLength(2)
    expect(circle.pot).toBeGreaterThan(0)
  })
})

describe('B8/B12b — « Un dé en plus »', () => {
  it('n’ajoute un dé qu’au premier jet de chaque phase, puis en écarte un', () => {
    // On force la récompense sur le joueur en jouant assez de graines pour la
    // voir tomber, puis on vérifie la forme de la trace.
    let seen = 0
    for (let seed = 1; seed <= 60 && seen < 3; seed++) {
      const { steps } = play(seed)
      const owner = steps.find((s) => s.kind === 'rewardTaken' && s.id === 'extraDie')
      if (!owner || owner.kind !== 'rewardTaken') continue
      seen++
      const who = owner.who
      let phaseThrow = 0
      for (const s of steps) {
        if (s.kind === 'phaseStart') phaseThrow = 0
        if (s.kind === 'throw' && s.who === who) {
          phaseThrow++
          // Le dé en plus n'existe qu'au premier jet de la phase.
          if (phaseThrow === 1) expect(s.values.length).toBeLessThanOrEqual(5)
          else expect(s.values.length).toBeLessThanOrEqual(4)
        }
        if (s.kind === 'dropDie') {
          expect(s.who).toBe(who)
          expect(s.values).toHaveLength(s.before.length - 1)
          // On n'écarte jamais un dé retenu : la main du jet est préservée.
          expect(s.hand.chipValue).toBeGreaterThan(0)
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})

describe('B13 à B16 — les récompenses ajoutées', () => {
  /** Force une récompense sur un participant, sans passer par les batailles. */
  function playWith(seed: number, id: string, owner: number, count = 2) {
    const { steps, result, participants, circle } = play(seed, 1, count, (live) => live.owned.set(id as never, owner))
    return { steps, result, participants, circle }
  }

  it('B13 — un 4-2-1 adverse est relancé, jamais le sien', () => {
    let seen = 0
    for (let seed = 1; seed <= 40 && seen < 5; seed++) {
      const { steps } = playWith(seed, 'reroll421', 0)
      const relance = new Set<number>()
      for (const s of steps) {
        if (s.kind === 'forcedReroll') {
          seen++
          expect(s.owner).toBe(0)
          expect(s.who).not.toBe(0)
          relance.add(s.who)
        }
        if (s.kind === 'turnEnd') {
          // Un adversaire ne peut finir sur un 4-2-1 que si la relance forcée
          // lui en a redonné un — elle ne se déclenche qu'une fois par tour.
          if (s.who !== 0 && s.hand.id === '421') expect(relance.has(s.who)).toBe(true)
          relance.delete(s.who)
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('B14 — le détenteur encaisse un jeton de moins, au minimum 1', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { steps } = playWith(seed, 'takeLess', 0)
      for (const s of steps) {
        if (s.kind !== 'roundResult') continue
        const nu = s.hands[s.best]!.chipValue
        expect(s.base).toBe(s.worst === 0 ? Math.max(1, nu - 1) : nu)
      }
    }
  })

  it('B15 — donner, c’est donner la moitié au troisième', () => {
    let seen = 0
    for (let seed = 1; seed <= 40 && seen < 3; seed++) {
      const { steps } = playWith(seed, 'splitGive', 0, 3)
      let lastAmount = 0
      for (const s of steps) {
        if (s.kind === 'roundResult') lastAmount = s.amount
        if (s.kind === 'rewardApplied' && s.owner === 0) lastAmount = s.amount
        if (s.kind === 'sideGift') {
          seen++
          expect(s.from).toBe(0)
          expect(s.amount).toBeLessThanOrEqual(Math.floor(lastAmount / 2))
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('B16 — la nénette fait circuler un jeton, même en perdant', () => {
    let seen = 0
    for (let seed = 1; seed <= 60 && seen < 3; seed++) {
      const { steps } = playWith(seed, 'nenetteGift', 0)
      for (const s of steps) {
        if (s.kind !== 'nenetteGift') continue
        seen++
        expect(s.amount).toBe(1)
        expect(s.targets.length).toBeGreaterThan(0)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})

describe('C3b — passer clôt ses changements', () => {
  it('un participant qui n’échange rien n’est plus consulté ensuite', () => {
    for (const seed of seeds) {
      const { steps } = play(seed, 3)
      const passes = steps.filter((s) => s.kind === 'duelMulligan')
      for (let i = 0; i + 1 < passes.length; i++) {
        const a = passes[i]!
        const b = passes[i + 1]!
        if (a.kind !== 'duelMulligan' || b.kind !== 'duelMulligan') continue
        if (b.pass !== a.pass + 1) continue
        a.swaps.forEach((n, who) => {
          // Qui a passé au tour précédent ne peut plus échanger.
          if (n === 0) expect(b.swaps[who]).toBe(0)
        })
      }
    }
  })
})

describe('F10/F11 — effets de face', () => {
  /** Un dé dont **toutes** les faces portent l'effet voulu. */
  const loaded = (effect: 'money' | 'forge' | 'takeLess' | 'payAll'): Die => {
    let die = createDie(cfg.dice.startingFaces)
    for (let i = 0; i < die.faces.length; i++) die = engrave(die, i, (i % 6) + 1, effect)
    return die
  }

  it('money — +1 par face visible, +10 si tous les dés l’affichent', () => {
    const four = [0, 1, 2, 3].map(() => loaded('money'))
    const { result } = play(1, 1, 2, undefined, four)
    // Chaque tour du joueur affiche 4 faces « money » sur 4 dés : +10 à chaque fois.
    expect(result.bonusMoney[0]).toBeGreaterThanOrEqual(10)
    expect(result.bonusMoney[0]! % 10).toBe(0)
    expect(result.bonusMoney[1]).toBe(0)
  })

  it('forge — trois symboles visibles donnent un point', () => {
    const four = [0, 1, 2, 3].map(() => loaded('forge'))
    const { result } = play(2, 1, 2, undefined, four)
    expect(result.bonusForge[0]).toBeGreaterThan(0)
    expect(result.bonusForge[1]).toBe(0)
  })

  it('takeLess — chaque face visible retire un jeton à ce qu’on encaisse', () => {
    const four = [0, 1, 2, 3].map(() => loaded('takeLess'))
    const { steps } = play(3, 1, 2, undefined, four)
    // La récompense `takeLess` (B14) s'ajoute aux faces, et n'importe qui peut
    // l'avoir prise : seules les faces du joueur sont garanties.
    let rewardOwner: number | null = null
    for (const s of steps) {
      if (s.kind === 'rewardTaken' && s.id === 'takeLess') rewardOwner = s.who
      if (s.kind !== 'roundResult') continue
      const nu = s.hands[s.best]!.chipValue
      const cuts = (s.worst === 0 ? 4 : 0) + (rewardOwner === s.worst ? 1 : 0)
      expect(s.base).toBe(cuts > 0 ? Math.max(1, nu - cuts) : nu)
    }
  })

  it('payAll — chaque apparition distribue un jeton du pot à tout le monde', () => {
    const four = [0, 1, 2, 3].map(() => loaded('payAll'))
    const { steps, circle } = play(4, 1, 2, undefined, four)
    const bonuses = steps.filter((s) => s.kind === 'faceBonus' && s.effect === 'payAll')
    expect(bonuses.length).toBeGreaterThan(0)
    // `J2` tient toujours : ces jetons viennent du pot, ils ne sont pas créés.
    for (const s of steps) {
      if (s.kind !== 'faceBonus') continue
      expect(s.pot + s.chips.reduce((a, b) => a + b, 0)).toBe(circle.pot)
    }
  })

  it('wild — une face joue aussi la valeur de son opposée', () => {
    // Sur un D6 nu, la face d'indice 0 vaut 1 et son opposée 6.
    const plain = createDie(cfg.dice.startingFaces)
    const wild = engrave(plain, 0, 1, 'wild')
    expect(wild.faces[0]).toEqual({ value: 1, effect: 'wild' })
    expect(oppositeValue(wild, 0)).toBe(6)
    // 1(wild→6), 6, 6 doit être lu comme un brelan de 6, pas comme un 1-1-x.
    const nu = bestOfThree([1, 6, 6], 6, cfg.combinations, false)
    const avecWild = bestOfThree([1, 6, 6], 6, cfg.combinations, false, [6, null, null])
    expect(nu.hand.id).toBe('junk')
    expect(avecWild.hand.id).toBe('triple')
    expect(avecWild.hand.baseValue).toBe(6)
  })
})

describe('F11 — la gravure propose, elle ne laisse plus choisir', () => {
  it('tire des valeurs distinctes et légales, avec des effets à la bonne fréquence', () => {
    const run = createRun(cfg)
    const rng = createRng(12)
    const seen = new Set<number>()
    let withEffect = 0
    let total = 0
    const fx = cfg.dice.faceEffects
    for (let i = 0; i < 400; i++) {
      const faceIndex = i % 6
      const options = engraveOptions(run, 0, faceIndex, rng)
      expect(options.length).toBe(fx.effectOptions + fx.valueOptions)
      const effets = options.filter((o) => o.kind === 'effect')
      const valeurs = options.filter((o) => o.kind === 'value')
      expect(effets).toHaveLength(fx.effectOptions)
      expect(valeurs).toHaveLength(fx.valueOptions)
      // Rien d'inutile : ni deux fois le même choix, ni la valeur déjà en place.
      expect(new Set(effets.map((o) => (o.kind === 'effect' ? o.effect : ''))).size).toBe(effets.length)
      expect(new Set(valeurs.map((o) => (o.kind === 'value' ? o.value : 0))).size).toBe(valeurs.length)
      for (const o of valeurs) {
        if (o.kind !== 'value') continue
        expect(o.value).toBeGreaterThanOrEqual(1)
        expect(o.value).toBeLessThanOrEqual(6)
        expect(o.value).not.toBe(run.dice[0]!.faces[faceIndex]!.value)
        seen.add(o.value)
        total++
      }
      withEffect += effets.length
    }
    expect(withEffect).toBeGreaterThan(0)
    expect(seen.size).toBeGreaterThan(3)
  })
})

/**
 * Régression trouvée à l'essai : le joueur se vidait, gagnait la partie
 * (`D10d`), puis la nénette d'un adversaire (`B16`) lui rendait un jeton dans
 * la **même manche** — et comme la sortie n'était contrôlée qu'à la fin de la
 * manche, la victoire disparaissait. `D11` est explicite : c'est le premier
 * passage à zéro qui compte, pas l'état final.
 */
describe('D10d / D11 — le premier passage à zéro gagne', () => {
  it('un jeton rendu dans la même manche ne reprend pas la victoire', () => {
    // Graine 27 à trois : le joueur tombe à 0, puis reçoit la nénette du démon 1.
    const { steps, result } = play(27, 0, 3)
    const firstOut = steps.find((s) => s.kind === 'out')
    expect(firstOut && firstOut.kind === 'out' ? firstOut.who : null).toBe(0)
    expect(result.ranking[0]).toBe(0)
    expect(result.humanWon).toBe(true)
  })

  it('sur 400 parties à trois, le premier à zéro est toujours classé premier', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const { steps, result } = play(seed, 0, 3)
      let inDischarge = false
      let firstZeros: number[] | null = null
      for (const s of steps) {
        if (s.kind === 'phaseStart' && s.phase === 'discharge') inDischarge = true
        if (!inDischarge || firstZeros !== null) continue
        if (!('chips' in s) || !Array.isArray(s.chips)) continue
        const zeros = (s.chips as number[]).map((c, i) => [c, i] as const).filter(([c]) => c === 0)
        if (zeros.length > 0) firstZeros = zeros.map(([, i]) => i)
      }
      if (firstZeros === null) continue
      // `D10g` : à égalité stricte le pile ou face tranche, donc on accepte
      // n'importe lequel des ex æquo — mais jamais quelqu'un d'autre.
      expect(firstZeros).toContain(result.ranking[0])
    }
  })
})

describe('R14 — on ne perd qu’en finissant dernier', () => {
  it('à trois, la deuxième place fait continuer le run', () => {
    let seconds = 0
    for (let seed = 1; seed <= 200; seed++) {
      const { result } = play(seed, 0, 3)
      const place = result.ranking.indexOf(0)
      expect(result.humanPlace).toBe(place)
      expect(result.humanFirst).toBe(place === 0)
      // La seule façon de perdre est d'être le dernier à détenir des jetons.
      expect(result.humanWon).toBe(place < result.ranking.length - 1)
      if (place === 1) seconds++
    }
    // Le cas doit vraiment se produire, sinon le test ne prouve rien.
    expect(seconds).toBeGreaterThan(10)
  })

  it('en duel, c’est toujours « finir premier »', () => {
    for (const seed of seeds) {
      const { result } = play(seed, 0, 2)
      expect(result.humanWon).toBe(result.ranking[0] === 0)
      expect(result.humanWon).toBe(result.humanFirst)
    }
  })
})
