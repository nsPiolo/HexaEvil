import { useEffect, useState } from 'react'
import { fmtMultiplier } from '../core/rules/bets'
import { ENDINGS, GAME_NAME, MENU, OPTIONS, STATS, fill } from './texts'
import type { Options, Stats } from './storage'

/** Écran de chargement : le logo peint (public/menu/splash.jpg) pendant 5 secondes, puis le menu. Un clic abrège l'attente. */
export function Splash({ onDone, durationMs = 5000 }: { onDone: () => void; durationMs?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs)
    return () => clearTimeout(t)
  }, [onDone, durationMs])
  return (
    <div className="screen splash" onClick={onDone} role="presentation">
      <h1 className="splash-logo">
        <img src="/menu/splash.jpg" alt={GAME_NAME} />
      </h1>
    </div>
  )
}

interface MenuProps {
  canContinue: boolean
  onContinue: () => void
  onNewRun: () => void
  onStats: () => void
  onOptions: () => void
}

export function Menu({ canContinue, onContinue, onNewRun, onStats, onOptions }: MenuProps) {
  return (
    <div className="screen menu">
      <div className="menu-panel">
        <h1 className="menu-title">
          <img src="/menu/title.png" alt={GAME_NAME} width={461} height={120} />
        </h1>
        <nav className="menu-list">
        <button type="button" className="menu-btn" disabled={!canContinue} onClick={onContinue} title={canContinue ? undefined : 'Aucune évasion en cours'}>
          {MENU.continue}
        </button>
        <button type="button" className="menu-btn menu-btn-primary" onClick={onNewRun}>
          {MENU.newRun}
        </button>
        <button type="button" className="menu-btn" onClick={onStats}>
          {MENU.stats}
        </button>
        <button type="button" className="menu-btn" onClick={onOptions}>
          {MENU.options}
        </button>
        </nav>
      </div>
    </div>
  )
}

export function StatsScreen({ stats, onBack }: { stats: Stats; onBack: () => void }) {
  const pct = stats.attempts > 0 ? Math.round((stats.escapes / stats.attempts) * 100) : 0
  const rows: [string, string][] = [
    [STATS.attempts, String(stats.attempts)],
    [STATS.escapes, `${stats.escapes} (${pct} %)`],
    [STATS.bestCircle, stats.bestCircle > 0 ? `${stats.bestCircle}` : STATS.none],
    [STATS.moneyWon, `${stats.moneyWon} pièces`],
    [STATS.moneySpent, `${stats.moneySpent} pièces`],
    [STATS.races, String(stats.races)],
    [STATS.bestBet, stats.bestBet > 0 ? `+${stats.bestBet} pièces` : STATS.none],
  ]
  return (
    <div className="screen panel-screen">
      <button type="button" className="btn btn-stone back" onClick={onBack}>
        ← {MENU.back}
      </button>
      <h1>{STATS.title}</h1>
      <div className="scroll">
        <dl className="stats">
          {rows.map(([k, v]) => (
            <div key={k} className="stat-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

const LANGS: { id: Options['language']; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
]

export function OptionsScreen({ options, onChange, onBack }: { options: Options; onChange: (o: Options) => void; onBack: () => void }) {
  return (
    <div className="screen panel-screen">
      <button type="button" className="btn btn-stone back" onClick={onBack}>
        ← {MENU.back}
      </button>
      <h1>{OPTIONS.title}</h1>
      <div className="scroll">
      <div className="options">
        <label className="option option-disabled" title={OPTIONS.volumeDisabled}>
          <span className="option-label">
            {OPTIONS.volume} <span className="muted small">({OPTIONS.volumeDisabled})</span>
          </span>
          <input type="range" min={0} max={100} step={10} value={options.volume} disabled onChange={(e) => onChange({ ...options, volume: Number(e.target.value) })} />
          <span className="option-value">{options.volume}</span>
        </label>
        <label className="option option-disabled" title={OPTIONS.languageDisabled}>
          <span className="option-label">
            {OPTIONS.language} <span className="muted small">({OPTIONS.languageDisabled})</span>
          </span>
          <select value={options.language} disabled onChange={(e) => onChange({ ...options, language: e.target.value as Options['language'] })}>
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="option-value" />
        </label>
        <label className="option">
          <span className="option-label">{OPTIONS.speed}</span>
          <input type="range" min={0.5} max={4} step={0.5} value={options.speed} onChange={(e) => onChange({ ...options, speed: Number(e.target.value) })} />
          <span className="option-value">{fmtMultiplier(options.speed)}</span>
        </label>
      </div>
      </div>
    </div>
  )
}

interface EndProps {
  kind: 'gameover' | 'escape'
  price: number
  money: number
  onBack: () => void
}

export function EndScreen({ kind, price, money, onBack }: EndProps) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 50)
    return () => clearTimeout(t)
  }, [])
  const escape = kind === 'escape'
  return (
    <div className={`screen end ${escape ? 'end-escape' : 'end-gameover'}` + (shown ? ' end-shown' : '')}>
      <h1>{escape ? ENDINGS.escapeTitle : ENDINGS.gameOverTitle}</h1>
      <p>{escape ? fill(ENDINGS.escapeBody, { money }) : fill(ENDINGS.gameOverBody, { price, missing: Math.max(0, price - money) })}</p>
      <button type="button" className="btn btn-primary" onClick={onBack}>
        {ENDINGS.backToMenu}
      </button>
    </div>
  )
}
