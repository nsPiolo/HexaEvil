/**
 * Règles des objets ajoutés au catalogue (artefacts.md, des.md, forge.md). On teste le moteur
 * pur : faces forgées, règles de collision, artefacts de paris et remises de boutique.
 */
import { describe, expect, it } from 'vitest'
import rawConfig from '../../../config/race.json'
import rawShop from '../../../config/shop.json'
import { loadConfig } from '../config/load'
import { loadShopConfig } from '../shop/load'
import { evaluateBet, lastGapCells, settleBets, ticketMultiplier, type Bet } from '../rules/bets'
import { plainFace } from '../rules/dice'
import { applyMove, buildMoves, createRace, endTurn, placeTribune, ranking, rollPlayerDice, simpleMove, type Move, type RaceState, type Roll } from '../rules/race'
import { seededRng } from '../rules/rng'
import { defaultInventory, effectivePrice, effectiveRerollCost, findItem, forgeFace, specialDie } from '../shop/shop'

const cfg = loadConfig(rawConfig)
const shop = loadShopConfig(rawShop)

/** Course à positions imposées : la colonne de chaque âme, dans l'ordre des ids. */
function raceAt(positions: number[]): RaceState {
  const race = createRace({ ...cfg, souls: { ...cfg.souls, count: positions.length } })
  return { ...race, souls: race.souls.map((s, i) => ({ ...s, position: positions[i] ?? 0 })) }
}

const move = (soul: number, distance: number, effects: Move['effects'] = []): Move => ({ ...simpleMove('player', soul, distance), effects })
const posOf = (st: RaceState, id: number): number => st.souls[id]!.position

describe('faces forgées', () => {
  it('donne à chaque altération sa valeur et son effet', () => {
    expect(forgeFace('gel', plainFace(-1))).toMatchObject({ value: 0, effect: 'freeze' })
    expect(forgeFace('bond', plainFace(3))).toMatchObject({ value: 3, effect: 'leap' })
    expect(forgeFace('aimant', plainFace(1))).toMatchObject({ value: 1, effect: 'magnet' })
    expect(forgeFace('explosive', plainFace(2))).toMatchObject({ value: 2, effect: 'explosive' })
    expect(forgeFace('elan', plainFace(2))).toMatchObject({ value: 2, effect: 'momentum' })
    expect(forgeFace('miroir', plainFace(1))).toMatchObject({ value: 1, effect: 'mirror' })
    expect(forgeFace('feuFollet', plainFace(-1))).toMatchObject({ value: 2, effect: 'willOWisp' })
    // Chaque altération du catalogue doit produire une face marquée à son nom.
    for (const it of shop.items.filter((i) => i.kind === 'forge')) {
      expect(forgeFace(it.id as never, plainFace(1)).altered).toBe(it.id)
    }
  })

  it('Bond : avance jusqu’à l’âme suivante et saute devant, sans franchir l’arrivée', () => {
    const st = raceAt([2, 5, 0])
    const { state } = applyMove(st, move(0, 3, ['leap']))
    // L'âme 1 est case 5 : on va dessus, on percute, on saute devant → case 6.
    expect(posOf(state, 0)).toBe(6)
    // Personne devant : la face vaut sa valeur nominale.
    const alone = applyMove(raceAt([2, 0, 0]), move(0, 3, ['leap'])).state
    expect(posOf(alone, 0)).toBe(5)
    // L'âme suivante a déjà franchi l'arrivée : on s'arrête sur la dernière case avant.
    const columns = raceAt([0]).track.columns
    const far = raceAt([2, columns + 1, 0])
    expect(posOf(applyMove(far, move(0, 3, ['leap'])).state, 0)).toBe(columns - 1)
  })

  it('Gel : l’âme ne bouge pas et le tour adverse ne la touche plus, jusqu’à la fin du tour', () => {
    const { state } = applyMove(raceAt([3, 0, 0]), move(0, 0, ['freeze']))
    expect(posOf(state, 0)).toBe(3)
    expect(state.frozen).toContain(0)
    const opponent = applyMove(state, { ...simpleMove('opponent', 0, 3), effects: [] })
    expect(posOf(opponent.state, 0)).toBe(3)
    expect(opponent.result.frozen).toBe(true)
    // Le gel tombe à la fin du tour.
    expect(endTurn(state).frozen).toEqual([])
  })

  it('Aimant : l’âme juste derrière suit d’une case', () => {
    const { follow } = applyMove(raceAt([4, 3, 0]), move(0, 1, ['magnet']))
    expect(follow.map((m) => ({ soul: m.soul, distance: m.distance }))).toEqual([{ soul: 1, distance: 1 }])
    // Personne derrière : rien à aspirer.
    expect(applyMove(raceAt([0, 3, 5]), move(0, 1, ['magnet'])).follow).toEqual([])
  })

  it('Explosive : souffle les voisines si elle percute, sinon recule elle-même', () => {
    // Percussion case 3 → saut en 4 ; les âmes des cases 3 et 5 reculent.
    const hit = applyMove(raceAt([1, 3, 5]), move(0, 2, ['explosive']))
    expect(hit.result.collision?.kind).toBe('jump')
    expect(hit.follow.map((m) => m.soul).sort()).toEqual([1, 2])
    expect(hit.follow.every((m) => m.distance === -1)).toBe(true)
    // Sans personne à percuter, l'âme paie le souffle elle-même.
    const miss = applyMove(raceAt([1, 8, 9]), move(0, 2, ['explosive']))
    expect(miss.result.collision).toBeNull()
    expect(miss.follow).toEqual([expect.objectContaining({ soul: 0, distance: -1 })])
  })

  it('Miroir et Feu follet se résolvent au lancer', () => {
    const mirror = { ...plainFace(1), effect: 'mirror' as const }
    const dice = [
      { kind: 'base', name: 'A', faces: [mirror], costPerUse: 0 },
      { kind: 'base', name: 'B', faces: [plainFace(3)], costPerUse: 0 },
    ]
    expect(rollPlayerDice(cfg, 5, seededRng(1), dice).distance).toEqual([3, 3])
    // Feu follet qui ne peut ressortir que lui-même : il vaut alors +2.
    const wisp = { ...plainFace(-1), effect: 'willOWisp' as const }
    const only = [{ kind: 'base', name: 'C', faces: [wisp], costPerUse: 0 }]
    expect(rollPlayerDice(cfg, 5, seededRng(2), only).distance).toEqual([2])
  })
})

