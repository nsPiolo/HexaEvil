import { describe, expect, it } from 'vitest'
import { config } from '../../core/config'
import { bossAnnounce, bossIntro, circleFailure, circleSuccess, demonLevel, demonLevelAtRace, demonRank, demonRankAtRace, rankOfLevel } from '../demon'
import { CIRCLES, DEMON_RANKS, ordinalOf } from '../texts'

const per = config.run.racesPerCircle

describe('grades du démon', () => {
  it('commence stagiaire et monte après les cercles 2, 3, 5, 7 et 8', () => {
    expect(demonRank(0).name).toBe('Stagiaire')
    // Un cercle ne suffit plus : le premier grade se gagne au bout de deux.
    expect(demonRank(1).name).toBe('Stagiaire')
    expect(demonRank(2).name).toBe('Assistant')
    expect(demonRank(3).name).toBe('Tourmenteur')
    expect(demonRank(5).name).toBe('Contremaître')
    expect(demonRank(7).name).toBe('Sous-directeur')
    expect(demonRank(8).label).toBe('Le stagiaire promu')
    expect(demonRank(9).label).toBe('Le stagiaire promu')
  })

  it('se déduit de la course en cours', () => {
    expect(demonRankAtRace(0).name).toBe('Stagiaire')
    expect(demonRankAtRace(per - 1).name).toBe('Stagiaire')
    expect(demonRankAtRace(per).name).toBe('Stagiaire')
    expect(demonRankAtRace(2 * per).name).toBe('Assistant')
    expect(demonRankAtRace(3 * per).name).toBe('Tourmenteur')
  })

  it('le niveau est l’index du grade', () => {
    expect(demonLevel(0)).toBe(0)
    expect(demonLevel(1)).toBe(0)
    expect(demonLevel(2)).toBe(1)
    expect(demonLevel(4)).toBe(2)
    expect(demonLevel(8)).toBe(5)
    expect(demonLevelAtRace(3 * per + 1)).toBe(2)
    expect(rankOfLevel(2).name).toBe('Tourmenteur')
    expect(rankOfLevel(99).label).toBe('Le stagiaire promu')
  })

  it('chaque type de pari se débloque à un niveau qui existe, et chaque promotion en ouvre au moins un', () => {
    const unlock = config.economy.betUnlockLevel
    for (const level of Object.values(unlock)) expect(level).toBeLessThan(DEMON_RANKS.length)
    // Les grades 1 à 4 débloquent chacun des paris ; leurs lignes les annoncent avec la cote de la config.
    for (let level = 1; level <= 4; level++) {
      const opened = (Object.keys(unlock) as (keyof typeof unlock)[]).filter((id) => unlock[id] === level)
      expect(opened.length).toBeGreaterThan(0)
      const text = circleSuccess(DEMON_RANKS[level]!.afterCircle).map((l) => l.text).join('\n')
      for (const id of opened) expect(text).toContain(`×${config.economy.multipliers[id]}`)
      expect(text).not.toMatch(/\{\w+\}/)
    }
  })

  it('les seuils de grade sont croissants', () => {
    for (let i = 1; i < DEMON_RANKS.length; i++) expect(DEMON_RANKS[i]!.afterCircle).toBeGreaterThan(DEMON_RANKS[i - 1]!.afterCircle)
  })
})

