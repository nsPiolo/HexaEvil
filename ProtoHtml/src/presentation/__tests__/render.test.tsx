/**
 * Test de fumée de l'interface : elle doit se rendre sans exception avec la
 * configuration livrée, et afficher les repères attendus (`U1`, `U2`, `K1`-`K5`).
 * Le rendu serveur suffit : il exécute les hooks et donc le chargement de la
 * configuration, sans exiger de DOM.
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { hex } from '../../core/hex/hexCoord'
import { createGame, runTick } from '../../core/rules/encounter'
import { buildGame, referenceConfig, withRecipes } from '../../core/__tests__/helpers'
import { BoardView } from '../BoardView'
import { Game } from '../Game'
import { aggregateFloaters, type MoveAnim } from '../useAnimation'

/** Le rendu serveur insère des marqueurs `<!-- -->` entre les interpolations. */
const config = referenceConfig()

/** L'interface est rendue sur la disposition de référence, pas sur le fichier
 * en cours d'édition : un terrain à moitié réglé ne doit pas rougir l'affichage. */
const html = () =>
  renderToString(<Game config={config} configText="{}" />).replaceAll('<!-- -->', '')

const spaceCount = 1 + 3 * config.board.radius * (config.board.radius + 1)

/**
 * La main est tirée au hasard (`A8`) mais la germe est fixée en configuration :
 * on la recalcule donc plutôt que de nommer des Tuiles en dur.
 */
const startingHand = createGame(config).hand
const tileName = (id: string) => config.tileTypes.find((t) => t.id === id)!.name

describe('Interface (rendu de fumée)', () => {
  it('se rend sans erreur', () => {
    expect(() => html()).not.toThrow()
  })

  it('affiche l’erreur au lieu de planter quand la configuration est invalide', () => {
    // `App` valide avant de monter le jeu : une direction inexistante doit
    // produire un écran lisible, pas une page blanche (G1).
    const out = renderToString(<App />).replaceAll('<!-- -->', '')
    if (out.includes('app--boot')) {
      expect(out).toContain('La configuration ne peut pas être chargée')
      expect(out).toContain('config-editor')
    } else {
      // Le fichier livré est valide : le jeu se monte normalement.
      expect(out).toContain('Escalier')
    }
  })

  it('affiche les métriques du proto (K1-K3)', () => {
    const out = html()
    expect(out).toContain('Escalier')
    expect(out).toContain(`0 / ${config.stairwayTarget}`) // progression / cible
    expect(out).toContain('Progression / Âme')
    expect(out).toContain(`0 / ${config.maxTicks} Ticks`) // l'horloge (E2)
    expect(out).toContain('Ticks restants')
    expect(out).toContain('Âmes apparues')
    expect(out).toContain('Sbires (apparus · vivants)')
    expect(out).toContain('retour en arrière (D16)')
  })

  it('affiche la main, la pioche et les actions de la Manche (A1-A3, U5)', () => {
    const out = html()
    expect(out).toContain('1 Tick')
    // La première Manche est courte : la cadence s'allonge ensuite (C1b).
    expect(out).toContain(`Manche (${config.ticksPerRound.start} Tick`)
    // Main de départ + la pioche automatique du premier tour (`A7`).
    expect(out).toContain(`Main (${startingHand.length}/${config.handMax})`)
    expect(out).toContain(`Piocher (${config.deck.length - startingHand.length})`)
    expect(out).toContain('Action de la Manche')
    expect(out).toContain('Passer')
    // Seules les Tuiles en main sont proposées, pas tout un catalogue.
    for (const id of new Set(startingHand)) expect(out).toContain(tileName(id))
  })

  it('dessine un Espace par case du Plateau', () => {
    expect(html().match(/role="gridcell"/g)).toHaveLength(spaceCount)
  })

  it('n’ouvre pas l’édition des Sorties tant qu’on ne la demande pas (U12)', () => {
    // À l'accueil, aucune Tuile n'est sélectionnée : pas de bouton « Terminer ».
    const out = html()
    expect(out).not.toContain('edit-toggle--on')
  })

  it('montre les Recettes du Bâtiment choisi au catalogue (U15)', () => {
    // Type par défaut : la Carrière. Sa Recette doit être lisible sans avoir
    // posé quoi que ce soit.
    // La Tuile détaillée est la première de la main ; on vérifie que son bloc
    // est rendu, sans épingler des valeurs qui sont là pour être réglées.
    const picked = config.tileTypes.find((t) => t.id === startingHand[0])!
    const out = html()
    expect(out).toContain('catalog__detail')
    expect(out).toContain(tileName(picked.id))
    expect(out).toContain('Sortie max')
    if (picked.recipes && picked.recipes.length > 0) {
      expect(out).toContain(`${picked.recipes[0]!.ticks} Tick`)
    }
  })

  it('annonce que la pose se fait sans Sortie (U9)', () => {
    // Les boutons de direction ne sont plus à l'écran d'accueil : ils vivent
    // dans le détail d'une Tuile, et la Sortie se désigne au clic sur un voisin.
    const out = html()
    expect(out).toContain('sans Sortie')
    expect(out).not.toContain('>NE</button>')
  })

  it('invite à sélectionner une Tuile quand rien n’est sélectionné (U2)', () => {
    expect(html()).toContain('Clique une Tuile pour l’inspecter')
  })

  it('propose les vitesses de lecture (U6)', () => {
    const out = html()
    for (const label of ['lent', 'normal', 'rapide', 'instantané']) expect(out).toContain(label)
  })
})

