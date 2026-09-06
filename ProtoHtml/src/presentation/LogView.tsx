import type { LogEntry } from '../core/rules/types'

export const LogView = ({ log }: { log: readonly LogEntry[] }) => (
  <ol className="log" aria-label="Journal de la Rencontre">
    {[...log]
      .slice(-40)
      .reverse()
      .map((e, i) => (
        <li key={`${e.tick}-${log.length - i}`} className={`log__entry log__entry--${e.side}`}>
          <span className="log__tick">T{e.tick}</span> {e.text}
        </li>
      ))}
  </ol>
)
