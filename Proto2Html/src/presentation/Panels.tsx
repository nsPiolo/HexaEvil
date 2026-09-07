/** Panneaux d'information — règles U4 à U9, M1 à M6. */

import { hexKey } from '../core/hex/hexCoord'
import { ALL_COLORS } from '../core/rules/types'
import { PASS_REASON_LABEL, SIDE_LABEL, colorHex, colorLabel, outcomeLabel } from './labels'
import type { ColorId, LogEntry, PlayingSide } from '../core/rules/types'
import type { HexCoord } from '../core/hex/hexCoord'
import type { GameApi } from './useGame'
import type { PreviewResult } from './preview'

const STEP_KIND_LABEL: Record<string, string> = {
  heal: 'Entretien',
  place: 'Pose',
  effect: 'Effet',
  attack: 'Attaque',
  riposte: 'Riposte',
  destroy: 'Destruction',
}

/**
 * U16 — bannière de l'étape en cours. C'est elle qui rend l'animation
 * *compréhensible* plutôt que seulement jolie : elle nomme la règle appliquée.
 */
export function StepBanner({ api }: { readonly api: GameApi }) {
  const { playback } = api
  if (!playback.playing) {
    return (
      <div className="step-banner idle">
        <span className="step-kind">Au repos</span>
        <span className="muted">Pose une Tuile : la résolution sera rejouée étape par étape.</span>
      </div>
    )
  }
  const kind = playback.kind ? (STEP_KIND_LABEL[playback.kind] ?? playback.kind) : ''
  return (
    <div className="step-banner">
      <span className="step-kind">{kind}</span>
      <span>{playback.label}</span>
      <span className="step-count">
        {playback.stepIndex + 1}/{playback.stepCount}
      </span>
    </div>
  )
}


/** U3 — Couleur imposée et état du tour. */
export function TurnPanel({ api }: { readonly api: GameApi }) {
  const { config, state, mustPass } = api
  const color = state.imposedColor
  return (
    <section className="panel">
      <h2>Tour {state.turn}</h2>
      <p className="row">
        <span className={`chip side-${state.activeSide}`}>{SIDE_LABEL[state.activeSide]}</span>
        {state.outcome ? (
          <span className="chip end">{outcomeLabel(state.outcome.cause, state.outcome.winner)}</span>
        ) : null}
      </p>
      <p className="imposed">
        Couleur imposée&nbsp;:{' '}
        {color === null ? (
          <strong>libre (première pose, C9)</strong>
        ) : (
          <strong style={{ color: colorHex(config.colors, color) }}>{colorLabel(config.colors, color)}</strong>
        )}
      </p>
      {mustPass && (
        <p className="warn">
          Ce camp doit <strong>passer</strong>&nbsp;: {PASS_REASON_LABEL[mustPass]}.
          {state.consecutivePasses === 1 && ' Une seconde passe consécutive terminerait la partie (W2).'}
        </p>
      )}
    </section>
  )
}

