import { describe, expect, it } from 'vitest'
import {
  bestHand,
  bestStrength,
  compareDice,
  evaluateDice,
  identify,
  NO_BONUS,
  type HandBonuses,
} from '../dice/combinations'
import { config } from './helpers'

const cfg = config()
const c = cfg.combinations
const bonus = (over: Partial<HandBonuses> = {}): HandBonuses => ({ ...NO_BONUS, ...over })
const hand = (values: number[], faces = 6, plus = false) =>
  evaluateDice(values, faces, c, bonus({ valuePlus1: plus }))

describe('V1 — reconnaissance des combinaisons', () => {
  it('reconnaît chaque combinaison, quel que soit l’ordre des dés', () => {
    expect(identify([4, 2, 1]).id).toBe('421')
    expect(identify([1, 4, 2]).id).toBe('421')
    expect(identify([1, 1, 1]).id).toBe('triple1')
    expect(identify([5, 5, 5]).id).toBe('triple')
    expect(identify([1, 1, 5]).id).toBe('pairOfOnes')
    expect(identify([3, 2, 1]).id).toBe('straight')
    expect(identify([6, 5, 4]).id).toBe('straight')
    expect(identify([2, 2, 1]).id).toBe('nenette')
    expect(identify([6, 3, 2]).id).toBe('junk')
  })

  it('V6 — la suite se lit sur 3 valeurs consécutives quel que soit le dé', () => {
    expect(identify([17, 16, 15]).id).toBe('straight')
  })
})

describe('V2 — barème généralisé', () => {
  // La table du GDD §8, colonne par colonne.
  const cases: [number, number, number][] = [
    // faces, valeur du 4-2-1, valeur du 1-1-1
    [6, 10, 7],
    [8, 12, 9],
    [12, 16, 13],
    [20, 24, 21],
    [100, 104, 101],
  ]
  it.each(cases)('D%i : 4-2-1 vaut %i et 1-1-1 vaut %i', (faces, v421, v111) => {
    expect(hand([4, 2, 1], faces).baseValue).toBe(v421)
    expect(hand([1, 1, 1], faces).baseValue).toBe(v111)
  })

  it('R3 — le pot vaut exactement trois 1-1-1', () => {
    for (const circle of cfg.circles) {
      expect(circle.pot).toBe(3 * hand([1, 1, 1], circle.dieFaces).baseValue)
    }
  })

  it('un brelan vaut sa valeur, un 1-1-x vaut le troisième dé', () => {
    expect(hand([5, 5, 5]).baseValue).toBe(5)
    expect(hand([1, 1, 5]).baseValue).toBe(5)
    expect(hand([6, 6, 6]).baseValue).toBe(6)
  })

  it('la suite vaut 2, le reste 1, la nénette 2', () => {
    expect(hand([3, 2, 1]).baseValue).toBe(2)
    expect(hand([6, 3, 2]).baseValue).toBe(1)
    expect(hand([2, 2, 1]).baseValue).toBe(2)
  })

  it('B13 — valuePlus1 change le transfert, pas le classement', () => {
    const nu = hand([5, 5, 5])
    const boosted = hand([5, 5, 5], 6, true)
    expect(boosted.chipValue).toBe(nu.chipValue + 1)
    expect(boosted.baseValue).toBe(nu.baseValue)
    expect(compareDice(nu, boosted)).toBe(0)
  })
})

describe('V4 — classement', () => {
  it('ordonne 4-2-1 > 1-1-1 > brelan 6 > suite > junk > nénette', () => {
    const ordered = [
      hand([4, 2, 1]),
      hand([1, 1, 1]),
      hand([6, 6, 6]),
      hand([6, 5, 4]),
      hand([6, 3, 2]),
      hand([2, 2, 1]),
    ]
    for (let i = 1; i < ordered.length; i++) {
      expect(compareDice(ordered[i - 1]!, ordered[i]!)).toBeLessThan(0)
    }
  })

  it('V1b — à valeur égale, x-x-x bat 1-1-x', () => {
    expect(compareDice(hand([5, 5, 5]), hand([1, 1, 5]))).toBeLessThan(0)
  })

  it('mais un 1-1-6 bat un brelan de 5 : la valeur passe avant', () => {
    expect(compareDice(hand([1, 1, 6]), hand([5, 5, 5]))).toBeLessThan(0)
  })

  it('V5 — la nénette est la pire main du jeu, tout en valant 2', () => {
    const nenette = hand([2, 2, 1])
    const junk = hand([6, 4, 2])
    expect(compareDice(nenette, junk)).toBeGreaterThan(0)
    expect(nenette.baseValue).toBeGreaterThan(junk.baseValue)
  })

  it('départage deux junk par valeurs décroissantes', () => {
    expect(compareDice(hand([6, 4, 2]), hand([6, 4, 1]))).toBeLessThan(0)
  })
})

