import { useEffect, useState } from 'react'
import { fmtMultiplier } from '../core/rules/bets'
import type { ShopItem } from '../core/shop/items'
import { LOCK_ART } from './art'
import { ItemArt } from './ItemArt'
import { COLLECTION, DEBT, ENDINGS, GAME_NAME, ITEM_KINDS, LANGUAGES, MENU, OPTIONS, RARITIES, STATS, UI, UNLOCK, fill } from './texts'
import type { Options, Stats } from './storage'


/** Carte d'objet hors boutique : ni prix, ni achat — le catalogue, pas le rayon. */
function ItemCard({ item }: { item: ShopItem }) {
  return (
    <article className={`coll-item kind-${item.kind} rarity-${item.rarity}`}>
      <header>
        <span>{ITEM_KINDS[item.kind]}</span>
        <span className={`shop-rarity rarity-${item.rarity}`}>{RARITIES[item.rarity]}</span>
      </header>
      <div className="shop-body">
        <ItemArt id={item.id} className="shop-art" />
        <div className="shop-text">
          <h3>{item.name}</h3>
          <p className="small">{item.description}</p>
        </div>
      </div>
      {item.warning && <p className="small shop-warning">⚠ {item.warning}</p>}
    </article>
  )
}

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
  onCollection: () => void
  onOptions: () => void
}