describe('artefacts de collision', () => {
  it('Semelles de plomb : reculer sur une âme en zone de fin range derrière au lieu d’échanger', () => {
    const zone = raceAt([0]).track.betThresholdColumn
    const st = raceAt([zone + 2, zone, 0])
    const plain = applyMove(st, move(0, -2))
    expect(plain.result.collision?.kind).toBe('swap')
    const soled = applyMove(st, move(0, -2), { semelles: true })
    expect(soled.result.collision).toBeNull()
    expect(posOf(soled.state, 0)).toBe(zone - 1)
  })

  it('Balance truquée : l’âme échangée gagne une case de plus', () => {
    const { follow } = applyMove(raceAt([5, 3, 0]), move(0, -2), { balance: true })
    expect(follow).toEqual([expect.objectContaining({ soul: 1, distance: 1, induced: true })])
  })

  it('Chaîne du Coccyte : l’échange lie les deux âmes, et le lien tombe en fin de tour', () => {
    const { state } = applyMove(raceAt([5, 3, 0]), move(0, -2), { chaine: true })
    expect(state.links).toEqual([[0, 1]])
    // L'âme liée suit de la même distance.
    const next = applyMove(state, move(0, 2), { chaine: true })
    expect(next.follow).toContainEqual(expect.objectContaining({ soul: 1, distance: 2 }))
    expect(endTurn(state).links).toEqual([])
  })

  it('Bât de chameau : la première percussion fusionne, une seule fois par course', () => {
    const { state } = applyMove(raceAt([1, 3, 0]), move(0, 2), { bat: true })
    expect(state.fusion).toEqual({ front: 1, back: 0 })
    // La percutante se range derrière au lieu de sauter devant.
    expect(posOf(state, 0)).toBe(2)
    expect(posOf(state, 1)).toBe(3)
    // Ensuite, tout déplacement de l'une entraîne l'autre.
    expect(applyMove(state, move(1, 2), { bat: true }).follow).toContainEqual(expect.objectContaining({ soul: 0, distance: 2 }))
    // La fusion survit à la fin du tour : elle dure la course.
    expect(endTurn(state).fusion).toEqual({ front: 1, back: 0 })
  })

  it('un déplacement induit n’en induit pas d’autres', () => {
    const { state } = applyMove(raceAt([5, 3, 0]), move(0, -2), { chaine: true })
    const induced = applyMove(state, { ...simpleMove('artefact', 0, 2), induced: true }, { chaine: true, balance: true })
    expect(induced.follow).toEqual([])
  })
})

