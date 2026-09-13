/** Les artefacts déjà implémentés dans le proto (voir docs/proto4/artefacts.md pour la liste complète). */
export type ArtefactId = 'lateBet' | 'sablier'

export interface ArtefactDef {
  id: ArtefactId
  name: string
  description: string
}

export const ARTEFACTS: readonly ArtefactDef[] = [
  {
    id: 'lateBet',
    name: 'Œil du parieur',
    description: 'Une fois par cercle, permet de poser un pari après avoir vu ses dés, avant de les associer.',
  },
  {
    id: 'sablier',
    name: 'Sablier de Charon',
    description: 'Le seuil de pari passe de 60 % à 70 % du parcours. S’applique à partir de la course suivante.',
  },
]
