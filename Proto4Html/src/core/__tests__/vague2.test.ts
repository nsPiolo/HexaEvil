/**
 * Vague 2 : les objets recyclés du catalogue de cartes abandonné (docs/proto4/cartes.md
 * § Ce qui a été recyclé) — faces de forge 15 à 18, Dé du Damné, artefacts 33 à 42.
 *
 * Ce fichier ne teste que ce que ces objets ajoutent aux règles. Ce qu'ils empruntent à
 * l'existant (collisions, couloirs, cumul, décote) est déjà couvert par `race.test.ts` et
 * `bets.test.ts` : le répéter ici ne dirait rien de neuf.
 */
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../config/load'
import type { RaceConfig } from '../config/schema'
import rawConfig from '../../../config/race.json'
import {
  ARM_WRESTLE_REACH,
  applyMove,
  buildMoves,
  createRace,
  createTrack,
  endTurn,
  hookDistance,
  placeMarker,
  sendToStart,
  type Move,
  type RaceState,
} from '../rules/race'
import { betRefusal, evaluateBet, settleBets, type Bet } from '../rules/bets'
import { forgeFace, effectivePrice } from '../shop/shop'
import { exclusiveWith } from '../shop/items'
import { plainFace, type Face } from '../rules/dice'

const cfg: RaceConfig = loadConfig(rawConfig)

function withPositions(positions: number[], lanes = 1): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } }, { lanes })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0 })) }
}

/** Un déplacement nu portant les effets de face qu'on veut éprouver. */
function faced(soul: number, distance: number, effects: Face['effect'][]): Move {
  return { source: 'player', soul, distance, parts: [{ soulDie: 0, distanceDie: 0, distance }], notes: [], effects: effects.filter((e): e is NonNullable<Face['effect']> => e !== null) }
}

const rollOf = (faces: Face[], soul: number[]) => ({ distance: faces.map((f) => f.value), faces, soul })

// ---------------------------------------------------------------------------

describe('face Revers (forge.md n°15)', () => {
  it('s’arrête derrière l’âme heurtée au lieu de sauter devant', () => {
    // Piste à un couloir : 0 en 0, 1 en 3. Un +3 percuterait et sauterait en 4 ; le Revers
    // fait redescendre sur la première case libre derrière, ici la 2.
    const state = withPositions([0, 3])
    const { result } = applyMove(state, faced(0, 3, ['reverse']))
    expect(result.to).toBe(2)
    expect(result.collision).toBeNull()
    expect(result.move.notes.some((n) => n.id === 'reverse')).toBe(true)
  })

  it('annule le déplacement quand rien n’est libre avant la case de départ', () => {
    // 0 en 0, 1 en 1 : un +1 percute en 1, et il n'y a aucune case entre 1 et 0.
    const state = withPositions([0, 1])
    const { result } = applyMove(state, faced(0, 1, ['reverse']))
    expect(result.to).toBe(0)
    expect(result.collision).toBeNull()
  })

  it('laisse un déplacement sans collision se faire normalement', () => {
    const state = withPositions([0, 7])
    expect(applyMove(state, faced(0, 2, ['reverse'])).result.to).toBe(2)
  })
})

describe('face Bras de fer (forge.md n°17)', () => {
  it('échange la place avec l’âme immédiatement devant', () => {
    const state = withPositions([2, 4])
    const { state: after, result } = applyMove(state, faced(0, 0, ['armWrestle']))
    expect(result.to).toBe(4)
    expect(after.souls[1]?.position).toBe(2)
    expect(result.collision).toEqual({ kind: 'swap', with: 1, otherFrom: 4, otherTo: 2 })
  })

  it('ne fait rien au-delà de sa portée', () => {
    const state = withPositions([0, ARM_WRESTLE_REACH + 1])
    const { state: after, result } = applyMove(state, faced(0, 0, ['armWrestle']))
    expect(result.to).toBe(0)
    expect(after.souls[1]?.position).toBe(ARM_WRESTLE_REACH + 1)
  })

  it('ne fait pas franchir l’arrivée (principe non négociable n°8)', () => {
    // L'âme de devant a déjà franchi : l'échange la ramènerait en arrière et ferait arriver
    // l'autre sans dé. La face ne fait rien.
    const state = withPositions([cfg.track.columns - 1, cfg.track.columns])
    const { result } = applyMove(state, faced(0, 0, ['armWrestle']))
    expect(result.to).toBe(cfg.track.columns - 1)
    expect(result.crossedFinish).toBe(false)
  })

  it('ne fait rien quand personne n’est devant', () => {
    const state = withPositions([5, 2])
    expect(applyMove(state, faced(0, 0, ['armWrestle'])).result.to).toBe(5)
  })
})

