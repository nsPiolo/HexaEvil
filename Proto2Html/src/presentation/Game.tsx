/** Assemblage de l'interface. Aucune règle ici — tout vient du Core (ADR-0003). */

import { useMemo, useState } from 'react'
import { hexKey } from '../core/hex/hexCoord'
import { BoardView } from './BoardView'
import { Controls } from './Controls'
import {
  DeckPanel,
  HandPanel,
  LogView,
  MetricsPanel,
  PreviewPanel,
  StepBanner,
  TileInspector,
  TurnPanel,
} from './Panels'
import { previewMove } from './preview'
import { useGame } from './useGame'
import type { HexCoord } from '../core/hex/hexCoord'

export function Game() {
  const api = useGame()
  const [chosen, setChosen] = useState<string | null>(null)
  const [hovered, setHovered] = useState<HexCoord | null>(null)
  const [inspected, setInspected] = useState<HexCoord | null>(null)

  const hand = api.hand
  const effective = chosen !== null && hand.includes(chosen) ? chosen : (hand[0] ?? null)

  const preview = useMemo(() => {
    // Pendant l'animation, l'aperçu n'a pas de sens : l'état affiché n'est pas
    // l'état réel (U16).
    if (!hovered || effective === null || api.state.outcome || api.locked) return null
    return previewMove(api.config, api.state, { typeId: effective, at: hovered })
  }, [api.config, api.locked, api.state, effective, hovered])

  const onClick = (at: HexCoord): void => {
    if (api.locked) return
    setInspected(at)
    if (api.state.outcome || effective === null) return
    const legal = api.legal.some((m) => hexKey(m.at) === hexKey(at) && m.typeId === effective)
    if (legal) api.place({ typeId: effective, at })
  }

  return (
    <div className="game">
      <header>
        <h1>Duel « Soustraction » — proto 2</h1>
        <p className="muted small">
          Source de vérité&nbsp;: <code>docs/proto2/GDD.md</code>. Chaque règle citée en commentaire du code.
        </p>
      </header>

      {api.warnings.length > 0 && (
        <div className="banner warn">
          {api.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      {api.error && <div className="banner error">{api.error}</div>}

      <div className="layout">
        <aside className="left">
          <TurnPanel api={api} />
          <HandPanel api={api} chosen={effective} onChoose={setChosen} />
          <PreviewPanel api={api} hovered={hovered} preview={preview} />
          <Controls api={api} />
        </aside>

        <main>
          <StepBanner api={api} />
          <BoardView
            api={api}
            hovered={hovered}
            selected={inspected}
            preview={preview}
            onHover={setHovered}
            onClick={onClick}
          />
          <p className="legend muted small">
            <strong>Hexagone texturé = Tuile posée</strong>, fond pastel uni = Espace vide et sa Couleur
            (U1) · contour plein = Tuile ravitaillée (F14), pointillé = coupée de son Roi, elle ne se
            soigne pas · liseré ambre = maillon critique (U10) · hachures sombres = Espace bloqué (B2).
          </p>
        </main>

        <aside className="right">
          <DeckPanel api={api} />
          <TileInspector api={api} at={inspected} />
          <MetricsPanel api={api} />
          <LogView api={api} />
        </aside>
      </div>
    </div>
  )
}
