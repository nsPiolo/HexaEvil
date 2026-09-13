/**
 * Persistance navigateur — spéc. interface §1 et « Continuer ».
 *
 * Trois tiroirs indépendants dans le `localStorage` : les statistiques cumulées
 * sur toutes les tentatives, les options, et **une** sauvegarde de run. Chaque
 * accès est protégé : en mode privé, en rendu serveur ou avec le stockage
 * refusé, le jeu doit continuer de tourner sans rien mémoriser.
 */

import type { Card, Die, RewardId } from '../core/rules/types'

const PREFIX = 'hexaevil.'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as object) }
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* stockage indisponible : on joue sans mémoire, ce n'est pas une erreur */
  }
}

function drop(key: string): void {
  try {
    globalThis.localStorage?.removeItem(PREFIX + key)
  } catch {
    /* idem */
  }
}

/* ------------------------------------------------------------ Statistiques */

export interface Stats {
  /** Nombre de tentatives — un run commencé, gagné ou perdu. */
  runs: number
  /** Runs menés jusqu'au bout des neuf Cercles. */
  escapes: number
  bestCircle: number
  /** Rencontres (parties) gagnées, tous runs confondus. */
  matchesWon: number
  moneySpent: number
  battles: number
  battlesWon: number
  /** 4-2-1 posés par le joueur en fin de tour. */
  count421: number
}

const NO_STATS: Stats = {
  runs: 0,
  escapes: 0,
  bestCircle: 0,
  matchesWon: 0,
  moneySpent: 0,
  battles: 0,
  battlesWon: 0,
  count421: 0,
}

export function loadStats(): Stats {
  return read('stats', NO_STATS)
}

export function saveStats(stats: Stats): void {
  write('stats', stats)
}

export function addStats(patch: Partial<Stats>): Stats {
  const current = loadStats()
  const next: Stats = { ...current }
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof Stats
    // `bestCircle` est un maximum, tout le reste est un cumul.
    next[key] = key === 'bestCircle' ? Math.max(current[key], v ?? 0) : current[key] + (v ?? 0)
  }
  saveStats(next)
  return next
}

export function resetStats(): Stats {
  saveStats(NO_STATS)
  return NO_STATS
}

/* ----------------------------------------------------------------- Options */

export type Lang = 'fr' | 'en' | 'de' | 'es'

export interface Options {
  /** 0 à 100 par pas de 10. Sans effet tant qu'il n'y a pas de son. */
  volume: number
  lang: Lang
  /** ×0,5 à ×4 par pas de 0,5. */
  speed: number
}

const DEFAULT_OPTIONS: Options = { volume: 70, lang: 'fr', speed: 1 }

export function loadOptions(): Options {
  return read('options', DEFAULT_OPTIONS)
}

export function saveOptions(options: Options): void {
  write('options', options)
}

/* ------------------------------------------------------------- Sauvegarde */

/**
 * L'état d'un run entre deux rencontres. On ne sauve **pas** la partie en
 * cours : la reprise remet le joueur dans la boutique, comme le dit la spéc.
 * Le générateur aléatoire est sauvé avec, pour qu'une reprise ne rejoue pas
 * la même suite de tirages (`G4`).
 */
export interface SavedRun {
  version: number
  circleIndex: number
  wins: number
  matchesPlayed: number
  money: number
  forgePoints: number
  deck: Card[]
  dice: Die[]
  /** `A8` : les bonus possédés. Absent des sauvegardes v1. */
  bonuses: RewardId[]
  bestCircle: number
  lastMoney: number
  totalMoney: number
  rngState: number
  nextUid: number
  savedAt: number
}

const SAVE_VERSION = 2

export function loadSave(): SavedRun | null {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + 'save')
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedRun
    if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.deck) || !Array.isArray(parsed.dice)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSave(save: Omit<SavedRun, 'version' | 'savedAt'>): void {
  write('save', { ...save, version: SAVE_VERSION, savedAt: Date.now() })
}

export function clearSave(): void {
  drop('save')
}
