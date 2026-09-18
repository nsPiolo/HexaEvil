import { useState } from 'react'
import { itemArt } from './art'

/**
 * Objets déjà cherchés et absents de `public/objets/` : un id manquant n'est demandé qu'une
 * fois par session, pas à chaque ouverture de la boutique.
 */
const missing = new Set<string>()

interface Props {
  /** Id de l'objet dans `config/shop.json`. */
  id: string
  /** Classe de la vignette : `shop-art` sur une carte de vitrine, `inv-art` dans l'inventaire. */
  className: string
}

/**
 * Vignette d'un objet achetable. Les seize dessins arrivent au fur et à mesure : tant qu'un
 * fichier manque, la carte se passe d'image plutôt que d'afficher un cadre vide, et il suffit
 * de poser le `.webp` dans `public/objets/` pour qu'il apparaisse — rien à déclarer dans le code.
 * Purement décoratif : le nom de l'objet est juste à côté.
 */
export function ItemArt({ id, className }: Props) {
  const src = itemArt(id)
  const [broken, setBroken] = useState(() => missing.has(src))
  if (broken) return null
  return (
    <img
      className={className}
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => {
        missing.add(src)
        setBroken(true)
      }}
    />
  )
}
