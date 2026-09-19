import { isBlocked, isInBetZone, specialAt, type MoveResult, type RaceState } from '../core/rules/race'
import { personalityOf, type Personalities } from '../core/rules/personalities'
import { PersonalityMark } from './PersonalityMark'
import { personalityEffect, personalityName } from './messages'
import { blockedArt, cellArt, hasCellArt } from './art'
import { fmtDistance, soulColor } from './souls'
import { bettingClosed } from '../core/rules/bets'
import { BETS, BET_LIVE, BOARD, GLOSSARY, RACE, UI, fill, plural } from './texts'

/** Sélection d'âmes pour le ticket de pari, depuis le plateau (spec 03/C2). */
export interface BoardSelection {
  souls: readonly number[]
  /** Nombre d'âmes du ticket : au-delà, plus de sélection (retrait toujours possible). */
  max: number
  onToggle: (id: number) => void
}

interface Props {
  race: RaceState
  lastResult: MoveResult | null
  /** Âme dont c'est le déplacement en cours (surbrillance). */
  activeSoul: number | null
  /** Âme survolée ailleurs (dé Âme, chip, carte de la file) : même rendu qu'`activeSoul`, autre source. */
  highlightSoul?: number | null
  onHoverSoul?: (id: number | null) => void
  /** Prochain déplacement prévisualisé : jeton fantôme sur la case d'arrivée (spec 05/C2). */
  preview?: MoveResult | null
  selection?: BoardSelection | null
  /** Âmes visées par un pari ouvert : un petit marqueur à la base du jeton. */
  bettedSouls?: ReadonlySet<number>
  /** Personnalités des âmes (GDD §6.5) : un signe sur le jeton, la règle au survol. */
  personalities?: Personalities
  /** Colonnes à surligner brièvement (départage « même colonne, le plus bas devant »). */
  tieColumns?: readonly number[]
  /** Tribune infernale : pose en cours ; chaque case permise devient cliquable. */
  onPlaceTribune?: (column: number, lane: number) => void
  /** Bornes du stagiaire : pose d'une borne sur cette case (même fenêtre que la tribune). */
  onPlaceMarker?: (column: number, lane: number) => void
}

/** Écart vertical entre deux jetons empilés sur la même case, en pixels ; taille d'un jeton. */
const STACK_GAP = 22
const TOKEN = 32
const SINGLE_LANE_HEIGHT = 150

/** Glyphes de conséquence d'un déplacement, avec leur explication (glossaire). */
export function consequenceGlyphs(r: MoveResult): { glyph: string; title: string }[] {
  const out: { glyph: string; title: string }[] = []
  if (r.blockedAtStart) out.push({ glyph: '✕', title: GLOSSARY.departBloque })
  if (r.detour !== null) out.push({ glyph: '↕', title: GLOSSARY.detour })
  if (r.collision?.kind === 'jump') out.push({ glyph: '↷', title: GLOSSARY.percuter })
  if (r.collision?.kind === 'swap') out.push({ glyph: '⇄', title: GLOSSARY.echanger })
  if (r.crossedFinish) out.push({ glyph: '🏁', title: GLOSSARY.arrivee })
  return out
}

/**
 * Plateau : `columns` colonnes × `lanes` couloirs. Le couloir 0 (prioritaire) est dessiné
 * EN BAS, au plus près du joueur. Les cases bloquées sont hachurées. Les âmes qui partagent
 * une case (départ, dernière case) s'empilent visuellement.
 */
