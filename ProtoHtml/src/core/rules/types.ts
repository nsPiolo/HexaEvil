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
  maxExits: number
  /**
   * `T8` — Sorties figées par la configuration : le joueur ne peut pas les
   * modifier, même si la Tuile lui appartient. Sert aux Tuiles de terrain dont
   * l'orientation fait partie de l'énoncé de la Rencontre (le `Puits`).
   */
  fixedExits?: boolean
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

/**
 * `C1b` — cadence d'une Manche : elle démarre à `start` et s'allonge de `step`
 * toutes les `delay` **Manches**, jusqu'au plafond `max`. Donne au joueur des
 * poses rapprochées au début, quand le réseau se construit, et des Manches
 * longues ensuite, quand il n'y a plus qu'à observer.
 */
export type TicksPerRound = Readonly<{
  start: number
  max: number
  /** Ce qu'on ajoute à chaque palier. */
  step: number
  /** Nombre de Manches entre deux paliers. */
  delay: number
}>

/** Contenu du fichier de configuration unique (`G1`, `G2`). */
export type GameConfig = Readonly<{
  ticksPerRound: TicksPerRound
  soulBudget: number
  minionBudget: number
  stairwayTarget: number
  carryCapacity: Readonly<Record<Side, number>>
  resources: readonly ResourceDef[]
  tileTypes: readonly TileTypeDef[]
  board: Readonly<{
    radius: number
    /** `B11` — Espaces existants mais **non constructibles** : des obstacles. */
    blocked: readonly HexCoord[]
  }>
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

/**
 * Ce qui s'est passé pendant un Tick. Le moteur l'énonce, l'interface l'anime :
 * sans ça, la Presentation devrait deviner les mouvements en comparant deux
 * états, c'est-à-dire raisonner sur les règles (ADR-0003).
 */
export type TickEvent =
  | { kind: 'spawn'; entityId: number; side: Side; coord: HexCoord }
  | {
      kind: 'move'
      entityId: number
      side: Side
      from: HexCoord
      to: HexCoord
      carrying?: ResourceId | undefined
    }
  | { kind: 'destroy'; entityId: number; side: Side; coord: HexCoord; cause: SpendCause }
  | {
      kind: 'stock'
      coord: HexCoord
      resource: ResourceId
      /** Signé : positif quand la Ressource entre, négatif quand elle sort. */
      delta: number
      reason: 'produced' | 'consumed' | 'deposited' | 'picked'
    }
  | { kind: 'progress'; coord: HexCoord; delta: number }

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
  /** Événements du dernier Tick déroulé, pour l'animation (`U6`, `U7`). */
  events: TickEvent[]
  log: LogEntry[]
  outcome: Outcome
}