describe('Tribune infernale', () => {
  it('refuse le départ et la zone de fin, paie et pousse l’âme qui s’y arrête', () => {
    const st = raceAt([0, 0, 0])
    expect(placeTribune(st, 0, 0).tribune).toBeNull()
    expect(placeTribune(st, st.track.betThresholdColumn, 0).tribune).toBeNull()
    const withTribune = placeTribune(st, 3, 0)
    expect(withTribune.tribune).toEqual({ column: 3, lane: 0 })
    const { coins, follow } = applyMove(withTribune, move(0, 3), { tribune: { coins: 4, push: 1 } })
    expect(coins).toBe(4)
    expect(follow).toContainEqual(expect.objectContaining({ soul: 0, distance: 1 }))
  })
})

describe('artefacts de paris', () => {
  const bet = (over: Partial<Bet> = {}): Bet => ({ id: 1, type: 'top3', souls: [0], stake: 10, multiplier: 2, turn: 0, status: 'open', payout: 0, ...over })

  it('Quatrième marche : le top 3 s’étend au top 4, sans toucher au reste', () => {
    const ranked = ranking(raceAt([9, 8, 7, 6, 5]))
    expect(evaluateBet({ type: 'top3', souls: [3] }, ranked)).toBe(false)
    expect(evaluateBet({ type: 'top3', souls: [3] }, ranked, 1)).toBe(true)
    // « Pas dans le top 3 » et le Podium exact ne bougent pas.
    expect(evaluateBet({ type: 'notTop3', souls: [3] }, ranked, 1)).toBe(true)
    expect(evaluateBet({ type: 'podiumExact', souls: [0, 1, 2] }, ranked, 1)).toBe(true)
  })

  it('Denier du cercle : le gain se calcule sur une mise gonflée, la dépense reste la mise', () => {
    const ranked = ranking(raceAt([9, 8, 7, 6, 5]))
    const plain = settleBets([bet()], ranked)
    const denier = settleBets([bet()], ranked, { stakeBonus: 3 })
    expect(plain.returned).toBe(20)
    expect(denier.returned).toBe(26)
    expect(denier.staked).toBe(10)
  })

  it('Encensoir du dernier : double le pari Dernière place quand l’écart est assez grand', () => {
    const wide = ranking(raceAt([9, 8, 7, 6, 0]))
    const tight = ranking(raceAt([9, 8, 7, 6, 5]))
    expect(lastGapCells(wide)).toBe(6)
    expect(lastGapCells(tight)).toBe(1)
    const opts = { lastGap: { cells: 5, factor: 2 } }
    expect(settleBets([bet({ type: 'last', souls: [4] })], wide, opts).returned).toBe(40)
    expect(settleBets([bet({ type: 'last', souls: [4] })], tight, opts).returned).toBe(20)
  })

  it('Baume du perdant : rend une part de la mise perdue, après le Livre des comptes', () => {
    const ranked = ranking(raceAt([9, 8, 7, 6, 5]))
    const lost = bet({ type: 'winner', souls: [4] })
    expect(settleBets([lost], ranked, { lossRelief: 0.1 }).relief).toBe(1)
    // Avec le Livre : 5 remboursés sur 10, le Baume ne porte plus que sur les 5 restants.
    const both = settleBets([lost], ranked, { lossRelief: 0.1, refundRatio: 0.5 })
    expect(both.refund).toBe(5)
    expect(both.relief).toBe(1)
    expect(both.returned).toBe(6)
  })

  it('Ticket de la première heure : +1 avant le lancer, −0,5 en course, jamais sous ×1', () => {
    const mods = { before: 1, during: 0.5 }
    expect(ticketMultiplier(3, true, mods)).toBe(4)
    expect(ticketMultiplier(3, false, mods)).toBe(2.5)
    expect(ticketMultiplier(1.2, false, mods)).toBe(1)
  })
})

