/**
 * Les bulles de dialogue — spéc. interface §2 et fin de Cercle.
 *
 * Une bulle à la fois, les précédentes restent visibles en retrait pour qu'on
 * puisse relire l'échange. On avance au bouton ou à la barre d'espace.
 */

import { useEffect, useState } from 'react'
import type { Bubble } from './dialogues'

export function Dialogue({
  bubbles,
  onDone,
  skipLabel,
  doneLabel = 'Suite',
}: {
  bubbles: readonly Bubble[]
  onDone: () => void
  /** Bouton de saut global, absent sur les écrans courts. */
  skipLabel?: string | undefined
  doneLabel?: string
}) {
  const [at, setAt] = useState(0)
  const last = at >= bubbles.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space' && e.key !== ' ') return
      e.preventDefault()
      setAt((i) => {
        if (i >= bubbles.length - 1) {
          onDone()
          return i
        }
        return i + 1
      })
    }
    globalThis.addEventListener?.('keydown', onKey)
    return () => globalThis.removeEventListener?.('keydown', onKey)
  }, [bubbles.length, onDone])

  const advance = (): void => {
    if (last) onDone()
    else setAt(at + 1)
  }

  const visible = bubbles.slice(Math.max(0, at - 3), at + 1)

  return (
    <div className="dialogue">
      <div className="dialogue__demon" aria-hidden="true">
        <span className="dialogue__horns" />
        <span className="dialogue__face" />
      </div>

      <div className="dialogue__stream">
        {visible.map((b, i) => {
          const index = Math.max(0, at - 3) + i
          const current = index === at
          return (
            <p
              key={index}
              className={`bubble bubble--${b.who} ${current ? 'bubble--now' : 'bubble--past'}`}
            >
              {b.text}
            </p>
          )
        })}
      </div>

      <div className="dialogue__actions">
        <button type="button" className="btn btn--primary btn--big" onClick={advance}>
          {last ? doneLabel : 'Suite'}
        </button>
        {skipLabel && (
          <button type="button" className="btn" onClick={onDone}>
            {skipLabel}
          </button>
        )}
        <span className="dialogue__count">
          {at + 1} / {bubbles.length}
        </span>
      </div>
    </div>
  )
}
