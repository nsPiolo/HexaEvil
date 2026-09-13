import { config } from '../core/config'
import { ARTEFACTS, type ArtefactId } from '../core/rules/artefacts'

interface Props {
  owned: readonly ArtefactId[]
  lateBetCharges: number
  onToggle: (id: ArtefactId) => void
}

/** Barre provisoire : en attendant la boutique, les artefacts implémentés s'activent ici. */
export function ArtefactBar({ owned, lateBetCharges, onToggle }: Props) {
  return (
    <section className="artefact-bar" aria-label="Artefacts">
      <span className="bet-label">Artefacts <span className="muted">(provisoire, en attendant la boutique)</span></span>
      <div className="artefact-list">
        {ARTEFACTS.map((a) => {
          const on = owned.includes(a.id)
          return (
            <button key={a.id} type="button" className={'artefact' + (on ? ' artefact-on' : '')} onClick={() => onToggle(a.id)} title={a.description} aria-pressed={on}>
              <span className="artefact-name">{a.name}</span>
              <span className="artefact-desc">{a.description}</span>
              {a.id === 'lateBet' && on && (
                <span className="artefact-charges">
                  {lateBetCharges}/{config.artefacts.lateBet.chargesPerCircle} charge{config.artefacts.lateBet.chargesPerCircle > 1 ? 's' : ''} ce cercle
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
