/** Assemblage : bandeau de run, table, bandeau d'étape, décisions (`U1`-`U16`). */

import { useMemo } from 'react'
import type { GameConfig } from '../core/config/schema'
import { currentCircle, HUMAN, isCircleFinal } from '../core/rules/run'
import { Prompt } from './Prompt'
import { Scene } from './Scene'
import { Shop } from './Shop'
import { describeStep } from './labels'
import { useSession } from './useSession'
import { buildView } from './viewModel'

export function Game({ cfg }: { cfg: GameConfig }) {
  const { session, progress } = useSession(cfg)
  const run = session.run
  const circle = currentCircle(run)
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

  const ladderSizes = useMemo(() => {
    const out: Record<number, number> = {}
    for (const [size, ladder] of Object.entries(cfg.cards.handRankings)) out[Number(size)] = ladder.length
    return out
  }, [cfg])

  return (
    <div className="app">
      <header className="banner">
        <div className="banner__circle">
          <span className="banner__label">Cercle</span>
          <strong>{circle.n}</strong>
          <span className="banner__sub">
            3 × D{circle.dieFaces} · {circle.cards} carte{circle.cards > 1 ? 's' : ''}
          </span>
        </div>
        <div className="banner__streak">
          <span className="banner__label">Série</span>
          <strong>
            {run.wins} / {circle.winsRequired}
          </strong>
          <span className={`banner__sub ${isCircleFinal(run) ? 'banner__sub--alert' : ''}`}>
            {isCircleFinal(run)
              ? 'dernière partie du Cercle — trois participants'
              : `une défaite et le run s’arrête`}
          </span>
        </div>
        <div className="banner__wallet">
          <span>
            <strong>{run.money}</strong> argent
          </span>
          <span>
            <strong>{run.forgePoints}</strong> forge
          </span>
          <span>
            <strong>{run.matchesPlayed}</strong> parties
          </span>
        </div>
        <div className="banner__speed">
          <button
            type="button"
            className={`chipbtn ${session.autoPilot ? 'chipbtn--on' : ''}`}
            onClick={() => session.setAutoPilot(!session.autoPilot)}
            title="Le jeu joue à votre place, pour regarder la mécanique tourner"
          >
            {session.autoPilot ? '⏸ reprendre la main' : '▶ pilote auto'}
          </button>
          <span className="banner__label">Vitesse</span>
          {[0.5, 1, 2, 4, 12].map((s) => (
            <button
              key={s}
              type="button"
              className={`chipbtn ${session.speed === s ? 'chipbtn--on' : ''}`}
              onClick={() => session.setSpeed(s)}
            >
              {s === 12 ? '⏩' : `×${s}`}
            </button>
          ))}
        </div>
      </header>

      {session.screen === 'match' && (
        <>
          <main className="stage">
            <Scene
              view={view}
              frame={frame}
              deltas={deltas}
              names={names}
              humanIndex={HUMAN}
              ladderSizes={ladderSizes}
              pickable={ask?.kind === 'reward' ? ask.offered : undefined}
              onPick={
                ask?.kind === 'reward'
                  ? (id) => session.answer({ kind: 'reward', id: id as never })
                  : undefined
              }
            />
          </main>
          <footer className="footer">
            <div className="ticker">
              <span className="ticker__dot" data-playing={!session.idle} />
              {step ? describeStep(step, names) : ask ? 'À vous de jouer' : '…'}
              {!session.idle && (
                <button type="button" className="chipbtn" onClick={() => session.skip()}>
                  passer l’animation
                </button>
              )}
            </div>
            {ask && (
              <Prompt
                ask={ask}
                view={view}
                names={names}
                ladderSize={ladderSizes[circle.cards] ?? 1}
                onAnswer={(a) => session.answer(a)}
              />
            )}
          </footer>
        </>
      )}

      {session.screen === 'shop' && <Shop session={session} />}

      {(session.screen === 'dead' || session.screen === 'won') && (
        <RunEnd session={session} won={session.screen === 'won'} />
      )}
    </div>
  )
}

/** `U15` : écran de fin de run. Le ton est une félicitation, pas un échec. */
function RunEnd({ session, won }: { session: ReturnType<typeof useSession>['session']; won: boolean }) {
  const run = session.run
  const circle = currentCircle(run)
  return (
    <div className="runend">
      <h2>{won ? 'Vous avez traversé les neuf Cercles' : `Vous êtes arrivé au Cercle ${circle.n}`}</h2>
      <p className="runend__lead">
        {won
          ? 'Les Enfers sont derrière vous.'
          : `${run.wins} victoire${run.wins > 1 ? 's' : ''} dans ce Cercle. Une défaite suffit : le run s’arrête ici.`}
      </p>
      <div className="runend__stats">
        <span>
          <strong>{run.matchesPlayed}</strong> parties jouées
        </span>
        <span>
          <strong>{run.totalMoney}</strong> d’argent gagné en tout
        </span>
        <span>
          <strong>{run.deck.length}</strong> cartes au deck
        </span>
        <span>
          meilleur Cercle atteint : <strong>{run.bestCircle}</strong>
        </span>
      </div>
      <button type="button" className="btn btn--primary btn--big" onClick={() => session.restart()}>
        Recommencer au Cercle 1
      </button>
    </div>
  )
}
