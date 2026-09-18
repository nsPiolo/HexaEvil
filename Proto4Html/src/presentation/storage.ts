/**
 * Persistance locale (interface.md : « dans la version web, on garde ces
 * informations dans le localstorage »). Quatre clés : sauvegarde du run, statistiques, options,
 * objets débloqués.
 * Toute lecture est défensive : une valeur absente ou cassée rend la valeur par défaut.
 */
import type { Inventory } from '../core/shop/shop'
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './texts'

const KEYS = { save: 'sinnersbet.save.v1', stats: 'sinnersbet.stats.v1', options: 'sinnersbet.options.v1', unlocks: 'sinnersbet.unlocks.v1' } as const

function read<T>(key: string, fallback: T, check: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v: unknown = JSON.parse(raw)
    return check(v) ? v : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* stockage indisponible : on joue sans persistance */
  }
}

// ---- Sauvegarde du run ------------------------------------------------------

/** État au début d'une rencontre : c'est là qu'on reprend avec « Continuer ». */
export interface RunSave {
  money: number
  inventory: Inventory
  /** Index de la prochaine course à jouer, à partir de 0. */
  raceIndex: number
  lateBetCharges: number
  /** Cercle le plus haut atteint dans ce run (pour les stats), à partir de 1. */
  bestCircle: number
  savedAt: number
}

function isRunSave(v: unknown): v is RunSave {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (typeof o.money !== 'number' || typeof o.raceIndex !== 'number' || typeof o.inventory !== 'object' || o.inventory === null) return false
  const inv = o.inventory as Inventory
  // Une sauvegarde sans dé Distance rendrait la course injouable : on la traite comme absente.
  return Array.isArray(inv.dice) && inv.dice.length > 0 && Array.isArray(inv.artefacts)
}

export function loadRun(): RunSave | null {
  return read<RunSave | null>(KEYS.save, null, (v): v is RunSave | null => v === null || isRunSave(v))
}

export function saveRun(save: RunSave): void {
  write(KEYS.save, save)
}

export function clearRun(): void {
  try {
    localStorage.removeItem(KEYS.save)
  } catch {
    /* ignore */
  }
}

// ---- Statistiques -----------------------------------------------------------

export interface Stats {
  attempts: number
  escapes: number
  bestCircle: number
  moneyWon: number
  moneySpent: number
  races: number
  bestBet: number
}

export const EMPTY_STATS: Stats = { attempts: 0, escapes: 0, bestCircle: 0, moneyWon: 0, moneySpent: 0, races: 0, bestBet: 0 }

function isStats(v: unknown): v is Stats {
  if (typeof v !== 'object' || v === null) return false
  return Object.keys(EMPTY_STATS).every((k) => typeof (v as Record<string, unknown>)[k] === 'number')
}

export function loadStats(): Stats {
  return read<Stats>(KEYS.stats, EMPTY_STATS, isStats)
}

export function updateStats(patch: (s: Stats) => Stats): Stats {
  const next = patch(loadStats())
  write(KEYS.stats, next)
  return next
}

// ---- Options ----------------------------------------------------------------

/**
 * Les langues traduites sont listées une seule fois, dans `texts` : une sauvegarde qui
 * porte autre chose (une langue retirée, un fichier bricolé) retombe sur le français à la
 * lecture plutôt que de laisser l'interface à moitié vide.
 */
export type { Language } from './texts'

export interface Options {
  /** 0 à 100, pas de 10. */
  volume: number
  language: Language
  /** 0,5 à 4, pas de 0,5. */
  speed: number
}

export const DEFAULT_OPTIONS: Options = { volume: 50, language: DEFAULT_LANGUAGE, speed: 1 }

function isOptions(v: unknown): v is Options {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.volume === 'number' && typeof o.speed === 'number' && typeof o.language === 'string'
}

export function loadOptions(): Options {
  const o = read<Options>(KEYS.options, DEFAULT_OPTIONS, isOptions)
  return { ...DEFAULT_OPTIONS, ...o, language: isLanguage(o.language) ? o.language : DEFAULT_LANGUAGE, speed: Math.min(4, Math.max(0.5, o.speed)) }
}

export function saveOptions(o: Options): void {
  write(KEYS.options, o)
}

// ---- Objets débloqués -------------------------------------------------------

/**
 * Méta-progression : les ids d'objets de boutique débloqués par les cercles payés
 * (`core/shop/unlocks.ts`). Volontairement hors de `RunSave` — ils survivent à la mort du
 * run, et `clearRun` ne les efface pas. Les ids absents du catalogue actuel sont filtrés à
 * la lecture par `unlockedIds`, pas ici : le stockage reste brut.
 */
export function loadUnlocks(): string[] {
  return read<string[]>(KEYS.unlocks, [], (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'))
}

export function saveUnlocks(ids: readonly string[]): void {
  write(KEYS.unlocks, ids)
}