export function Board({ race, lastResult, activeSoul, highlightSoul = null, onHoverSoul, preview = null, selection = null, bettedSouls, personalities, tieColumns = [], onPlaceTribune, onPlaceMarker }: Props) {
  const closed = bettingClosed(race)
  const { track } = race
  const cols = Array.from({ length: track.totalCells }, (_, i) => i)
  const lanes = track.lanes
  const rows = Array.from({ length: lanes }, (_, r) => lanes - 1 - r) // couloir affiché par ligne, du haut vers le bas
  const swapped = lastResult?.collision?.kind === 'swap' ? lastResult.collision.with : null
  const jumped = lastResult?.collision?.kind === 'jump' ? lastResult.collision.over : []
  const stackGap = STACK_GAP
  // Hauteur d'un couloir : assez pour empiler les âmes qui partagent une case au départ.
  const perLane = Math.ceil(race.souls.length / lanes)
  const laneHeight = Math.max(56, TOKEN + (perLane - 1) * STACK_GAP + 16)
  const trackHeight = lanes > 1 ? lanes * laneHeight : SINGLE_LANE_HEIGHT
  const previewSoul = preview?.move.soul ?? null
  const previewGlyphs = preview ? consequenceGlyphs(preview) : []

  // Plusieurs âmes sur la même case (départ, dernière case) : on les empile.
  const occupants = new Map<string, number[]>()
  for (const s of race.souls) {
    const k = `${s.position}:${s.lane}`
    occupants.set(k, [...(occupants.get(k) ?? []), s.id])
  }

  const cellClass = (c: number, lane: number | null): string => {
    const k = ['cell']
    if (c === 0) k.push('cell-start')
    if (c >= track.betThresholdColumn && c < track.columns) k.push('cell-betzone')
    if (c === track.columns) k.push('cell-finish')
    if (c >= track.columns) k.push('cell-after')
    if (lane !== null && isBlocked(track, c, lane)) k.push('cell-blocked')
    if (tieColumns.includes(c)) k.push('cell-tie')
    return k.join(' ')
  }

  /** Une âme est-elle sélectionnable pour le ticket ? Mêmes règles que les chips du panneau. */
  const pickState = (id: number, position: number): { picked: boolean; canPick: boolean; why: string } => {
    if (!selection) return { picked: false, canPick: false, why: '' }
    const picked = selection.souls.includes(id)
    if (picked) return { picked, canPick: true, why: BETS.unpickOnBoard }
    if (isInBetZone(track, position)) return { picked, canPick: false, why: BETS.overThreshold }
    if (selection.souls.length >= selection.max) return { picked, canPick: false, why: '' }
    return { picked, canPick: true, why: BETS.pickOnBoard }
  }

  /**
   * Ce qu'une case a à dire au survol, dans l'ordre où on le lit : ce qui empêche de s'y
   * arrêter, puis ce qui s'y déclenche. Une case peut cumuler — le joueur pose la tribune
   * où il veut, y compris sur une case spéciale — d'où une liste et non un texte.
   */
  const cellTips = (c: number, lane: number): string[] => {
    const out: string[] = []
    if (isBlocked(track, c, lane)) out.push(fill(BOARD.blockedTitle, { column: c, lane: lane + 1 }))
    const sp = specialAt(track, c, lane)
    if (sp) out.push(fill(BOARD.special[sp.kind], { n: sp.value, s: plural(sp.value) }))
    if (race.tribune?.column === c && race.tribune.lane === lane) out.push(BOARD.tribuneTitle)
    return out
  }

  const cellStyle = (position: number, lane: number, offset = 0) => ({
    left: `calc(${position} * (100% / var(--cells)))`,
    top: `calc(${lanes - 1 - lane} * (100% / var(--lanes)))`,
    transform: `translateY(${offset}px)`,
  })

  return (
    <section className={'board' + (selection ? ' board-selecting' : '')} style={{ ['--cells' as string]: track.totalCells, ['--lanes' as string]: lanes }} aria-label={UI.board.label}>
      <div className="cells cells-head">
        {cols.map((c) => (
          <div key={c} className={cellClass(c, null) + ' head' + (c === track.betThresholdColumn && closed ? ' head-closed' : '')} title={c === track.betThresholdColumn ? (closed ? BOARD.zoneClosedTitle : GLOSSARY.zoneDeFin) : tieColumns.includes(c) ? BOARD.tieColumn : undefined}>
            {c === 0 ? UI.board.start : c === track.betThresholdColumn ? `${Math.round(track.betThresholdRatio * 100)} %${closed ? ` · ${BOARD.zoneClosed}` : ''}` : c === track.columns ? UI.board.finish : c}
          </div>
        ))}
      </div>
      <div className="cells track" style={{ height: `${trackHeight}px` }}>
        {/* Tribune infernale : posée avant la course, elle rapporte et pousse (artefacts.md n°19). */}
        {race.tribune && (
          <div className="tribune" style={cellStyle(race.tribune.column, race.tribune.lane)} title={BOARD.tribuneTitle} aria-label={BOARD.tribune}>
            <img src={cellArt('tribune')} alt="" />
          </div>
        )}
        {rows.map((lane) =>
          cols.map((c) => {
            const tips = cellTips(c, lane)
            return (
            <div key={`${lane}-${c}`} className={cellClass(c, lane)} title={tips.length > 0 ? undefined : tieColumns.includes(c) ? BOARD.tieColumn : undefined}>
              {isBlocked(track, c, lane) && <img className="cell-blocked-mark" src={blockedArt(c, lane)} alt="" aria-hidden="true" />}
              {/* Case spéciale (GDD §2.2) : elle n'agit que sur l'âme qui s'y arrête. */}
              {(() => {
                const sp = specialAt(track, c, lane)
                if (!sp) return null
                // Un type de case pas encore peint se lit à son signe : mieux vaut un glyphe
                // net qu'une image cassée (voir `hasCellArt`).
                return (
                  <span className={`cell-special cell-${sp.kind}`}>
                    {hasCellArt(sp.kind) ? <img src={cellArt(sp.kind)} alt="" /> : <span aria-hidden="true">{BOARD.specialMark[sp.kind]}</span>}
                  </span>
                )
              })()}
              {/* Pose de la tribune : seules les cases permises sont cliquables. */}
              {onPlaceTribune && c > 0 && c < track.betThresholdColumn && !isBlocked(track, c, lane) && (
                <button type="button" className="cell-tribune" onClick={() => onPlaceTribune(c, lane)} aria-label={fill(BOARD.tribunePlace, { column: c })} title={fill(BOARD.tribunePlace, { column: c })} />
              )}
              {/* Pose d'une borne : mêmes cases permises que la tribune, et pas deux effets sur une même case. */}
              {onPlaceMarker && c > 0 && c < track.betThresholdColumn && !isBlocked(track, c, lane) && !specialAt(track, c, lane) && !(race.tribune?.column === c && race.tribune.lane === lane) && (
                <button type="button" className="cell-tribune" data-testid={`place-marker-${c}-${lane}`} onClick={() => onPlaceMarker(c, lane)} aria-label={fill(BOARD.markerPlace, { column: c })} title={fill(BOARD.markerPlace, { column: c })} />
              )}
              {/* Au survol : ce que la case fait. Elle sort vers le haut, sauf sur la ligne du
                  haut où elle sortirait du plateau — `.board` défile en x, donc il coupe en y. */}
              {tips.length > 0 && (
                <span className={'cell-tip' + (lane === lanes - 1 ? ' cell-tip-below' : '')} role="tooltip" data-testid={`cell-tip-${c}-${lane}`}>
                  {tips.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              )}
            </div>
            )
          }),
        )}
        {race.souls.map((soul) => {
          const stack = occupants.get(`${soul.position}:${soul.lane}`) ?? [soul.id]
          const index = stack.indexOf(soul.id)
          // Éventail (spec 08/C7) : survoler un jeton ou sa légende écarte la pile pour que chacun se lise.
          const fanned = stack.length > 1 && highlightSoul !== null && stack.includes(highlightSoul)
          const offset = (index - (stack.length - 1) / 2) * (fanned ? stackGap * 1.7 : stackGap)
          const isActive = activeSoul === soul.id || highlightSoul === soul.id || previewSoul === soul.id
          const isLast = lastResult?.move.soul === soul.id
          const { picked, canPick, why } = pickState(soul.id, soul.position)
          const tokenClass = ['token']
          if (isActive) tokenClass.push('token-active')
          if (isLast && lastResult?.blockedAtStart) tokenClass.push('token-blocked')
          if (swapped === soul.id) tokenClass.push('token-swapped')
          if (jumped.includes(soul.id)) tokenClass.push('token-jumped')
          if (soul.finishOrder !== null) tokenClass.push('token-finished')
          if (picked) tokenClass.push('token-picked')
          if (selection && !canPick) tokenClass.push('token-unpickable')
          if (fanned) tokenClass.push('token-fanned')
          const worn = personalityOf(personalities, soul.id)
          // La personnalité s'ajoute au titre du jeton : c'est la première chose à lire avant
          // de parier, et elle doit s'obtenir sans ouvrir de panneau (GDD §1.3).
          const base = lanes > 1 ? `${soul.name} · couloir ${soul.lane + 1}` : soul.name
          const label = worn ? `${base} — ${personalityName(worn)} : ${personalityEffect(worn)}` : base
          const zoneNote = !selection && isInBetZone(track, soul.position) ? BETS.overThreshold : ''
          const title = selection && why ? `${label} — ${why}` : zoneNote ? `${label} — ${zoneNote}` : label
          // L'enveloppe `.token` couvre toute la case (les jetons empilés se recouvrent) : elle laisse
          // passer les clics, c'est le corps du jeton qui porte le survol, le titre et le bouton.
          const hover = { onMouseEnter: () => onHoverSoul?.(soul.id), onMouseLeave: () => onHoverSoul?.(null) }
          // Marqueur de pari (recommandation §4.3), accroché au corps du jeton — pas à l'enveloppe, qui couvre toute la case.
          const betMark = bettedSouls?.has(soul.id) ? (
            <span className="token-bet" title={BET_LIVE.betted} aria-label={BET_LIVE.betted}>
              ¤
            </span>
          ) : null
          const soulMark = worn ? <PersonalityMark personality={worn} className="token-mark" /> : null
          return (
            <div key={soul.id} className={tokenClass.join(' ')} data-testid={`token-${soul.id}`} data-soul={soul.name} data-cell={soul.position} data-state={picked ? 'picked' : isActive ? 'active' : 'idle'} style={{ ...cellStyle(soul.position, soul.lane, offset), ['--soul' as string]: soulColor(soul.id) }}>
              {selection ? (
                <button type="button" className="token-btn" disabled={!canPick} onClick={() => selection.onToggle(soul.id)} aria-pressed={picked} title={title} {...hover} onFocus={() => onHoverSoul?.(soul.id)} onBlur={() => onHoverSoul?.(null)}>
                  <span className="token-body">
                    {soul.name.slice(0, 2)}
                    {soulMark}
                    {betMark}
                  </span>
                </button>
              ) : (
                <span className="token-body" title={title} {...hover}>
                  {soul.name.slice(0, 2)}
                  {soulMark}
                  {betMark}
                </span>
              )}
              {isLast && lastResult && (
                <span key={`${race.turn}-${lastResult.from}-${lastResult.to}-${lastResult.toLane}`} className={'bubble' + (lastResult.move.source === 'opponent' ? ' bubble-opp' : '')}>
                  {fmtDistance(lastResult.move.distance)}
                  {consequenceGlyphs(lastResult).map((g) => (
                    <span key={g.glyph} title={g.title}>
                      {' '}
                      {g.glyph}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )
        })}
        {preview && previewSoul !== null && (
          <>
            <div className="token token-ghost" data-testid="ghost-token" data-soul={race.souls[previewSoul]?.name} data-cell={preview.to} style={{ ...cellStyle(preview.to, preview.toLane), ['--soul' as string]: soulColor(previewSoul) }} title={fill(RACE.previewTitle, { name: race.souls[previewSoul]?.name ?? '?', dist: fmtDistance(preview.move.distance), to: preview.to })} aria-label={RACE.previewGhost}>
              <span className="token-body">{race.souls[previewSoul]?.name.slice(0, 2)}</span>
              <span className="bubble bubble-ghost">
                {fmtDistance(preview.move.distance)}
                {previewGlyphs.map((g) => (
                  <span key={g.glyph} title={g.title}>
                    {' '}
                    {g.glyph}
                  </span>
                ))}
              </span>
            </div>
            {preview.collision?.kind === 'swap' && (
              <div className="token token-ghost token-ghost-2" style={{ ...cellStyle(preview.collision.otherTo, preview.fromLane), ['--soul' as string]: soulColor(preview.collision.with) }} title={GLOSSARY.echanger}>
                <span className="token-body">{race.souls[preview.collision.with]?.name.slice(0, 2)}</span>
              </div>
            )}
          </>
        )}
      </div>
      <ul className="legend" aria-label={UI.board.souls}>
        {race.souls.map((soul) => {
          const { picked, canPick, why } = pickState(soul.id, soul.position)
          const hot = activeSoul === soul.id || highlightSoul === soul.id || previewSoul === soul.id
          const legendMark = personalityOf(personalities, soul.id)
          const inner = (
            <>
              <span className="lane-dot" style={{ background: soulColor(soul.id) }} />
              <span style={{ color: soulColor(soul.id) }}>{soul.name}</span>
              {legendMark && <PersonalityMark personality={legendMark} className="legend-mark" titled />}
              <span className="lane-pos">
                case {soul.position}
                {lanes > 1 && ` · c${soul.lane + 1}`}
              </span>
            </>
          )
          return (
            <li key={soul.id} className={(hot ? 'legend-active' : '') + (picked ? ' legend-picked' : '')} onMouseEnter={() => onHoverSoul?.(soul.id)} onMouseLeave={() => onHoverSoul?.(null)}>
              {selection ? (
                <button type="button" className="legend-btn" disabled={!canPick} onClick={() => selection.onToggle(soul.id)} aria-pressed={picked} title={why || undefined}>
                  {inner}
                </button>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
