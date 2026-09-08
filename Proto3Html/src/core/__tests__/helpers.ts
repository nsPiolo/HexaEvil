import { readFileSync } from 'node:fs'
import { loadConfig } from '../config/load'
import type { GameConfig } from '../config/schema'

let cached: GameConfig | null = null

export function config(): GameConfig {
  if (!cached) {
    const raw = JSON.parse(readFileSync(new URL('../../../config/gameplay.json', import.meta.url), 'utf8'))
    cached = loadConfig(raw)
  }
  return cached
}
