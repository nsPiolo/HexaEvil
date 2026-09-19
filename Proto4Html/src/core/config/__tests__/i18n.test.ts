/**
 * La couche de traduction de la configuration laisse volontairement passer ce qu'elle ne
 * trouve pas : mieux vaut un nom français dans une partie anglaise qu'une partie qui ne
 * démarre pas. C'est donc ici, et pas chez le joueur, que se voit un nom oublié.
 */
import { describe, expect, it } from 'vitest'
import rawRace from '../../../../config/race.json'
import rawShop from '../../../../config/shop.json'
import en from '../../../../config/i18n/en.json'
import { loadConfig } from '../load'
import { loadShopConfig } from '../../shop/load'
import { translateRaceConfig, translateShopConfig, translatedConfigLanguages } from '../i18n'

/** Les couches, par langue, pour vérifier la couverture à la source. */
const OVERLAYS = { en } as const
const LANGS = translatedConfigLanguages()
const base = loadConfig(rawRace)
const baseShop = loadShopConfig(rawShop)

describe('traduction de la configuration', () => {
  it('a au moins une langue en plus du français', () => {
    expect(LANGS).toContain('en')
  })

  it.each(LANGS)('%s : nomme toutes les âmes, tous les cercles, tous les pouvoirs et tous les terrains', (lang) => {
    const overlay = OVERLAYS[lang as keyof typeof OVERLAYS]
    const translated = loadConfig(translateRaceConfig(rawRace, lang))
    // Les noms d'âmes sont des noms propres : rien n'interdit qu'un nom s'écrive pareil dans
    // les deux langues, comparer le résultat au français ne prouverait donc rien. La
    // couverture se vérifie sur la couche elle-même.
    expect(overlay.souls).toHaveLength(base.souls.names.length)
    overlay.souls.forEach((name, i) => expect(name.trim(), `âme ${i}`).not.toBe(''))
    expect(overlay.circles).toHaveLength(base.run.circles.length)
    expect(translated.run.circles).toHaveLength(base.run.circles.length)
    translated.run.circles.forEach((circle, i) => {
      const ref = base.run.circles[i]!
      const names = overlay.circles[i]!
      // Noms courts : un nom de cercle, de boss ou de terrain peut s'écrire pareil dans les
      // deux langues (« Violence », « Minos »). On exige qu'il soit renseigné, pas qu'il
      // diffère. La phrase de pouvoir, elle, est de la prose : elle ne peut pas coïncider.
      expect(names.name.trim(), `cercle ${i + 1} : nom`).not.toBe('')
      expect(names.boss.trim(), `cercle ${i + 1} : boss`).not.toBe('')
      expect(circle.power, `cercle ${i + 1} : pouvoir`).not.toBe(ref.power)
      expect(names.terrains, `cercle ${i + 1} : terrains`).toHaveLength(ref.terrains.length)
      names.terrains.forEach((t, j) => expect(t.trim(), `cercle ${i + 1}, terrain ${j + 1}`).not.toBe(''))
      expect(circle.terrains).toHaveLength(ref.terrains.length)
    })
  })

  it.each(LANGS)('%s : nomme et décrit tous les objets de la boutique, contreparties comprises', (lang) => {
    const overlay = OVERLAYS[lang as keyof typeof OVERLAYS]
    const translated = loadShopConfig(translateShopConfig(rawShop, lang))
    // Tous les objets du catalogue ont leur entrée, et aucune entrée ne vise un objet retiré.
    expect(Object.keys(overlay.items).sort()).toEqual(baseShop.items.map((i) => i.id).sort())
    expect(translated.items).toHaveLength(baseShop.items.length)
    translated.items.forEach((item, i) => {
      const ref = baseShop.items[i]!
      expect(item.id).toBe(ref.id)
      expect(item.name, `${item.id} : nom`).not.toBe(ref.name)
      expect(item.description, `${item.id} : description`).not.toBe(ref.description)
      if (ref.warning !== null) expect(item.warning, `${item.id} : contrepartie`).not.toBe(ref.warning)
    })
  })

  it.each(LANGS)('%s : ne touche à aucun nombre', (lang) => {
    const translated = loadConfig(translateRaceConfig(rawRace, lang))
    expect(translated.economy).toEqual(base.economy)
    expect(translated.track).toEqual(base.track)
    expect(translated.dice).toEqual(base.dice)
    translated.run.circles.forEach((c, i) => {
      const ref = base.run.circles[i]!
      expect({ price: c.price, souls: c.souls, lanes: c.lanes, powers: c.powers }).toEqual({ price: ref.price, souls: ref.souls, lanes: ref.lanes, powers: ref.powers })
      c.terrains.forEach((t, j) => expect({ blocked: t.blocked, specials: t.specials }).toEqual({ blocked: ref.terrains[j]!.blocked, specials: ref.terrains[j]!.specials }))
    })
    const shopTranslated = loadShopConfig(translateShopConfig(rawShop, lang))
    shopTranslated.items.forEach((item, i) => {
      const ref = baseShop.items[i]!
      expect({ price: item.price, rarity: item.rarity, kind: item.kind, params: item.params, minRank: item.minRank }).toEqual({ price: ref.price, rarity: ref.rarity, kind: ref.kind, params: ref.params, minRank: ref.minRank })
    })
  })

  it('laisse la configuration intacte pour une langue sans couche', () => {
    expect(translateRaceConfig(rawRace, 'fr')).toBe(rawRace)
    expect(translateShopConfig(rawShop, 'xx')).toBe(rawShop)
  })
})
