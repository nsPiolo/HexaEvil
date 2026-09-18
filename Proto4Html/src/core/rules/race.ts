/**
 * Règles de la course — GDD proto4 §2.2 à §2.7, hors paris, boutique et effets.
 *
 * Tout est pur : un état entre, un état sort. La présentation ne fait qu'enchaîner
 * ces fonctions en y glissant des pauses pour que le testeur voie chaque geste.
 *
 * Piste à couloirs (GDD §2.2, §2.6) : la position d'une âme est sa COLONNE, son
 * couloir sert au choix de la case d'arrivée et au départage. Une colonne pleine
 * (toutes ses cases libres occupées) provoque la collision ; sinon l'âme se décale
 * dans la case vide la plus en bas. Le couloir 0 est celui du bas, prioritaire.
 * Certaines cases peuvent être bloquées (rétrécissement) : on n'y atterrit jamais.
 * Avec un seul couloir, on retrouve les règles d'origine : une case par colonne.
 */
import type { BlockedCell, RaceConfig, SpecialCell } from '../config/schema'
import { BOARD_EFFECTS, plainFace, type DistanceDie, type Face, type FaceEffect } from './dice'
import type { Rng } from './rng'
import { bossValue, hasBoss, type BossEffect } from './boss'

export type SoulId = number

export interface Soul {
  id: SoulId
  name: string
  /** Colonne occupée, 0 = ligne de départ. */
  position: number
  /** Couloir occupé, 0 = celui du bas (prioritaire). */
  lane: number
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
  /** Nombre de couloirs (GDD §2.2 : 1 au cercle 1, puis âmes − 4). */
  lanes: number
  /** Cases bloquées (rétrécissements), colonnes 1 à columns − 1. */
  blocked: readonly BlockedCell[]
  /** Cases spéciales du terrain : elles agissent sur l'âme qui s'y arrête (GDD §2.2). */
  specials: readonly SpecialCell[]
}

/** Deux âmes fusionnées par le Bât de chameau : tout déplacement de l'une déplace l'autre. */
export interface Fusion {
  front: SoulId
  back: SoulId
}

export interface RaceState {
  track: Track
  souls: readonly Soul[]
  /** Numéro du tour en cours, à partir de 1. */
  turn: number
  finished: boolean
  nextFinishOrder: number
  /** Face Gel : âmes que le tour adverse ne déplace pas, jusqu'à la fin du tour. */
  frozen: readonly SoulId[]
  /** Chaîne du Coccyte : paires liées par un échange, jusqu'à la fin du tour. */
  links: readonly (readonly [SoulId, SoulId])[]
  /** Bât de chameau : la fusion en cours, une seule par course. */
  fusion: Fusion | null
  /** Tribune infernale : case qui rapporte et pousse, posée avant la course. */
  tribune: { column: number; lane: number } | null
  /** Boss Porte-chaînes : âmes immobilisées, avec le dernier tour où elles le restent. */
  chained: readonly { soul: SoulId; untilTurn: number }[]
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
  /**
   * Ce qui a modifié ce déplacement, en codes : l'écran en fait une phrase dans sa langue
   * (`noteText`, presentation/messages.ts). Le moteur ne rédige pas.
   */
  notes: readonly MoveNote[]
  /**
   * Effets des faces qui composent ce déplacement et qui se résolvent contre le plateau
   * (`BOARD_EFFECTS`) : `applyMove` en a besoin, une distance seule ne les porte pas.
   */
  effects: readonly FaceEffect[]
  /**
   * Déplacement provoqué par un autre (lien, aimant, souffle, poussée) : il n'en provoque
   * pas à son tour. Sans ce garde-fou, Bât + Chaîne + Aimant s'entraînent sans fin.
   */
  induced?: boolean
}

/** Déplacement nu, pour les appels qui n'ont ni dés ni effets derrière eux. */
/**
 * Identifiants des mentions portées par un déplacement. `value` accompagne celles qui
 * annoncent un chiffre ; `from`/`to` la Clepsydre, qui dit la face avant et après.
 */
export type MoveNoteId =
  | 'harshNegatives'
  | 'slowWater'
  | 'clepsydreFlip'
  | 'clepsydreBoost'
  | 'seal'
  | 'compass'
  | 'bite'
  | 'riggedScales'
  | 'camelPack'
  | 'cocytusChain'
  | 'magnet'
  | 'explosive'
  | 'explosiveSelf'
  | 'stand'
  | 'trap'
  | 'boost'