describe('remises de boutique', () => {
  const forge = findItem(shop, 'limee')
  const artefact = findItem(shop, 'boussole')

  it('Rabais de Ploutos retire sa part de tout, renouvellement compris', () => {
    const full = effectivePrice(artefact, 1, shop.priceGrowthPerCircle)
    expect(effectivePrice(artefact, 1, shop.priceGrowthPerCircle, { globalDiscount: 0.03 })).toBe(Math.round(full * 0.97))
    expect(effectiveRerollCost(shop, { globalDiscount: 0.03 })).toBe(Math.round(shop.rerollCost * 0.97))
  })

  it('Marteau d’Héphaïstos : la forge offerte vaut 0, les suivantes 20 % de moins', () => {
    expect(effectivePrice(forge, 1, shop.priceGrowthPerCircle, { forgeDiscount: 0.2, forgeFreeAvailable: true })).toBe(0)
    const full = effectivePrice(forge, 1, shop.priceGrowthPerCircle)
    expect(effectivePrice(forge, 1, shop.priceGrowthPerCircle, { forgeDiscount: 0.2 })).toBe(Math.round(full * 0.8))
    // La remise de forge ne touche pas un artefact.
    expect(effectivePrice(artefact, 1, shop.priceGrowthPerCircle, { forgeDiscount: 0.2, forgeFreeAvailable: true })).toBe(effectivePrice(artefact, 1, shop.priceGrowthPerCircle))
  })
})

describe('dés spéciaux', () => {
  it('Dé de Fraude : la face ? copie la meilleure autre face du lancer', () => {
    const fraude = findItem(shop, 'fraude')
    if (fraude.kind !== 'die') throw new Error('fraude doit être un dé')
    const die = specialDie(fraude)
    expect(die.faces.filter((f) => f.wild)).toHaveLength(1)
    const wild = die.faces.find((f) => f.wild)!
    const roll: Roll = rollPlayerDice(cfg, 5, seededRng(3), [
      { ...die, faces: [wild] },
      { kind: 'base', name: 'B', faces: [plainFace(5)], costPerUse: 0 },
    ])
    expect(roll.distance[0]).toBe(5)
  })

  it('Troisième dé Distance : il s’ajoute au lancer au lieu de remplacer', () => {
    const it = findItem(shop, 'troisiemeDe')
    if (it.kind !== 'die') throw new Error('troisiemeDe doit être un dé')
    expect(it.mode).toBe('add')
    const inv = defaultInventory(cfg)
    const before = inv.dice.length
    const roll = rollPlayerDice(cfg, 5, seededRng(4), [...inv.dice, specialDie(it)])
    expect(roll.distance).toHaveLength(before + 1)
  })

  it('Relance jumelle : deux dés Âme identiques déclenchent une relance unique', () => {
    // Graine choisie pour que le premier tirage double une âme : la relance change le résultat.
    const dice = defaultInventory(cfg).dice
    let found = false
    for (let seed = 1; seed < 200 && !found; seed++) {
      const plain = rollPlayerDice(cfg, 5, seededRng(seed), dice)
      if (new Set(plain.soul).size === plain.soul.length) continue
      found = true
      const rerolled = rollPlayerDice(cfg, 5, seededRng(seed), dice, { rerollTwins: true })
      expect(rerolled.soul).not.toEqual(plain.soul)
    }
    expect(found).toBe(true)
  })

  it('Quatrième tête de Cerbère : un dé Âme de plus au lancer', () => {
    const dice = defaultInventory(cfg).dice
    expect(rollPlayerDice(cfg, 5, seededRng(5), dice, { soulDice: cfg.dice.soulDice + 1 }).soul).toHaveLength(cfg.dice.soulDice + 1)
  })

  it('Verrou de Minos : le dé verrouillé garde sa face', () => {
    const dice = defaultInventory(cfg).dice
    const kept = plainFace(3)
    const roll = rollPlayerDice(cfg, 5, seededRng(6), dice, { locked: { 0: kept } })
    expect(roll.faces[0]).toEqual(kept)
  })
})

describe('catalogue', () => {
  it('chaque objet du fichier a une implémentation et des textes', () => {
    for (const it of shop.items) {
      expect(it.name.length).toBeGreaterThan(0)
      expect(it.description.length).toBeGreaterThan(10)
      expect(it.price).toBeGreaterThan(0)
    }
    // Les trois familles sont représentées, sinon une vitrine peut n'offrir qu'un seul geste.
    for (const kind of ['artefact', 'die', 'forge'] as const) {
      expect(shop.items.filter((i) => i.kind === kind).length).toBeGreaterThan(0)
    }
  })

  it('buildMoves remonte les effets de plateau des faces associées', () => {
    const roll: Roll = { distance: [2], faces: [{ ...plainFace(2), effect: 'explosive' }], soul: [1] }
    expect(buildMoves(roll, [{ soulDie: 0, distanceDie: 0 }], 'player')[0]?.effects).toEqual(['explosive'])
  })
})
