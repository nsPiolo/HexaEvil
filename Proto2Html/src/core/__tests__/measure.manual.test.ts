import { describe, it } from 'vitest'
import { playBatch } from '../rules/driver'
import { loadConfig } from '../config/load'
import rawGameplay from '../../../config/gameplay.json'
import type { RawConfig } from '../config/schema'
import type { GameConfig } from '../config/schema'

/**
 * Mesure §14 / M4 — à lancer à la main :
 *   npx vitest run src/core/__tests__/measure.manual.test.ts
 * Ce n'est pas un test de régression : il imprime des chiffres, il n'assert rien.
 */
function cfg(over: Partial<GameConfig>): GameConfig {
  const raw = JSON.parse(JSON.stringify(rawGameplay)) as RawConfig
  const { config } = loadConfig({ ...raw, ai: { ...raw.ai, player: { profile: 'neutre', level: 'expert' } } })
  return { ...config, ...over }
}

function kingShields(config: GameConfig, shields: number): GameConfig {
  const types = new Map(config.tileTypes)
  const king = types.get('N00')
  if (king) types.set('N00', { ...king, shields })
  return { ...config, tileTypes: types }
}

const N = 30


describe('mesure §14 (M4)', () => {
  it('compare les leviers d’équilibrage', () => {
    const rows: string[] = []
    const variants: [string, GameConfig][] = [
      ['heal=1, Roi non soigné (LIVRÉ)', cfg({})],
      ['heal=2, Roi non soigné        ', cfg({ upkeepHeal: 2, upkeepHealsKing: false })],
      ['heal=0                        ', cfg({ upkeepHeal: 0 })],
      ['heal=1, Roi soigné            ', cfg({ upkeepHeal: 1, upkeepHealsKing: true })],
      ['heal=2, Roi soigné            ', cfg({ upkeepHeal: 2, upkeepHealsKing: true })],
      ['livré, Roi 1 bouclier         ', kingShields(cfg({}), 1)],
      ['livré, Roi 3 boucliers        ', kingShields(cfg({}), 3)],
    ]
    for (const [label, config] of variants) {
      const s = playBatch(config, N)
      const pct = (n: number) => `${String(Math.round((100 * n) / N)).padStart(3)}%`
      const avgKing = (k: 'player' | 'demon') =>
        (s.rows.reduce((a, r) => a + r.kingForce[k], 0) / N).toFixed(1).padStart(4)
      rows.push(
        `${label} | Roi tué ${pct(s.byCause['kingDestroyed'] ?? 0)} · plein ${pct(s.byCause['boardFull'] ?? 0)} · 2 passes ${pct(s.byCause['twoPasses'] ?? 0)}` +
          ` | J ${pct(s.wins.player)} D ${pct(s.wins.demon)} nul ${pct(s.draws)}` +
          ` | tours ${String(s.medianTurns).padStart(3)} | Roi fin J ${avgKing('player')} D ${avgKing('demon')}`,
      )
    }
    console.log('\n' + rows.join('\n') + '\n')
  }, 900000)

  it('M5 — l’avantage du premier joueur est-il un effet d’ordre ?', () => {
    // Échantillon plus large : à 30 parties la mesure était trop bruitée pour
    // trancher `Q12`.
    const M = 80
    const rows: string[] = []
    let firstWins = 0
    for (const first of ['player', 'demon'] as const) {
      const config = cfg({ firstPlayer: first })
      const s = playBatch(config, M)
      const pct = (n: number) => `${String(Math.round((100 * n) / M)).padStart(3)}%`
      firstWins += s.wins[first]
      rows.push(
        `firstPlayer=${first.padEnd(6)} | J ${pct(s.wins.player)} D ${pct(s.wins.demon)} nul ${pct(s.draws)}` +
          ` | le camp qui OUVRE gagne ${pct(s.wins[first])}`,
      )
    }
    rows.push(`=> avantage du premier joueur sur ${2 * M} parties : ${Math.round((100 * firstWins) / (2 * M))}%`)
    console.log('\n' + rows.join('\n') + '\n')
  }, 1800000)
})
