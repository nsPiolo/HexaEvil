import { describe, expect, it } from 'vitest'
import { createStartingDeck, newCard } from '../cards/deck'
import { categorize, compareHands, evaluateHand } from '../cards/hands'
import type { Card, HandCategory } from '../rules/types'
import { config } from './helpers'

const cfg = config()
const cards = cfg.cards
const c = (value: number, suit: Card['suit']) => newCard(value, suit)

/** Toutes les mains de `size` cartes d'un deck neuf, comptées par catégorie. */
function census(size: number): Map<HandCategory, number> {
  const deck = createStartingDeck(cards)
  const counts = new Map<HandCategory, number>()
  const hand: Card[] = []
  const walk = (start: number): void => {
    if (hand.length === size) {
      const cat = categorize(hand, cards)
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
      return
    }
    for (let i = start; i < deck.length; i++) {
      hand.push(deck[i] as Card)
      walk(i + 1)
      hand.pop()
    }
  }
  walk(0)
  return counts
}

describe('C11 — reconnaissance des catégories', () => {
  it('reconnaît les catégories classiques à 5 cartes', () => {
    expect(categorize([c(5, 'hearts'), c(5, 'spades'), c(5, 'clubs'), c(5, 'diamonds'), c(9, 'hearts')], cards)).toBe('carre')
    expect(categorize([c(5, 'hearts'), c(5, 'spades'), c(5, 'clubs'), c(9, 'diamonds'), c(9, 'hearts')], cards)).toBe('full')
    expect(categorize([c(2, 'hearts'), c(5, 'hearts'), c(7, 'hearts'), c(9, 'hearts'), c(11, 'hearts')], cards)).toBe('couleur')
    expect(categorize([c(2, 'hearts'), c(3, 'spades'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')], cards)).toBe('suite')
    expect(categorize([c(2, 'hearts'), c(3, 'hearts'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')], cards)).toBe('quinteFlush')
  })

  it('C8 — cinq cartes identiques, née du clonage, bat tout', () => {
    const five = [0, 1, 2, 3, 4].map(() => c(7, 'hearts'))
    expect(categorize(five, cards)).toBe('cinqIdentiques')
    expect(evaluateHand(five, cards).rank).toBe(0)
  })

  it('C14 — l’As ne boucle pas en bas : A,2,3 n’est pas une suite', () => {
    expect(categorize([c(14, 'hearts'), c(2, 'spades'), c(3, 'clubs')], cards)).toBe('carteHaute')
    expect(categorize([c(12, 'hearts'), c(13, 'spades'), c(14, 'clubs')], cards)).toBe('suite')
  })

  it('C12d — pas de suite à 2 cartes, donc pas de quinte flush non plus', () => {
    expect(categorize([c(5, 'hearts'), c(6, 'hearts')], cards)).toBe('couleur')
    expect(categorize([c(5, 'hearts'), c(6, 'spades')], cards)).toBe('carteHaute')
  })
})

describe('C12 — le classement configuré est bien l’ordre de rareté', () => {
  // Le test qui vaut le plus cher : il **redérive** la table du GDD §4 par
  // dénombrement exhaustif et la confronte à la configuration. Si quelqu'un
  // touche `handRankings` sans compter, ça casse ici.
  for (const size of [1, 2, 3, 4]) {
    it(`main de ${size} carte(s) : rareté croissante`, () => {
      const counts = census(size)
      const observed = [...counts.entries()].sort((a, b) => a[1] - b[1]).map(([cat]) => cat)
      const configured = (cards.handRankings[size] ?? []).filter((cat) => counts.has(cat))
      expect(configured).toEqual(observed)
    })
  }

  it('les chiffres annoncés dans le GDD §4', () => {
    const two = census(2)
    expect(two.get('paire')).toBe(78) // 5,88 %
    expect(two.get('couleur')).toBe(312) // 23,53 %
    expect(two.get('carteHaute')).toBe(936) // 70,59 %

    const three = census(3)
    expect(three.get('quinteFlush')).toBe(44)
    expect(three.get('brelan')).toBe(52)
    expect(three.get('suite')).toBe(660)
    expect(three.get('couleur')).toBe(1100)
    expect(three.get('paire')).toBe(3744)

    const four = census(4)
    expect(four.get('carre')).toBe(13)
    expect(four.get('quinteFlush')).toBe(40)
    expect(four.get('brelan')).toBe(2496)
    expect(four.get('suite')).toBe(2520)
    expect(four.get('doublePaire')).toBe(2808)
    expect(four.get('couleur')).toBe(2820)
  })

  it('à 2 cartes la paire bat la couleur — l’inversion demandée', () => {
    const paire = evaluateHand([c(5, 'hearts'), c(5, 'spades')], cards)
    const couleur = evaluateHand([c(5, 'hearts'), c(9, 'hearts')], cards)
    expect(compareHands(paire, couleur)).toBeLessThan(0)
  })

  it('à 3 cartes la suite bat la couleur — l’inverse du poker', () => {
    const suite = evaluateHand([c(5, 'hearts'), c(6, 'spades'), c(7, 'clubs')], cards)
    const couleur = evaluateHand([c(5, 'hearts'), c(9, 'hearts'), c(13, 'hearts')], cards)
    expect(compareHands(suite, couleur)).toBeLessThan(0)
  })

  it('à 4 cartes le carré bat la quinte flush', () => {
    const carre = evaluateHand([c(5, 'hearts'), c(5, 'spades'), c(5, 'clubs'), c(5, 'diamonds')], cards)
    const qf = evaluateHand([c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts'), c(8, 'hearts')], cards)
    expect(compareHands(carre, qf)).toBeLessThan(0)
  })
})

describe('départage', () => {
  it('compare à catégorie égale par valeurs décroissantes', () => {
    const haut = evaluateHand([c(13, 'hearts'), c(4, 'spades')], cards)
    const bas = evaluateHand([c(12, 'hearts'), c(11, 'spades')], cards)
    expect(compareHands(haut, bas)).toBeLessThan(0)
  })

  it('une paire de rois bat une paire de dames', () => {
    const rois = evaluateHand([c(13, 'hearts'), c(13, 'spades')], cards)
    const dames = evaluateHand([c(12, 'hearts'), c(12, 'spades')], cards)
    expect(compareHands(rois, dames)).toBeLessThan(0)
  })
})
