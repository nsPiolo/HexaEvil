import { describe, expect, it } from 'vitest'
import { isAllyOf, isEnemyOf } from '../rules/relations'
import { PLAYING_SIDES, type Side } from '../rules/types'

/** Règle T7 — la relation d'alliance est ASYMÉTRIQUE. Table de vérité complète. */
describe('T7 — relation d’alliance asymétrique', () => {
  it('depuis un camp : même camp allié, camp opposé adverse', () => {
    expect(isAllyOf('player', 'player')).toBe(true)
    expect(isEnemyOf('player', 'player')).toBe(false)
    expect(isAllyOf('player', 'demon')).toBe(false)
    expect(isEnemyOf('player', 'demon')).toBe(true)
  })

  it('depuis un camp : une neutre n’est NI alliée NI adverse (troisième état)', () => {
    for (const side of PLAYING_SIDES) {
      expect(isAllyOf(side, 'neutral')).toBe(false)
      expect(isEnemyOf(side, 'neutral')).toBe(false)
    }
  })

  it('depuis une neutre : tout le monde est allié, personne n’est adverse', () => {
    for (const other of ['player', 'demon', 'neutral'] as Side[]) {
      expect(isAllyOf('neutral', other)).toBe(true)
      expect(isEnemyOf('neutral', other)).toBe(false)
    }
  })

  it('la relation n’est pas réciproque — c’est tout l’objet de T7', () => {
    expect(isAllyOf('neutral', 'player')).toBe(true)
    expect(isAllyOf('player', 'neutral')).toBe(false)
  })
})