describe('dialogues de transition', () => {
  it("insère la promotion juste avant l'annonce du cercle suivant, avec le nouveau nom", () => {
    // La première promotion tombe à la fin du DEUXIÈME cercle.
    const lines = circleSuccess(2)
    const success = CIRCLES[1]!.success
    const promo = DEMON_RANKS[1]!
    expect(lines).toHaveLength(success.length + promo.lines.length)
    // Avant la promotion : ancien nom.
    for (let i = 0; i < success.length - 1; i++) {
      expect(lines[i]!.text).toBe(success[i]!.text.replace('{souls}', String(config.run.circles[2]!.souls)).replace('{price}', String(config.run.circles[2]!.price)))
      if (lines[i]!.who === 'demon') expect(lines[i]!.label).toBe('Démon stagiaire')
    }
    // Les lignes de promotion, dites par l'assistant, cotes remplies.
    promo.lines.forEach((l, k) => {
      const line = lines[success.length - 1 + k]!
      expect(line.text).toBe(l.text.replace(/\{(\w+)\}/g, (_, key: string) => String(config.economy.multipliers[key as keyof typeof config.economy.multipliers])))
      if (l.who === 'demon') expect(line.label).toBe(promo.label)
      else expect(line.label).toBeUndefined()
    })
    // La dernière : annonce du cercle 3 avec ses valeurs, par l'assistant.
    const last = lines[lines.length - 1]!
    expect(last.label).toBe(promo.label)
    expect(last.text).toContain(String(config.run.circles[2]!.price))
    expect(last.text).not.toContain('{')
  })

  it('sans promotion, le texte du cercle est dit tel quel par le grade courant', () => {
    // Le premier cercle ne promeut plus : son texte est dit par le stagiaire, sans coupure.
    const lines = circleSuccess(1)
    expect(lines).toHaveLength(CIRCLES[0]!.success.length)
    expect(lines.every((l) => l.who !== 'demon' || l.label === 'Démon stagiaire')).toBe(true)
  })

  it('le cercle 8 promeut sans lignes propres : le texte du cercle suffit, le nom change', () => {
    const lines = circleSuccess(8)
    expect(lines).toHaveLength(CIRCLES[7]!.success.length)
    expect(lines[0]!.label).toBe('Le stagiaire promu')
  })

  it("l'évasion (cercle 9) garde le texte complet", () => {
    const lines = circleSuccess(9)
    expect(lines.map((l) => l.text)).toEqual(CIRCLES[8]!.success.map((l) => l.text))
    expect(lines.every((l) => l.who !== 'demon' || l.label === 'Le stagiaire promu')).toBe(true)
  })

  it("l'échec et l'annonce du boss gardent le grade d'avant le cercle", () => {
    expect(circleFailure(1)[0]!.label).toBe('Démon stagiaire')
    expect(circleFailure(4)[0]!.label).toBe('Démon tourmenteur')
    // Le boss du deuxième cercle est annoncé par le stagiaire : il n'est promu qu'après l'avoir battu.
    const boss = bossAnnounce(2)
    expect(boss[0]!.label).toBe('Démon stagiaire')
    expect(boss[0]!.text).toContain(String(config.run.circles[1]!.price))
    expect(bossAnnounce(3)[0]!.label).toBe('Démon assistant')
  })
})

/**
 * Au-delà du dernier cercle écrit, le jeu continue (GDD §8.1) : tous les textes indexés par
 * cercle doivent tenir, sans accolade oubliée ni texte vide.
 */
describe('cercles au-delà de la liste écrite', () => {
  const beyond = [CIRCLES.length + 1, CIRCLES.length + 2, CIRCLES.length + 7, 40]

  it('a un texte de réussite, d’échec, d’annonce et de scène de boss, sans clé non remplie', () => {
    for (const circle of beyond) {
      for (const lines of [circleSuccess(circle), circleFailure(circle), bossAnnounce(circle), bossIntro(circle)]) {
        expect(lines.length).toBeGreaterThan(0)
        const text = lines.map((l) => l.text).join(' ')
        expect(text).not.toMatch(/\{\w+\}/)
        expect(text.trim()).not.toBe('')
      }
    }
  })

  it('donne un portrait et un nom à chaque locuteur de la scène du boss', () => {
    for (const circle of beyond) {
      for (const line of bossIntro(circle)) {
        if (line.who === 'player') continue
        expect(line.label).toBeTruthy()
        expect(line.portrait).toBeTruthy()
      }
    }
  })

  it('continue de compter les cercles dans le HUD', () => {
    expect(ordinalOf(1)).toBe('1er')
    expect(ordinalOf(CIRCLES.length)).toBe(`${CIRCLES.length}e`)
    expect(ordinalOf(CIRCLES.length + 1)).toBe(`${CIRCLES.length + 1}e`)
    expect(ordinalOf(112)).toBe('112e')
  })
})
