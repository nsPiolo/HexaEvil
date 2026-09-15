import { useEffect, useState } from 'react'
import { config } from '../core/config'
import { bettingClosed } from '../core/rules/bets'
import { isPairingComplete, type MoveResult, type RaceState } from '../core/rules/race'
import type { Phase, RaceUi } from './useRace'
import { fmtDistance, soulColor } from './souls'
import { FaceChip } from './Inventory'
import { BetList } from './BetPanel'
import { GLOSSARY, HUD, RACE } from './texts'

function soulName(race: RaceState, id: number | undefined): string {
  return id === undefined ? '?' : (race.souls[id]?.name ?? `#${id}`)
}

/** Emplacement du haut : la paire de l'adversaire. */
export function OpponentSlot({ ui }: { ui: RaceUi }) {
  const { phase, opponentRoll, race } = ui
  return (
    <section className="slot slot-opponent" aria-label="Adversaire">
      <span className="slot-label">Adversaire · {config.opponent.rollsPerTurn} paire{config.opponent.rollsPerTurn > 1 ? 's' : ''} par tour</span>
      <div className="dice-row">
        {phase === 'opponent' && !opponentRoll && (
          <>
            <span className="die die-soul die-rolling die-small">?</span>
            <span className="die die-dist die-rolling die-small">?</span>
          </>
        )}
        {opponentRoll && (
          <>
            <span className="die die-soul die-small" style={{ ['--soul' as string]: soulColor(opponentRoll.soul[0] ?? 0) }}>{soulName(race, opponentRoll.soul[0])}</span>
            <span className={'die die-dist die-small' + ((opponentRoll.distance[0] ?? 0) < 0 ? ' die-neg' : '')}>{fmtDistance(opponentRoll.distance[0] ?? 0)}</span>
          </>
        )}
        {phase !== 'opponent' && !opponentRoll && <span className="slot-empty" />}
      </div>
    </section>
  )
}

/** Frise de sous-phases (spec 05/C3) : quelle pastille s'allume pour chaque phase de l'écran. */
const PHASE_STEP: Record<Phase, number | null> = { prep: 0, idle: 1, rolling: 1, pairing: 2, resolving: 3, opponent: 4, finished: null }

interface PlayerProps {
  ui: RaceUi
  speed: number
  /** Prochain déplacement prévisualisé (première combinaison de la file). */
  preview: MoveResult | null
  highlightSoul: number | null
  onHoverSoul: (id: number | null) => void
  onStart: () => void
  onRoll: () => void
  onPickSoul: (i: number) => void
  onPickDistance: (i: number) => void
  onReset: () => void
  onResolve: () => void
  onRemoveCombination: (i: number) => void
  onMoveCombination: (i: number, dir: -1 | 1) => void
}

