import { describe, expect, it } from 'vitest'
import { ConfigError, parseConfig } from '../config/load'
import { buildConfig, rawGameplay } from './helpers'

describe('Configuration (G1-G3, B8-B9)', () => {
  it('le fichier de configuration livré est valide', () => {
    // Garde-fou du réglage : s'il rougit, le message dit exactement quelle
    // valeur du JSON est en cause. Aucune valeur de gameplay n'est asservie
    // ici — recettes, budgets et disposition sont à toi.
    expect(() => buildConfig()).not.toThrow()
  })

  it('fournit les types de Tuile dont les règles ont besoin', () => {
    const config = buildConfig()
    const ids = config.tileTypes.map((t) => t.id)
    for (const id of ['soulWell', 'chasm', 'stairway', 'empty', 'quarry']) {
      expect(ids).toContain(id)
    }
    // L'Escalier reste neutre et sans Sortie : c'est une règle, pas un réglage.
    const stairway = config.tileTypes.find((t) => t.id === 'stairway')!
    expect(stairway.side).toBe('neutral')
    expect(stairway.maxExits).toBe(0)
  })

  it('refuse une Recette qui référence une Ressource inconnue', () => {
    const raw = rawGameplay()
    const types = raw.tileTypes as { id: string; recipes?: { in?: Record<string, number> }[] }[]
    const quarry = types.find((t) => t.id === 'quarry')!
    quarry.recipes = [{ in: { granite: 1 }, out: { rawBasalt: 1 }, ticks: 1 } as never]
    expect(() => parseConfig(raw)).toThrow(/Ressource inconnue « granite »/)
  })

  it('refuse plus de Sorties que le type de Tuile n’en autorise (T4)', () => {
    expect(() =>
      parseConfig({
        ...rawGameplay(),
        initialTiles: [{ q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: ['E'] }],
      }),
    ).toThrow(/autorise 0/)
  })

  it('refuse un terrain où les deux réseaux se croisent (B8)', () => {
    expect(() =>
      parseConfig({
        ...rawGameplay(),
        initialTiles: [
          { q: 0, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
          { q: 1, r: 0, type: 'empty', owner: 'demon', exits: ['W'] },
          // Une Tuile du joueur qui déboucherait dans le réseau du démon.
          { q: 2, r: 0, type: 'empty', owner: 'player', exits: ['W'] },
        ],
      }),
    ).toThrow(/ne doivent jamais se croiser \(B8\)/)
  })

  it('refuse deux Tuiles sur le même Espace (B4)', () => {
    expect(() =>
      parseConfig({
        ...rawGameplay(),
        initialTiles: [
          { q: 0, r: 0, type: 'empty', owner: 'player', exits: [] },
          { q: 0, r: 0, type: 'empty', owner: 'player', exits: [] },
        ],
      }),
    ).toThrow(ConfigError)
  })

  it('refuse une direction inconnue', () => {
    expect(() =>
      parseConfig({
        ...rawGameplay(),
        initialTiles: [{ q: 0, r: 0, type: 'empty', owner: 'player', exits: ['NORD'] }],
      }),
    ).toThrow(/attendu E, NE, NW, W, SW, SE/)
  })
})
