/** Menu principal, statistiques et options — spéc. interface §1. */

import { useState } from 'react'
import {
  loadStats,
  resetStats,
  saveOptions,
  type Lang,
  type Options,
  type Stats,
} from './storage'

export function Menu({
  canContinue,
  onContinue,
  onNew,
  onStats,
  onOptions,
}: {
  canContinue: boolean
  onContinue: () => void
  onNew: () => void
  onStats: () => void
  onOptions: () => void
}) {
  return (
    <div className="menu">
      <h1 className="menu__title">
        Hexa<em>Evil</em>
      </h1>
      <nav className="menu__nav">
        <button type="button" className="menu__item" disabled={!canContinue} onClick={onContinue}>
          Continuer
          <span>{canContinue ? 'reprendre l’évasion en cours' : 'aucune évasion en cours'}</span>
        </button>
        <button type="button" className="menu__item menu__item--main" onClick={onNew}>
          Commencer une nouvelle évasion
          <span>neuf Cercles, une seule vie</span>
        </button>
        <button type="button" className="menu__item" onClick={onStats}>
          Statistiques
          <span>vos tentatives, vos évasions</span>
        </button>
        <button type="button" className="menu__item" onClick={onOptions}>
          Options
          <span>volume, langue, vitesse</span>
        </button>
      </nav>
    </div>
  )
}

/* ------------------------------------------------------------ Statistiques */

function percent(part: number, whole: number): string {
  if (whole <= 0) return '—'
  return `${Math.round((part / whole) * 100)} %`
}

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats>(() => loadStats())
  const rows: [string, string][] = [
    ['Nombre de tentatives', String(stats.runs)],
    ['Nombre d’évasions', `${stats.escapes} · ${percent(stats.escapes, stats.runs)}`],
    ['Cercle atteint', stats.bestCircle > 0 ? String(stats.bestCircle) : '—'],
    ['Rencontres gagnées', String(stats.matchesWon)],
    ['Argent dépensé', String(stats.moneySpent)],
    ['Batailles jouées', String(stats.battles)],
    ['Batailles gagnées', `${stats.battlesWon} · ${percent(stats.battlesWon, stats.battles)}`],
    ['Nombre de 4-2-1', String(stats.count421)],
  ]

  return (
    <div className="sheet">
      <header className="sheet__head">
        <button type="button" className="btn" onClick={onBack}>
          ← Retour
        </button>
        <h2>Statistiques</h2>
      </header>
      <dl className="statlist">
        {rows.map(([label, value]) => (
          <div key={label} className="statlist__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn" onClick={() => setStats(resetStats())}>
        Remettre les compteurs à zéro
      </button>
    </div>
  )
}

/* ----------------------------------------------------------------- Options */

const LANGS: [Lang, string][] = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['es', 'Español'],
]

export function OptionsScreen({
  options,
  onChange,
  onBack,
}: {
  options: Options
  onChange: (next: Options) => void
  onBack: () => void
}) {
  // Toute modification s'applique tout de suite, sans valider.
  const set = (patch: Partial<Options>): void => {
    const next = { ...options, ...patch }
    saveOptions(next)
    onChange(next)
  }

  return (
    <div className="sheet">
      <header className="sheet__head">
        <button type="button" className="btn" onClick={onBack}>
          ← Retour
        </button>
        <h2>Options</h2>
      </header>

      {/* Une option sans effet est grisée plutôt que retirée : elle dit ce qui viendra. */}
      <div className="optrow optrow--off">
        <label htmlFor="opt-volume">Volume</label>
        <input
          id="opt-volume"
          type="range"
          min={0}
          max={100}
          step={10}
          value={options.volume}
          disabled
          onChange={(e) => set({ volume: Number(e.target.value) })}
        />
        <span className="optrow__value">{options.volume}</span>
        <span className="optrow__note">pas encore de son dans le prototype</span>
      </div>

      <div className="optrow optrow--off">
        <label htmlFor="opt-lang">Langue</label>
        <select
          id="opt-lang"
          value={options.lang}
          disabled
          onChange={(e) => set({ lang: e.target.value as Lang })}
        >
          {LANGS.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <span className="optrow__value" />
        <span className="optrow__note">le prototype n’est écrit qu’en français</span>
      </div>

      <div className="optrow">
        <label htmlFor="opt-speed">Vitesse des animations</label>
        <input
          id="opt-speed"
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={options.speed}
          onChange={(e) => set({ speed: Number(e.target.value) })}
        />
        <span className="optrow__value">×{options.speed}</span>
        <span className="optrow__note">s’applique immédiatement</span>
      </div>
    </div>
  )
}