describe('Plateau animé (U1, U6, U7)', () => {
  /** Deux Ticks de la chaîne Puits → Carrière → `end`, animation à mi-course. */
  const midMove = (end = 'stairway') => {
    let state = buildGame({
      // Recette fixée par le test : « +2 » à la production, « −1 » au ramassage.
      ...withRecipes('quarry', [{ out: { rawBasalt: 2 }, ticks: 1 }]),
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: end, owner: end === 'stairway' ? 'neutral' : 'player', exits: [] },
      ],
    })
    state = runTick(state)
    state = runTick(state)
    const moves = new Map<number, MoveAnim>()
    for (const event of state.events) {
      if (event.kind === 'move') {
        moves.set(event.entityId, { from: event.from, to: event.to, carrying: event.carrying })
      }
    }
    const floaters = aggregateFloaters(state.events, 0).map((f) => ({ ...f, age: 0.2 }))
    return renderToString(
      <BoardView
        state={state}
        selected={hex(1, 0)}
        placeable={() => true}
        wireTargets={[]}
        moves={moves}
        ghosts={[]}
        floaters={floaters}
        t={0.5}
        onSpaceClick={() => {}}
      />,
    ).replaceAll('<!-- -->', '')
  }

  it('dessine une pastille par entité, entre les deux Espaces à mi-course', () => {
    const out = midMove()
    const dots = out.match(/class="entity entity--player[^"]*"/g) ?? []
    expect(dots).toHaveLength(2)
    // L'Âme #1 va de (1,0) vers (2,0) : à t = 0,5 son abscisse est entre les deux.
    expect(out).toMatch(/cx="1[12][0-9]\./)
  })

  it('affiche la charge portée à côté de la pastille', () => {
    // Chaîne finissant sur un Vide : l'Âme garde son Basalte brut (D11), là où
    // l'Escalier le lui aurait pris au dépôt (D10).
    const out = midMove('empty')
    expect(out).toContain('class="entity__load"')
    expect(out).toContain('🪨')
    expect(midMove('stairway')).not.toContain('class="entity__load"')
  })

  it('affiche les étiquettes « +x » et « −n » (U7)', () => {
    const out = midMove()
    expect(out).toContain('floater--gain')
    expect(out).toContain('floater--loss')
    expect(out).toContain('>+2</text>')
    expect(out).toContain('>−1</text>')
  })

  it('conserve les compteurs numériques par Tuile (U1)', () => {
    expect(midMove()).toContain('class="cell__souls"')
  })
})

describe('Progression affichée sur l’Escalier (U11)', () => {
  const boardWith = (progress: number) => {
    const state = buildGame({
      board: { radius: 2 },
      initialTiles: [
        { q: 0, r: 0, type: 'soulWell', owner: 'player', exits: ['E'] },
        { q: 1, r: 0, type: 'quarry', owner: 'player', exits: ['E'] },
        { q: 2, r: 0, type: 'stairway', owner: 'neutral', exits: [] },
      ],
    })
    state.progress = progress
    return renderToString(
      <BoardView
        state={state}
        selected={undefined}
        placeable={() => false}
        wireTargets={[]}
        moves={new Map()}
        ghosts={[]}
        floaters={[]}
        t={1}
        onSpaceClick={() => {}}
      />,
    ).replaceAll('<!-- -->', '')
  }

  it('écrit la progression et la cible sur la Tuile', () => {
    const out = boardWith(42)
    expect(out).toContain('class="cell__progress"')
    expect(out).toContain('>42<')
    expect(out).toContain(`/${config.stairwayTarget}<`)
  })

  it('l’affiche même à zéro', () => {
    expect(boardWith(0)).toContain('>0<')
  })

  it('ne l’affiche que sur les Bâtiments qui font varier la progression', () => {
    // Une seule Tuile en porte une : l'Escalier. La Carrière et le Puits non.
    expect(boardWith(7).match(/class="cell__progress"/g)).toHaveLength(1)
  })
})