describe('D3b — meilleure combinaison de 3 dés parmi N', () => {
  it('retient les trois dés qui font la meilleure main', () => {
    const best = bestHand([6, 4, 2, 1], 6, c)
    expect(best.hand.id).toBe('421')
    expect(best.indices).toEqual([1, 2, 3])
  })

  it('à 3 dés, c’est l’identité', () => {
    const best = bestHand([5, 5, 5], 6, c)
    expect(best.hand.id).toBe('triple')
    expect(best.indices).toEqual([0, 1, 2])
  })

  it('sur 5 dés, choisit le brelan plutôt que la suite', () => {
    const best = bestHand([3, 4, 5, 6, 6], 6, c)
    expect(best.hand.id).toBe('straight') // suite 4-5-6 vaut 2, aucun brelan complet
    const withTriple = bestHand([3, 4, 6, 6, 6], 6, c)
    expect(withTriple.hand.id).toBe('triple')
    expect(withTriple.hand.baseValue).toBe(6)
  })

  it('bestStrength est cohérente avec compareDice', () => {
    // `bestStrength` est volontairement plus grossière : elle s'arrête au rang,
    // à la valeur et au départage triple/1-1-x, sans descendre aux valeurs de
    // dés. C'est un objectif d'IA, pas un classement de partie — mais quand
    // elle sépare deux mains, elle doit les séparer dans le bon sens.
    const cases: number[][] = [
      [4, 2, 1, 3],
      [1, 1, 1, 6],
      [6, 6, 6, 1],
      [1, 1, 5, 2],
      [2, 2, 1, 5],
      [6, 5, 4, 2],
      [3, 5, 2, 6],
    ]
    for (const a of cases) {
      for (const b of cases) {
        const sa = bestStrength(a, 6, c)
        const sb = bestStrength(b, 6, c)
        if (sa === sb) continue
        const cmp = compareDice(bestHand(a, 6, c).hand, bestHand(b, 6, c).hand)
        expect(Math.sign(sb - sa)).toBe(Math.sign(cmp))
      }
    }
  })
})

