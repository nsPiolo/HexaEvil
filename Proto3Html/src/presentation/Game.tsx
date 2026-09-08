/**
 * L'écran d'un run : table, fin de Cercle, boutique, fin de run — plus les deux
 * bandeaux en surimpression que la spéc. veut visibles partout.
 */

import { useState } from 'react'
import type { GameConfig } from '../core/config/schema'
import { currentCircle } from '../core/rules/run'
import { Dialogue } from './Dialogue'
import { ordinal } from './labels'
import { Match } from './Match'
import type { Session } from './session'
import { Shop } from './Shop'
import { usePlayback } from './useSession'

export function Game({ session, cfg, onQuit }: { session: Session; cfg: GameConfig; onQuit: () => void }) {
  const progress = usePlayback(session)
  const run = session.run
  const circle = currentCircle(run)
  const screen = session.screen
  const onFelt = screen === 'match'

  return (
    <div className={`play ${onFelt ? 'play--felt' : 'play--room'}`}>
      {/* En haut à gauche : où l'on est. En haut à droite : ce que l'on a. */}
      <div className="hud hud--left">
        <strong>{ordinal(circle.n)} Cercle</strong>
        <span>
          {ordinal(Math.min(run.wins + 1, circle.winsRequired), true)} rencontre sur {circle.winsRequired}
        </span>
      </div>
      <div className="hud hud--right">
        <strong>
          {run.money} <span>pièce{run.money > 1 ? 's' : ''}</span>
        </strong>
        <strong>
          {run.forgePoints} <span>forge</span>
        </strong>
      </div>

      {screen === 'match' && <Match session={session} cfg={cfg} progress={progress} />}

      {screen === 'transition' && (
        <Dialogue
          bubbles={session.bubbles}
          onDone={() => session.closeTransition()}
          doneLabel="Vers la boutique"
        />
      )}

      {screen === 'shop' && <Shop session={session} />}

      {(screen === 'dead' || screen === 'won') && (
        <RunEnd session={session} won={screen === 'won'} onQuit={onQuit} />
      )}

      <DevPanel session={session} onQuit={onQuit} />
    </div>
  )
}

/** `U15` : écran de fin de run. Le ton est une félicitation, pas un échec. */
function RunEnd({ session, won, onQuit }: { session: Session; won: boolean; onQuit: () => void }) {
  const run = session.run
  const circle = currentCircle(run)
  return (
    <div className="runend">
      <h2>{won ? 'Vous avez traversé les neuf Cercles' : `Vous êtes arrivé au ${ordinal(circle.n)} Cercle`}</h2>
      <p className="runend__lead">
        {won
          ? 'Les Enfers sont derrière vous.'
          : `${run.wins} victoire${run.wins > 1 ? 's' : ''} dans ce Cercle. Une défaite suffit : le run s’arrête ici.`}
      </p>
      <div className="runend__stats">
        <span>
          <strong>{run.matchesPlayed}</strong> rencontres jouées
        </span>
        <span>
          <strong>{run.totalMoney}</strong> pièces gagnées en tout
        </span>
        <span>
          <strong>{run.deck.length}</strong> cartes au deck
        </span>
        <span>
          meilleur Cercle atteint : <strong>{run.bestCircle}</strong>
        </span>
      </div>
      <button type="button" className="btn btn--primary btn--big" onClick={onQuit}>
        Retour au menu
      </button>
    </div>
  )
}

/**
 * Les outils de test — pilote automatique, vitesse, saut d'animation. Ils ne
 * font pas partie du jeu fini : d'où le panneau replié dans un coin.
 */
function DevPanel({ session, onQuit }: { session: Session; onQuit: () => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className="devtab" onClick={() => setOpen(true)} title="Outils de test">
        ⚙
      </button>
    )
  }
  return (
    <div className="dev">
      <button type="button" className="devtab devtab--in" onClick={() => setOpen(false)}>
        ×
      </button>
      <button
        type="button"
        className={`chipbtn ${session.autoPilot ? 'chipbtn--on' : ''}`}
        onClick={() => session.setAutoPilot(!session.autoPilot)}
      >
        {session.autoPilot ? '⏸ reprendre la main' : '▶ pilote auto'}
      </button>
      <span className="dev__label">Vitesse</span>
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
      {!session.idle && (
        <button type="button" className="chipbtn" onClick={() => session.skip()}>
          passer l’animation
        </button>
      )}
      <button type="button" className="chipbtn" onClick={onQuit}>
        quitter au menu
      </button>
    </div>
  )
}
