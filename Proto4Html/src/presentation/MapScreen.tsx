import { useState } from 'react'
import { config } from '../core/config'
import { demonRankAtRace } from './demon'
import { CIRCLES, HUD, MAP, MENU, fill } from './texts'
import { circleOf, type SessionCarry } from './useRace'

interface Props {
  carry: SessionCarry
  onLaunch: () => void
  onMenu: () => void
}

const R0 = 26
const STEP = 30
/** Jeu laissé entre deux couronnes voisines, pour qu'elles se lisent sans trait de contour. */
const GAP = 5
/**
 * Rayon de l'anneau extérieur, et boîte du dessin calée dessus : la `viewBox` vaut exactement
 * les anneaux plus une marge pour le trait et le halo. La pierre ronde peinte dans le décor
 * (public/map/bg.jpg) reçoit donc la spirale au pixel près, quel que soit le format de la fenêtre
 * — le placement en pourcentage est dans `.map-svg` (index.css).
 */
const R_MAX = R0 + STEP * config.run.circles.length
const PAD = 10
const SIZE = (R_MAX + PAD) * 2
const CENTER = SIZE / 2

/** Spirale continue : un tour par cercle, le premier cercle au centre. t = numéro de course fractionnaire. */
function spiral(t: number): { x: number; y: number } {
  const r = R0 + STEP * t
  const angle = -Math.PI / 2 + 2 * Math.PI * t
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

/** Bruit déterministe dans [0, 1) : le même dessin à chaque affichage, sans alignement des points. */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Paramètre de spirale d'une course : 3 points par tour. Chaque point flotte dans son tiers de
 * tour (entre 0,15 et 0,85), d'où un léger chaos d'un cercle à l'autre tout en gardant l'ordre
 * des courses le long du trait.
 */
function tOf(raceIndex: number): number {
  return (raceIndex + 0.15 + 0.7 * jitter(raceIndex)) / config.run.racesPerCircle
}

function point(raceIndex: number): { x: number; y: number } {
  return spiral(tOf(raceIndex))
}

/** Tracé lisse de la spirale d'une course à une autre, bornes comprises. */
function spiralPath(fromRace: number, toRace: number): string {
  const t0 = tOf(fromRace)
  const t1 = tOf(toRace)
  const steps = Math.max(1, (toRace - fromRace) * 10)
  const parts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const p = spiral(t0 + ((t1 - t0) * i) / steps)
    parts.push(`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
  }
  return parts.join(' ')
}

/** Écran entre deux courses : les neuf cercles, la progression, le boss et le prix du cercle en cours. */
export function MapScreen({ carry, onLaunch, onMenu }: Props) {
  const total = config.run.circles.length * config.run.racesPerCircle
  const next = carry.raceIndex
  const { circle: currentCircle } = circleOf(next)
  const [selected, setSelected] = useState<number>(currentCircle)
  const per = config.run.racesPerCircle
  const info = config.run.circles[selected - 1]!
  const texts = CIRCLES[selected - 1]
  const path = spiralPath(0, total - 1)

  return (
    <div className="screen map">
      {/* La scène garde le format de l'illustration : les deux repères peints (pierre ronde, bloc
          rectangulaire) restent alignés avec la spirale et le panneau à toutes les tailles. */}
      <div className="map-stage">
        <div className="hud hud-left">
          <span className="hud-big">{fill(HUD.circle, { ordinal: CIRCLES[currentCircle - 1]?.ordinal ?? currentCircle })}</span>
          <span className="muted small">{fill(HUD.demon, { rank: demonRankAtRace(next).name })}</span>
          <span className="muted small">{MAP.subtitle}</span>
        </div>
        <div className="hud hud-right">
          <span className="hud-big money">{fill(HUD.coins, { n: carry.money })}</span>
          <button type="button" className="btn-stone btn-stone-sm" onClick={onMenu}>
            {HUD.menu}
          </button>
        </div>

        <svg className="map-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={MAP.title}>
          {/* Anneaux : un par cercle, le premier au centre */}
          {config.run.circles.map((c, k) => {
            const rMid = R0 + STEP * (k + 0.5)
            const n = k + 1
            const cls = ['ring']
            if (n < currentCircle) cls.push('ring-done')
            if (n === currentCircle) cls.push('ring-current')
            if (n === selected) cls.push('ring-selected')
            return (
              <g key={c.name} className={cls.join(' ')} onClick={() => setSelected(n)}>
                {/* L'aplat de la couronne : un trait épais de la largeur d'un anneau, moins le
                    jeu qui sépare deux couronnes voisines. La couleur dit l'état du cercle. */}
                <circle cx={CENTER} cy={CENTER} r={rMid} className="ring-band" style={{ strokeWidth: STEP - GAP }} />
                {/* Zone de clic sur toute la couronne, jeu compris : pas de trou entre deux anneaux. */}
                <circle cx={CENTER} cy={CENTER} r={rMid} className="ring-hit" style={{ strokeWidth: STEP }} />
                <text x={CENTER} y={CENTER - rMid + 4} className="ring-label" textAnchor="middle">
                  {n}
                </text>
              </g>
            )
          })}
          {/* Le trait en spirale qui relie les courses : le tracé complet en fil fin, puis le
              chemin déjà parcouru repassé par-dessus en trait épais. */}
          <path d={path} className="spiral" />
          {next > 0 && <path d={spiralPath(0, Math.min(next, total) - 1)} className="spiral spiral-done" />}
          {/* Les points : une course chacun, le troisième de chaque cercle est le boss */}
          {Array.from({ length: total }, (_, i) => {
            const p = point(i)
            const isBoss = i % per === per - 1
            const state = i < next ? 'done' : i === next ? 'next' : 'locked'
            const n = Math.floor(i / per) + 1
            const label = isBoss ? `${MAP.bossRace} — ${config.run.circles[n - 1]?.boss ?? ''}` : fill(MAP.race, { n: (i % per) + 1 })
            return (
              <g
                key={i}
                className={`race-dot race-${state}` + (isBoss ? ' race-boss' : '')}
                onClick={() => {
                  setSelected(n)
                  if (state === 'next') onLaunch()
                }}
                role={state === 'next' ? 'button' : undefined}
                aria-label={state === 'next' ? `${MAP.launch} : ${label}` : label}
              >
                <title>{`${fill(MAP.circleOf, { n, name: config.run.circles[n - 1]?.name ?? '' })} · ${label} · ${state === 'done' ? MAP.done : state === 'next' ? MAP.next : MAP.locked}`}</title>
                {state === 'next' && <circle cx={p.x} cy={p.y} r={isBoss ? 16 : 12} className="dot-halo" />}
                <circle cx={p.x} cy={p.y} r={isBoss ? 9 : 6} className="dot" />
                {isBoss && <text x={p.x} y={p.y + 3.5} className="dot-boss" textAnchor="middle">☠</text>}
              </g>
            )
          })}
        </svg>

        <aside className="map-info">
          <h2>{fill(MAP.circleOf, { n: selected, name: info.name })}</h2>
          <p className="muted small">
            {selected < currentCircle ? 'Cercle traversé.' : selected === currentCircle ? MAP.current : MAP.locked}
            {' · '}
            {info.souls} âmes en course
          </p>
          <dl className="map-dl">
            <div>
              <dt>{MAP.boss}</dt>
              <dd>{info.boss}</dd>
            </div>
            <div>
              <dt>{MAP.power}</dt>
              <dd>
                {info.power} <span className="tag">{MAP.powerPending}</span>
              </dd>
            </div>
            <div>
              <dt>{MAP.track}</dt>
              <dd>
                {fill(MAP.lanes, { n: info.lanes, s: info.lanes > 1 ? 's' : '' })}
                {' · '}
                {info.blocked.length > 0
                  ? fill(MAP.blocked, { n: info.blocked.length, s: info.blocked.length > 1 ? 's' : '', columns: [...new Set(info.blocked.map((b) => b.column))].sort((a, b) => a - b).join(', ') })
                  : MAP.noBlocked}
              </dd>
            </div>
            <div>
              <dt>{MAP.price}</dt>
              <dd>{selected <= currentCircle ? `${info.price} pièces` : <span className="muted">{MAP.priceHidden}</span>}</dd>
            </div>
          </dl>
          {texts && selected < currentCircle && <p className="muted small">Payé. {MENU.continue} vers le cercle {selected + 1}.</p>}
          <button type="button" className="btn btn-primary" onClick={onLaunch}>
            {MAP.launch} — {next % per === per - 1 ? MAP.bossRace : fill(MAP.race, { n: (next % per) + 1 })}
          </button>
        </aside>
      </div>
    </div>
  )
}
