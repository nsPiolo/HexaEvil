import { describe, expect, it } from 'vitest'
import { arrivalNote } from '../Ranking'

describe('ordre d’arrivée dans le classement (spec 08/C6)', () => {
  it('ne dit rien quand le rang et l’ordre d’arrivée coïncident, ou sans franchissement', () => {
    expect(arrivalNote(1, 1)).toBeNull()
    expect(arrivalNote(3, 3)).toBeNull()
    expect(arrivalNote(2, null)).toBeNull()
  })
  it('raconte le dépassement en français clair quand ils diffèrent', () => {
    expect(arrivalNote(2, 1)).toBe('a franchi l’arrivée le 1er · doublé pendant la fin du tour')
    expect(arrivalNote(1, 2)).toBe('a franchi l’arrivée le 2e · a dépassé après l’arrivée')
  })
})
