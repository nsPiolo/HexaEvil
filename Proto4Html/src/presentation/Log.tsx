import { useEffect, useRef } from 'react'
import type { LogEntry } from './useRace'

export function Log({ entries }: { entries: LogEntry[] }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [entries.length])
  let lastTurn = 0
  return (
    <section className="log" aria-label="Journal de la course">
      <h3>Journal</h3>
      <div className="log-scroll">
        {entries.map((e) => {
          const showTurn = e.turn !== lastTurn
          lastTurn = e.turn
          return (
            <div key={e.id}>
              {showTurn && <div className="log-turn">Tour {e.turn}</div>}
              <div className={`log-entry log-${e.source}`}>{e.text}</div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
    </section>
  )
}