describe('face Écho (forge.md n°16)', () => {
  const echo = forgeFace('echo', plainFace(1))

  it('ajoute un déplacement de 1 sur l’âme du dé Âme inutilisé', () => {
    // Deux dés Distance, trois dés Âme : le dé Âme 2 (âme 4) reste sur le carreau.
    const roll = rollOf([echo, plainFace(2)], [0, 1, 4])
    const moves = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 1, distanceDie: 1 }], 'player')
    expect(moves).toHaveLength(3)
    expect(moves[0]?.distance).toBe(1)
    expect(moves[2]).toMatchObject({ soul: 4, distance: 1, induced: true })
    expect(moves[2]?.notes[0]?.id).toBe('echo')
  })

  it('vaut une case de plus sur sa propre âme quand tous les dés Âme ont servi', () => {
    const roll = rollOf([echo, plainFace(2)], [0, 1])
    const moves = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 1, distanceDie: 1 }], 'player')
    expect(moves).toHaveLength(2)
    expect(moves[0]?.distance).toBe(2)
  })
})

describe('face de fusion (forge.md n°18)', () => {
  it('cumule les deux distances sur une seule âme quand les deux combinaisons la visent', () => {
    // C'est ce que fait l'action `fuseCombination` : elle repointe le dé Âme, le cumul du
    // GDD §2.5.1 fait le reste. On vérifie ici la règle qu'elle exploite.
    const roll = rollOf([forgeFace('fusion', plainFace(1)), plainFace(3)], [0, 1])
    const moves = buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }, { soulDie: 0, distanceDie: 1 }], 'player')
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ soul: 0, distance: 4 })
  })
})

describe('Roue d’Ixion (artefacts.md n°42)', () => {
  it('renvoie l’âme au départ et lui rend son absence d’arrivée', () => {
    const state = withPositions([cfg.track.columns - 1, 2])
    const { state: crossed, result } = applyMove(state, faced(0, 2, []))
    expect(result.crossedFinish).toBe(true)
    expect(crossed.souls[0]?.finishOrder).toBe(1)

    const back = sendToStart(crossed, 0)
    expect(back.souls[0]).toMatchObject({ position: 0, finishOrder: null })
    // Le numéro d'arrivée est rendu : la prochaine âme à franchir sera bien la première.
    expect(back.nextFinishOrder).toBe(1)
    expect(back.barred).toEqual([0])
    // La course n'est pas finie : plus personne n'a franchi.
    expect(endTurn(back).finished).toBe(false)
  })

  it('ferme le guichet pour l’âme renvoyée, même repassée sous le seuil', () => {
    const state = { ...withPositions([0, 2]), barred: [0] }
    expect(betRefusal(state, 'winner', [0], 10, 100)).toEqual({ kind: 'soulBarred' })
    expect(betRefusal(state, 'winner', [1], 10, 100)).toBeNull()
  })
})