export interface MoveNote {
  id: MoveNoteId
  value?: number
  from?: number
  to?: number
}

export function simpleMove(source: MoveSource, soul: SoulId, distance: number, notes: readonly MoveNote[] = []): Move {
  return { source, soul, distance, parts: [], notes, effects: [] }
}

export type Collision =
  | { kind: 'jump'; over: readonly SoulId[] }
  | { kind: 'swap'; with: SoulId; otherFrom: number; otherTo: number }

/** Pourquoi l'âme n'a pas atterri dans son couloir : case bloquée, ou occupée alors qu'une autre était vide. */
export type Detour = 'blocked' | 'occupied' | null

export interface MoveResult {
  move: Move
  from: number
  to: number
  fromLane: number
  toLane: number
  /** Décalage de couloir à l'arrivée (null : atterrit dans son couloir). */
  detour: Detour
  /** Distance négative sur la case de départ : l'âme ne bouge pas (§2.6). */
  blockedAtStart: boolean
  collision: Collision | null
  crossedFinish: boolean
  /** Face Gel, ou tour adverse sur une âme gelée : l'âme n'a pas bougé et ne bougera plus du tour. */
  frozen: boolean
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
  /** Couloirs de la piste (dépend du cercle) ; 1 par défaut. */
  lanes?: number
  /** Cases bloquées du cercle ; aucune par défaut. */
  blocked?: readonly BlockedCell[]
  /** Cases spéciales du terrain ; aucune par défaut. */
  specials?: readonly SpecialCell[]
}

export function createTrack(cfg: RaceConfig['track'], options: RaceOptions = {}): Track {
  const ratio = options.betThresholdRatio ?? cfg.betThresholdRatio
  const cellsAfterFinish = cfg.cellsAfterFinish
  const lanes = Math.max(1, options.lanes ?? 1)
  return {
    columns: cfg.columns,
    cellsAfterFinish,
    totalCells: cfg.columns + cellsAfterFinish,
    betThresholdRatio: ratio,
    betThresholdColumn: Math.ceil(cfg.columns * ratio),
    lanes,
    blocked: (options.blocked ?? []).filter((b) => b.lane < lanes && b.column > 0 && b.column < cfg.columns),
    specials: (options.specials ?? []).filter((c) => c.lane < lanes && c.column > 0 && c.column < cfg.columns),
  }
}

export function isBlocked(track: Track, column: number, lane: number): boolean {
  return track.blocked.some((b) => b.column === column && b.lane === lane)
}

/** Case spéciale de cette position, ou null. */
export function specialAt(track: Track, column: number, lane: number): SpecialCell | null {
  return track.specials.find((c) => c.column === column && c.lane === lane) ?? null
}

export function createRace(config: RaceConfig, options: RaceOptions = {}): RaceState {
  const souls: Soul[] = []
  const count = options.soulCount ?? config.souls.count
  const track = createTrack(config.track, options)
  // Ligne de départ commune : les âmes se répartissent sur les couloirs, du bas vers le haut.
  for (let i = 0; i < count; i++) {
    souls.push({ id: i, name: at(config.souls.names, i, 'souls.names'), position: 0, lane: i % track.lanes, finishOrder: null })
  }
  return { track, souls, turn: 1, finished: false, nextFinishOrder: 1, frozen: [], links: [], fusion: null, tribune: null, chained: [] }
}

/**
 * Faces qui se résolvent au moment même du lancer (forge.md) :
 *
 * - **Feu follet** : le dé est relancé une fois et le nouveau résultat s'impose ; s'il ressort
 *   Feu follet, il vaut +2 — on ne relance pas indéfiniment ;
 * - **Miroir** : la face prend la valeur d'un autre dé Distance du lancer. On ignore les autres
 *   Miroirs pour qu'aucune paire de miroirs ne se regarde ; sans autre dé, la face garde la sienne.
 *
 * Le Dé de Fraude (`?`, valeur 0 sur la face `wild`) suit la même logique que le Miroir mais copie
 * la **meilleure** face visible : c'est un dé qui triche, pas un dé qui reflète.
 */
