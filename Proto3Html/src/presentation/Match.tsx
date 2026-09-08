/**
 * L'écran de partie : la table, les commandes du joueur, le fil des étapes.
 *
 * C'est ici que vit l'état d'interaction — cartes cochées, dés gardés, mode
 * retournement. Il est volontairement **au-dessus** de la table : les cartes
 * qu'on sélectionne sont celles posées dans la zone du joueur, pas des copies
 * affichées dans un panneau.
 */

import { useMemo, useState } from 'react'
import type { GameConfig } from '../core/config/schema'
import type { Ask } from '../core/rules/asks'
import { HUMAN, yieldsForgePoint } from '../core/rules/run'
import { ActionBar } from './ActionBar'
import { describeStep, PHASE_LABEL } from './labels'
import type { Session } from './session'
import { Table, type RailStage } from './Table'
import { buildView } from './viewModel'

function askKey(ask: Ask | null): string {
  if (!ask) return 'none'
  if (ask.kind === 'turn') return `turn-${ask.context.who}-${ask.context.phase}-${ask.context.throwNo}`
  if (ask.kind === 'mulligan') return `mull-${ask.pass}-${ask.hand.map((c) => c.uid).join('.')}`
  return ask.kind
}

export function Match({ session, cfg, progress }: { session: Session; cfg: GameConfig; progress: number }) {
  const [swap, setSwap] = useState<number[]>([])
  const [keep, setKeep] = useState<boolean[]>([])
  const [flipMode, setFlipMode] = useState(false)
  const [lastAsk, setLastAsk] = useState('none')

  const names = session.names
  const view = useMemo(
    () => buildView(session.queue, session.cursor, names.length || 2),
    // La file est mutée en place : on dépend de sa **longueur**, pas de sa référence.
    [session, session.queue.length, session.cursor, names.length],
  )
  const frame = session.frame(progress)
  const deltas = session.deltas()
  const step = session.step
  const ask = session.ask

  // Chaque nouvelle question repart d'une sélection vierge.
  const key = askKey(ask)
  if (key !== lastAsk) {
    setLastAsk(key)
    setSwap([])
    setKeep([])
    setFlipMode(false)
  }

  const ladderSizes: Record<number, number> = {}
  for (const [size, ladder] of Object.entries(cfg.cards.handRankings)) ladderSizes[Number(size)] = ladder.length

  // Le fil d'Ariane suit l'ordre fixe de la partie (`S1`).
  const rail: RailStage[] = []
  cfg.battleSeries.forEach((series, i) => {
    rail.push({
      key: `duels${i}`,
      label: 'Batailles',
      blocks: series.duels,
      done: view.timeline.duelsDone[i] ?? 0,
    })
    rail.push({ key: series.phase, label: PHASE_LABEL[series.phase], blocks: 0, done: 0 })
  })

  const turnAsk = ask?.kind === 'turn' ? ask.context : null
  const diceCount = turnAsk?.diceCount ?? 0
  const keepMask = keep.length === diceCount ? keep : new Array<boolean>(diceCount).fill(false)

  const actionBar = ask ? (
    <ActionBar
      ask={ask}
      view={view}
      names={names}
      ladderSize={ladderSizes[view.hands[HUMAN]?.length ?? 1] ?? 1}
      swap={swap}
      keep={keepMask}
      flipMode={flipMode}
      setFlipMode={setFlipMode}
      onAnswer={(a) => session.answer(a)}
    />
  ) : null

  return (
    <>
      <Table
        view={view}
        frame={frame}
        deltas={deltas}
        names={names}
        humanIndex={HUMAN}
        ladderSizes={ladderSizes}
        rail={rail}
        actionBar={actionBar}
        forgeAtStake={yieldsForgePoint(session.run)}
        pickable={ask?.kind === 'reward' ? ask.offered : undefined}
        onPick={ask?.kind === 'reward' ? (id) => session.answer({ kind: 'reward', id: id as never }) : undefined}
        cardAction={
          ask?.kind === 'mulligan'
            ? {
                selected: swap,
                onCard: (i) => setSwap((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])),
              }
            : undefined
        }
        diceAction={
          turnAsk && turnAsk.values !== null
            ? flipMode
              ? {
                  mode: 'flip',
                  keep: keepMask,
                  onDie: (i) => {
                    setFlipMode(false)
                    session.answer({ kind: 'turn', action: { type: 'flip', dieIndex: i } })
                  },
                }
              : {
                  mode: 'keep',
                  keep: keepMask,
                  onDie: (i) => setKeep(keepMask.map((x, j) => (j === i ? !x : x))),
                }
            : undefined
        }
      />

      <p className="ticker">
        <span className="ticker__dot" data-playing={!session.idle} />
        {step ? describeStep(step, names) : ask ? 'À vous de jouer' : '…'}
      </p>
    </>
  )
}