describe('Crochet de Charon (artefacts.md n°41)', () => {
  it('ramène à la dernière colonne avant le seuil, donc de nouveau pariable', () => {
    const state = withPositions([cfg.track.columns - 1, 0])
    const d = hookDistance(state, 0)
    expect(d).toBeLessThan(0)
    const { state: after } = applyMove(state, { source: 'artefact', soul: 0, distance: d, parts: [], notes: [], effects: [], induced: true })
    expect(after.souls[0]?.position).toBe(state.track.betThresholdColumn - 1)
    expect(betRefusal(after, 'winner', [0], 10, 100)).toBeNull()
  })

  it('ne fait rien sur une âme qui n’est pas en zone de fin', () => {
    expect(hookDistance(withPositions([1, 0]), 0)).toBe(0)
  })
})

describe('Bornes du stagiaire (artefacts.md n°33)', () => {
  it('pose une borne hors départ et hors zone de fin, et pas deux sur la même case', () => {
    const state = withPositions([0, 0])
    const one = placeMarker(state, 2, 0, 'trap', 2, 2)
    expect(one.markers).toBe(1)
    expect(one.track.specials).toHaveLength(1)
    // Case déjà occupée par une borne : refusé.
    expect(placeMarker(one, 2, 0, 'boost', 2, 2)).toBe(one)
    // Départ et zone de fin : refusés.
    expect(placeMarker(one, 0, 0, 'trap', 2, 2)).toBe(one)
    expect(placeMarker(one, state.track.betThresholdColumn, 0, 'trap', 2, 2)).toBe(one)
  })

  it('s’arrête au nombre de bornes permis', () => {
    let state = withPositions([0, 0])
    state = placeMarker(state, 2, 0, 'trap', 2, 2)
    state = placeMarker(state, 3, 0, 'boost', 2, 2)
    expect(state.markers).toBe(2)
    expect(placeMarker(state, 4, 0, 'tar', 0, 2)).toBe(state)
  })

  it('la Fosse fait reculer, le Tremplin fait avancer', () => {
    const pit = placeMarker(withPositions([0, 9]), 3, 0, 'trap', 2, 2)
    expect(applyMove(pit, faced(0, 3, [])).follow[0]).toMatchObject({ soul: 0, distance: -2 })
    const spring = placeMarker(withPositions([0, 9]), 3, 0, 'boost', 2, 2)
    expect(applyMove(spring, faced(0, 3, [])).follow[0]).toMatchObject({ soul: 0, distance: 2 })
  })

  it('le Goudron coupe les déplacements induits de l’âme engluée, jusqu’à la fin du tour', () => {
    // Sans goudron, le Tremplin de la case 3 pousse l'âme de 2.
    const plain = placeMarker(withPositions([0, 9]), 3, 0, 'boost', 2, 2)
    expect(applyMove(plain, faced(0, 3, [])).follow).toHaveLength(1)
    // Avec du goudron sur la même case, plus rien ne la pousse — pas même ce tremplin.
    const tar = placeMarker(withPositions([0, 9]), 3, 0, 'tar', 0, 2)
    const { state: after, follow } = applyMove(tar, faced(0, 3, ['magnet']))
    expect(follow).toHaveLength(0)
    expect(after.tarred).toEqual([0])
    // Le goudron ne tient qu'un tour.
    expect(endTurn(after).tarred).toEqual([])
  })
})

describe('longueur de piste (artefacts.md n°34 et 35)', () => {
  it('raccourcit ou rallonge le parcours et recalcule le seuil de pari', () => {
    const base = createTrack(cfg.track)
    const shorter = createTrack(cfg.track, { columns: cfg.track.columns - 1 })
    const longer = createTrack(cfg.track, { columns: cfg.track.columns + 1 })
    expect(shorter.columns).toBe(base.columns - 1)
    expect(longer.columns).toBe(base.columns + 1)
    expect(shorter.betThresholdColumn).toBeLessThanOrEqual(base.betThresholdColumn)
    expect(longer.betThresholdColumn).toBeGreaterThanOrEqual(base.betThresholdColumn)
    expect(shorter.totalCells).toBe(shorter.columns + cfg.track.cellsAfterFinish)
  })

  it('garde toujours de quoi courir', () => {
    expect(createTrack(cfg.track, { columns: -5 }).columns).toBe(2)
  })

  it('interdit de posséder les deux artefacts qui s’annulent', () => {
    expect(exclusiveWith('raccourci', ['chaineDesLimbes'])).toBe('chaineDesLimbes')
    expect(exclusiveWith('chaineDesLimbes', ['raccourci'])).toBe('raccourci')
    expect(exclusiveWith('coteMontante', ['ticketPremiereHeure'])).toBe('ticketPremiereHeure')
    expect(exclusiveWith('raccourci', ['boursePercee'])).toBeNull()
  })
})

