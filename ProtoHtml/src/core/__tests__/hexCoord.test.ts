import { describe, expect, it } from 'vitest'
import { distance, fromCube, hex, key, neighbors, range, toCube } from '../hex/hexCoord'

describe('HexCoord', () => {
  it('convertit axial <-> cubique en respectant x + y + z = 0', () => {
    const c = toCube(hex(2, -1))
    expect(c.x + c.y + c.z).toBe(0)
    expect(fromCube(c)).toEqual(hex(2, -1))
  })

  it('a exactement 6 voisines toutes à distance 1', () => {
    const ns = neighbors(hex(0, 0))
    expect(ns).toHaveLength(6)
    expect(new Set(ns.map(key)).size).toBe(6)
    for (const n of ns) expect(distance(hex(0, 0), n)).toBe(1)
  })

  it('compte 1 + 3r(r+1) tuiles dans une portée de rayon r', () => {
    for (const r of [0, 1, 2, 3]) expect(range(hex(0, 0), r)).toHaveLength(1 + 3 * r * (r + 1))
  })
})
