/**
 * Vocabulaire de la Rencontre — GDD §2. Tous les identifiants de règle cités
 * (`D16`, `P6`…) renvoient au GDD `docs/proto/GDD.md`.
 */
import type { DirectionName, HexCoord } from '../hex/hexCoord'

export type Side = 'player' | 'demon'

/** Propriétaire d'une Tuile. `neutral` = l'`Escalier` (`T2`). */
export type Owner = Side | 'neutral'

export type ResourceId = string
export type TileTypeId = string

/** Contenu d'une réserve : quantité par Ressource (`R3`). */
export type Stock = Readonly<Record<ResourceId, number>>

/** Recette d'un Bâtiment (`R1`). `consumesSelf` : le matériau est l'entité (`X3`). */
export type RecipeDef = Readonly<{
  side?: Side
  in?: Stock
  out?: Stock
  progress?: number
  consumesSelf?: boolean
  ticks: number
}>

export type ResourceDef = Readonly<{ id: ResourceId; name: string; glyph: string }>

/** Type de Tuile (Data, aucune logique — ADR-0003). */
export type TileTypeDef = Readonly<{
  id: TileTypeId
  name: string
  glyph: string
  side: Owner
  minExits?: number
  maxExits: number
  /** Tuile d'apparition : `Puits des âmes` / `Gouffre` (`C4`, `X1`). */
  spawns?: Side
  recipes?: readonly RecipeDef[]
}>

export type InitialTileDef = Readonly<{
  q: number
  r: number
  type: TileTypeId
  owner: Owner
  exits: readonly DirectionName[]
}>

/** Contenu du fichier de configuration unique (`G1`, `G2`). */
export type GameConfig = Readonly<{
  ticksPerRound: number
  soulBudget: number
  minionBudget: number
  stairwayTarget: number
  carryCapacity: Readonly<Record<Side, number>>
  resources: readonly ResourceDef[]
  tileTypes: readonly TileTypeDef[]
  board: Readonly<{ radius: number; spaces?: readonly HexCoord[] }>
  initialTiles: readonly InitialTileDef[]
  catalog: readonly TileTypeId[]
}>

/** Tuile posée sur un Espace (`HexTile`). */
export type TileState = {
  coord: HexCoord
  typeId: TileTypeId
  owner: Owner
  /** Accès convertis en Sorties, par index de direction (`D2`). */
  exits: number[]
  input: Record<ResourceId, number>
  output: Record<ResourceId, number>
  /** Compteur de tourniquet (`D8`, `D9`). */
  roundRobin: number
  productionsDone: number
}

/** Âme ou Sbire. */
export type EntityState = {
  id: number
  side: Side
  space: HexCoord
  carrying?: ResourceId | undefined
  /** Production en cours : index de Recette + Ticks déjà comptés (`P2`, `P3`). */
  production?: { recipeIndex: number; ticksDone: number } | undefined
  /** Espaces déjà traversés — y revenir détruit l'entité (`D16`). */
  visited: string[]
  /** A déjà produit sur l'Espace courant (`P1`), remis à faux au déplacement. */
  producedHere: boolean
}

/** Cause de disparition d'une entité, ventilée dans les métriques (`K1`). */
export type SpendCause = 'delivered' | 'blocked' | 'backtrack'

export type SpendBreakdown = Record<SpendCause, number>

export type LogEntry = Readonly<{
  tick: number
  side: Side | 'system'
  text: string
}>

export type Outcome = 'ongoing' | 'victory' | 'defeat'

/** Phase de jeu : pose de Tuile, puis déroulé des Ticks (`C1`). */
export type Phase = 'placement' | 'running' | 'over'

/** État complet de la Rencontre. Sérialisable, clonable, sans dépendance React. */
export type GameState = {
  config: GameConfig
  tick: number
  round: number
  phase: Phase
  ticksLeftInRound: number
  spaces: HexCoord[]
  tiles: Record<string, TileState>
  entities: EntityState[]
  nextEntityId: number
  spawned: Record<Side, number>
  spent: Record<Side, SpendBreakdown>
  progress: number
  /** Ponction du démon : appliquée vs. absorbée par le plancher à 0 (`R8`, `E8`). */
  drain: { applied: number; absorbed: number }
  /** Une seule pose par Manche (`C1`). */
  placedThisRound: boolean
  log: LogEntry[]
  outcome: Outcome
}
