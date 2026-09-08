import { useMemo } from 'react'
import raw from '../config/gameplay.json'
import { loadConfig } from './core/config/load'
import { Game } from './presentation/Game'

export default function App() {
  const loaded = useMemo(() => {
    try {
      return { cfg: loadConfig(raw), error: null as string | null }
    } catch (e) {
      return { cfg: null, error: e instanceof Error ? e.message : String(e) }
    }
  }, [])

  // `G2` : un message d'erreur explicite désignant le champ fautif.
  if (!loaded.cfg) return <div className="fatal">{loaded.error}</div>
  return <Game cfg={loaded.cfg} />
}
