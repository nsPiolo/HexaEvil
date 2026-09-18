import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { config } from '../../core/config'
import { SOUL_COLORS, SOUL_DICE, soulColor, soulDieStyle } from '../souls'

/**
 * `soulColor` boucle sur la palette (`id % SOUL_COLORS.length`). Une palette plus courte que
 * la liste des noms ne casse rien à l'exécution : elle redonne simplement la même couleur à
 * deux âmes de la même course, et le plateau devient illisible sans qu'aucun test n'échoue.
 * D'où ces garde-fous, qui se déclenchent dès qu'on ajoute un nom ou qu'on peuple un cercle.
 */
describe('palette des âmes', () => {
  it('a au moins autant de couleurs que de noms d’âmes', () => {
    expect(SOUL_COLORS.length).toBeGreaterThanOrEqual(config.souls.names.length)
  })

  it('en a assez pour le cercle le plus peuplé', () => {
    expect(SOUL_COLORS.length).toBeGreaterThanOrEqual(Math.max(...config.run.circles.map((c) => c.souls)))
  })

  it('n’a aucune couleur en double', () => {
    expect(new Set(SOUL_COLORS).size).toBe(SOUL_COLORS.length)
  })

  it('donne une couleur distincte à chaque âme du cercle le plus peuplé', () => {
    const maxSouls = Math.max(...config.run.circles.map((c) => c.souls))
    const used = Array.from({ length: maxSouls }, (_, id) => soulColor(id))
    expect(new Set(used).size).toBe(maxSouls)
  })
})

/**
 * Une face déclarée mais absente du dossier ne lève rien : le navigateur ignore l'URL morte
 * et laisse le dé d'os, exactement comme s'il n'y avait pas de face. Le repli ressemble donc
 * au bon fonctionnement, et une face oubliée peut traverser une relecture. D'où ce test.
 */
describe('faces de dé peintes', () => {
  const dossier = fileURLToPath(new URL('../../../public/table/dice/', import.meta.url))

  it('a le fichier de chaque face déclarée', () => {
    for (const hex of SOUL_DICE) expect(existsSync(`${dossier}${hex}.webp`), `${hex}.webp`).toBe(true)
  })

  it('a le dé d’os, qui sert de repli à toutes', () => {
    expect(existsSync(`${dossier}white.webp`)).toBe(true)
  })

  it('pointe sur la face de l’âme quand elle est peinte, sur rien sinon', () => {
    expect(soulDieStyle(0)['--soul-die']).toBe("url('/table/dice/e0a83c.webp')")
    expect(soulDieStyle(11)['--soul-die']).toBe("url('/table/dice/c5ccd2.webp')")
    expect(soulDieStyle(SOUL_COLORS.length)['--soul-die']).toBe(soulDieStyle(0)['--soul-die'])
  })
})
