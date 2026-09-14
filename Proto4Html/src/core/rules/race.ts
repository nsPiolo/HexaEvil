/**
 * Règles de la course — GDD proto4 §2.2 à §2.7, hors paris, boutique et effets.
 *
 * Tout est pur : un état entre, un état sort. La présentation ne fait qu'enchaîner
 * ces fonctions en y glissant des pauses pour que le testeur voie chaque geste.
 *
 * Représentation retenue pour cette étape : chaque âme a son propre couloir (visuel),
 * la « case » qui compte pour les collisions est la COLONNE. Deux âmes sur la même
 * colonne sont sur la même case. Les rétrécissements de piste viendront plus tard.
 */
import type { RaceConfig } from '../config/schema'
import { plainFace, type DistanceDie, type Face } from './dice'
import type { Rng } from './rng'

export type SoulId = number

export interface Soul {
  id: SoulId
  name: string
  /** Colonne occupée, 0 = ligne de départ. */
  position: number
  /** Ordre de franchissement de l'arrivée (1 = première), ou null. */
  finishOrder: number | null
}

export interface Track {
  /** Cases de parcours ; l'arrivée est franchie à `columns`. */
  columns: number
  cellsAfterFinish: number
  /** columns + cellsAfterFinish ; la dernière case est `totalCells - 1`. */
  totalCells: number
  /** Part du parcours au-delà de laquelle on ne parie plus (0,6 par défaut, 0,7 avec le Sablier). */
  betThresholdRatio: number
  /** Première colonne de la zone « plus de pari ». */
  betThresholdColumn: number
}

export interface RaceState {
  track: Track
  souls: readonly Soul[]
  /** Numéro du tour en cours, à partir de 1. */
  turn: number
  finished: boolean
  nextFinishOrder: number
}

/** Un lancer : valeurs des dés Distance (avec la face sortie), et âme désignée par chaque dé Âme. */
export interface Roll {
  distance: readonly number[]
  /** Face sortie pour chaque dé Distance (effets de forge). Même longueur que `distance`. */
  faces: readonly Face[]
  soul: readonly SoulId[]
}

/** Association d'un dé Âme et d'un dé Distance, par indices dans le lancer. */
export interface Combination {
  soulDie: number
  distanceDie: number
}

export type MoveSource = 'player' | 'opponent' | 'artefact'

/** Déplacement à résoudre. Plusieurs combinaisons sur la même âme sont cumulées ici (§2.5.1). */
export interface Move {
  source: MoveSource
  soul: SoulId
  distance: number
  parts: readonly { soulDie: number; distanceDie: number; distance: number }[]
  /** Modificateurs appliqués (artefacts, faces forgées), pour le journal. */
  notes: readonly string[]
}

export type Collision =
  | { kind: 'jump'; over: readonly SoulId[] }
  | { kind: 'swap'; with: SoulId; otherFrom: number; otherTo: number }

export interface MoveResult {
  move: Move
  from: number
  to: number
  /** Distance négative sur la case de départ : l'âme ne bouge pas (§2.6). */
  blockedAtStart: boolean
  collision: Collision | null
  crossedFinish: boolean
}

// ---------------------------------------------------------------------------

function at<T>(arr: readonly T[], i: number, what: string): T {
  const v = arr[i]
  if (v === undefined) throw new Error(`${what} : indice ${i} hors limites`)
  return v
}

export interface RaceOptions {
  /** Remplace track.betThresholdRatio (artefact Sablier). */
  betThresholdRatio?: number
  /** Nombre d'âmes en course (dépend du cercle) ; sinon souls.count. */
  soulCount?: number
}

export function createTrack(cfg: RaceConfig['track'], options: RaceOptions = {}): Track {
  const ratio = options.betThresholdRatio ?? cfg.betThresholdRatio
  const cellsAfterFinish = cfg.cellsAfterFinish
  return {
    columns: cfg.columns,
    cellsAfterFinish,
    totalCells: cfg.columns + cellsAfterFinish,
    betThresholdRatio: ratio,
    betThresholdColumn: Math.ceil(cfg.columns * ratio),
  }
}

