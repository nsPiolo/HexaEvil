import { useState } from 'react'
import { itemArt } from './art'

/**
 * Vignettes déjà cherchées et absentes de `public/objets/` : un id manquant n'est demandé
 * qu'une fois par session, pas à chaque ouverture de la boutique.
 */
const missing = new Set<string>()

/** Le point d'interrogation peint, servi tant que la vignette d'un objet n'existe pas. */
const FALLBACK = itemArt('qmark')

interface Props {
  /** Id de l'objet dans `config/shop.json`. */
  id: string
  /** Classe de la vignette : `shop-art` sur une carte, `inv-art` dans la pastille d'inventaire. */
  className: string
}

/** La vignette à afficher : le dessin de l'objet, sinon le point d'interrogation, sinon rien. */
function choisir(src: string): string | null {
  if (!missing.has(src)) return src
  return missing.has(FALLBACK) ? null : FALLBACK
}

/**
 * Vignette d'un objet achetable. Les seize dessins arrivent au fur et à mesure : tant qu'un
 * fichier manque, la carte montre le point d'interrogation (`public/objets/qmark.webp`)
 * plutôt qu'un trou, pour que toutes les cartes aient la même silhouette. Il suffit de poser
 * le `.webp` dans `public/objets/` pour qu'il remplace le repli — rien à déclarer dans le code.
 * Purement décoratif : le nom de l'objet est juste à côté.
 */
export function ItemArt({ id, className }: Props) {
  const src = itemArt(id)
  const [source, setSource] = useState<string | null>(() => choisir(src))
  if (!source) return null
  return (
    <img
      key={source}
      className={className}
      src={source}
      alt=""
      aria-hidden="true"
      onError={() => {
        missing.add(source)
        // Le repli lui-même introuvable : on ne rend plus rien, sinon la carte boucle.
        setSource(source === FALLBACK ? null : choisir(src))
      }}
    />
  )
}
