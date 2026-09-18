/**
 * Pouvoirs de boss (GDD §5.1), cases spéciales (§2.2) et progression de boutique
 * (artefacts.md, forge.md, boutique-README § Déblocage par la hiérarchie).
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import { loadShopConfig } from '../shop/load'
import { BOSS_EFFECT_IDS, generateBossEffects, type BossEffect } from '../rules/boss'
import { plainFace } from '../rules/dice'
import {
  applyMove,
  bossContext,
  bossMoveRules,
  buildMoves,
  createRace,
  createTrack,
  endTurn,
  rollOpponentPair,
  rollPlayerDice,
  simpleMove,
  specialAt,
  type Move,
  type RaceState,
} from '../rules/race'
import { seededRng } from '../rules/rng'
import { applyPurchase, artefactSlotsAt, decapFace, defaultInventory, findItem, generateVitrine, maxAlteredFaces, resaleValue, sellArtefact } from '../shop/shop'
import { allIds } from '../shop/unlocks'

const cfg = loadConfig(rawConfig)
const shop = loadShopConfig(rawShop)
const fx = (id: BossEffect['id'], value: number): BossEffect[] => [{ id, value }]

function raceAt(positions: number[]): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0 })) }
}
const move = (soul: number, distance: number): Move => simpleMove('player', soul, distance)
const posOf = (st: RaceState, id: number): number => st.souls[id]!.position

describe('catalogue des pouvoirs', () => {
  it('chaque cercle écrit porte des effets connus, et la course du boss seule les subit', () => {
    for (const c of cfg.run.circles) {
      expect(c.powers.length).toBeGreaterThan(0)
      for (const e of c.powers) expect(BOSS_EFFECT_IDS).toContain(e.id)
      expect(c.power.length).toBeGreaterThan(10)
    }
  })

  it('un boss généré assemble 2 à 4 effets distincts et compatibles, à graine égale le même', () => {
    for (let seed = 1; seed < 60; seed++) {
      const e = generateBossEffects(seededRng(seed))
      expect(e.length).toBeGreaterThanOrEqual(2)
      expect(e.length).toBeLessThanOrEqual(4)
      expect(new Set(e.map((x) => x.id)).size).toBe(e.length)
      const ids = e.map((x) => x.id)
      // Les couples qui s'annulent ou s'embrouillent ne sortent jamais ensemble.
      expect(ids.includes('slowWater') && ids.includes('opponentBoost')).toBe(false)
      expect(ids.includes('frozenLanes') && ids.includes('pushBack')).toBe(false)
    }
    expect(generateBossEffects(seededRng(7))).toEqual(generateBossEffects(seededRng(7)))
  })
})

describe('effets de boss en course', () => {
  it('Minos aggrave les reculs et Le Noyé ralentit les avancées, des deux côtés', () => {
    const harsh = buildMoves({ distance: [-1], faces: [plainFace(-1)], soul: [0] }, [{ soulDie: 0, distanceDie: 0 }], 'opponent', bossContext(1, fx('harshNegatives', 1)))
    expect(harsh[0]?.distance).toBe(-2)
    const slow = buildMoves({ distance: [3], faces: [plainFace(3)], soul: [0] }, [{ soulDie: 0, distanceDie: 0 }], 'player', bossContext(1, fx('slowWater', 1)))
    expect(slow[0]?.distance).toBe(2)
  })

  it('Cerbère mord la percutée, Le Porte-chaînes l’immobilise', () => {
    const bite = applyMove(raceAt([1, 3, 0]), move(0, 2), bossMoveRules(fx('bite', 1)))
    expect(bite.follow).toContainEqual(expect.objectContaining({ soul: 1, distance: -1 }))
    const chain = applyMove(raceAt([1, 3, 0]), move(0, 2), bossMoveRules(fx('chained', 1)))
    expect(chain.state.chained).toEqual([{ soul: 1, untilTurn: 2 }])
    // Enchaînée, elle ne bouge plus, même poussée par le joueur.
    const stuck = applyMove(chain.state, move(1, 3), {})
    expect(posOf(stuck.state, 1)).toBe(posOf(chain.state, 1))
    expect(stuck.result.frozen).toBe(true)
  })

  it('Phlégyas pousse au lieu d’échanger', () => {
    const st = raceAt([5, 3, 0])
    const swap = applyMove(st, move(0, -2), {})
    expect(posOf(swap.state, 1)).toBe(5)
    const push = applyMove(st, move(0, -2), bossMoveRules(fx('pushBack', 1)))
    expect(posOf(push.state, 0)).toBe(3)
    expect(posOf(push.state, 1)).toBe(2)
  })

  it('Le Givre supprime le déport de couloir : on percute dans son propre couloir', () => {
    const race = createRace({ ...cfg, souls: { ...cfg.souls, count: 3 } }, { lanes: 2 })
    const souls = race.souls.map((s, i) => ({ ...s, position: [1, 3, 3][i]!, lane: [0, 0, 1][i]! }))
    const st = { ...race, souls }
    // Sans le pouvoir, la colonne 3 est pleine : l'âme saute devant.
    expect(posOf(applyMove(st, move(0, 2), {}).state, 0)).toBe(4)
    // Avec, elle percute l'occupante de son couloir et saute aussi — mais sans avoir cherché
    // ailleurs : c'est bien une collision, pas un déport.
    const frozen = applyMove(st, move(0, 2), bossMoveRules(fx('frozenLanes', 1)))
    expect(frozen.result.collision?.kind).toBe('jump')
  })

  it('Le Souffle recule tout le monde en fin de tour, sauf au tour d’arrivée', () => {
    const st = raceAt([5, 3, 0])
    const blown = endTurn(st, fx('backdraft', 1))
    expect(blown.souls.map((s) => s.position)).toEqual([4, 2, 0])
    // Course finie : le classement est joué, on n'y touche plus.
    const done = raceAt([cfg.track.columns + 1, 3, 0])
    expect(endTurn(done, fx('backdraft', 1)).souls.map((s) => s.position)).toEqual([cfg.track.columns + 1, 3, 0])
  })

  it('Le Minotaure charge et Le stagiaire promu vise vos paris', () => {
    for (let seed = 1; seed < 30; seed++) {
      const boosted = rollOpponentPair(cfg, 5, seededRng(seed), { boost: 1 })
      const plain = rollOpponentPair(cfg, 5, seededRng(seed), {})
      const p = plain.distance[0]!
      expect(boosted.distance[0]).toBe(p > 0 ? p + 1 : p)
      const targeted = rollOpponentPair(cfg, 5, seededRng(seed), { targets: [2] })
      expect(targeted.soul[0]).toBe(2)
      expect(targeted.distance[0]!).toBeLessThan(0)
    }
  })

  it('Géryon fait mentir les dés Âme, sans jamais sortir du plateau', () => {
    const dice = defaultInventory(cfg).dice
    let lied = false
    for (let seed = 1; seed < 120; seed++) {
      const honest = rollPlayerDice(cfg, 5, seededRng(seed), dice)
      const liar = rollPlayerDice(cfg, 5, seededRng(seed), dice, { lying: 2 })
      expect(liar.soul.every((id) => id >= 0 && id < 5)).toBe(true)
      if (liar.soul.join() !== honest.soul.join()) lied = true
    }
    expect(lied).toBe(true)
  })

  it('Les Furies avancent le seuil de pari', () => {
    const normal = createTrack(cfg.track)
    const furies = createTrack(cfg.track, { betThresholdRatio: 0.4 })
    expect(furies.betThresholdColumn).toBeLessThan(normal.betThresholdColumn)
  })
})

describe('cases spéciales', () => {
  const track = (specials: { column: number; lane: number; kind: 'trap' | 'boost' | 'gold'; value: number }[]) =>
    ({ ...raceAt([0, 6, 9]), track: createTrack(cfg.track, { specials }) }) as RaceState

  it('ne se déclenchent qu’à l’arrêt, jamais au passage', () => {
    const st = track([{ column: 2, lane: 0, kind: 'trap', value: 1 }])
    expect(specialAt(st.track, 2, 0)?.kind).toBe('trap')
    // On s'arrête dessus : le piège agit.
    expect(applyMove(st, move(0, 2), {}).follow).toContainEqual(expect.objectContaining({ soul: 0, distance: -1 }))
    // On la traverse : rien.
    expect(applyMove(st, move(0, 3), {}).follow).toEqual([])
  })

  it('la case payante ne rapporte que sur une âme pariée, le tremplin pousse tout le monde', () => {
    const goldTrack = track([{ column: 2, lane: 0, kind: 'gold', value: 5 }])
    // Pariée : elle paie.
    expect(applyMove(goldTrack, move(0, 2), { bettedSouls: new Set([0]) }).coins).toBe(5)
    // Pas de ticket sur elle : on regarde passer, sans encaisser.
    expect(applyMove(goldTrack, move(0, 2), { bettedSouls: new Set([1]) }).coins).toBe(0)
    expect(applyMove(goldTrack, move(0, 2), {}).coins).toBe(0)
    const boost = applyMove(track([{ column: 2, lane: 0, kind: 'boost', value: 2 }]), move(0, 2), {})
    expect(boost.follow).toContainEqual(expect.objectContaining({ soul: 0, distance: 2 }))
  })

  it('arrivent progressivement : rien aux deux premiers cercles, puis de plus en plus', () => {
    const count = (circle: number): number => cfg.run.circles[circle - 1]!.terrains.reduce((m, t) => Math.max(m, t.specials.length), 0)
    expect(count(1)).toBe(0)
    expect(count(2)).toBe(0)
    expect(count(3)).toBeGreaterThan(0)
    expect(count(10)).toBeGreaterThan(count(3))
    // Une case spéciale ne tombe jamais sur une case bloquée.
    for (const c of cfg.run.circles) {
      for (const t of c.terrains) {
        for (const sp of t.specials) expect(t.blocked.some((b) => b.column === sp.column && b.lane === sp.lane)).toBe(false)
      }
    }
  })
})

describe('progression de boutique', () => {
  it('les emplacements d’artefacts s’ouvrent avec le grade', () => {
    expect(artefactSlotsAt(shop, 0)).toBe(shop.artefactSlots)
    expect(artefactSlotsAt(shop, 2)).toBe(shop.artefactSlots + 1)
    expect(artefactSlotsAt(shop, 4)).toBe(shop.artefactSlots + 2)
  })

  it('la vitrine ne propose que ce que le grade autorise', () => {
    const inv = defaultInventory(cfg)
    const all = allIds(shop)
    for (let seed = 1; seed < 60; seed++) {
      for (const it of generateVitrine(shop, inv, all, seededRng(seed), 0)) expect(it.minRank).toBe(0)
      for (const it of generateVitrine(shop, inv, all, seededRng(seed), 2)) expect(it.minRank).toBeLessThanOrEqual(2)
    }
    // Un légendaire ne sort jamais au grade 0, et finit par sortir au grade 4.
    const legendary = shop.items.filter((i) => i.rarity === 'legendary')
    expect(legendary.length).toBeGreaterThan(0)
    for (const it of legendary) expect(it.minRank).toBeGreaterThan(0)
  })

  it('un dé ne porte pas plus de faces forgées que le grade ne permet', () => {
    expect(maxAlteredFaces(shop, 0)).toBe(shop.forge.maxAltered)
    expect(maxAlteredFaces(shop, shop.forge.advancedLevel)).toBe(shop.forge.maxAlteredAdvanced)
    let inv = defaultInventory(cfg)
    inv = applyPurchase(findItem(shop, 'limee'), inv, { dieIndex: 0, faceIndex: 0 }, 2).inventory
    inv = applyPurchase(findItem(shop, 'doree'), inv, { dieIndex: 0, faceIndex: 1 }, 2).inventory
    expect(() => applyPurchase(findItem(shop, 'sceau'), inv, { dieIndex: 0, faceIndex: 2 }, 2)).toThrow(/décapez/)
    // Au grade avancé, une troisième passe.
    expect(() => applyPurchase(findItem(shop, 'sceau'), inv, { dieIndex: 0, faceIndex: 2 }, 3)).not.toThrow()
  })

  it('le décapage rend la face à son état d’origine et libère une place', () => {
    const base = defaultInventory(cfg)
    const original = base.dice[0]!.faces[0]!.value
    const forged = applyPurchase(findItem(shop, 'limee'), base, { dieIndex: 0, faceIndex: 0 }, 2).inventory
    expect(forged.dice[0]!.faces[0]!.altered).toBe('limee')
    const back = decapFace(forged, { dieIndex: 0, faceIndex: 0 }).inventory
    expect(back.dice[0]!.faces[0]).toEqual({ value: original, effect: null, altered: null })
    expect(() => decapFace(back, { dieIndex: 0, faceIndex: 0 })).toThrow(/n’est pas forgée/)
  })

  it('un artefact se revend à sa part du prix, et se remplace quand les emplacements sont pleins', () => {
    const price = findItem(shop, 'boussole').price
    expect(resaleValue(shop, price)).toBe(Math.round(price * shop.resaleRatio))
    const inv = { ...defaultInventory(cfg), artefacts: ['boussole' as const, 'clepsydre' as const] }
    expect(sellArtefact(inv, 'boussole').inventory.artefacts).toEqual(['clepsydre'])
    expect(() => sellArtefact(inv, 'sablier')).toThrow(/non possédé/)
    // Remplacement : le nouvel artefact prend la place de l'ancien, qui disparaît.
    const swapped = applyPurchase(findItem(shop, 'sablier'), inv, { dieIndex: 0, replaceArtefact: 'clepsydre' }).inventory
    expect(swapped.artefacts).toEqual(['boussole', 'sablier'])
  })
})