export function createRace(config: RaceConfig, options: RaceOptions = {}): RaceState {
  const souls: Soul[] = []
  const count = options.soulCount ?? config.souls.count
  for (let i = 0; i < count; i++) {
    souls.push({ id: i, name: at(config.souls.names, i, 'souls.names'), position: 0, finishOrder: null })
  }
  return { track: createTrack(config.track, options), souls, turn: 1, finished: false, nextFinishOrder: 1 }
}

/** Lancer du joueur avec ses propres dés Distance (forgés ou spéciaux). */
export function rollPlayerDice(config: RaceConfig, soulCount: number, rng: Rng, dice: readonly DistanceDie[]): Roll {
  const faces: Face[] = dice.map((d) => at(d.faces, rng.int(d.faces.length), `faces du ${d.name}`))
  const soul: SoulId[] = []
  for (let i = 0; i < config.dice.soulDice; i++) soul.push(rng.int(soulCount))
  return { distance: faces.map((f) => f.value), faces, soul }
}

export interface OpponentOptions {
  /** Face retournée : les -1 de l'adversaire valent +1. */
  flipNegatives?: boolean
}

/** Une paire de l'adversaire : un dé Âme, un dé Distance de base (§2.5.2). */
export function rollOpponentPair(config: RaceConfig, soulCount: number, rng: Rng, options: OpponentOptions = {}): Roll {
  let value = at(config.dice.distanceFaces, rng.int(config.dice.distanceFaces.length), 'distanceFaces')
  if (options.flipNegatives && value < 0) value = -value
  return { distance: [value], faces: [plainFace(value)], soul: [rng.int(soulCount)] }
}

/** Contexte des modificateurs appliqués aux distances du joueur. */
export interface MoveContext {
  turn: number
  /** Clepsydre fêlée : au tour 1, négatif → sa valeur absolue, positif → +1. */
  clepsydre: boolean
  /** Âmes visées par un pari actif du joueur (Sceau du parieur). */
  bettedSouls: ReadonlySet<SoulId>
  /** Bonus du Sceau quand l'âme est pariée (+2 par-dessus le +1 de la face). */
  sealBonus: number
}

function effectiveDistance(face: Face, soul: SoulId, ctx: MoveContext | undefined, notes: string[]): number {
  let d = face.value
  if (!ctx) return d
  if (ctx.clepsydre && ctx.turn === 1) {
    if (d < 0) {
      notes.push(`Clepsydre : ${d} → +${-d}`)
      d = -d
    } else if (d > 0) {
      notes.push(`Clepsydre : +${d} → +${d + 1}`)
      d += 1
    }
  }
  if (face.effect === 'betSeal' && ctx.bettedSouls.has(soul)) {
    notes.push(`Sceau du parieur : +${ctx.sealBonus}`)
    d += ctx.sealBonus
  }
  return d
}

/**
 * Transforme les combinaisons choisies (dans l'ordre du joueur) en déplacements.
 * Si deux combinaisons visent la même âme, les distances se cumulent en un seul
 * déplacement, résolu à la place de la première occurrence.
 */
export function buildMoves(roll: Roll, combinations: readonly Combination[], source: MoveSource, ctx?: MoveContext): Move[] {
  const moves: Move[] = []
  for (const c of combinations) {
    const soul = at(roll.soul, c.soulDie, 'dé Âme')
    const face = roll.faces[c.distanceDie] ?? plainFace(at(roll.distance, c.distanceDie, 'dé Distance'))
    const notes: string[] = []
    const distance = effectiveDistance(face, soul, ctx, notes)
    const part = { soulDie: c.soulDie, distanceDie: c.distanceDie, distance }
    const existing = moves.find((m) => m.soul === soul)
    if (existing) {
      existing.distance += distance
      existing.parts = [...existing.parts, part]
      existing.notes = [...existing.notes, ...notes]
    } else {
      moves.push({ source, soul, distance, parts: [part], notes })
    }
  }
  return moves
}

/** Boussole des Limbes : l'âme du premier dés Âme inutilisés (un déplacement de +1 par dé, dans l'ordre des dés) avance de 1. Null si tous les dés Âme ont servi. */
export function unusedSoulMoves(roll: Roll, combinations: readonly Combination[]): Move[] {
  const used = new Set(combinations.map((c) => c.soulDie))
  return roll.soul.flatMap((soul, idx) => (used.has(idx) ? [] : [{ source: 'artefact' as const, soul, distance: 1, parts: [{ soulDie: idx, distanceDie: -1, distance: 1 }], notes: ['Boussole des Limbes'] }]))
}

