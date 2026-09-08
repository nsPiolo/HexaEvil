/**
 * Le squelette de l'application — spéc. interface §1.
 *
 * Logo, menu, écrans annexes, puis le run. C'est le seul endroit qui décide
 * *quel* écran est à l'affiche ; tout le reste ne connaît que le sien.
 */

import { useMemo, useState } from 'react'
import raw from '../config/gameplay.json'
import { loadConfig } from './core/config/load'
import { Dialogue } from './presentation/Dialogue'
import { INTRO } from './presentation/dialogues'
import { Game } from './presentation/Game'
import { Menu, OptionsScreen, StatsScreen } from './presentation/Menu'
import { Session } from './presentation/session'
import { Splash } from './presentation/Splash'
import { addStats, clearSave, loadOptions, loadSave, type Options } from './presentation/storage'

type Route = 'splash' | 'menu' | 'stats' | 'options' | 'intro' | 'play'

export default function App() {
  const loaded = useMemo(() => {
    try {
      return { cfg: loadConfig(raw), error: null as string | null }
    } catch (e) {
      return { cfg: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [])

  const [route, setRoute] = useState<Route>('splash')
  const [session, setSession] = useState<Session | null>(null)
  const [options, setOptions] = useState<Options>(() => loadOptions())
  const [hasSave, setHasSave] = useState(() => loadSave() !== null)

  // `G2` : un message d'erreur explicite désignant le champ fautif.
  if (!loaded.cfg) return <div className="fatal">{loaded.error}</div>
  const cfg = loaded.cfg

  const start = (saved: ReturnType<typeof loadSave>): Session => {
    const s = new Session(cfg, saved)
    s.setSpeed(options.speed)
    setSession(s)
    return s
  }

  const newRun = (): void => {
    clearSave()
    setHasSave(false)
    // Une tentative de plus : elle compte dès qu'on s'assied à la table.
    addStats({ runs: 1 })
    start(null)
    setRoute('intro')
  }

  const cont = (): void => {
    const saved = loadSave()
    if (!saved) return
    start(saved)
    setRoute('play')
  }

  const quit = (): void => {
    setSession(null)
    setHasSave(loadSave() !== null)
    setRoute('menu')
  }

  switch (route) {
    case 'splash':
      return <Splash onDone={() => setRoute('menu')} />
    case 'menu':
      return (
        <Menu
          canContinue={hasSave}
          onContinue={cont}
          onNew={newRun}
          onStats={() => setRoute('stats')}
          onOptions={() => setRoute('options')}
        />
      )
    case 'stats':
      return <StatsScreen onBack={() => setRoute('menu')} />
    case 'options':
      return (
        <OptionsScreen
          options={options}
          onChange={(next) => {
            setOptions(next)
            session?.setSpeed(next.speed)
          }}
          onBack={() => setRoute('menu')}
        />
      )
    case 'intro':
      return (
        <div className="play play--room">
          <Dialogue
            bubbles={INTRO}
            onDone={() => setRoute('play')}
            skipLabel="Passer l’introduction"
            doneLabel="À la table"
          />
        </div>
      )
    case 'play':
      if (!session) return <div className="fatal">Aucune partie en cours.</div>
      return <Game session={session} cfg={cfg} onQuit={quit} />
  }
}
