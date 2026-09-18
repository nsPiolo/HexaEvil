import { useCallback, useEffect, useMemo, useState } from 'react'
import { MENU, SPEAKERS, type Line } from './texts'

interface Props {
  lines: readonly Line[]
  /** Libellé du bouton pour tout sauter ; absent = pas de saut. */
  skipLabel?: string
  /** Décor de la scène ; absent = la salle de lave du stagiaire (CSS `.dialogue`). */
  background?: string
  onDone: () => void
}

/** Suite d'écrans où le démon parle dans des bulles ; « Suite » ou espace pour avancer. */
export function Dialogue({ lines, skipLabel, background, onDone }: Props) {
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

  /**
   * Portraits du dialogue (posés ligne par ligne par `spokenBy`) : tous montés d'un coup et
   * superposés, seul l'actuel est opaque. Le navigateur les charge dès l'ouverture de l'écran,
   * donc un changement d'expression est un fondu et non un blanc le temps du téléchargement.
   */
  const portraits = useMemo(() => [...new Set(lines.map((l) => l.portrait).filter((p) => p !== undefined))], [lines])
  /**
   * Le portrait suit celui qui parle : chaque réplique du démon ou du boss impose le sien.
   * Une réplique du joueur laisse en scène celui qui lui répond.
   */
  const portrait = lines.slice(0, index + 1).reduce<string | undefined>((p, l) => (l.who === 'player' ? p : l.portrait), portraits[0])

  return (
    <div className={'screen dialogue' + (background ? ' dialogue-scene' : '')} style={background ? { backgroundImage: `url('${background}')` } : undefined}>
      <div className="dialogue-stage">
        {portraits.map((src) => (
          <img key={src} className={'dialogue-portrait' + (src === portrait ? ' dialogue-portrait-on' : '')} src={src} alt="" aria-hidden="true" />
        ))}
        <div className="bubbles">
          {lines.slice(0, index + 1).map((l, i) => (
            <p key={i} className={`bubble-line bubble-${l.who}` + (i === index ? ' bubble-current' : ' bubble-past')}>
              <span className="bubble-who">{l.label ?? SPEAKERS[l.who]}</span>
              {l.text}
            </p>
          ))}
        </div>
      </div>
      <div className="dialogue-actions">
        <div className="dialogue-actions-inner">
          <button type="button" className="btn-stone btn-stone-orange" onClick={(e) => e.detail > 0 && next()} autoFocus>
            {last ? 'Terminer' : MENU.next}
          </button>
          {skipLabel && !last && (
            <button type="button" className="btn-stone" onClick={onDone}>
              {skipLabel}
            </button>
          )}
          <span className="muted small">espace pour avancer</span>
        </div>
      </div>
    </div>
  )
}