/**
 * Combinaisons dans l'ordre naturel (dé Distance i avec dé Âme i) : le choix par défaut
 * de l'adversaire et de l'auto-jeu. Les dés Âme au-delà du nombre de dés Distance restent inutilisés.
 */
export function naturalCombinations(roll: Roll): Combination[] {
  return roll.distance.map((_, i) => ({ soulDie: i, distanceDie: i }))
}

/** Une association est complète quand chaque dé Distance a trouvé son dé Âme. */
export function isPairingComplete(roll: Roll, combinations: readonly Combination[]): boolean {
  return combinations.length === roll.distance.length
}

function occupantAt(souls: readonly Soul[], position: number, except: SoulId): Soul | undefined {
  return souls.find((s) => s.id !== except && s.position === position)
}

/** Applique un déplacement et ses collisions (§2.6). */
export function applyMove(state: RaceState, move: Move): { state: RaceState; result: MoveResult } {
  const { track } = state
  const maxCell = track.totalCells - 1
  const mover = at(state.souls, move.soul, 'âme')
  const from = mover.position

  let to = from
  let collision: Collision | null = null
  let blockedAtStart = false
  const souls = state.souls.map((s) => ({ ...s }))

  if (move.distance < 0 && from === 0) {
    blockedAtStart = true
  } else if (move.distance > 0) {
    to = Math.min(maxCell, from + move.distance)
    // Atterrir sur une case occupée : on saute devant l'âme percutée, en cascade.
    // La dernière case du plateau se partage (les ex æquo s'y retrouvent).
    const over: SoulId[] = []
    let occupant = occupantAt(souls, to, mover.id)
    while (occupant && to < maxCell) {
      over.push(occupant.id)
      to += 1
      occupant = occupantAt(souls, to, mover.id)
    }
    if (over.length > 0) collision = { kind: 'jump', over }
  } else if (move.distance < 0) {
    to = Math.max(0, from + move.distance)
    // Reculer sur une case occupée : échange de place. La ligne de départ se partage.
    const occupant = to > 0 ? occupantAt(souls, to, mover.id) : undefined
    if (occupant) {
      collision = { kind: 'swap', with: occupant.id, otherFrom: occupant.position, otherTo: from }
      at(souls, occupant.id, 'âme').position = from
    }
  }

  const crossedFinish = from < track.columns && to >= track.columns
  const moved = at(souls, mover.id, 'âme')
  moved.position = to
  let nextFinishOrder = state.nextFinishOrder
  if (crossedFinish) {
    moved.finishOrder = nextFinishOrder
    nextFinishOrder += 1
  }

  return {
    state: { ...state, souls, nextFinishOrder },
    result: { move, from, to, blockedAtStart, collision, crossedFinish },
  }
}

/** Clôture le tour : la course est finie dès qu'une âme a franchi l'arrivée (§2.7). */
export function endTurn(state: RaceState): RaceState {
  const finished = state.souls.some((s) => s.position >= state.track.columns)
  return { ...state, finished, turn: finished ? state.turn : state.turn + 1 }
}

export interface Ranked {
  soul: Soul
  /** 1 = première ; deux âmes à égalité partagent le rang. */
  rank: number
}

/** Classement définitif : position décroissante, puis ordre de franchissement de l'arrivée. */
export function ranking(state: RaceState): Ranked[] {
  const sorted = [...state.souls].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position
    const fa = a.finishOrder ?? Number.POSITIVE_INFINITY
    const fb = b.finishOrder ?? Number.POSITIVE_INFINITY
    return fa - fb
  })
  const out: Ranked[] = []
  sorted.forEach((soul, i) => {
    const prev = out[i - 1]
    const tied = prev !== undefined && prev.soul.position === soul.position && prev.soul.finishOrder === soul.finishOrder
    out.push({ soul, rank: tied ? prev.rank : i + 1 })
  })
  return out
}

export function isInBetZone(track: Track, position: number): boolean {
  return position >= track.betThresholdColumn
}