/** Emplacement du bas : les dés du joueur, l'association et les boutons d'action. */
export function PlayerSlot({ ui, speed, preview, highlightSoul, onHoverSoul, onStart, onRoll, onPickSoul, onPickDistance, onReset, onResolve, onRemoveCombination, onMoveCombination }: PlayerProps) {
  const { phase, roll, race, combinations, selectedSoulDie, resolvingIndex } = ui
  const pairing = phase === 'pairing'
  const rolling = phase === 'rolling'
  const complete = roll !== null && isPairingComplete(roll, combinations)
  const orderOfSoul = (i: number): number => combinations.findIndex((c) => c.soulDie === i)
  const orderOfDist = (i: number): number => combinations.findIndex((c) => c.distanceDie === i)
  const soulCount = roll?.soul.length ?? config.dice.soulDice
  const distCount = roll?.distance.length ?? ui.inventory.dice.length
  const unused = soulCount - distCount
  const step = PHASE_STEP[phase]

  // Bouton qui pulse (spec 05/C5) : appariement complet et aucune interaction pendant idlePulseMs.
  // Toute interaction dans l'emplacement (clic, clavier) ou tout changement de la file réarme le délai.
  const [pulse, setPulse] = useState(false)
  const [interaction, setInteraction] = useState(0)
  useEffect(() => {
    setPulse(false)
    if (!pairing || !complete) return
    const t = setTimeout(() => setPulse(true), config.animation.idlePulseMs / speed)
    return () => clearTimeout(t)
  }, [pairing, complete, combinations, interaction, speed])
  const touch = (): void => setInteraction((n) => n + 1)

  const hint = (): string => {
    switch (phase) {
      case 'prep':
        return ui.bets.length === 0 ? 'Posez au moins un pari initial pour ouvrir la boutique et lancer la course.' : 'Paris posés. Passez par la boutique si vous voulez, puis lancez la course.'
      case 'idle':
        return `Tour ${race.turn} — lancez les dés.${bettingClosed(race) ? '' : ' Dernier moment pour parier ce tour.'}`
      case 'rolling':
        return 'Les dés roulent…'
      case 'pairing':
        if (complete) return 'Ordre fixé. Résolvez, ou réordonnez la file (← → ×) avant.'
        if (selectedSoulDie !== null) return 'Choisissez maintenant un dé Distance à lui associer.'
        return `Cliquez un dé Âme, puis un dé Distance. L'ordre des associations est l'ordre de résolution (${combinations.length}/${distCount})${unused > 0 ? ` — ${unused} dé Âme rester${unused > 1 ? 'ont' : 'a'} inutilisé${unused > 1 ? 's' : ''}` : ''}.`
      case 'resolving':
        return 'Résolution de vos combinaisons…'
      case 'opponent':
        return "Tour de l'adversaire…"
      case 'finished':
        return 'Course terminée.'
    }
    return ''
  }

  return (
    <section className="slot slot-player" aria-label="Joueur" onPointerDown={touch} onKeyDown={touch}>
      <ol className="subphases" aria-label={RACE.phasesLabel} data-testid="phase-strip" data-state={step === null ? 'none' : RACE.phases[step]}>
        {RACE.phases.map((label, i) => (
          <li key={label} className={'subphase' + (step === i ? ' subphase-on' : '') + (step !== null && i < step ? ' subphase-done' : '')} aria-current={step === i ? 'step' : undefined}>
            {label}
          </li>
        ))}
      </ol>
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
                    onClick={() => onPickSoul(i)}
                    onMouseEnter={() => hover(true)}
                    onMouseLeave={() => hover(false)}
                    onFocus={() => hover(true)}
                    onBlur={() => hover(false)}
                    style={id !== undefined && !rolling ? { ['--soul' as string]: soulColor(id) } : undefined}
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
                if (pairing && selectedSoulDie !== null && order < 0) cls.push('die-target')
                if (phase === 'resolving' && resolvingIndex !== null && combinations[resolvingIndex]?.distanceDie === i) cls.push('die-resolving')
                if (face?.altered) cls.push('die-forged')
                return (
                  <span key={i} className="die-wrap">
                    <button type="button" className={cls.join(' ')} data-testid={`die-dist-${i}`} disabled={!pairing || selectedSoulDie === null || order >= 0} onClick={() => onPickDistance(i)} title={die?.name}>
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
          {roll && combinations.length > 0 && (
            <ol className={'combos' + (pairing ? ' combos-queue' : '')} aria-label={RACE.queue} title={GLOSSARY.combinaison}>
              {combinations.map((c, i) => {
                const id = roll.soul[c.soulDie]
                const d = roll.distance[c.distanceDie]
                const dup = combinations.findIndex((o) => roll.soul[o.soulDie] === id) !== i
                const previewed = pairing && preview !== null && i === 0
                const cls = ['combo']
                if (resolvingIndex === i) cls.push('combo-active')
                if (dup) cls.push('combo-dup')
                if (previewed) cls.push('combo-preview')
                if (id !== undefined && highlightSoul === id) cls.push('combo-hot')
                return (
                  <li key={`${c.soulDie}-${c.distanceDie}`} className={cls.join(' ')} data-testid={`combo-${i}`} title={pairing && i > 0 ? RACE.afterPrevious : undefined} onMouseEnter={() => onHoverSoul(id ?? null)} onMouseLeave={() => onHoverSoul(null)}>
                    <span className="combo-n">{i + 1}</span>
                    <span className="combo-soul" style={{ color: id !== undefined ? soulColor(id) : undefined }}>{soulName(race, id)}</span>
                    <span className="combo-dist">{d !== undefined ? fmtDistance(d) : '?'}</span>
                    {dup && <span className="combo-note">cumulé avec la précédente</span>}
                    {previewed && <span className="combo-note combo-note-preview">{RACE.previewGhost}</span>}
                    {pairing && (
                      <span className="combo-ctl">
                        <button type="button" className="combo-btn" disabled={i === 0} onClick={() => onMoveCombination(i, -1)} aria-label={RACE.moveUp} title={RACE.moveUp}>
                          ←
                        </button>
                        <button type="button" className="combo-btn" disabled={i === combinations.length - 1} onClick={() => onMoveCombination(i, 1)} aria-label={RACE.moveDown} title={RACE.moveDown}>
                          →
                        </button>
                        <button type="button" className="combo-btn combo-btn-x" onClick={() => onRemoveCombination(i)} aria-label={RACE.remove} title={RACE.removeTitle}>
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
          <BetList race={race} bets={ui.bets} compact />
        </aside>
      </div>
      <div className="actions">
        {phase === 'prep' && (
          <button type="button" className="btn btn-primary" disabled={ui.bets.length === 0} onClick={onStart} title={ui.bets.length === 0 ? 'Il faut au moins un pari initial' : undefined}>
            {HUD.toRace}
          </button>
        )}
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
