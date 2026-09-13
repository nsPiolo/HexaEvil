import { useCallback, useEffect, useState } from 'react'
import { MENU, type Line } from './texts'

interface Props {
  lines: readonly Line[]
  /** Libellé du bouton pour tout sauter ; absent = pas de saut. */
  skipLabel?: string
  onDone: () => void
}

/** Suite d'écrans où le démon parle dans des bulles ; « Suite » ou espace pour avancer. */
export function Dialogue({ lines, skipLabel, onDone }: Props) {
  const [index, setIndex] = useState(0)
  const last = index >= lines.length - 1
  const next = useCallback(() => {
    if (last) onDone()
    else setIndex((i) => i + 1)
  }, [last, onDone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next])

  return (
    <div className="screen dialogue">
      <div className="dialogue-stage">
        <div className="demon" aria-hidden="true">
          <span className="demon-horns" />
          <span className="demon-face">
            <span className="demon-eye" />
            <span className="demon-eye" />
          </span>
        </div>
        <div className="bubbles">
          {lines.slice(0, index + 1).map((l, i) => (
            <p key={i} className={`bubble-line bubble-${l.who}` + (i === index ? ' bubble-current' : ' bubble-past')}>
              <span className="bubble-who">{l.who === 'demon' ? 'Démon stagiaire' : 'Vous'}</span>
              {l.text}
            </p>
          ))}
        </div>
      </div>
      <div className="dialogue-actions">
        <button type="button" className="btn btn-primary" onClick={(e) => e.detail > 0 && next()} autoFocus>
          {last ? 'Terminer' : MENU.next}
        </button>
        {skipLabel && !last && (
          <button type="button" className="btn" onClick={onDone}>
            {skipLabel}
          </button>
        )}
        <span className="muted small">espace pour avancer</span>
      </div>
    </div>
  )
}