export function Menu({ canContinue, onContinue, onNewRun, onStats, onCollection, onOptions }: MenuProps) {
  return (
    <div className="screen menu">
      <div className="menu-panel">
        <h1 className="menu-title">
          <img src="/menu/title.png" alt={GAME_NAME} width={461} height={120} />
        </h1>
        <nav className="menu-list">
        <button type="button" className="menu-btn" disabled={!canContinue} onClick={onContinue} title={canContinue ? undefined : UI.menu.noRun}>
          {MENU.continue}
        </button>
        <button type="button" className="menu-btn menu-btn-primary" onClick={onNewRun}>
          {MENU.newRun}
        </button>
        <button type="button" className="menu-btn" onClick={onStats}>
          {MENU.stats}
        </button>
        <button type="button" className="menu-btn" onClick={onCollection}>
          {MENU.collection}
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
    [STATS.moneyWon, fill(UI.ticket.coins, { n: stats.moneyWon })],
    [STATS.moneySpent, fill(UI.ticket.coins, { n: stats.moneySpent })],
    [STATS.races, String(stats.races)],
    [STATS.bestBet, stats.bestBet > 0 ? fill(UI.ticket.bestBet, { n: stats.bestBet }) : STATS.none],
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
        <label className="option">
          <span className="option-label">{OPTIONS.language}</span>
          {/* Le changement prend effet au rendu suivant : c'est `App` qui applique la langue
              puis enregistre l'option, et l'écran entier se redessine, celui-ci compris. */}
          <select value={options.language} onChange={(e) => onChange({ ...options, language: e.target.value as Options['language'] })}>
            {LANGUAGES.map((l) => (
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
  /** Évasion seulement : poursuivre le run comme démon dans les cercles suivants (GDD §5.3). */
  onContinue?: () => void
  onBack: () => void
}

export function EndScreen({ kind, price, money, onContinue, onBack }: EndProps) {
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
      {/* L'évasion est une fin, pas la seule : le run reste ouvert tant que le joueur n'est pas rentré au menu. */}
      {escape && onContinue && <p className="muted">{ENDINGS.escapeStay}</p>}
      <div className="end-actions">
        {escape && onContinue && (
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            {ENDINGS.escapeContinue}
          </button>
        )}
        <button type="button" className={escape && onContinue ? 'btn' : 'btn btn-primary'} onClick={onBack}>
          {ENDINGS.backToMenu}
        </button>
      </div>
    </div>
  )
}

interface CollectionProps {
  /** Objets débloqués, dans l'ordre du catalogue. */
  items: readonly ShopItem[]
  /** Nombre de scellés : on les compte, on ne les nomme pas. */
  lockedCount: number
  onBack: () => void
}

/**
 * Collection (accueil) : ce que la boutique peut proposer aujourd'hui, et combien d'objets
 * restent sous scellé. Les scellés apparaissent en cartes anonymes — assez pour mesurer ce
 * qu'il reste à jouer, pas assez pour gâcher la révélation de fin de cercle.
 */
export function CollectionScreen({ items, lockedCount, onBack }: CollectionProps) {
  const total = items.length + lockedCount
  return (
    <div className="screen panel-screen collection-screen">
      <button type="button" className="btn btn-stone back" onClick={onBack}>
        ← {MENU.back}
      </button>
      <h1>{COLLECTION.title}</h1>
      <p className="coll-count">{fill(COLLECTION.count, { n: items.length, total })}</p>
      <p className="coll-hint muted small">{COLLECTION.hint}</p>
      <div className="coll-scroll">
        <div className="collection">
          {items.length === 0 && <p className="muted">{COLLECTION.empty}</p>}
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        <p className="coll-locked-line small">
          {lockedCount === 0 ? COLLECTION.complete : fill(COLLECTION.locked, { n: lockedCount, s: lockedCount > 1 ? 's' : '' })}
        </p>
        {/* Rack de cadenas : des tuiles serrées, jamais des cartes pleines — dix scellés ne
            doivent pas peser plus lourd à l'écran que les objets réellement en rayon. */}
        <div className="sealed-rack">
          {Array.from({ length: lockedCount }, (_, i) => (
            <span key={`locked-${i}`} className="coll-sealed" title={COLLECTION.lockedTitle} role="img" aria-label={COLLECTION.lockedCard}>
              <img className="coll-seal" src={LOCK_ART} alt="" aria-hidden="true" width={230} height={320} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Révélation de fin de cercle : le cercle est payé, un objet sort de la réserve. Écran
 * plein, un seul bouton — c'est une récompense, pas un choix (App.tsx, `onRaceFinished`).
 */
export function UnlockScreen({ item, remaining, onDone }: { item: ShopItem; remaining: number; onDone: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 50)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={'screen panel-screen unlock-screen' + (shown ? ' unlock-shown' : '')}>
      <h1>{UNLOCK.title}</h1>
      <p className="unlock-intro">{UNLOCK.intro}</p>
      <div className="unlock-card">
        <ItemCard item={item} />
      </div>
      <p className="unlock-added small">{UNLOCK.added}</p>
      <p className="muted small">{remaining === 0 ? UNLOCK.last : fill(UNLOCK.remaining, { n: remaining, s: remaining > 1 ? 's' : '' })}</p>
      <div className="end-actions">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          {UNLOCK.next}
        </button>
      </div>
    </div>
  )
}

interface DebtProps {
  price: number
  money: number
  borrow: number
  /** Ce que la dette ajoutera au prix du cercle suivant. */
  interest: number
  onBorrow: () => void
  onRefuse: () => void
}

/**
 * Dette infernale (artefacts.md n°20) : le seul écran où une fin de run se refuse. Le montant et
 * l'intérêt sont affichés avant le choix — c'est un marché, pas un sauvetage.
 */
export function DebtScreen({ price, money, borrow, interest, onBorrow, onRefuse }: DebtProps) {
  return (
    <div className="screen panel-screen debt-screen">
      <h1>{DEBT.title}</h1>
      <p className="debt-lead">{fill(DEBT.lead, { price, money, missing: price - money })}</p>
      <p className="debt-offer">{fill(DEBT.offer, { borrow })}</p>
      <p className="debt-cost small">{fill(DEBT.cost, { interest })}</p>
      <div className="end-actions">
        <button type="button" className="btn btn-primary" onClick={onBorrow}>
          {fill(DEBT.accept, { borrow })}
        </button>
        <button type="button" className="btn" onClick={onRefuse}>
          {DEBT.refuse}
        </button>
      </div>
    </div>
  )
}
