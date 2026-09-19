import { useEffect, useState, type DragEvent } from 'react'
import { config } from '../core/config'
import { bettingClosed } from '../core/rules/bets'
import { isInBetZone, isPairingComplete, type Combination, type MoveResult, type RaceState } from '../core/rules/race'
import { opponentRolls, type Phase, type RaceUi } from './useRace'
import { dieTilt, distDieStyle, fmtDistance, hasDistArt, soulColor, soulDieStyle } from './souls'
import { FaceChip } from './Inventory'
import { BetList } from './BetPanel'
import { GLOSSARY, HUD, RACE, UI, fill } from './texts'
import { dieName } from './messages'

function soulName(race: RaceState, id: number | undefined): string {
  return id === undefined ? '?' : (race.souls[id]?.name ?? `#${id}`)
}

/**
 * Emplacement du haut : la paire de l'adversaire. Hors de son tour (spec 08/C10), une ligne
 * fine ; il reprend sa hauteur quand la paire se révèle et la garde tant qu'elle est affichée.
 */
export function OpponentSlot({ ui }: { ui: RaceUi }) {
  const { phase, opponentRoll, race } = ui
  const pairs = opponentRolls(ui)
  const thin = phase !== 'opponent' && !opponentRoll
  return (
    <section className={'slot slot-opponent' + (thin ? ' slot-opponent-thin' : '')} aria-label={UI.play.opponent} data-state={thin ? 'thin' : 'full'}>
      {/* Le nombre de paires n'est pas fixe : le Fouet, la Pièce à deux faces et certains
          pouvoirs de boss en ajoutent. L'étiquette dit ce qui va réellement tomber ce tour-ci. */}
      <span className="slot-label">
        Adversaire · {pairs} paire{pairs > 1 ? 's' : ''} par tour
      </span>
      <div className="dice-row">
        {phase === 'opponent' && !opponentRoll && (
          <>
            <span className="die die-soul die-rolling die-small" style={{ ['--die-tilt' as string]: dieTilt(7) }}>?</span>
            <span className="die die-dist die-rolling die-small" style={{ ['--die-tilt' as string]: dieTilt(53) }}>?</span>
          </>
        )}
        {opponentRoll && (
          <>
            <span className="die die-soul die-small" style={{ ...soulDieStyle(opponentRoll.soul[0] ?? 0), ['--die-tilt' as string]: dieTilt(7) }}>{soulName(race, opponentRoll.soul[0])}</span>
            <span className={'die die-dist die-small' + ((opponentRoll.distance[0] ?? 0) < 0 ? ' die-neg' : '')} style={{ ['--die-tilt' as string]: dieTilt(53) }}>{fmtDistance(opponentRoll.distance[0] ?? 0)}</span>
          </>
        )}
        {thin && <span className="slot-empty slot-empty-thin" />}
      </div>
    </section>
  )
}

/** Frise de sous-phases (spec 05/C3) : quelle pastille s'allume pour chaque phase de l'écran. */
const PHASE_STEP: Record<Phase, number | null> = { prep: 0, idle: 1, rolling: 1, pairing: 2, resolving: 3, opponent: 4, finished: null }

/** Frise `préparer · lancer · ordonner · résoudre · adversaire`, en tête de la zone basse, toujours visible. */
export function PhaseStrip({ phase }: { phase: Phase }) {
  const step = PHASE_STEP[phase]
  return (
    <ol className="subphases" aria-label={RACE.phasesLabel} data-testid="phase-strip" data-state={step === null ? 'none' : RACE.phases[step]}>
      {RACE.phases.map((label, i) => (
        <li key={label} className={'subphase' + (step === i ? ' subphase-on' : '') + (step !== null && i < step ? ' subphase-done' : '')} aria-current={step === i ? 'step' : undefined}>
          {label}
        </li>
      ))}
    </ol>
  )
}

