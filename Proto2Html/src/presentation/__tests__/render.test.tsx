/**
 * Rendu de l'interface. Objectif : que le SVG et les panneaux se produisent
 * sans erreur avec la configuration livrée, pas de valider l'esthétique.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Game } from '../Game'

describe('rendu de l’interface', () => {
  const html = renderToStaticMarkup(<Game />)

  it('produit le Plateau et ses 19 Espaces (rayon 2)', () => {
    expect(html).toContain('Plateau hexagonal')
    // Un fond clair par Espace non bloqué : 19 − 2 bloqués = 17.
    expect((html.match(/space-base/g) ?? []).length).toBe(17)
    // Un contour par Espace.
    expect((html.match(/class="outline"/g) ?? []).length).toBe(19)
  })

  it('affiche les Tuiles pré-posées avec leur force dérivée', () => {
    expect(html).toContain('N00')
    expect(html).toContain('V00')
    expect(html).toContain('>20<')
    expect(html).toContain('>10<')
  })

  it('U3 — affiche la Couleur imposée', () => {
    expect(html).toContain('Couleur imposée')
    expect(html).toContain('libre (première pose, C9)')
  })

  it('U8 — affiche la décomposition des Decks', () => {
    expect(html).toContain('Decks par Couleur')
  })

  it('U6/U5/M — les panneaux de détail, journal et métriques sont présents', () => {
    expect(html).toContain('Journal de résolution')
    expect(html).toContain('Métriques')
    expect(html).toContain('Ravitaillement (M6)')
  })

  it('U10 — la légende explique le ravitaillement', () => {
    expect(html).toContain('ravitaillée')
    expect(html).toContain('maillon critique')
  })

  it('n’affiche aucun avertissement de configuration avec le fichier livré', () => {
    expect(html).not.toContain('banner warn')
  })

  it('U1 — les Espaces sont peints sur un fond clair, pour délaver leur Couleur', () => {
    expect(html).toContain('space-base')
    expect(html).toContain('space-fill')
  })

  it('U16 — les textures de Tuiles sont définies et utilisées', () => {
    for (const id of ['tex-player', 'tex-demon', 'tex-neutral', 'tex-blocked']) {
      expect(html).toContain(`id="${id}"`)
    }
    // Les Tuiles pré-posées utilisent bien la texture de leur camp.
    expect(html).toContain('url(#tex-player)')
    expect(html).toContain('url(#tex-demon)')
    expect(html).toContain('url(#tex-neutral)')
  })

  it('U16 — la bannière d’étape est présente, au repos au montage', () => {
    expect(html).toContain('step-banner idle')
    expect(html).toContain('Au repos')
  })

  it('U16 — le réglage de vitesse est présent', () => {
    expect(html).toContain('Vitesse ×')
    expect(html).toContain('Passer l’animation')
  })
})
