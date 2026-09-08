/** Le logo animé, cinq secondes — spéc. interface §1. Un clic l'abrège. */

import { useEffect } from 'react'

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <button type="button" className="splash" onClick={onDone} aria-label="passer l’introduction">
      <span className="splash__glow" aria-hidden="true" />
      <span className="splash__hex" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <h1 className="splash__title">
        Hexa<em>Evil</em>
      </h1>
      <p className="splash__sub">une variante infernale du 4-21</p>
    </button>
  )
}
