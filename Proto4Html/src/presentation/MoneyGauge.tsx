import { GAUGE, fill } from './texts'

interface Props {
  money: number
  price: number
  /** Somme des mises des paris ouverts (information de survol). */
  staked: number
  /** Courses restantes dans le cercle, quand l'appelant le sait (modale de résultats). */
  racesLeft?: number
}

/**
 * Jauge des trois usages (spec 01/C1) : répond partout à « où en suis-je par rapport au
 * prix du cercle ? ». Même composant, même géométrie dans le HUD, le panneau de paris,
 * la boutique et la modale de résultats. Jamais bloquante : c'est de l'information.
 *
 *   [████████████░░░░░░░░░░]  87 / 200
 *    solde                    prix du cercle
 *
 * Solde ≥ prix : la barre est à l'échelle du solde, un séparateur marque le prix et la
 * portion au-delà est la marge de jeu. Solde < prix : la barre est à l'échelle du prix,
 * remplissage ambre sur fond rouge pâle, et le manque est écrit à côté.
 */
export function MoneyGauge({ money, price, staked, racesLeft }: Props) {
  const warn = money < price
  const scale = Math.max(1, warn ? price : money)
  const fillPct = Math.min(100, (Math.max(0, money) / scale) * 100)
  const separatorPct = warn ? 100 : (price / scale) * 100
  const missing = Math.max(0, price - money)
  const margin = Math.max(0, money - price)
  const detail = warn
    ? racesLeft !== undefined && racesLeft > 0
      ? fill(GAUGE.missingIn, { missing, n: racesLeft, s: racesLeft > 1 ? 's' : '' })
      : fill(GAUGE.missing, { missing })
    : margin > 0
      ? fill(GAUGE.margin, { n: margin })
      : GAUGE.covered
  return (
    <div data-testid="money-gauge" data-state={warn ? 'warn' : 'ok'} className={'gauge' + (warn ? ' gauge-warn' : '')} title={fill(GAUGE.tooltip, { money, staked, price })} role="img" aria-label={`${GAUGE.label} : ${money} / ${price}. ${detail}`}>
      <div className="gauge-row">
        <div className="gauge-bar">
          <div className="gauge-fill" style={{ width: `${fillPct}%` }} />
          {!warn && <div className="gauge-sep" style={{ left: `${separatorPct}%` }} aria-hidden="true" />}
        </div>
        <span className="gauge-values">
          <span className="gauge-money">{money}</span>
          <span className="gauge-slash"> / </span>
          <span className="gauge-price">{price}</span>
        </span>
      </div>
      <div className="gauge-legend">
        <span>{GAUGE.balance}</span>
        <span className="gauge-detail">{detail}</span>
        <span>{GAUGE.price}</span>
      </div>
    </div>
  )
}
