/**
 * Test de fumée de l'interface : elle doit se rendre sans exception avec la
 * configuration livrée, et afficher les repères attendus (`U1`, `U2`, `K1`-`K5`).
 * Le rendu serveur suffit : il exécute les hooks et donc le chargement de la
 * configuration, sans exiger de DOM.
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../../App'

/** Le rendu serveur insère des marqueurs `<!-- -->` entre les interpolations. */
const html = () => renderToString(<App />).replaceAll('<!-- -->', '')

describe('Interface (rendu de fumée)', () => {
  it('se rend sans erreur avec la configuration livrée', () => {
    expect(() => html()).not.toThrow()
  })

  it('affiche les métriques du proto (K1-K3)', () => {
    const out = html()
    expect(out).toContain('Escalier')
    expect(out).toContain('0 / 200') // progression / cible
    expect(out).toContain('Progression / Âme')
    expect(out).toContain('Âmes en réserve')
    expect(out).toContain('100 / 100')
    expect(out).toContain('retour en arrière (D16)')
  })

  it('affiche le catalogue posable et le pas-à-pas (T7, U5)', () => {
    const out = html()
    expect(out).toContain('1 Tick')
    expect(out).toContain('Manche (5 Ticks)')
    for (const name of ['Carrière', 'Tailleur de pierre', 'Atelier', 'Sculpteur', 'Aiguillage']) {
      expect(out).toContain(name)
    }
  })

  it('dessine les 37 Espaces du Plateau de rayon 3 et les 6 boutons de direction', () => {
    const out = html()
    expect(out.match(/role="gridcell"/g)).toHaveLength(37)
    for (const dir of ['E', 'NE', 'NW', 'W', 'SW', 'SE']) {
      expect(out).toContain(`>${dir}</button>`)
    }
  })

  it('invite à sélectionner une Tuile quand rien n’est sélectionné (U2)', () => {
    expect(html()).toContain('Clique une Tuile pour l’inspecter')
  })
})