describe('B19 à B24 — ce que les récompenses changent à la lecture d’une main', () => {
  it('B19 — la suite élargie accepte un écart de 2', () => {
    expect(identify([2, 4, 6]).id).toBe('junk')
    expect(identify([2, 4, 6], true).id).toBe('straight')
    expect(identify([2, 3, 5], true).id).toBe('straight')
    // Ce qui était déjà une suite en reste une.
    expect(identify([3, 4, 5], true).id).toBe('straight')
    // Et ce qui n’en est pas une n’en devient pas une.
    expect(identify([2, 5, 6], true).id).toBe('junk')
    expect(identify([1, 1, 3], true).id).toBe('pairOfOnes')
  })

  it('B20 — un plancher change les jetons transférés, pas le classement', () => {
    const nu = evaluateDice([3, 4, 5], 6, c)
    const floored = evaluateDice([3, 4, 5], 6, c, bonus({ floors: { straight: 5 } }))
    expect(nu.chipValue).toBe(2)
    expect(floored.chipValue).toBe(5)
    expect(floored.baseValue).toBe(nu.baseValue)
    expect(compareDice(nu, floored)).toBe(0)
  })

  it('B20 — le plancher ne rabaisse jamais une main déjà au-dessus', () => {
    // 1-1-6 vaut déjà 6 : le plancher à 4 ne doit rien retirer.
    expect(evaluateDice([1, 1, 6], 6, c, bonus({ floors: { pairOfOnes: 4 } })).chipValue).toBe(6)
    expect(evaluateDice([1, 1, 2], 6, c, bonus({ floors: { pairOfOnes: 4 } })).chipValue).toBe(4)
  })

  it('B23 — 4 identiques valent 10 jetons, +4 par dé de plus', () => {
    const four = bestHand([5, 5, 5, 5], 6, c, bonus({ quad: true }))
    expect(four.hand.id).toBe('quad')
    expect(four.hand.chipValue).toBe(10)
    expect(four.indices).toEqual([0, 1, 2, 3])
    const five = bestHand([5, 5, 5, 5, 5], 6, c, bonus({ quad: true }))
    expect(five.hand.chipValue).toBe(14)
    // Sans la récompense, ce n’est qu’un brelan.
    expect(bestHand([5, 5, 5, 5], 6, c).hand.id).toBe('triple')
  })

  it('B23 — et 3 identiques ne suffisent pas', () => {
    expect(bestHand([5, 5, 5, 2], 6, c, bonus({ quad: true })).hand.id).toBe('triple')
  })

  it('B24 — une suite sur tous les dés vaut 7 jetons', () => {
    const best = bestHand([3, 4, 5, 6], 6, c, bonus({ fullStraight: true }))
    expect(best.hand.id).toBe('fullStraight')
    expect(best.hand.chipValue).toBe(7)
    expect(best.indices).toEqual([0, 1, 2, 3])
    // Il faut **tous** les dés : un intrus et la main retombe sur les meilleurs 3.
    expect(bestHand([3, 4, 5, 1], 6, c, bonus({ fullStraight: true })).hand.id).toBe('straight')
    // Et 3 dés ne font jamais une grande suite (`minDice`).
    expect(bestHand([3, 4, 5], 6, c, bonus({ fullStraight: true })).hand.id).toBe('straight')
  })

  it('B23/B24 — les deux passent devant le 4-2-1', () => {
    const quad = bestHand([5, 5, 5, 5], 6, c, bonus({ quad: true })).hand
    const full = bestHand([3, 4, 5, 6], 6, c, bonus({ fullStraight: true })).hand
    const best421 = bestHand([4, 2, 1, 6], 6, c).hand
    expect(compareDice(quad, best421)).toBeLessThan(0)
    expect(compareDice(full, best421)).toBeLessThan(0)
    // Entre elles, la valeur départage : 10 (ou plus) contre 7.
    expect(compareDice(quad, full)).toBeLessThan(0)
  })

  it('B19 + B24 — la grande suite suit la suite élargie du détenteur', () => {
    const wide = bonus({ fullStraight: true, wideStraight: true })
    expect(bestHand([2, 4, 6, 8], 8, c, wide).hand.id).toBe('fullStraight')
    expect(bestHand([2, 4, 6, 8], 8, c, bonus({ fullStraight: true })).hand.id).not.toBe('fullStraight')
  })

  it('F10 — une face « 3 ou 5 » ne vaut plus sa valeur imprimée', () => {
    // Le 6 lu 3 fait la suite 2-3-4 ; sans lecture, ce n’est qu’un junk.
    expect(bestHand([6, 4, 2], 6, c).hand.id).toBe('junk')
    expect(bestHand([6, 4, 2], 6, c, NO_BONUS, [[3, 5], null, null]).hand.id).toBe('straight')
    // Et le 6 n’est plus lisible : un 6-6-6 gravé deux fois n’est plus un brelan de 6.
    const lu = bestHand([6, 6, 6], 6, c, NO_BONUS, [[3, 5], [3, 5], null])
    expect(lu.hand.id).not.toBe('triple')
  })

  it('bestStrength suit bestHand sur les nouvelles combinaisons', () => {
    const cases: [number[], HandBonuses][] = [
      [[5, 5, 5, 5], bonus({ quad: true })],
      [[3, 4, 5, 6], bonus({ fullStraight: true })],
      [[2, 4, 6, 1], bonus({ wideStraight: true })],
      [[4, 2, 1, 6], NO_BONUS],
      [[6, 3, 2, 5], NO_BONUS],
    ]
    for (const [va, ba] of cases) {
      for (const [vb, bb] of cases) {
        const sa = bestStrength(va, 6, c, ba)
        const sb = bestStrength(vb, 6, c, bb)
        if (sa === sb) continue
        const cmp = compareDice(bestHand(va, 6, c, ba).hand, bestHand(vb, 6, c, bb).hand)
        expect(Math.sign(sb - sa)).toBe(Math.sign(cmp))
      }
    }
  })
})