interface PlayerProps {
  ui: RaceUi
  speed: number
  /** Prochain déplacement prévisualisé (première carte de la file). */
  preview: MoveResult | null
  highlightSoul: number | null
  onHoverSoul: (id: number | null) => void
  onStart: () => void
  onRoll: () => void
  onPickSoul: (i: number) => void
  onPickDistance: (i: number) => void
  /** Fiole de sang : +1 sur ce dé, une fois par tour. Absent si le joueur ne l'a pas. */
  onFiole?: (i: number) => void
  /** Face d'élan : relancer ce dé et ajouter le résultat. */
  onMomentum?: (i: number) => void
  /** Verrou de Minos : garder ce dé sur sa face pour le prochain lancer (null = lever le verrou). */
  onLock?: (i: number | null) => void
  /** Boule de Cocyte : relancer les cinq dés, une fois par course. Absent si le joueur ne l'a pas. */
  onOrb?: () => void
  /** Face de fusion : verser la distance de la face sur l'âme de ce dé Âme déjà associé. */
  onFuse?: (soulDie: number) => void
  /** Crochet de Charon : ramener une âme de la zone de fin sous le seuil, une fois par course. */
  onHook?: (soul: number) => void
  /** Écho du Styx : marquer la combinaison de cette âme pour qu'elle soit rejouée. */
  onStyx?: (soul: number) => void
  onReset: () => void
  onResolve: () => void
  /** Glisser-déposer : dé Âme déposé sur un dé Distance. */
  onPairDice: (soulDie: number, distanceDie: number) => void
  /** Cartes fusionnées (spec 08/C3) : retirer toutes les combinaisons d'une carte ; réordonner la file entière. */
  onRemoveCombinations: (indices: readonly number[]) => void
  onSetCombinations: (next: readonly Combination[]) => void
}

/** Ce qu'on est en train de glisser (glisser-déposer natif du navigateur, aucune bibliothèque). */
type Drag = { kind: 'soul'; index: number } | { kind: 'combo'; index: number } | null

const DRAG_MIME = 'application/x-sinnersbet'
function readDrag(e: DragEvent): Drag {
  const raw = e.dataTransfer.getData(DRAG_MIME)
  const m = /^(soul|combo):(\d+)$/.exec(raw)
  return m ? { kind: m[1] as 'soul' | 'combo', index: Number(m[2]) } : null
}

/** Une carte de la file : toutes les combinaisons qui visent la même âme, dans l'ordre de la première (spec 08/C3). */
interface Card {
  soul: number | undefined
  /** Indices dans `combinations`. */
  indices: number[]
  parts: number[]
  total: number
}

export function cardsOf(roll: RaceUi['roll'], combinations: readonly Combination[]): Card[] {
  if (!roll) return []
  const cards: Card[] = []
  combinations.forEach((c, k) => {
    const soul = roll.soul[c.soulDie]
    const d = roll.distance[c.distanceDie] ?? 0
    const card = cards.find((x) => x.soul === soul)
    if (card) {
      card.indices.push(k)
      card.parts.push(d)
      card.total += d
    } else cards.push({ soul, indices: [k], parts: [d], total: d })
  })
  return cards
}

