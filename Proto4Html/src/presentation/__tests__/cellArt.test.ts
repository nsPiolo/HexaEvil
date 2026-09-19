import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { config } from '../../core/config'
import { BLOCKED_ART, blockedArt, cellArt, hasCellArt } from '../art'

const dossier = fileURLToPath(new URL('../../../public/table/cases/', import.meta.url))
const fichier = (url: string): string => `${dossier}${url.split('/').pop()}`

/**
 * Comme pour les faces de dé, un fichier manquant ne lève rien : le navigateur laisse
 * l'image vide et la case perd son marqueur sans que rien ne le signale.
 */
describe('marqueurs de case', () => {
  const kinds = new Set(config.run.circles.flatMap((c) => c.terrains.flatMap((t) => t.specials.map((s) => s.kind))))

  it('a le dessin de chaque type de case spéciale utilisé par un cercle', () => {
    expect(kinds.size).toBeGreaterThan(0)
    for (const kind of kinds) expect(existsSync(fichier(cellArt(kind))), kind).toBe(true)
  })

  it('a celui de la tribune, posée par le joueur et non par un cercle', () => {
    expect(existsSync(fichier(cellArt('tribune')))).toBe(true)
  })

  /**
   * Le goudron est posé par les Bornes du stagiaire (artefacts.md n°33), pas par un terrain :
   * aucun cercle ne l'emploie, le test ci-dessus ne le voit donc pas. Il lui faut le sien, et
   * il vérifie aussi `hasCellArt` — c'est elle qui décide si le plateau sert l'image ou le
   * signe de repli, et une image posée sans être déclarée là resterait invisible.
   */
  it('a celui du goudron, posé par un artefact et non par un cercle', () => {
    expect(existsSync(fichier(cellArt('tar')))).toBe(true)
    expect(hasCellArt('tar')).toBe(true)
  })

  it('a chacun des éboulis', () => {
    for (const nom of BLOCKED_ART) expect(existsSync(fichier(cellArt(nom))), nom).toBe(true)
  })
})

describe('éboulis d’une case bloquée', () => {
  it('ne change pas d’un rendu à l’autre pour une même case', () => {
    expect(blockedArt(3, 1)).toBe(blockedArt(3, 1))
    expect(blockedArt(9, 0)).toBe(blockedArt(9, 0))
  })

  it('ne sert pas le même dessin à toutes les cases d’une piste', () => {
    const dessins = new Set<string>()
    for (let c = 1; c <= config.track.columns; c++) for (let lane = 0; lane < 8; lane++) dessins.add(blockedArt(c, lane))
    expect(dessins.size).toBe(BLOCKED_ART.length)
  })

  it('ne sort jamais de la liste, quelle que soit la case', () => {
    const connus = new Set(BLOCKED_ART.map((n) => cellArt(n)))
    for (let c = 0; c < 40; c++) for (let lane = 0; lane < 12; lane++) expect(connus.has(blockedArt(c, lane))).toBe(true)
  })
})
