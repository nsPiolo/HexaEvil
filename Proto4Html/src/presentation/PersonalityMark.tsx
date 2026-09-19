import type { PersonalityId } from '../core/rules/personalities'
import { personalityEffect, personalityName } from './messages'
import { BOARD, fill } from './texts'

/**
 * Le signe d'une personnalité (GDD §6.5) : un glyphe, le même partout — sur le jeton de
 * l'âme marquée, dans sa légende, dans le choix de la boutique — et le même que celui gravé
 * sur la vignette du masque (docs/proto4/prompts-objets.md § Masques).
 *
 * Des glyphes de texte plutôt que des emoji, pour la même raison que le cadenas peint de la
 * Collection : un emoji change de dessin d'un système à l'autre et jure avec l'habillage. Ils
 * sont pris dans les blocs les plus largement servis (formes géométriques, flèches, maths),
 * et choisis pour rester lisibles à 12 px, taille du marqueur sur un jeton.
 */
export const PERSONALITY_GLYPH: Readonly<Record<PersonalityId, string>> = {
  martyr: '✚',
  ambitieux: '▲',
  tricheur: '⊗',
  condamne: '⇥',
  parasite: '≺',
  juge: '§',
  resolu: '⊘',
  opposant: '⇄',
  constant: '≡',
  ogre: '✖',
}

interface Props {
  personality: PersonalityId
  /** Classe en plus (`token-mark` sur un jeton, rien dans un texte). */
  className?: string
  /** Vrai pour porter l'explication au survol ; faux quand la phrase est déjà à côté. */
  titled?: boolean
}

export function PersonalityMark({ personality, className, titled }: Props) {
  const label = fill(BOARD.personality, { name: personalityName(personality), effect: personalityEffect(personality) })
  return (
    <span className={'pmark' + (className ? ` ${className}` : '')} title={titled ? label : undefined} aria-label={titled ? label : undefined}>
      {PERSONALITY_GLYPH[personality]}
    </span>
  )
}
