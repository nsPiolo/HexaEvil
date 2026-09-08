import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { config } from '../../core/__tests__/helpers'
import { Dialogue } from '../Dialogue'
import { circleCleared, INTRO } from '../dialogues'
import { Game } from '../Game'
import { Menu, OptionsScreen, StatsScreen } from '../Menu'
import { Session } from '../session'
import { Splash } from '../Splash'
import { addStats, loadSave, loadStats, resetStats, type Options } from '../storage'

const cfg = config()

/** Un `localStorage` en mémoire : les écrans doivent y écrire pour de vrai. */
class MemoryStorage {
  private readonly map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v)
  }
  removeItem(k: string): void {
    this.map.delete(k)
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

const OPTIONS: Options = { volume: 70, lang: 'fr', speed: 1 }

describe('les écrans hors partie se rendent', () => {
  it('l’application démarre sur le logo, avec la vraie configuration', () => {
    const html = renderToString(<App />)
    expect(html).toContain('splash')
    // `G2` : une configuration invalide s'annoncerait ici plutôt qu'au premier clic.
    expect(html).not.toContain('fatal')
  })

  it('le logo', () => {
    expect(renderToString(<Splash onDone={() => undefined} />)).toContain('splash')
  })

  it('le menu principal, sans sauvegarde', () => {
    const html = renderToString(
      <Menu
        canContinue={false}
        onContinue={() => undefined}
        onNew={() => undefined}
        onStats={() => undefined}
        onOptions={() => undefined}
      />,
    )
    expect(html).toContain('Continuer')
    // `Continuer` doit être grisé tant qu'aucun run n'est en cours.
    expect(html).toContain('disabled')
  })

  it('les statistiques', () => {
    const html = renderToString(<StatsScreen onBack={() => undefined} />)
    expect(html).toContain('Nombre de tentatives')
    expect(html).toContain('Nombre de 4-2-1')
  })

  it('les options', () => {
    const html = renderToString(
      <OptionsScreen options={OPTIONS} onChange={() => undefined} onBack={() => undefined} />,
    )
    expect(html).toContain('Vitesse des animations')
  })

  it('l’introduction', () => {
    const html = renderToString(<Dialogue bubbles={INTRO} onDone={() => undefined} skipLabel="Passer" />)
    expect(html).toContain('vous êtes mort')
    expect(html).toContain('Passer')
  })
})

describe('la fin de Cercle annonce ce qui change', () => {
  it('cite le nombre de cartes et la taille des dés', () => {
    const bubbles = circleCleared(cfg.circles[1]!, cfg.circles[2]!)
    const texts = bubbles.map((b) => b.text).join(' | ')
    // Cercle 2 → 3 : les dés passent de 6 à 8 faces.
    expect(texts).toContain('8 faces')
    expect(bubbles[0]?.who).toBe('demon')
  })
})

describe('la partie se rend du début à la fin', () => {
  it('la table, puis la boutique', () => {
    const session = new Session(cfg)
    expect(renderToString(<Game session={session} cfg={cfg} onQuit={() => undefined} />)).toContain('table')

    // On force la partie jusqu'au bout pour atteindre l'écran suivant.
    session.autoPilot = true
    for (let guard = 0; guard < 4000 && session.screen === 'match'; guard++) {
      if (!session.idle) session.skip()
      else if (session.ask) session.autoStep()
      else break
    }
    expect(['shop', 'transition', 'dead', 'won']).toContain(session.screen)
    expect(renderToString(<Game session={session} cfg={cfg} onQuit={() => undefined} />)).toContain('hud')
  })
})

describe('le run se sauve et se reprend', () => {
  it('reprend en boutique avec le même deck et la même bourse', () => {
    const session = new Session(cfg)
    session.autoPilot = true
    for (let guard = 0; guard < 4000 && session.screen === 'match'; guard++) {
      if (!session.idle) session.skip()
      else if (session.ask) session.autoStep()
      else break
    }
    const saved = loadSave()
    if (session.run.status !== 'playing') {
      // Une défaite efface la sauvegarde : le run est bel et bien terminé (`R6`).
      expect(saved).toBeNull()
      return
    }
    expect(saved).not.toBeNull()
    const back = new Session(cfg, saved)
    expect(back.screen).toBe('shop')
    expect(back.run.money).toBe(session.run.money)
    expect(back.run.deck.length).toBe(session.run.deck.length)
    expect(back.run.circleIndex).toBe(session.run.circleIndex)
    expect(back.run.dice[0]?.faces.length).toBe(session.run.dice[0]?.faces.length)
  })
})

describe('les statistiques se cumulent', () => {
  it('additionne, sauf le meilleur Cercle qui est un maximum', () => {
    resetStats()
    addStats({ runs: 1, battles: 3, bestCircle: 4 })
    addStats({ runs: 1, battles: 2, bestCircle: 2 })
    const stats = loadStats()
    expect(stats.runs).toBe(2)
    expect(stats.battles).toBe(5)
    expect(stats.bestCircle).toBe(4)
  })
})