/** Emplacement du bas : les dés du joueur, l'association et les boutons d'action. */
export function PlayerSlot({ ui, speed, preview, highlightSoul, onHoverSoul, onStart, onRoll, onPickSoul, onPickDistance, onFiole, onMomentum, onLock, onOrb, onFuse, onHook, onStyx, onReset, onResolve, onPairDice, onRemoveCombinations, onSetCombinations }: PlayerProps) {
  const { phase, roll, race, combinations, selectedSoulDie, resolvingIndex } = ui
  const pairing = phase === 'pairing'
  const rolling = phase === 'rolling'
  const prep = phase === 'prep'
  const complete = roll !== null && isPairingComplete(roll, combinations)
  const cards = cardsOf(roll, combinations)
  const cardOf = (k: number): number => cards.findIndex((c) => c.indices.includes(k))
  const orderOfSoul = (i: number): number => cardOf(combinations.findIndex((c) => c.soulDie === i))
  const orderOfDist = (i: number): number => cardOf(combinations.findIndex((c) => c.distanceDie === i))
  const soulCount = roll?.soul.length ?? config.dice.soulDice
  const distCount = roll?.distance.length ?? ui.inventory.dice.length
  const unused = soulCount - distCount
  // Face de fusion : proposable seulement quand elle est associée et qu'il reste une autre
  // combinaison à absorber — sinon le bouton parlerait d'un geste impossible.
  const fusionPaired = roll !== null && combinations.some((c) => roll.faces[c.distanceDie]?.effect === 'fusion')
  const canFuse = pairing && fusionPaired && combinations.length > 1
  // Crochet de Charon : les âmes déjà en zone de fin, les seules qu'il peut rappeler.
  const hookable = onHook && !ui.hookUsed ? race.souls.filter((so) => isInBetZone(race.track, so.position)) : []

  // Bouton qui pulse (spec 05/C5) : appariement complet et aucune interaction pendant idlePulseMs.
  const [pulse, setPulse] = useState(false)
  const [interaction, setInteraction] = useState(0)
  useEffect(() => {
    setPulse(false)
    if (!pairing || !complete) return
    const t = setTimeout(() => setPulse(true), config.animation.idlePulseMs / speed)
    return () => clearTimeout(t)
  }, [pairing, complete, combinations, interaction, speed])
  const touch = (): void => setInteraction((n) => n + 1)

  // Réordonner la file par cartes : la file de combinaisons est reconstruite dans le nouvel ordre des cartes.
  const reorder = (from: number, to: number): void => {
    if (from === to || !cards[from] || !cards[to]) return
    const next = [...cards]
    const [card] = next.splice(from, 1)
    next.splice(to, 0, card!)
    onSetCombinations(next.flatMap((c) => c.indices.map((k) => combinations[k]!)))
  }

  // Glisser-déposer (recommandation §7.2) : associer = glisser un dé Âme sur un dé Distance,
  // ordonner = glisser une carte dans la file. Le clic-clic et les flèches restent l'alternative.
  const [drag, setDrag] = useState<Drag>(null)
  const [over, setOver] = useState<string | null>(null)
  const startDrag = (d: Exclude<Drag, null>) => (e: DragEvent): void => {
    e.dataTransfer.setData(DRAG_MIME, `${d.kind}:${d.index}`)
    e.dataTransfer.effectAllowed = 'move'
    setDrag(d)
    touch()
  }
  const endDrag = (): void => {
    setDrag(null)
    setOver(null)
  }
  const allowDrop = (accept: 'soul' | 'combo', key: string) => (e: DragEvent): void => {
    const d = drag ?? readDrag(e)
    if (!d || d.kind !== accept) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (over !== key) setOver(key)
  }
  const dropOnDist = (distanceDie: number) => (e: DragEvent): void => {
    e.preventDefault()
    const d = drag ?? readDrag(e)
    if (d?.kind === 'soul') onPairDice(d.index, distanceDie)
    endDrag()
  }
  const dropOnCard = (to: number) => (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const d = drag ?? readDrag(e)
    if (d?.kind === 'combo') reorder(d.index, to)
    endDrag()
  }

  const hint = (): string => {
    switch (phase) {
      case 'prep':
        return ui.bets.length === 0 ? UI.play.prepNoBet : UI.play.betsDone
      case 'idle':
        return fill(UI.play.idle, { n: race.turn, lastCall: bettingClosed(race) ? '' : UI.play.idleLastCall })
      case 'rolling':
        return UI.play.rolling
      case 'pairing':
        if (complete) return UI.play.ordered
        if (selectedSoulDie !== null) return UI.play.pickDistance
        return fill(UI.play.pairing, { n: combinations.length, total: distCount, unused: unused === 0 ? '' : unused === 1 ? UI.play.unusedOne : fill(UI.play.unusedMany, { n: unused }) })
      case 'resolving':
        return UI.play.resolving
      case 'opponent':
        return UI.play.opponentTurn
      case 'finished':
        return UI.play.finished
    }
    return ''
  }

  // Préparation : pas de dés à montrer, le panneau de paris occupe cet espace (spec 08/C2). Version courte.
  if (prep) {
    return (
      <section className="slot slot-player slot-player-prep" aria-label={UI.play.player}>
        <p className="hint">{hint()}</p>
        <div className="actions">
          {/* Même bouton que dans le pied du panneau de paris (`.bp-start`) : corne, halo et
              états sont partagés, replié ou déplié le lancement a la même tête. */}
          <button type="button" className="btn bp-start" disabled={ui.bets.length === 0} onClick={onStart} title={ui.bets.length === 0 ? UI.bets.noBetYet : undefined}>
            <span className="bp-start-glow" aria-hidden="true" />
            <span className="bp-start-art" aria-hidden="true" />
            <span className="bp-start-label">{HUD.toRace}</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="slot slot-player" aria-label={UI.play.player} onPointerDown={touch} onKeyDown={touch}>
      <p className="hint">{hint()}</p>
      <div className="slot-body">
        <div className="slot-dice">
          <div className="dice-group">
            <h3>{UI.play.soulDice}</h3>
            <div className="dice-row">
              {Array.from({ length: soulCount }, (_, i) => {
                const id = roll?.soul[i]
                const order = orderOfSoul(i)
                const cls = ['die', 'die-soul']
                if (rolling) cls.push('die-rolling')
                if (selectedSoulDie === i) cls.push('die-selected')
                if (order >= 0) cls.push('die-paired')
                if (complete && order < 0) cls.push('die-unused')
                if (phase === 'resolving' && resolvingIndex !== null && combinations[resolvingIndex]?.soulDie === i) cls.push('die-resolving')
                if (id !== undefined && highlightSoul === id && !rolling) cls.push('die-hot')
                const hover = (on: boolean): void => onHoverSoul(on && id !== undefined && !rolling ? id : null)
                const button = (
                  <button
                    type="button"
                    className={cls.join(' ')}
                    data-testid={`die-soul-${i}`}
                    disabled={!pairing || order >= 0}
                    draggable={pairing && order < 0}
                    onDragStart={startDrag({ kind: 'soul', index: i })}
                    onDragEnd={endDrag}
                    title={pairing && order < 0 ? RACE.dragSoul : undefined}
                    onClick={() => onPickSoul(i)}
                    onMouseEnter={() => hover(true)}
                    onMouseLeave={() => hover(false)}
                    onFocus={() => hover(true)}
                    onBlur={() => hover(false)}
                    style={{ ...(id !== undefined && !rolling ? soulDieStyle(id) : {}), ['--die-tilt' as string]: dieTilt(i) }}
                  >
                    {rolling || id === undefined ? '?' : soulName(race, id)}
                    {order >= 0 && <span className="die-order">{order + 1}</span>}
                  </button>
                )
                // Face de fusion : le bouton se pose sous le dé Âme qui ACCUEILLE la distance,
                // c'est-à-dire un dé déjà associé à une autre combinaison que celle de la face.
                const fusable =
                  canFuse &&
                  onFuse !== undefined &&
                  order >= 0 &&
                  combinations.some((c) => c.soulDie === i && roll?.faces[c.distanceDie]?.effect !== 'fusion')
                return (
                  <span key={i} className="die-wrap">
                    {button}
                    {fusable && (
                      <span className="die-tools">
                        <button type="button" className="die-tool" onClick={() => onFuse(i)} title={RACE.fuseTitle}>
                          {RACE.fuse}
                        </button>
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="dice-group">
            <h3>{UI.play.distanceDice}</h3>
            <div className="dice-row">
              {Array.from({ length: distCount }, (_, i) => {
                const d = roll?.distance[i]
                const face = roll?.faces[i]
                const die = ui.inventory.dice[i]
                const order = orderOfDist(i)
                const cls = ['die', 'die-dist']
                if (rolling) cls.push('die-rolling')
                if (order >= 0) cls.push('die-paired')
                if (d !== undefined && d < 0) cls.push('die-neg')
                if (pairing && (selectedSoulDie !== null || drag?.kind === 'soul') && order < 0) cls.push('die-target')
                if (over === `dist-${i}`) cls.push('die-drop')
                if (phase === 'resolving' && resolvingIndex !== null && combinations[resolvingIndex]?.distanceDie === i) cls.push('die-resolving')
                if (face?.altered) cls.push('die-forged')
                if (hasDistArt(die?.kind)) cls.push('die-dist-art')
                return (
                  <span key={i} className="die-wrap">
                    <button
                      type="button"
                      className={cls.join(' ')}
                      data-testid={`die-dist-${i}`}
                      style={{ ...distDieStyle(die?.kind), ['--die-tilt' as string]: dieTilt(i + 50) }}
                      disabled={!pairing || selectedSoulDie === null || order >= 0}
                      onClick={() => onPickDistance(i)}
                      title={drag?.kind === 'soul' && order < 0 ? RACE.dropHere : die ? dieName(die.kind) : undefined}
                      onDragOver={pairing && order < 0 ? allowDrop('soul', `dist-${i}`) : undefined}
                      onDragLeave={() => over === `dist-${i}` && setOver(null)}
                      onDrop={pairing && order < 0 ? dropOnDist(i) : undefined}
                    >
                      {rolling || d === undefined ? '?' : fmtDistance(d)}
                      {face?.effect === 'gold' && <span className="die-effect">✦</span>}
                      {face?.effect === 'betSeal' && <span className="die-effect">♠</span>}
                      {order >= 0 && <span className="die-order">{order + 1}</span>}
                      {ui.lockedDie === i && <span className="die-lock" aria-hidden="true">⚿</span>}
                    </button>
                    {/* Objets qui se déclenchent sur un dé précis, avant de l'associer (artefacts.md, forge.md). */}
                    {pairing && order < 0 && (onFiole || onMomentum || onLock) && (
                      <span className="die-tools">
                        {onFiole && ui.fioleTurn !== race.turn && (
                          <button type="button" className="die-tool" onClick={() => onFiole(i)} title={RACE.fioleTitle}>
                            {RACE.fiole}
                          </button>
                        )}
                        {onMomentum && face?.effect === 'momentum' && !ui.momentumUsed.includes(i) && (
                          <button type="button" className="die-tool" onClick={() => onMomentum(i)} title={RACE.momentumTitle}>
                            {RACE.momentum}
                          </button>
                        )}
                        {onLock && (
                          <button type="button" className={'die-tool' + (ui.lockedDie === i ? ' die-tool-on' : '')} onClick={() => onLock(ui.lockedDie === i ? null : i)} title={RACE.lockTitle}>
                            {RACE.lock}
                          </button>
                        )}
                      </span>
                    )}
                    {die && die.kind !== 'base' && <span className="die-name">{dieName(die.kind)}</span>}
                    {die && die.kind === 'base' && die.faces.some((f) => f.altered) && (
                      <span className="die-name">
                        {die.faces.filter((f) => f.altered).map((f, k) => <FaceChip key={k} face={f} dim />)}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          {roll && cards.length > 0 && (
            <ol className={'combos' + (pairing ? ' combos-queue' : '')} aria-label={RACE.queue} title={GLOSSARY.combinaison}>
              {cards.map((card, i) => {
                const id = card.soul
                const previewed = pairing && preview !== null && i === 0
                const active = resolvingIndex !== null && card.indices.includes(resolvingIndex)
                const cls = ['combo']
                if (active) cls.push('combo-active')
                if (previewed) cls.push('combo-preview')
                if (id !== undefined && highlightSoul === id) cls.push('combo-hot')
                if (drag?.kind === 'combo' && drag.index === i) cls.push('combo-dragging')
                if (over === `combo-${i}`) cls.push('combo-drop')
                const title = pairing ? (i > 0 ? `${RACE.afterPrevious} ${RACE.dragCard}` : RACE.dragCard) : undefined
                return (
                  <li
                    key={card.indices.map((k) => `${combinations[k]!.soulDie}-${combinations[k]!.distanceDie}`).join('|')}
                    className={cls.join(' ')}
                    data-testid={`combo-${i}`}
                    data-parts={card.parts.length}
                    title={title}
                    draggable={pairing}
                    onDragStart={startDrag({ kind: 'combo', index: i })}
                    onDragEnd={endDrag}
                    onDragOver={pairing ? allowDrop('combo', `combo-${i}`) : undefined}
                    onDragLeave={() => over === `combo-${i}` && setOver(null)}
                    onDrop={pairing ? dropOnCard(i) : undefined}
                    onMouseEnter={() => onHoverSoul(id ?? null)}
                    onMouseLeave={() => onHoverSoul(null)}
                  >
                    <span className="combo-n">{i + 1}</span>
                    <span className="combo-soul" style={{ color: id !== undefined ? soulColor(id) : undefined }}>{soulName(race, id)}</span>
                    <span className="combo-dist">{fmtDistance(card.total)}</span>
                    {card.parts.length > 1 && (
                      <span className="combo-parts" title={GLOSSARY.combinaison} aria-label={fill(UI.play.cumul, { n: card.parts.length })}>
                        {card.parts.map((p, k) => (
                          <span key={k} className={'face face-dim' + (p < 0 ? ' face-neg' : '')}>
                            {fmtDistance(p)}
                          </span>
                        ))}
                      </span>
                    )}
                    {previewed && <span className="combo-note combo-note-preview">{RACE.previewGhost}</span>}
                    {pairing && (
                      <span className="combo-ctl">
                        <button type="button" className="combo-btn" disabled={i === 0} onClick={() => reorder(i, i - 1)} aria-label={RACE.moveUp} title={RACE.moveUp}>
                          ←
                        </button>
                        <button type="button" className="combo-btn" disabled={i === cards.length - 1} onClick={() => reorder(i, i + 1)} aria-label={RACE.moveDown} title={RACE.moveDown}>
                          →
                        </button>
                        {/* Écho du Styx : la carte marquée sera rejouée juste après s'être résolue. */}
                        {onStyx && !ui.styxUsed && id !== undefined && (
                          <button
                            type="button"
                            className={'combo-btn' + (ui.styxSoul === id ? ' combo-btn-on' : '')}
                            data-testid={`styx-${i}`}
                            aria-pressed={ui.styxSoul === id}
                            onClick={() => onStyx(id)}
                            aria-label={RACE.styxTitle}
                            title={RACE.styxTitle}
                          >
                            {RACE.styx}
                          </button>
                        )}
                        <button type="button" className="combo-btn combo-btn-x" onClick={() => onRemoveCombinations(card.indices)} aria-label={RACE.remove} title={RACE.removeTitle}>
                          ×
                        </button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <aside className="slot-bets" aria-label={UI.bets.placed}>
          <h3>{fill(UI.play.placedCount, { n: ui.bets.length })}</h3>
          <BetList race={race} bets={ui.bets} compact live />
        </aside>
      </div>
      <div className="actions">
        {phase === 'idle' && (
          <button type="button" className="btn btn-primary bp-roll" onClick={onRoll} title={fill(HUD.tabShortcut, { key: RACE.rollKey })}>
            <span className="bp-roll-art" aria-hidden="true" />
            <span className="bp-roll-label">
              {UI.play.roll} <span className="key-hint" aria-hidden="true">{RACE.rollKey}</span>
            </span>
          </button>
        )}
        {pairing && (
          <>
            <button type="button" className={'btn btn-primary' + (pulse ? ' btn-pulse' : '')} data-state={pulse ? 'pulse' : 'idle'} disabled={!complete} onClick={onResolve}>{UI.play.resolve}</button>
            <button type="button" className="btn" disabled={combinations.length === 0} onClick={onReset}>{UI.play.reset}</button>
            {/* Boule de Cocyte : tout relancer, une fois par course, avant d'associer quoi que ce soit. */}
            {onOrb && !ui.cocytusUsed && (
              <button type="button" className="btn" data-testid="orb" disabled={combinations.length > 0} onClick={onOrb} title={combinations.length > 0 ? RACE.orbPairedTitle : RACE.orbTitle}>
                {RACE.orb}
              </button>
            )}
          </>
        )}
        {/* Crochet de Charon : une âme de la zone de fin par bouton, une seule sera rappelée. */}
        {onHook && hookable.length > 0 && (phase === 'idle' || pairing) && (
          <span className="hook-tools" aria-label={RACE.hookTitle}>
            <span className="hook-label">{RACE.hook}</span>
            {hookable.map((so) => (
              <button key={so.id} type="button" className="btn btn-small" data-testid={`hook-${so.id}`} onClick={() => onHook(so.id)} title={RACE.hookTitle} style={{ color: soulColor(so.id) }}>
                {so.name}
              </button>
            ))}
          </span>
        )}
      </div>
    </section>
  )
}