function resolveRollFaces(faces: readonly Face[], dice: readonly DistanceDie[], rng: Rng): Face[] {
  const rolled = faces.map((face, i) => {
    if (face.effect !== 'willOWisp') return face
    const die = dice[i]
    if (!die) return face
    const again = at(die.faces, rng.int(die.faces.length), `faces du dé ${die.kind}`)
    return again.effect === 'willOWisp' ? { ...again, value: 2 } : again
  })
  return rolled.map((face, i) => {
    const others = rolled.filter((f, j) => j !== i && f.effect !== 'mirror' && !f.wild)
    if (face.effect === 'mirror') return others.length === 0 ? face : { ...face, value: at(others, 0, 'autre dé Distance').value }
    // Face `?` du Dé de Fraude : elle copie la plus forte des autres faces visibles.
    if (face.wild) return others.length === 0 ? face : { ...face, value: Math.max(...others.map((f) => f.value)) }
    return face
  })
}

export interface RollOptions {
  /** Dés Âme du lancer (Quatrième tête de Cerbère en ajoute un) ; `config.dice.soulDice` par défaut. */
  soulDice?: number
  /** Verrou de Minos : faces gardées du tour précédent, par index de dé. */
  locked?: Readonly<Record<number, Face>>
  /**
   * Relance jumelle : quand deux dés Âme ou plus désignent la même âme, tous sont relancés
   * une fois. Le second tirage est gardé tel quel, même s'il répète (artefacts.md n°1).
   */
  rerollTwins?: boolean
  /** Boss Géryon : une fois sur n, un dé Âme désigne l'âme voisine au lieu de la sienne. */
  lying?: number
}

/** Lancer du joueur avec ses propres dés Distance (forgés ou spéciaux). */
export function rollPlayerDice(config: RaceConfig, soulCount: number, rng: Rng, dice: readonly DistanceDie[], options: RollOptions = {}): Roll {
  const raw: Face[] = dice.map((d, i) => options.locked?.[i] ?? at(d.faces, rng.int(d.faces.length), `faces du dé ${d.kind}`))
  const faces = resolveRollFaces(raw, dice, rng)
  const count = options.soulDice ?? config.dice.soulDice
  const drawSouls = (): SoulId[] => Array.from({ length: count }, () => rng.int(soulCount))
  let soul = drawSouls()
  if (options.rerollTwins && new Set(soul).size < soul.length) soul = drawSouls()
  // Boss Géryon : le mensonge se glisse après le tirage, pour que la relance jumelle porte sur
  // ce que les dés ont vraiment dit — sinon l'artefact corrigerait le pouvoir du boss.
  if (options.lying && options.lying > 0) soul = soul.map((id) => (rng.int(options.lying!) === 0 ? (id + 1) % soulCount : id))
  return { distance: faces.map((f) => f.value), faces, soul }
}

export interface OpponentOptions {
  /** Face retournée : les -1 de l'adversaire valent +1. */
  flipNegatives?: boolean
  /** Boss Le Minotaure : ses distances positives gagnent n cases. */
  boost?: number
  /**
   * Boss Le stagiaire promu : il lit vos tickets. Ses paires visent d'abord une de vos âmes
   * pariées et la font reculer. Vide = il tire au hasard comme d'habitude.
   */
  targets?: readonly SoulId[]
}

/** Une paire de l'adversaire : un dé Âme, un dé Distance de base (§2.5.2). */
export function rollOpponentPair(config: RaceConfig, soulCount: number, rng: Rng, options: OpponentOptions = {}): Roll {
  let value = at(config.dice.distanceFaces, rng.int(config.dice.distanceFaces.length), 'distanceFaces')
  if (options.flipNegatives && value < 0) value = -value
  if (options.boost && value > 0) value += options.boost
  const targets = options.targets ?? []
  if (targets.length > 0) {
    // Il vise vos paris et les fait reculer : la face devient négative, l'âme est une des vôtres.
    value = -Math.abs(value === 0 ? 1 : value)
    return { distance: [value], faces: [plainFace(value)], soul: [at(targets, rng.int(targets.length), 'âme pariée')] }
  }
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
  /**
   * Effets de boss qui pèsent sur toute distance, la vôtre comme celle de l'adversaire
   * (Minos aggrave les reculs, le Noyé ralentit les avancées). Voir `bossContext`.
   */
  boss?: { harshNegatives?: number; slowWater?: number }
}

