import { useEffect, useState, type ReactNode } from 'react'
import { config } from '../core/config'
import { HELP, fill, oddsText, type HelpBlock } from './texts'

/**
 * Cotes citées par l'aide. Elles ne sont pas écrites dans les textes : une recalibration
 * (`npm run odds -- --suggest`) changeait la config sans changer l'aide, qui annonçait alors
 * des gains que le guichet ne payait plus.
 */
const ODDS = oddsText(config.economy.multipliers)

interface Props {
  onClose: () => void
}

/**
 * Balisage inline minimal des textes d'aide : `**gras**` et `*italique*`. Les textes
 * restent de simples chaînes dans texts.ts (traduisibles), le rendu se fait ici.
 */
function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter((part) => part !== '')
    .map((part, i) => {
      if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
      return part
    })
}

/** Rendu d'un texte d'aide : cotes de la config d'abord, balisage inline ensuite. */
function help(text: string): ReactNode[] {
  return rich(fill(text, ODDS))
}

function Block({ block }: { block: HelpBlock }) {
  const items = block.items ?? []
  switch (block.kind) {
    case 'h':
      return <h3>{block.text}</h3>
    case 'ul':
      return (
        <ul>
          {items.map((item, i) => (
            <li key={i}>{help(item)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol>
          {items.map((item, i) => (
            <li key={i}>{help(item)}</li>
          ))}
        </ol>
      )
    default:
      return <p>{help(block.text ?? '')}</p>
  }
}

/**
 * Page d'aide en popup : index des sections à gauche, une section à la fois à droite.
 * Le contenu vient de HELP (texts.ts) ; ce composant ne connaît que sa mise en page.
 * Consultation pure : rien ici ne touche à la partie en cours.
 */
export function HelpPanel({ onClose }: Props) {
  const [active, setActive] = useState<string>(HELP.sections[0].id)
  const section = HELP.sections.find((s) => s.id === active) ?? HELP.sections[0]
  // Échap ferme : l'aide se lit au milieu d'une course, on doit en sortir sans viser un bouton.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="help" data-testid="help-panel">
      <h1 className="help-title">{HELP.title}</h1>
      <div className="help-intro">
        {HELP.intro.map((text, i) => (
          <p key={i}>{help(text)}</p>
        ))}
      </div>

      <div className="help-body">
        <nav className="help-nav" aria-label={HELP.navLabel}>
          {HELP.sections.map((s) => (
            <button key={s.id} type="button" className="help-nav-btn" aria-current={s.id === active} data-testid={`help-nav-${s.id}`} onClick={() => setActive(s.id)}>
              {s.title}
            </button>
          ))}
        </nav>

        <article className="help-section" data-testid="help-section" data-section={section.id}>
          <h2>
            <span className="help-icon" aria-hidden="true">
              {section.icon}
            </span>
            {section.title}
          </h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>
      </div>

      <div className="help-foot">
        <button type="button" className="btn" onClick={onClose}>
          {HELP.close}
        </button>
      </div>
    </div>
  )
}
