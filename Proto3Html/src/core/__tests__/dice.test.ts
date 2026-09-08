import { describe, expect, it } from 'vitest'
import {
  canEngrave,
  createDie,
  engrave,
  engravedFaces,
  flip,
  naturalDie,
  oppositeIndex,
  upgradeDie,
} from '../dice/dice'
import { evaluateDice } from '../dice/combinations'
import { config } from './helpers'

const cfg = config()
const d6 = () => createDie(cfg.dice.startingFaces)
/** Les tailles de dé successives du run (`R2`). */
const ladder = [...new Set(cfg.circles.map((c) => c.dieFaces))].sort((a, b) => a - b)

describe('F2 — appariement des faces', () => {
  it('le dé de départ vérifie v + opposé = faces + 1', () => {
    const die = d6()
    for (let i = 0; i < die.faces.length; i++) {
      expect((die.faces[i] as number) + (die.faces[oppositeIndex(die, i)] as number)).toBe(7)
    }
  })
})

describe('F6/F8 — montée de dé', () => {
  it('ajoute les nouvelles faces par paires aux extrémités', () => {
    expect(upgradeDie(d6(), 8).faces).toEqual([7, 1, 2, 3, 4, 5, 6, 8])
  })

  it('conserve les gravures déjà faites', () => {
    const grave = engrave(d6(), 2, 4) // la face à 3 devient un 4
    const monte = upgradeDie(grave, 8)
    expect(monte.faces).toEqual([7, 1, 2, 4, 4, 5, 6, 8])
  })

  it('préserve tous les appariements existants', () => {
    const before = d6()
    const after = upgradeDie(before, 12)
    for (let i = 0; i < before.faces.length; i++) {
      const v = before.faces[i] as number
      const opp = before.faces[oppositeIndex(before, i)] as number
      const j = after.faces.indexOf(v)
      expect(after.faces[oppositeIndex(after, j)]).toBe(opp)
    }
  })

  it('F7 — le D100 dilue la gravure : une seule face gravée sur 100', () => {
    const grave = engrave(d6(), 2, 4) // la face à 3 devient un 4
    const d100 = ladder.reduce((die, size) => upgradeDie(die, size), grave)
    expect(d100.faces).toHaveLength(100)
    expect(engravedFaces(d100, cfg.dice.startingFaces, ladder)).toHaveLength(1)
    expect(d100.faces.filter((f) => f === 4)).toHaveLength(2)
  })
})

describe('A7 — garde-fou de gravure', () => {
  it('refuse une valeur hors du dé', () => {
    expect(canEngrave(d6(), 0, 9, 4).ok).toBe(false)
  })

  it('autorise jusqu’à maxSameFace exemplaires, pas au-delà', () => {
    let die = d6()
    // Le dé porte déjà un 4 : trois gravures suffisent à en avoir quatre.
    die = engrave(die, 0, 4)
    die = engrave(die, 1, 4)
    die = engrave(die, 2, 4)
    expect(die.faces.filter((f) => f === 4)).toHaveLength(4)
    expect(canEngrave(die, 4, 4, 4).ok).toBe(false)
    expect(canEngrave(die, 4, 4, 4).reason).toContain('A7')
  })

  it('un dé saturé donne bien 29,6 % de 4-2-1 au premier jet (§17)', () => {
    const build = (target: number) => {
      let die = d6()
      let done = die.faces.filter((f) => f === target).length
      for (let i = 0; i < 6 && done < 4; i++) {
        if (die.faces[i] === target) continue
        die = engrave(die, i, target)
        done++
      }
      return die
    }
    const dice = [build(4), build(2), build(1)]
    let hits = 0
    const total = dice[0]!.faces.length * dice[1]!.faces.length * dice[2]!.faces.length
    for (const a of dice[0]!.faces) {
      for (const b of dice[1]!.faces) {
        for (const c of dice[2]!.faces) {
          if (evaluateDice([a, b, c], 6, cfg.combinations, false).id === '421') hits++
        }
      }
    }
    expect(hits / total).toBeCloseTo(0.296, 2)
  })
})

describe('B10 — retournement', () => {
  it('lit la face opposée telle qu’elle est gravée', () => {
    const die = d6()
    // La face d'indice 1 porte un 2 ; son opposée (indice 4) porte un 5.
    expect(flip(die, 1).value).toBe(5)
    const grave = engrave(die, 4, 3)
    expect(flip(grave, 1).value).toBe(3)
  })
})

describe('naturalDie', () => {
  it('reconstitue exactement un dé jamais gravé', () => {
    expect(naturalDie(cfg.dice.startingFaces, ladder, 8).faces).toEqual(upgradeDie(d6(), 8).faces)
    const d20 = naturalDie(cfg.dice.startingFaces, ladder, 20)
    expect(engravedFaces(d20, cfg.dice.startingFaces, ladder)).toEqual([])
  })
})
