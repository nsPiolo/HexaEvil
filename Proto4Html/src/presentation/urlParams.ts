/**
 * Paramètres d'URL pour les tests de bout en bout (spec 07, T1 et T2). Aucun effet sans eux.
 *
 * - `?seed=NNN` : graine de la première course ; les courses suivantes utilisent seed + index,
 *   si bien que dés, vitrine et course sont entièrement déterministes (mulberry32).
 * - `?lang=fr|en` : force la langue, avant même l'option enregistrée.
 * - `?e2e=1` : démarrage direct d'un nouveau run sur l'écran de jeu (pas de splash, pas
 *   d'intro), vitesse ×4, sauvegarde effacée. Avec lui seulement : `?money=NNN` fixe le
 *   solde de départ, `?race=N` l'index de la première course (0 = cercle 1, course 1) et
 *   `?speed=N` la vitesse des animations (1 à 4, défaut 4).
 */
import { isLanguage, type Language } from './texts'

function params(): URLSearchParams | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

function intParam(name: string): number | null {
  const raw = params()?.get(name)
  if (raw === null || raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null
}

/** Graine imposée par l'URL, ou null (graine au hasard). */
export function urlSeed(): number | null {
  return intParam('seed')
}

/** Graine d'une course quand l'URL en impose une : base + index de la course, sinon null. */
export function seedForRace(raceIndex: number): number | null {
  const base = urlSeed()
  return base === null ? null : (base + raceIndex) >>> 0
}

/**
 * Langue imposée par l'URL (`?lang=en`), ou null. Utile en test et pour un lien de
 * démonstration : elle l'emporte sur l'option enregistrée sans la modifier.
 */
export function urlLanguage(): Language | null {
  const raw = params()?.get('lang')
  return isLanguage(raw) ? raw : null
}

/** Mode test de bout en bout (`?e2e=1`). */
export function e2eMode(): boolean {
  const v = params()?.get('e2e')
  return v === '1' || v === 'true'
}

/** Réglages de départ du mode e2e : solde et index de course, s'ils sont donnés. */
export function e2eStart(): { money: number | null; raceIndex: number | null; speed: number } {
  if (!e2eMode()) return { money: null, raceIndex: null, speed: 1 }
  const speed = intParam('speed')
  return { money: intParam('money'), raceIndex: intParam('race'), speed: speed === null ? 4 : Math.min(4, Math.max(1, speed)) }
}
