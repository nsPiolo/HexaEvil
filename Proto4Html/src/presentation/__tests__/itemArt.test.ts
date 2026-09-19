import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { shop } from '../../core/config'
import { itemArt } from '../art'

const dossier = fileURLToPath(new URL('../../../public/objets/', import.meta.url))
const fichier = (id: string): string => `${dossier}${itemArt(id).split('/').pop()}`

/**
 * `ItemArt` sert le point d'interrogation quand la vignette manque, et c'est voulu : les
 * dessins sont arrivés un par un sans qu'une carte s'élargisse. Le revers, maintenant que les
 * quarante-huit sont peints, est qu'un fichier perdu ou mal nommé ne se voit plus — la carte
 * garde sa silhouette et montre « ? », exactement comme du temps où le dessin n'existait pas.
 *
 * Ajouter un objet sans sa vignette fera donc échouer ce test : c'est le rappel de la poser
 * dans `public/objets/` (`python3 scripts/install-art.py objets`), pas un interdit.
 */
describe('vignettes de la boutique', () => {
  it('a le dessin des quarante-huit objets du catalogue', () => {
    expect(shop.items.length).toBe(48)
    for (const item of shop.items) expect(existsSync(fichier(item.id)), `${item.id}.webp`).toBe(true)
  })

  it('a le point d’interrogation, qui tient la place d’une vignette absente', () => {
    expect(existsSync(fichier('qmark'))).toBe(true)
  })
})
