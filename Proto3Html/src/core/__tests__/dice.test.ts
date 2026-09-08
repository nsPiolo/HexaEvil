import { describe, expect, it } from 'vitest'
import {
  canEngrave,
  createDie,
  engrave,
  engraveEffect,
  engraveValue,
  engravedFaces,
  flip,
  naturalDie,
  oppositeIndex,
  upgradeDie,
  values,
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
    const v = values(die)
    for (let i = 0; i < die.faces.length; i++) {
      expect((v[i] as number) + (v[oppositeIndex(die, i)] as number)).toBe(7)
    }
  })
})

describe('F6/F8 — montée de dé', () => {
  it('ajoute les nouvelles faces par paires aux extrémités', () => {
    expect(values(upgradeDie(d6(), 8))).toEqual([7, 1, 2, 3, 4, 5, 6, 8])
  })

  it('conserve les gravures déjà faites', () => {
    const grave = engrave(d6(), 2, 4) // la face à 3 devient un 4
    const monte = upgradeDie(grave, 8)
    expect(values(monte)).toEqual([7, 1, 2, 4, 4, 5, 6, 8])
  })

  it('préserve tous les appariements existants', () => {
    const before = d6()
    const after = upgradeDie(before, 12)
    const bv = values(before)
    const av = values(after)
    for (let i = 0; i < before.faces.length; i++) {
      const v = bv[i] as number
      const opp = bv[oppositeIndex(before, i)] as number
      const j = av.indexOf(v)
      expect(av[oppositeIndex(after, j)]).toBe(opp)
    }
  })

  it('F7 — le D100 dilue la gravure : une seule face gravée sur 100', () => {
    const grave = engrave(d6(), 2, 4) // la face à 3 devient un 4
    const d100 = ladder.reduce((die, size) => upgradeDie(die, size), grave)
    expect(d100.faces).toHaveLength(100)
    expect(engravedFaces(d100, cfg.dice.startingFaces, ladder)).toHaveLength(1)
    expect(values(d100).filter((v) => v === 4)).toHaveLength(2)
  })
})

describe('A6 — bornes de la gravure', () => {
  it('refuse une valeur hors du dé', () => {
    expect(canEngrave(d6(), 0, 9).ok).toBe(false)
    expect(canEngrave(d6(), 0, 0).ok).toBe(false)
    expect(canEngrave(d6(), 9, 3).ok).toBe(false)
  })

  it('n’impose plus aucun plafond de faces identiques (A7 retiré)', () => {
    let die = d6()
    for (let i = 0; i < 6; i++) {
      expect(canEngrave(die, i, 4).ok).toBe(true)
      die = engraveValue(die, i, 4)
    }
    expect(values(die)).toEqual([4, 4, 4, 4, 4, 4])
  })

  it('un dé saturé donne bien 100 % de 4 — et c’est au joueur de voir que c’est mauvais', () => {
    let die = d6()
    for (let i = 0; i < 6; i++) die = engraveValue(die, i, 4)
    // Trois dés ainsi gravés ne feront jamais ni suite, ni 4-2-1, ni 1-1-x.
    const hand = evaluateDice([4, 4, 4], 6, cfg.combinations, false)
    expect(hand.id).toBe('triple')
    expect(hand.baseValue).toBe(4)
  })

  it('graver une valeur conserve l’effet, graver un effet conserve la valeur', () => {
    const avecEffet = engraveEffect(d6(), 2, 'wild')
    expect(avecEffet.faces[2]).toEqual({ value: 3, effect: 'wild' })
    const puisValeur = engraveValue(avecEffet, 2, 5)
    expect(puisValeur.faces[2]).toEqual({ value: 5, effect: 'wild' })
    const puisAutreEffet = engraveEffect(puisValeur, 2, 'money')
    expect(puisAutreEffet.faces[2]).toEqual({ value: 5, effect: 'money' })
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
    expect(values(naturalDie(cfg.dice.startingFaces, ladder, 8))).toEqual(values(upgradeDie(d6(), 8)))
    const d20 = naturalDie(cfg.dice.startingFaces, ladder, 20)
    expect(engravedFaces(d20, cfg.dice.startingFaces, ladder)).toEqual([])
  })
})