describe('Registre des paris exotiques (artefacts.md n°39)', () => {
  it('compte les percussions subies par chaque âme', () => {
    const state = withPositions([0, 2, 3])
    const { state: after } = applyMove(state, faced(0, 2, []))
    // L'âme 0 arrive en 2, percute l'âme 1, saute en 3, percute l'âme 2, saute en 4.
    expect(after.rams).toEqual({ 1: 1, 2: 1 })
  })

  it('retient qu’une âme a reculé, d’où que vienne le recul', () => {
    const state = withPositions([4, 0])
    expect(state.backward).toBe(false)
    expect(applyMove(state, faced(0, -2, [])).state.backward).toBe(true)
  })

  it('règle « percutée deux fois » sur le compteur, pas sur le classement', () => {
    const ranked = [
      { soul: { id: 0, name: 'a', position: 9, lane: 0, finishOrder: null }, rank: 1 },
      { soul: { id: 1, name: 'b', position: 2, lane: 0, finishOrder: null }, rank: 2 },
    ]
    expect(evaluateBet({ type: 'rammedTwice', souls: [1] }, ranked, 0, { rams: { 1: 2 }, backward: false })).toBe(true)
    expect(evaluateBet({ type: 'rammedTwice', souls: [1] }, ranked, 0, { rams: { 1: 1 }, backward: false })).toBe(false)
    expect(evaluateBet({ type: 'noBackward', souls: [] }, ranked, 0, { rams: {}, backward: false })).toBe(true)
    expect(evaluateBet({ type: 'noBackward', souls: [] }, ranked, 0, { rams: {}, backward: true })).toBe(false)
    // Sans statistiques, un pari exotique ne peut pas être gagné : on ne devine pas un déroulé.
    expect(evaluateBet({ type: 'noBackward', souls: [] }, ranked, 0)).toBe(false)
  })

  it('paie le ticket exotique au règlement', () => {
    const ranked = [{ soul: { id: 0, name: 'a', position: 9, lane: 0, finishOrder: null }, rank: 1 }]
    const bet: Bet = { id: 1, type: 'noBackward', souls: [], stake: 10, multiplier: 4, turn: 0, status: 'open', payout: 0 }
    const won = settleBets([bet], ranked, { stats: { rams: {}, backward: false } })
    expect(won.bets[0]?.status).toBe('won')
    expect(won.returned).toBe(40)
    const lost = settleBets([bet], ranked, { stats: { rams: {}, backward: true } })
    expect(lost.bets[0]?.status).toBe('lost')
  })
})

describe('Sceau du stagiaire (artefacts.md n°25)', () => {
  const mask = { kind: 'personality', id: 'masqueMartyr', personality: 'martyr', name: 'm', description: 'd', rarity: 'common', price: 100, params: {}, impact: 'moyen', warning: null, minRank: 1 } as const
  const broken = { ...mask, id: 'masqueBrise', personality: null } as const

  it('remise les masques et offre le premier masque brisé du cercle', () => {
    expect(effectivePrice(mask, 1, 0)).toBe(100)
    expect(effectivePrice(mask, 1, 0, { maskDiscount: 0.3 })).toBe(70)
    expect(effectivePrice(broken, 1, 0, { maskDiscount: 0.3, maskFreeAvailable: true })).toBe(0)
    // La gratuité ne porte que sur le masque brisé : marquer une âme reste payant.
    expect(effectivePrice(mask, 1, 0, { maskDiscount: 0.3, maskFreeAvailable: true })).toBe(70)
  })
})