/** Contexte minimal pour l'adversaire : il subit les effets de boss, pas vos artefacts. */
export function bossContext(turn: number, effects: readonly BossEffect[]): MoveContext {
  return { turn, clepsydre: false, bettedSouls: new Set(), sealBonus: 0, boss: bossDistanceMods(effects) }
}

/** Part du pouvoir de boss qui modifie les distances, extraite une fois pour toutes. */
export function bossDistanceMods(effects: readonly BossEffect[]): { harshNegatives?: number; slowWater?: number } {
  const mods: { harshNegatives?: number; slowWater?: number } = {}
  const harsh = bossValue(effects, 'harshNegatives')
  if (harsh !== null) mods.harshNegatives = harsh
  const slow = bossValue(effects, 'slowWater')
  if (slow !== null) mods.slowWater = slow
  return mods
}

function effectiveDistance(face: Face, soul: SoulId, ctx: MoveContext | undefined, notes: MoveNote[]): number {
  let d = face.value
  if (!ctx) return d
  // Pouvoir de boss d'abord : il pèse sur la face sortie, avant tout ce que le joueur y ajoute.
  if (ctx.boss?.harshNegatives && d < 0) {
    d -= ctx.boss.harshNegatives
    notes.push({ id: 'harshNegatives', value: d })
  }
  if (ctx.boss?.slowWater && d > 0) {
    d = Math.max(0, d - ctx.boss.slowWater)
    notes.push({ id: 'slowWater', value: d })
  }
  if (ctx.clepsydre && ctx.turn === 1) {
    if (d < 0) {
      notes.push({ id: 'clepsydreFlip', from: d, to: -d })
      d = -d
    } else if (d > 0) {
      notes.push({ id: 'clepsydreBoost', from: d, to: d + 1 })
      d += 1
    }
  }
  if (face.effect === 'betSeal' && ctx.bettedSouls.has(soul)) {
    notes.push({ id: 'seal', value: ctx.sealBonus })
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
    const notes: MoveNote[] = []
    const distance = effectiveDistance(face, soul, ctx, notes)
    const part = { soulDie: c.soulDie, distanceDie: c.distanceDie, distance }
    const effects = face.effect && BOARD_EFFECTS.includes(face.effect) ? [face.effect] : []
    const existing = moves.find((m) => m.soul === soul)
    if (existing) {
      existing.distance += distance
      existing.parts = [...existing.parts, part]
      existing.notes = [...existing.notes, ...notes]
      existing.effects = [...existing.effects, ...effects]
    } else {
      moves.push({ source, soul, distance, parts: [part], notes, effects })
    }
  }
  return moves
}