/** D3 — la main est le sommet du Deck de la Couleur imposée. */
export function HandPanel({
  api,
  chosen,
  onChoose,
}: {
  readonly api: GameApi
  readonly chosen: string | null
  readonly onChoose: (id: string) => void
}) {
  const { config, hand, state } = api
  return (
    <section className="panel">
      <h2>Main — sommet du Deck ({hand.length})</h2>
      {hand.length === 0 && <p className="muted">Aucune Tuile jouable dans cette Couleur (C10).</p>}
      <ul className="hand">
        {hand.map((id, i) => {
          const def = config.tileTypes.get(id)
          return (
            <li key={`${id}-${i}`}>
              <button
                type="button"
                className={chosen === id ? 'card chosen' : 'card'}
                onClick={() => onChoose(id)}
                disabled={state.outcome !== null || api.locked}
                style={{ borderColor: colorHex(config.colors, def?.color ?? null) }}
              >
                <span className="card-id">{id}</span>
                <span className="card-force">{def?.force ?? '?'}</span>
                {def && def.shields > 0 && <span className="card-shields">◈{def.shields}</span>}
                <span className="card-effect">{effectSummary(id)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** M3 — barres mises à l'échelle du maximum, pour ne pas déborder du panneau. */
function Histogram({ api }: { readonly api: GameApi }) {
  const { config, metrics } = api
  const active = ALL_COLORS.filter((c) => config.activeColors.includes(c))
  const max = Math.max(1, ...active.map((c) => metrics.imposedHistogram[c as ColorId]))
  return (
    <ul className="histogram">
      {active.map((c) => {
        const n = metrics.imposedHistogram[c as ColorId]
        return (
          <li key={c}>
            <span className="hist-label">{c.slice(0, 3)}</span>
            <span className="hist-track">
              <span
                className="hist-bar"
                style={{ width: `${(100 * n) / max}%`, background: colorHex(config.colors, c) }}
              />
            </span>
            <span className="hist-count muted">{n}</span>
          </li>
        )
      })}
    </ul>
  )
}

function effectSummary(id: string): string {
  switch (id) {
    case 'R04': return '+1 bouclier'
    case 'R05': return '−2 aux adverses'
    case 'B01': return 'aura +1 bouclier allié'
    case 'B02': return 'repeint en rouge'
    case 'V01': return '+2 boucliers'
    case 'V02': return '+3 boucliers'
    case 'V03': return '+3 boucliers'
    case 'N01': return 'annule les effets voisins'
    case 'N03': return '−2 à tous les voisins'
    case 'J01': return 'aura −2 boucliers adverses'
    case 'J02': return 'aura +2 force alliée'
    default: return ''
  }
}

/** U4 — aperçu complet de la résolution avant la pose. */
export function PreviewPanel({
  api,
  hovered,
  preview,
}: {
  readonly api: GameApi
  readonly hovered: HexCoord | null
  readonly preview: PreviewResult | null
}) {
  const { config } = api
  if (!hovered) return (
    <section className="panel">
      <h2>Aperçu (U4)</h2>
      <p className="muted">Choisis une Tuile, puis survole un Espace.</p>
    </section>
  )
  if (!preview) return (
    <section className="panel">
      <h2>Aperçu (U4)</h2>
      <p className="muted">Espace ({hovered.q},{hovered.r}) — aucune Tuile choisie.</p>
    </section>
  )
  if (!preview.ok) return (
    <section className="panel">
      <h2>Aperçu (U4)</h2>
      <p className="warn">{preview.reason}</p>
    </section>
  )
  return (
    <section className="panel">
      <h2>Aperçu — ({hovered.q},{hovered.r})</h2>
      {preview.winsNow && <p className="good"><strong>Cette pose tue le Roi adverse : victoire immédiate (W1).</strong></p>}
      {preview.hurtsOwnKing > 0 && (
        <p className="warn"><strong>Attention (U7)</strong> : cette pose retire {preview.hurtsOwnKing} force à ton propre Roi (E9).</p>
      )}
      <p>
        Force à la pose <strong>{preview.placedForce}</strong>
        {preview.placementBonus > 0 && <span className="muted"> (dont +{preview.placementBonus} d’alliés, F3)</span>}
        {' · '}
        {preview.survives ? <span className="good">survit</span> : <span className="bad">détruite par la riposte</span>}
        {' · '}
        {preview.supplied ? <span className="good">ravitaillée</span> : <span className="bad">non ravitaillée (F14)</span>}
      </p>
      {preview.destroyed.length > 0 && (
        <p className="bad">Détruites : {preview.destroyed.map((d) => `${d.typeId} (${d.at.q},${d.at.r})`).join(', ')}</p>
      )}
      {preview.damaged.length > 0 && (
        <ul className="lines">
          {preview.damaged.map((d) => (
            <li key={hexKey(d.at)}>
              {d.typeId} ({d.at.q},{d.at.r}) : {d.before} → <strong>{d.after}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="offered">
        Couleur donnée à l’adversaire&nbsp;:{' '}
        {preview.offeredColor === null ? (
          '—'
        ) : (
          <strong style={{ color: colorHex(config.colors, preview.offeredColor) }}>
            {colorLabel(config.colors, preview.offeredColor)}
          </strong>
        )}
        {preview.starvesEnemy && <span className="good"> — son Deck est vide : il passera son tour (C10) !</span>}
      </p>
    </section>
  )
}

/** U8 — décomposition des Decks, ce qui rend la famine de Couleur jouable. */
export function DeckPanel({ api }: { readonly api: GameApi }) {
  const { config, state } = api
  return (
    <section className="panel">
      <h2>Decks par Couleur (U8)</h2>
      <table className="decks">
        <thead>
          <tr>
            <th />
            {config.activeColors.map((c) => (
              <th key={c} style={{ color: colorHex(config.colors, c) }}>
                {c.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['player', 'demon'] as PlayingSide[]).map((side) => (
            <tr key={side}>
              <th className={`side-${side}`}>{SIDE_LABEL[side]}</th>
              {config.activeColors.map((c) => {
                const n = state.decks[side][c].length
                return (
                  <td key={c} className={n === 0 ? 'empty' : undefined}>
                    {n}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/** U6 — détail d'une Tuile : état stocké, dérivé, silence, ravitaillement. */
export function TileInspector({ api, at }: { readonly api: GameApi; readonly at: HexCoord | null }) {
  const { view, supplied, critical, state, config } = api
  const tile = at ? view.byKey.get(hexKey(at)) : undefined
  if (!at || !tile) {
    const space = at ? state.spaces.find((s) => hexKey(s.at) === hexKey(at)) : undefined
    return (
      <section className="panel">
        <h2>Tuile (U6)</h2>
        <p className="muted">
          {space
            ? space.blocked
              ? `Espace (${at?.q},${at?.r}) — bloqué (B2), rien ne s’y pose.`
              : `Espace (${at?.q},${at?.r}) — libre, Couleur ${space.color}.`
            : 'Clique un Espace.'}
        </p>
      </section>
    )
  }
  const def = view.defOf(tile)
  const isSupplied = tile.side !== 'neutral' && supplied[tile.side].has(tile.uid)
  const isCritical = tile.side !== 'neutral' && critical[tile.side].has(tile.uid)
  return (
    <section className="panel">
      <h2>
        {tile.typeId} <span className={`chip side-${tile.side}`}>{SIDE_LABEL[tile.side]}</span>
      </h2>
      <table className="detail">
        <tbody>
          <tr><th>Couleur</th><td>{colorLabel(config.colors, def.color)}</td></tr>
          <tr><th>baseForce</th><td>{def.force}</td></tr>
          <tr><th>placementBonus</th><td>+{tile.placementBonus} <span className="muted">(figé, F3)</span></td></tr>
          <tr><th>damage</th><td>−{tile.damage}</td></tr>
          <tr><th>grantedShields</th><td>{tile.grantedShields}</td></tr>
          <tr className="derived"><th>force dérivée</th><td><strong>{view.forceOf(tile)}</strong></td></tr>
          <tr className="derived"><th>boucliers dérivés</th><td><strong>{view.shieldsOf(tile)}</strong></td></tr>
          <tr><th>muette (E7)</th><td>{view.isSilenced(tile) ? 'oui' : 'non'}</td></tr>
          <tr>
            <th>ravitaillée (F14)</th>
            <td>
              {tile.side === 'neutral' ? '— (neutre)' : isSupplied ? 'oui' : 'non — ne se soigne pas'}
              {isCritical && <span className="warn"> · maillon critique</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** U5 — journal de résolution, étape par étape. */
export function LogView({ api }: { readonly api: GameApi }) {
  const entries = api.state.log.slice(-60).reverse()
  return (
    <section className="panel log">
      <h2>Journal de résolution (U5)</h2>
      <ol>
        {entries.map((e, i) => (
          <li key={`${e.turn}-${i}`} className={`log-${e.kind}`}>
            <span className="log-turn">T{e.turn}</span> {describe(e)}
          </li>
        ))}
      </ol>
    </section>
  )
}

function describe(e: LogEntry): string {
  switch (e.kind) {
    case 'upkeep':
      return `Entretien ${SIDE_LABEL[e.side]} : ${e.healed.map((h) => `${h.typeId} +${h.amount}`).join(', ')} (F13).`
    case 'place':
      return `${SIDE_LABEL[e.side]} pose ${e.typeId} en (${e.at.q},${e.at.r})${e.placementBonus > 0 ? ` (+${e.placementBonus} d’alliés)` : ''}.`
    case 'pass':
      return `${SIDE_LABEL[e.side]} passe — ${PASS_REASON_LABEL[e.reason]}.`
    case 'imposed':
      return `Couleur imposée à l’adversaire : ${e.color}${e.starves ? ' — son Deck est vide, il passera !' : ''}.`
    case 'effect':
    case 'attack':
    case 'riposte':
    case 'destroyed':
    case 'end':
      return e.text
  }
}

/** M1 à M6 — métriques. */
export function MetricsPanel({ api }: { readonly api: GameApi }) {
  const { state, view, metrics, supplied, batch } = api
  const kingForce = (side: PlayingSide): number => {
    const king = state.tiles.find((t) => t.side === side && view.defOf(t).role === 'king')
    return king ? view.forceOf(king) : 0
  }
  const ratio = (side: PlayingSide): string => {
    const own = state.tiles.filter((t) => t.side === side).length
    return own === 0 ? '—' : `${Math.round((100 * supplied[side].size) / own)}%`
  }
  return (
    <section className="panel">
      <h2>Métriques</h2>
      <table className="detail">
        <tbody>
          <tr><th>Force des Rois (M1)</th><td>J {kingForce('player')} · D {kingForce('demon')}</td></tr>
          <tr><th>Tuiles en jeu (M2)</th><td>J {state.tiles.filter((t) => t.side === 'player').length} · D {state.tiles.filter((t) => t.side === 'demon').length}</td></tr>
          <tr><th>Ravitaillement (M6)</th><td>J {ratio('player')} · D {ratio('demon')}</td></tr>
          <tr><th>Passes (M3)</th><td>J {metrics.passes.player} · D {metrics.passes.demon}</td></tr>
          <tr><th>Couleurs offertes vides (M3)</th><td>{metrics.starvingImposed}</td></tr>
        </tbody>
      </table>
      <h3>Couleurs imposées (M3)</h3>
      <Histogram api={api} />
      {batch && (
        <>
          <h3>Lot IA contre IA (M4)</h3>
          <table className="detail">
            <tbody>
              <tr><th>Parties</th><td>{batch.rows.length}</td></tr>
              <tr><th>Victoires</th><td>J {batch.wins.player} · D {batch.wins.demon} · nuls {batch.draws}</td></tr>
              <tr><th>Causes de fin</th><td>{Object.entries(batch.byCause).map(([k, v]) => `${k} ${v}`).join(' · ')}</td></tr>
              <tr><th>Tours (médiane)</th><td>{batch.medianTurns}</td></tr>
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
