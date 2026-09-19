import type { ReactNode } from 'react'

/**
 * Balisage inline minimal des textes du jeu : `**gras**` et `*italique*`. Les textes restent
 * de simples chaînes dans texts.ts (traduisibles), le rendu se fait ici.
 *
 * Partagé entre l'aide et les bulles de dialogue : les répliques mettent en italique l'aparté
 * qui suit les « … », et un `<em>` rendu ici évite d'écrire du JSX dans le lexique.
 */
export function rich(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter((part) => part !== '')
    .map((part, i) => {
      if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
      return part
    })
}
