import { useState } from 'react'
import { config } from '../core/config'
import { circleAt, isBeyondWritten } from '../core/rules/circles'
import { demonRankAtRace } from './demon'
import { STEP_ART } from './art'
import { CIRCLES, HUD, MAP, MENU, fill, ordinalOf } from './texts'
import { describeBossEffects } from '../core/rules/boss'
import { bossEffectsFor, circleOf, type SessionCarry } from './useRace'

interface Props {
  carry: SessionCarry
  onLaunch: () => void
  onMenu: () => void
}

const R0 = 26
const STEP = 30
/** Jeu laissé entre deux couronnes voisines, pour qu'elles se lisent sans trait de contour. */
const GAP = 5
const PAD = 10
/** Largeur d'un brasero, en unités de la `viewBox` ; le boss a le sien, plus imposant. */
const BRAZIER = 30
const BRAZIER_BOSS = 42

/**
 * Géométrie de la spirale pour un nombre d'anneaux donné. La `viewBox` vaut exactement les
 * anneaux plus une marge pour le trait et le halo : la pierre ronde peinte dans le décor
 * (public/map/bg.jpg) reçoit donc la spirale au pixel près, quel que soit le format de la
 * fenêtre — le placement en pourcentage est dans `.map-svg` (index.css).
 *
 * Le nombre d'anneaux n'est pas fixe : au-delà du dernier cercle écrit, le jeu continue
 * (circles.ts) et la spirale gagne un tour par cercle. Comme la boîte est calée sur l'anneau
 * extérieur, tout est simplement redessiné plus serré à l'intérieur du même rocher.
 */
function geometry(rings: number): { size: number; center: number } {
  const size = (R0 + STEP * rings + PAD) * 2
  return { size, center: size / 2 }
}

/** Spirale continue : un tour par cercle, le premier cercle au centre. t = numéro de course fractionnaire. */
function spiral(center: number, t: number): { x: number; y: number } {
  const r = R0 + STEP * t
  const angle = -Math.PI / 2 + 2 * Math.PI * t
  return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
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

function point(center: number, raceIndex: number): { x: number; y: number } {
  return spiral(center, tOf(raceIndex))
}

/** Tracé lisse de la spirale d'une course à une autre, bornes comprises. */
function spiralPath(center: number, fromRace: number, toRace: number): string {
  const t0 = tOf(fromRace)
  const t1 = tOf(toRace)
  const steps = Math.max(1, (toRace - fromRace) * 10)
  const parts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const p = spiral(center, t0 + ((t1 - t0) * i) / steps)
    parts.push(`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
  }
  return parts.join(' ')
}

/** Écran entre deux courses : les neuf cercles, la progression, le boss et le prix du cercle en cours. */
export function MapScreen({ carry, onLaunch, onMenu }: Props) {
  const next = carry.raceIndex
  const { circle: currentCircle } = circleOf(next)
  // Au-delà des cercles écrits, la spirale s'allonge jusqu'où le joueur est monté.
  const rings = Math.max(config.run.circles.length, currentCircle)
  const { size: SIZE, center: CENTER } = geometry(rings)
  const total = rings * config.run.racesPerCircle
  const [selected, setSelected] = useState<number>(currentCircle)
  const per = config.run.racesPerCircle
  const info = circleAt(config.run, selected)
  // Au-delà des cercles écrits, le boss est assemblé (GDD §8.1) : on annonce ses effets tirés,
  // pas le texte du dernier cercle écrit, qui ne décrit plus rien.
  const generated = isBeyondWritten(config.run, selected)
  const powerText = generated ? describeBossEffects(bossEffectsFor((selected - 1) * config.run.racesPerCircle + config.run.racesPerCircle - 1)) : info.power
  const texts = CIRCLES[selected - 1]
  const path = spiralPath(CENTER, 0, total - 1)

  return (
    <div className="screen map">
      {/* La scène garde le format de l'illustration : les deux repères peints (pierre ronde, bloc
          rectangulaire) restent alignés avec la spirale et le panneau à toutes les tailles. */}
      <div className="map-stage">
        <div className="hud hud-left">
          <span className="hud-big">{fill(HUD.circle, { ordinal: ordinalOf(currentCircle) })}</span>
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
          {Array.from({ length: rings }, (_, k) => {
            const rMid = R0 + STEP * (k + 0.5)
            const n = k + 1
            const cls = ['ring']
            if (n < currentCircle) cls.push('ring-done')
            if (n === currentCircle) cls.push('ring-current')
            if (n === selected) cls.push('ring-selected')
            return (
              <g key={n} className={cls.join(' ')} onClick={() => setSelected(n)}>
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
          {next > 0 && <path d={spiralPath(CENTER, 0, Math.min(next, total) - 1)} className="spiral spiral-done" />}
          {/* Les points : une course chacun, le troisième de chaque cercle est le boss */}
          {Array.from({ length: total }, (_, i) => {
            const p = point(CENTER, i)
            const isBoss = i % per === per - 1
            const state = i < next ? 'done' : i === next ? 'next' : 'locked'
            const n = Math.floor(i / per) + 1
            const label = isBoss ? `${MAP.bossRace} — ${circleAt(config.run, n).boss}` : fill(MAP.race, { n: (i % per) + 1 })
            const w = isBoss ? BRAZIER_BOSS : BRAZIER
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
                <title>{`${fill(MAP.circleOf, { n, name: circleAt(config.run, n).name })} · ${label} · ${state === 'done' ? MAP.done : state === 'next' ? MAP.next : MAP.locked}`}</title>
                {state === 'next' && <circle cx={p.x} cy={p.y} r={isBoss ? 14 : 11} className="dot-halo" />}
                <image
                  href={state === 'done' ? STEP_ART.on : STEP_ART.off}
                  className="dot-mark"
                  width={w}
                  height={w * STEP_ART.ratio}
                  x={p.x - w * STEP_ART.cx}
                  y={p.y - w * STEP_ART.ratio * STEP_ART.cy}
                />
                {isBoss && <text x={p.x} y={p.y + 3.5} className="dot-boss" textAnchor="middle">☠</text>}
                {/* Cible de clic : la vasque, pas le cadre de l'image — celui de `step_on` monte
                    haut au-dessus du brasero et mordrait sur le repère voisin. */}
                <circle cx={p.x} cy={p.y} r={isBoss ? 11 : 8} className="dot-hit" />
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
              <dd>{powerText}</dd>
            </div>
            <div>
              <dt>{MAP.track}</dt>
              <dd>{fill(MAP.lanes, { n: info.lanes, s: info.lanes > 1 ? 's' : '' })}</dd>
            </div>
            {/* Le terrain n'est tiré qu'au départ de la course : la carte annonce les variantes possibles, pas celle qui sera jouée. */}
            <div>
              <dt>{MAP.terrain}</dt>
              <dd>
                {info.terrains.length > 1 ? MAP.terrainDrawn : MAP.terrainOne}
                <ul className="map-terrains">
                  {info.terrains.map((t) => (
                    <li key={t.name}>
                      <span className="map-terrain-name">{t.name}</span>
                      {' — '}
                      {t.blocked.length > 0
                        ? fill(MAP.blocked, { n: t.blocked.length, s: t.blocked.length > 1 ? 's' : '', columns: [...new Set(t.blocked.map((b) => b.column))].sort((a, b) => a - b).join(', ') })
                        : MAP.noBlocked}
                    </li>
                  ))}
                </ul>
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
