import { useEffect, useState, type DragEvent } from 'react'
import { config } from '../core/config'
import { bettingClosed } from '../core/rules/bets'
import { isPairingComplete, type Combination, type MoveResult, type RaceState } from '../core/rules/race'
import type { Phase, RaceUi } from './useRace'
import { dieTilt, fmtDistance, soulColor, soulDieStyle } from './souls'
import { FaceChip } from './Inventory'
import { BetList } from './BetPanel'
import { GLOSSARY, HUD, RACE } from './texts'

function soulName(race: RaceState, id: number | undefined): string {
  return id === undefined ? '?' : (race.souls[id]?.name ?? `#${id}`)
}

/**
 * Emplacement du haut : la paire de l'adversaire. Hors de son tour (spec 08/C10), une ligne
 * fine ; il reprend sa hauteur quand la paire se révèle et la garde tant qu'elle est affichée.
 */
export function OpponentSlot({ ui }: { ui: RaceUi }) {
  const { phase, opponentRoll, race } = ui
  const thin = phase !== 'opponent' && !opponentRoll
  return (
    <section className={'slot slot-opponent' + (thin ? ' slot-opponent-thin' : '')} aria-label="Adversaire" data-state={thin ? 'thin' : 'full'}>
      <span className="slot-label">Adversaire · {config.opponent.rollsPerTurn} paire{config.opponent.rollsPerTurn > 1 ? 's' : ''} par tour</span>
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
export function PlayerSlot({ ui, speed, preview, highlightSoul, onHoverSoul, onStart, onRoll, onPickSoul, onPickDistance, onReset, onResolve, onPairDice, onRemoveCombinations, onSetCombinations }: PlayerProps) {
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
        return ui.bets.length === 0 ? 'Posez au moins un pari initial pour ouvrir la boutique et lancer la course.' : 'Paris posés. Passez par la boutique si vous voulez, puis lancez la course.'
      case 'idle':
        return `Tour ${race.turn} — lancez les dés.${bettingClosed(race) ? '' : ' Dernier moment pour parier ce tour.'}`
      case 'rolling':
        return 'Les dés roulent…'
      case 'pairing':
        if (complete) return 'Ordre fixé. Résolvez, ou réordonnez la file (glisser, ← → ×) avant.'
        if (selectedSoulDie !== null) return 'Choisissez maintenant un dé Distance à lui associer.'
        return `Glissez (ou cliquez) un dé Âme sur un dé Distance. L'ordre des cartes est l'ordre de résolution (${combinations.length}/${distCount})${unused > 0 ? ` — ${unused} dé Âme rester${unused > 1 ? 'ont' : 'a'} inutilisé${unused > 1 ? 's' : ''}` : ''}.`
      case 'resolving':
        return 'Résolution de vos combinaisons…'
      case 'opponent':
        return "Tour de l'adversaire…"
      case 'finished':
        return 'Course terminée.'
    }
    return ''
  }

  // Préparation : pas de dés à montrer, le panneau de paris occupe cet espace (spec 08/C2). Version courte.
  if (prep) {
    return (
      <section className="slot slot-player slot-player-prep" aria-label="Joueur">
        <p className="hint">{hint()}</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={ui.bets.length === 0} onClick={onStart} title={ui.bets.length === 0 ? 'Il faut au moins un pari initial' : undefined}>
            {HUD.toRace}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="slot slot-player" aria-label="Joueur" onPointerDown={touch} onKeyDown={touch}>
      <p className="hint">{hint()}</p>
      <div className="slot-body">
        <div className="slot-dice">
          <div className="dice-group">
            <h3>Dés Âme</h3>
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
                return (
                  <button
                    key={i}
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
              })}
            </div>
          </div>
          <div className="dice-group">
            <h3>Dés Distance</h3>
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
                return (
                  <span key={i} className="die-wrap">
                    <button
                      type="button"
                      className={cls.join(' ')}
                      data-testid={`die-dist-${i}`}
                      style={{ ['--die-tilt' as string]: dieTilt(i + 50) }}
                      disabled={!pairing || selectedSoulDie === null || order >= 0}
                      onClick={() => onPickDistance(i)}
                      title={drag?.kind === 'soul' && order < 0 ? RACE.dropHere : die?.name}
                      onDragOver={pairing && order < 0 ? allowDrop('soul', `dist-${i}`) : undefined}
                      onDragLeave={() => over === `dist-${i}` && setOver(null)}
                      onDrop={pairing && order < 0 ? dropOnDist(i) : undefined}
                    >
                      {rolling || d === undefined ? '?' : fmtDistance(d)}
                      {face?.effect === 'gold' && <span className="die-effect">✦</span>}
                      {face?.effect === 'betSeal' && <span className="die-effect">♠</span>}
                      {order >= 0 && <span className="die-order">{order + 1}</span>}
                    </button>
                    {die && die.kind !== 'base' && <span className="die-name">{die.name}</span>}
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
                      <span className="combo-parts" title={GLOSSARY.combinaison} aria-label={`cumul de ${card.parts.length} dés`}>
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
        <aside className="slot-bets" aria-label="Paris posés">
          <h3>Paris posés ({ui.bets.length})</h3>
          <BetList race={race} bets={ui.bets} compact live />
        </aside>
      </div>
      <div className="actions">
        {phase === 'idle' && <button type="button" className="btn btn-primary" onClick={onRoll}>Lancer les dés</button>}
        {pairing && (
          <>
            <button type="button" className={'btn btn-primary' + (pulse ? ' btn-pulse' : '')} data-state={pulse ? 'pulse' : 'idle'} disabled={!complete} onClick={onResolve}>Résoudre</button>
            <button type="button" className="btn" disabled={combinations.length === 0} onClick={onReset}>Réinitialiser</button>
          </>
        )}
      </div>
    </section>
  )
}
