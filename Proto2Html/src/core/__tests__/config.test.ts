import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../config/load'
import { defaultRaw } from './helpers'

describe('chargement de la configuration (G1, G2)', () => {
  it('la configuration livrée est valide et sans avertissement', () => {
    const { config, warnings } = loadConfig(defaultRaw())
    expect(config.activeColors).toEqual(['red', 'blue', 'green', 'black', 'yellow'])
    expect(config.tileTypes.size).toBe(20)
    expect(config.decks.player).toHaveLength(37)
    expect(config.decks.demon).toHaveLength(37)
    expect(warnings).toEqual([])
  })

  it('T2 — le Roi et la Tour sont marqués « pré-posée uniquement »', () => {
    const { config } = loadConfig(defaultRaw())
    expect(config.tileTypes.get('N00')?.preplacedOnly).toBe(true)
    expect(config.tileTypes.get('V00')?.preplacedOnly).toBe(true)
    expect(config.tileTypes.get('N01')?.preplacedOnly).toBe(false)
  })

  it('T3/Q1 — le Roi a 20 force et 2 boucliers', () => {
    const { config } = loadConfig(defaultRaw())
    expect(config.tileTypes.get('N00')).toMatchObject({ force: 20, shields: 2, role: 'king' })
  })

  it('Q6 — N01 est immunisée à l’annulation', () => {
    const { config } = loadConfig(defaultRaw())
    expect(config.tileTypes.get('N01')?.immuneToSilence).toBe(true)
    expect(config.tileTypes.get('B01')?.immuneToSilence).toBe(false)
  })

  it('§1 — le préfixe d’ID est l’initiale FRANÇAISE (V→green, N→black, J→yellow)', () => {
    const { config } = loadConfig(defaultRaw())
    expect(config.tileTypes.get('V01')?.color).toBe('green')
    expect(config.tileTypes.get('N02')?.color).toBe('black')
    expect(config.tileTypes.get('J03')?.color).toBe('yellow')
    expect(config.tileTypes.get('B03')?.color).toBe('blue')
  })

  describe('C1 — Couleurs actives et filtrage des Decks', () => {
    it('une Couleur à 0 % est désactivée et ses Tuiles quittent le Deck', () => {
      const raw = defaultRaw()
      const patched = {
        ...raw,
        board: { ...raw.board, colorDistribution: { red: 40, blue: 30, green: 30, black: 0, yellow: 0 } },
      }
      const { config, warnings } = loadConfig(patched)
      expect(config.activeColors).toEqual(['red', 'blue', 'green'])
      // 37 − 5 noires − 6 jaunes = 26.
      expect(config.decks.player).toHaveLength(26)
      expect(config.decks.player.some((id) => id.startsWith('N') || id.startsWith('J'))).toBe(false)
      expect(warnings.join(' ')).toContain('Couleurs désactivées')
      expect(warnings.join(' ')).toContain('11 Tuile(s) retirée(s)')
    })

    it('les Tuiles pré-posées échappent au filtre : le Roi noir survit sans noir actif', () => {
      const raw = defaultRaw()
      const patched = {
        ...raw,
        board: { ...raw.board, colorDistribution: { red: 40, blue: 30, green: 30, black: 0, yellow: 0 } },
      }
      const { config } = loadConfig(patched)
      // Les deux Rois N00 restent au montage malgré le noir désactivé.
      expect(config.setup.filter((s) => s.type === 'N00')).toHaveLength(2)
      expect(config.activeColors).not.toContain('black')
    })

    it('refuse une répartition qui ne somme pas à 100', () => {
      const raw = defaultRaw()
      const patched = { ...raw, board: { ...raw.board, colorDistribution: { red: 50, blue: 30 } } }
      expect(() => loadConfig(patched)).toThrow(/somme.*100/)
    })
  })

  describe('validations du montage (B7, B7b)', () => {
    it('refuse deux Tuiles superposées', () => {
      const raw = defaultRaw()
      const king = raw.setup.find((e) => e.type === 'N00' && e.side === 'demon')
      const patched = {
        ...raw,
        setup: [...raw.setup, { side: 'demon' as const, type: 'V00', q: king?.q ?? 0, r: king?.r ?? 0 }],
      }
      expect(() => loadConfig(patched)).toThrow(/superposent/)
    })

    it('refuse un camp sans Roi', () => {
      const raw = defaultRaw()
      const patched = { ...raw, setup: raw.setup.filter((s) => !(s.type === 'N00' && s.side === 'demon')) }
      expect(() => loadConfig(patched)).toThrow(/exactement un Roi/)
    })

    it('refuse un Roi sur un Espace bloqué', () => {
      const raw = defaultRaw()
      const patched = {
        ...raw,
        setup: raw.setup.map((s) => (s.type === 'N00' && s.side === 'demon' ? { ...s, q: 0, r: 1 } : s)),
      }
      expect(() => loadConfig(patched)).toThrow(/Espace bloqué/)
    })

    /**
     * B7b — le cas réel qui a fait changer le relief par défaut (B11) : le relief
     * « deux bouchons devant chaque Roi » ne laisse que 2 voisins libres, que les
     * 2 Tours occupent entièrement. Le Roi devient inatteignable.
     */
    it('B7b — refuse le relief « bouchons » + 2 Tours, qui enferme le Roi', () => {
      const raw = defaultRaw()
      const patched = {
        ...raw,
        // Rayon épinglé : cette fixture reproduit le cas historique du rayon 4.
        board: {
          ...raw.board,
          radius: 4,
          blocked: [
            { q: -3, r: 1 }, { q: -3, r: 2 },
            { q: 3, r: -1 }, { q: 3, r: -2 },
          ],
        },
        setup: [
          { side: 'player' as const, type: 'N00', q: -4, r: 2 },
          { side: 'player' as const, type: 'V00', q: -4, r: 3 },
          { side: 'player' as const, type: 'V00', q: -4, r: 1 },
          { side: 'demon' as const, type: 'N00', q: 4, r: -2 },
          { side: 'demon' as const, type: 'V00', q: 4, r: -3 },
          { side: 'demon' as const, type: 'V00', q: 4, r: -1 },
        ],
      }
      expect(() => loadConfig(patched)).toThrow(/inatteignable/)
    })
  })

  it('B10/B12 — un relief asymétrique est accepté, mais signalé', () => {
    const raw = defaultRaw()
    const patched = {
      ...raw,
      // Relief du brouillon (B9) : rayon 4 par construction, avec son propre
      // montage — le montage par défaut est au rayon 2 et entrerait en collision.
      board: {
        ...raw.board,
        radius: 4,
        blocked: [
          { q: 4, r: -3 }, { q: 3, r: -3 }, { q: 2, r: -2 }, { q: 1, r: -1 },
          { q: 0, r: 1 }, { q: 0, r: 2 }, { q: 0, r: 3 }, { q: 1, r: 3 },
        ],
      },
      setup: [
        { side: 'player' as const, type: 'N00', q: -4, r: 0 },
        { side: 'demon' as const, type: 'N00', q: 4, r: 0 },
      ],
    }
    const { warnings } = loadConfig(patched)
    expect(warnings.join(' ')).toContain('non centralement symétrique')
    expect(warnings.join(' ')).toContain('8 Espace(s)')
  })

  it('refuse une Tuile pré-posée glissée dans un Deck (T2)', () => {
    const raw = defaultRaw()
    const patched = { ...raw, decks: { ...raw.decks, player: [...raw.decks.player, 'N00'] } }
    expect(() => loadConfig(patched)).toThrow(/pré-posée/)
  })

  it('les erreurs désignent toujours le champ fautif (G2)', () => {
    const raw = defaultRaw()
    expect(() => loadConfig({ ...raw, handSize: 0 })).toThrow(ConfigError)
    expect(() => loadConfig({ ...raw, handSize: 0 })).toThrow(/handSize/)
    expect(() => loadConfig({ ...raw, upkeepHeal: -1 })).toThrow(/upkeepHeal/)
  })
})