/** Boussole des Limbes : l'âme du premier dés Âme inutilisés (un déplacement de +1 par dé, dans l'ordre des dés) avance de 1. Null si tous les dés Âme ont servi. */
export function unusedSoulMoves(roll: Roll, combinations: readonly Combination[]): Move[] {
  const used = new Set(combinations.map((c) => c.soulDie))
  return roll.soul.flatMap((soul, idx) =>
    used.has(idx) ? [] : [{ source: 'artefact' as const, soul, distance: 1, parts: [{ soulDie: idx, distanceDie: -1, distance: 1 }], notes: [{ id: 'compass' }], effects: [] }],
  )
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

export interface CellChoice {
  lane: number
  /** Âme déjà sur la case retenue : il y aura collision. */
  occupant: Soul | null
  detour: Detour
}

/**
 * Choix de la case d'arrivée dans une colonne (GDD §2.6), en priorité dans le couloir
 * `preferredLane` :
 * 1. sa case est vide : on y va ;
 * 2. sa case est bloquée : une case vide de la colonne, la plus en bas ; sinon la case
 *    la plus en bas, et collision avec son occupante ;
 * 3. sa case est occupée : une autre case vide, la plus en bas ; sinon collision sur place.
 */
export function chooseCell(track: Track, souls: readonly Soul[], column: number, preferredLane: number, except: SoulId, frozenLanes = false): CellChoice {
  const occupantOf = (lane: number): Soul | null => souls.find((s) => s.id !== except && s.position === column && s.lane === lane) ?? null
  let open: number[] = []
  for (let l = 0; l < track.lanes; l++) if (!isBlocked(track, column, l)) open.push(l)
  if (open.length === 0) open = Array.from({ length: track.lanes }, (_, l) => l)
  const preferredOpen = open.includes(preferredLane)
  if (preferredOpen && !occupantOf(preferredLane)) return { lane: preferredLane, occupant: null, detour: null }
  // Couloirs gelés (boss Le Givre) : plus de déport, l'âme reste dans son couloir et y percute.
  if (frozenLanes && preferredOpen) return { lane: preferredLane, occupant: occupantOf(preferredLane), detour: null }
  const empty = open.find((l) => !occupantOf(l))
  if (empty !== undefined) return { lane: empty, occupant: null, detour: preferredOpen ? 'occupied' : 'blocked' }
  const lane = preferredOpen ? preferredLane : at(open, 0, 'couloir')
  return { lane, occupant: occupantOf(lane), detour: preferredOpen ? null : 'blocked' }
}

/** Règles de déplacement ouvertes par les artefacts et la forge (artefacts.md, forge.md). */
export interface MoveRules {
  /** Semelles de plomb : reculer sur une âme en zone de fin fait sauter derrière au lieu d'échanger. */
  semelles?: boolean
  /** Balance truquée : l'âme échangée avance d'une case de plus. */
  balance?: boolean
  /** Chaîne du Coccyte : un échange lie les deux âmes jusqu'à la fin du tour. */
  chaine?: boolean
  /** Bât de chameau : la première percussion de la course fusionne les deux âmes. */
  bat?: boolean
  /** Tribune infernale : pièces versées et poussée quand une âme s'arrête sur la case. */
  tribune?: { coins: number; push: number }
  /** Boss Cerbère : l'âme percutée est mordue et recule de n cases après le saut. */
  bite?: number
  /** Boss Phlégyas : reculer sur une âme la pousse en arrière au lieu d'échanger. */
  pushBack?: boolean
  /** Boss Le Givre : plus de déport de couloir, on percute l'occupante de son propre couloir. */
  frozenLanes?: boolean
  /** Boss Le Porte-chaînes : l'âme percutée est immobilisée pendant n tours. */
  chainTurns?: number
  /**
   * Âmes sur lesquelles le joueur a un pari ouvert : seules elles font payer la case payante
   * (GDD §2.2). Absent = aucun pari, la case ne rapporte rien — le moteur ne devine pas les
   * tickets, c'est l'appelant qui les lui donne.
   */
  bettedSouls?: ReadonlySet<SoulId>
}

/** Règles de déplacement imposées par le pouvoir de boss, à fusionner avec celles du joueur. */
export function bossMoveRules(effects: readonly BossEffect[]): MoveRules {
  const r: MoveRules = {}
  const bite = bossValue(effects, 'bite')
  if (bite !== null) r.bite = bite
  if (hasBoss(effects, 'pushBack')) r.pushBack = true
  if (hasBoss(effects, 'frozenLanes')) r.frozenLanes = true
  const chain = bossValue(effects, 'chained')
  if (chain !== null) r.chainTurns = chain
  return r
}

/** Distance réelle de la face Bond : jusqu'à l'âme suivante, sinon la valeur de la face. */
function leapDistance(state: RaceState, soul: SoulId, fallback: number): number {
  const from = at(state.souls, soul, 'âme').position
  const ahead = state.souls.filter((s) => s.id !== soul && s.position > from).map((s) => s.position)
  if (ahead.length === 0) return fallback
  const next = Math.min(...ahead)
  // L'arrivée ne se franchit pas par un Bond : on s'arrête sur la dernière case avant.
  const target = next >= state.track.columns ? state.track.columns - 1 : next
  return Math.max(0, target - from)
}

/** L'âme immédiatement derrière une colonne, ou null (face Aimant). */
function soulBehind(state: RaceState, column: number, except: SoulId): Soul | null {
  const behind = state.souls.filter((s) => s.id !== except && s.position < column)
  if (behind.length === 0) return null
  return behind.reduce((best, s) => (s.position > best.position ? s : best))
}

/** Partenaire lié à une âme : fusion du Bât, ou chaîne du Coccyte. */
function partnersOf(state: RaceState, soul: SoulId): SoulId[] {
  const out: SoulId[] = []
  if (state.fusion) {
    if (state.fusion.front === soul) out.push(state.fusion.back)
    if (state.fusion.back === soul) out.push(state.fusion.front)
  }
  for (const [a, b] of state.links) {
    if (a === soul) out.push(b)
    if (b === soul) out.push(a)
  }
  return [...new Set(out)]
}

export interface MoveOutcome {
  state: RaceState
  result: MoveResult
  /**
   * Déplacements induits, à résoudre juste après celui-ci : partenaire lié ou fusionné,
   * âme aspirée par l'Aimant, âmes soufflées par la face Explosive, poussée de la Tribune.
   * Ils portent `induced` : ils n'en induisent pas d'autres, un déplacement induit par âme
   * et par tour (artefacts.md § Combinaisons à surveiller).
   */
  follow: Move[]
  /** Pièces gagnées par ce déplacement (Tribune infernale, case payante). */
  coins: number
}

/** Applique un déplacement, son choix de case et ses collisions (§2.6), règles d'objets comprises. */
export function applyMove(state: RaceState, move: Move, rules: MoveRules = {}): MoveOutcome {
  const { track } = state
  const maxCell = track.totalCells - 1
  const mover = at(state.souls, move.soul, 'âme')
  const from = mover.position
  const fromLane = mover.lane

  // Face Gel : l'âme désignée ne bouge pas et devient intouchable par le tour adverse.
  if (move.effects.includes('freeze')) {
    const frozen = state.frozen.includes(move.soul) ? state.frozen : [...state.frozen, move.soul]
    return {
      state: { ...state, frozen },
      result: { move, from, to: from, fromLane, toLane: fromLane, detour: null, blockedAtStart: false, collision: null, crossedFinish: false, frozen: true },
      follow: [],
      coins: 0,
    }
  }
  // Boss Le Porte-chaînes : une âme enchaînée ne bouge plus, quelle que soit la source.
  if (state.chained.some((c) => c.soul === move.soul && state.turn <= c.untilTurn)) {
    return {
      state,
      result: { move, from, to: from, fromLane, toLane: fromLane, detour: null, blockedAtStart: false, collision: null, crossedFinish: false, frozen: true },
      follow: [],
      coins: 0,
    }
  }
  // Le tour adverse ne déplace pas une âme gelée.
  if (move.source === 'opponent' && state.frozen.includes(move.soul)) {
    return {
      state,
      result: { move, from, to: from, fromLane, toLane: fromLane, detour: null, blockedAtStart: false, collision: null, crossedFinish: false, frozen: true },
      follow: [],
      coins: 0,
    }
  }

  const distance = move.effects.includes('leap') ? leapDistance(state, move.soul, move.distance) : move.distance

  let to = from
  let toLane = fromLane
  let detour: Detour = null
  let collision: Collision | null = null
  let blockedAtStart = false
  let fusion = state.fusion
  let links = state.links
  let chained = state.chained
  const souls = state.souls.map((s) => ({ ...s }))
  const follow: Move[] = []

  if (distance < 0 && from === 0) {
    blockedAtStart = true
  } else if (distance > 0) {
    to = Math.min(maxCell, from + distance)
    // Colonne pleine : on percute et on saute devant, en cascade, en rechoisissant la case
    // à chaque colonne. La dernière case du plateau se partage (les arrivées s'y empilent).
    const over: SoulId[] = []
    for (;;) {
      const choice = chooseCell(track, souls, to, fromLane, mover.id, rules.frozenLanes)
      toLane = choice.lane
      detour = choice.detour
      if (!choice.occupant || to >= maxCell) break
      // Bât de chameau : la première percussion de la course fusionne au lieu de faire sauter.
      // L'âme percutée reste devant, la percutante se range juste derrière.
      if (rules.bat && fusion === null && !move.induced) {
        fusion = { front: choice.occupant.id, back: mover.id }
        to = Math.max(0, to - 1)
        const behind = chooseCell(track, souls, to, fromLane, mover.id, rules.frozenLanes)
        toLane = behind.lane
        detour = behind.detour
        break
      }
      over.push(choice.occupant.id)
      to += 1
    }
    if (over.length > 0) {
      collision = { kind: 'jump', over }
      if (!move.induced) {
        // Boss Cerbère : la percutée est mordue et recule après le saut.
        if (rules.bite) for (const id of over) follow.push({ ...simpleMove('artefact', id, -rules.bite, [{ id: 'bite', value: rules.bite }]), induced: true })
        // Boss Le Porte-chaînes : la percutée est immobilisée pour les tours suivants.
        if (rules.chainTurns) chained = [...chained, ...over.map((id) => ({ soul: id, untilTurn: state.turn + rules.chainTurns! }))]
      }
    }
  } else if (distance < 0) {
    to = Math.max(0, from + distance)
    if (to > 0) {
      // Colonne pleine en reculant : échange de place avec l'occupante de la case retenue.
      // La ligne de départ se partage.
      let choice = chooseCell(track, souls, to, fromLane, mover.id, rules.frozenLanes)
      // Semelles de plomb : on n'échange plus avec une âme en zone de fin, on se range derrière,
      // tant qu'on y reste. Dès qu'on sort de la zone, la règle normale (échange) reprend.
      while (rules.semelles && choice.occupant && isInBetZone(track, to) && to > 0) {
        to -= 1
        choice = chooseCell(track, souls, to, fromLane, mover.id, rules.frozenLanes)
      }
      toLane = choice.lane
      detour = choice.detour
      if (choice.occupant && to > 0) {
        const other = at(souls, choice.occupant.id, 'âme')
        if (rules.pushBack) {
          // Boss Phlégyas : dans le Styx on ne s'échange pas, on se pousse — les deux reculent.
          const pushed = Math.max(0, to - 1)
          collision = { kind: 'swap', with: other.id, otherFrom: to, otherTo: pushed }
          other.position = pushed
        } else {
          collision = { kind: 'swap', with: other.id, otherFrom: to, otherTo: from }
          other.position = from
          other.lane = fromLane
        }
        // Balance truquée : l'âme échangée gagne une case de plus.
        if (rules.balance && !move.induced) follow.push({ ...simpleMove('artefact', other.id, 1, [{ id: 'riggedScales' }]), induced: true })
        // Chaîne du Coccyte : les deux âmes restent liées jusqu'à la fin du tour.
        if (rules.chaine) links = [...links, [mover.id, other.id] as const]
      }
    }
  }

  const crossedFinish = from < track.columns && to >= track.columns
  const moved = at(souls, mover.id, 'âme')
  moved.position = to
  moved.lane = toLane
  let nextFinishOrder = state.nextFinishOrder
  if (crossedFinish) {
    moved.finishOrder = nextFinishOrder
    nextFinishOrder += 1
  }

  let coins = 0
  if (!move.induced) {
    // Partenaires liés ou fusionnés : ils suivent de la même distance.
    for (const id of partnersOf(state, move.soul)) {
      if (id === move.soul || distance === 0) continue
      follow.push({ ...simpleMove('artefact', id, distance, [{ id: state.fusion ? 'camelPack' : 'cocytusChain' }]), induced: true })
    }
    // Face Aimant : l'âme juste derrière prend la case libérée.
    if (move.effects.includes('magnet') && to > from) {
      const behind = soulBehind(state, from, move.soul)
      if (behind) follow.push({ ...simpleMove('artefact', behind.id, 1, [{ id: 'magnet' }]), induced: true })
    }
    // Face Explosive : souffle les voisines de la case d'arrivée, ou l'âme elle-même si elle n'a percuté personne.
    if (move.effects.includes('explosive')) {
      if (collision) {
        for (const s of state.souls) {
          if (s.id === move.soul || s.position === 0) continue
          if (s.position === to - 1 || s.position === to + 1) follow.push({ ...simpleMove('artefact', s.id, -1, [{ id: 'explosive' }]), induced: true })
        }
      } else {
        follow.push({ ...simpleMove('artefact', move.soul, -1, [{ id: 'explosiveSelf' }]), induced: true })
      }
    }
    // Tribune infernale : l'âme qui s'y arrête paie le spectacle et repart poussée.
    const tribune = state.tribune
    if (rules.tribune && tribune && to === tribune.column && toLane === tribune.lane) {
      coins += rules.tribune.coins
      if (rules.tribune.push > 0) follow.push({ ...simpleMove('artefact', move.soul, rules.tribune.push, [{ id: 'stand' }]), induced: true })
    }
    // Cases spéciales du terrain (GDD §2.2) : elles n'agissent qu'à l'arrêt, pas au passage.
    const cell = specialAt(track, to, toLane)
    if (cell) {
      // La case payante ne verse que sur une âme pariée : on encaisse sur son propre ticket,
      // pas sur la course des autres.
      if (cell.kind === 'gold' && rules.bettedSouls?.has(move.soul)) coins += cell.value
      if (cell.kind === 'trap') follow.push({ ...simpleMove('artefact', move.soul, -cell.value, [{ id: 'trap', value: cell.value }]), induced: true })
      if (cell.kind === 'boost') follow.push({ ...simpleMove('artefact', move.soul, cell.value, [{ id: 'boost', value: cell.value }]), induced: true })
    }
  }

  return {
    state: { ...state, souls, nextFinishOrder, frozen: state.frozen, links, fusion, chained },
    result: { move, from, to, fromLane, toLane, detour, blockedAtStart, collision, crossedFinish, frozen: false },
    follow,
    coins,
  }
}

/**
 * Prévisualisation d'un déplacement : exactement les règles d'`applyMove` (case d'arrivée,
 * détour de couloir, percute/saute, recul/échange, ligne de départ, arrivée), sans rien
 * modifier ni toucher au hasard. `applyMove` étant pur, on renvoie simplement son résultat
 * et on jette l'état produit : deux appels successifs donnent le même résultat, et résoudre
 * ensuite donne ce qui a été montré.
 */
export function previewMove(state: RaceState, soul: SoulId, distance: number, effects: readonly FaceEffect[] = [], rules: MoveRules = {}): MoveResult {
  return applyMove(state, { ...simpleMove('player', soul, distance), effects }, rules).result
}

/**
 * Clôture le tour : la course est finie dès qu'une âme a franchi l'arrivée (§2.7). Le gel et
 * les chaînes ne durent qu'un tour et tombent ici ; la fusion du Bât tient toute la course.
 */
export function endTurn(state: RaceState, effects: readonly BossEffect[] = []): RaceState {
  const finished = state.souls.some((s) => s.position >= state.track.columns)
  const turn = finished ? state.turn : state.turn + 1
  // Boss Le Souffle : tout le monde recule d'un cran en fin de tour. Le recul est uniforme, donc
  // sans collision : l'ordre relatif ne change pas, seule la course s'allonge. Sur le tour
  // d'arrivée on n'y touche pas — le classement est déjà joué.
  const gust = bossValue(effects, 'backdraft')
  const souls = !finished && gust ? state.souls.map((so) => ({ ...so, position: Math.max(0, so.position - gust) })) : state.souls
  return { ...state, souls, finished, turn, frozen: [], links: [], chained: state.chained.filter((c) => c.untilTurn >= turn) }
}

/**
 * Pose la tribune (artefact Tribune infernale) sur une case libre hors départ et hors zone de
 * fin. Renvoie l'état inchangé si la case ne convient pas : c'est l'appelant qui choisit.
 */
export function placeTribune(state: RaceState, column: number, lane: number): RaceState {
  if (column <= 0 || column >= state.track.betThresholdColumn) return state
  if (lane < 0 || lane >= state.track.lanes || isBlocked(state.track, column, lane)) return state
  return { ...state, tribune: { column, lane } }
}

export interface Ranked {
  soul: Soul
  /** 1 = première ; deux âmes à égalité (même case partagée) ont le même rang. */
  rank: number
}

/**
 * Classement définitif (§2.7) : colonne décroissante, puis couloir (le plus bas devant),
 * puis ordre de franchissement de l'arrivée pour les âmes empilées sur la dernière case.
 * Il ne reste d'ex æquo que sur les cases partagées (départ, dernière case).
 */
export function ranking(state: RaceState): Ranked[] {
  const sorted = [...state.souls].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position
    if (a.lane !== b.lane) return a.lane - b.lane
    const fa = a.finishOrder ?? Number.POSITIVE_INFINITY
    const fb = b.finishOrder ?? Number.POSITIVE_INFINITY
    return fa - fb
  })
  const out: Ranked[] = []
  sorted.forEach((soul, i) => {
    const prev = out[i - 1]
    const tied = prev !== undefined && prev.soul.position === soul.position && prev.soul.lane === soul.lane && prev.soul.finishOrder === soul.finishOrder
    out.push({ soul, rank: tied ? prev.rank : i + 1 })
  })
  return out
}

export function isInBetZone(track: Track, position: number): boolean {
  return position >= track.betThresholdColumn
}
