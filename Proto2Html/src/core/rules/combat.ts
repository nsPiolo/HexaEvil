/**
 * Effets à la pose et résolution du combat — règles E1..E9, F5..F12.
 *
 * Deux invariants tenus par ce module :
 *  - F6 : toute la résolution LIT un instantané et n'ÉCRIT que des `damage`,
 *    appliqués simultanément. Une Tuile détruite à l'étape 2 riposte quand
 *    même à l'étape 3, et le résultat ne dépend pas de l'ordre de parcours.
 *  - F10 : la destruction se fait par vagues simultanées jusqu'à stabilité,
 *    donc indépendamment de l'ordre de retrait.
 *
 * Le module produit en plus, **à la demande**, une trace d'étapes (`U16`) pour
 * que l'affichage puisse rejouer la résolution. La trace est un flux
 * d'événements : elle n'influence aucun calcul. L'attaque et la riposte visent
 * des Tuiles disjointes, les montrer l'une après l'autre ne trahit donc pas la
 * simultanéité de `F6`.
 */

import { hexKey, neighbors } from '../hex/hexCoord'
import { viewBoard, type BoardView } from './derived'
import { isEnemyOf, matchesTarget } from './relations'
import type { GameConfig } from '../config/schema'
import type {
  ColorId,
  ForceChange,
  HexSpace,
  LogEntry,
  PlacedTile,
  ResolutionStep,
  StepKind,
} from './types'

export interface ResolutionResult {
  readonly tiles: readonly PlacedTile[]
  readonly spaces: readonly HexSpace[]
  readonly log: readonly LogEntry[]
  readonly destroyedUids: readonly number[]
  /** Vide si la trace n'a pas été demandée. */
  readonly steps: readonly ResolutionStep[]
}

type DamageMap = Map<number, number>

function addDamage(map: DamageMap, uid: number, amount: number): void {
  if (amount <= 0) return
  map.set(uid, (map.get(uid) ?? 0) + amount)
}

function applyDamage(tiles: readonly PlacedTile[], map: DamageMap): PlacedTile[] {
  if (map.size === 0) return [...tiles]
  return tiles.map((t) => {
    const extra = map.get(t.uid)
    return extra === undefined ? t : { ...t, damage: t.damage + extra }
  })
}

/** Variations de force entre deux états, pour l'animation. */
export function forceChanges(
  config: GameConfig,
  before: readonly PlacedTile[],
  after: readonly PlacedTile[],
): ForceChange[] {
  const beforeView = viewBoard(config, before)
  const afterView = viewBoard(config, after)
  const out: ForceChange[] = []
  for (const tile of before) {
    const still = afterView.byUid.get(tile.uid)
    if (!still) continue
    const from = beforeView.forceOf(tile)
    const to = afterView.forceOf(still)
    if (from !== to) out.push({ uid: tile.uid, typeId: tile.typeId, at: tile.at, from, to })
  }
  return out
}

/** Petit accumulateur d'étapes. Inerte si la trace n'est pas demandée. */
class StepRecorder {
  private readonly steps: ResolutionStep[] = []
  constructor(
    private readonly config: GameConfig,
    private readonly enabled: boolean,
  ) {}

  push(
    kind: StepKind,
    label: string,
    before: readonly PlacedTile[],
    after: readonly PlacedTile[],
    spaces: readonly HexSpace[],
    focusUid: number | null,
    destroyed: readonly number[] = [],
  ): void {
    if (!this.enabled) return
    this.steps.push({
      kind,
      label,
      tiles: [...after],
      spaces: [...spaces],
      changes: forceChanges(this.config, before, after),
      destroyed: [...destroyed],
      focusUid,
    })
  }

  /** Étape de destruction : les Tuiles condamnées sont encore là, pour être animées. */
  pushDestroy(
    label: string,
    tiles: readonly PlacedTile[],
    spaces: readonly HexSpace[],
    destroyed: readonly number[],
    focusUid: number | null,
  ): void {
    if (!this.enabled) return
    this.steps.push({
      kind: 'destroy',
      label,
      tiles: [...tiles],
      spaces: [...spaces],
      changes: [],
      destroyed: [...destroyed],
      focusUid,
    })
  }

  all(): ResolutionStep[] {
    return this.steps
  }
}

/**
 * F10 / F11 : retire par vagues simultanées toutes les Tuiles à force ≤ 0, en
 * recalculant les dérivées entre chaque vague — une aura perdue peut en tuer
 * d'autres (cascade). Chaque vague est une étape d'animation distincte : c'est
 * ce qui rend `F11` visible.
 */
export function resolveDestruction(
  config: GameConfig,
  tiles: readonly PlacedTile[],
  turn: number,
  recorder?: StepRecorder,
  spaces?: readonly HexSpace[],
  focusUid?: number | null,
): { tiles: PlacedTile[]; log: LogEntry[]; destroyedUids: number[] } {
  let current = [...tiles]
  const log: LogEntry[] = []
  const destroyedUids: number[] = []
  let wave = 0

  for (;;) {
    const view = viewBoard(config, current)
    const doomed = current.filter((t) => view.forceOf(t) <= 0)
    if (doomed.length === 0) break
    wave += 1
    for (const t of doomed) {
      destroyedUids.push(t.uid)
      log.push({
        turn,
        kind: 'destroyed',
        wave,
        text:
          `${t.typeId} (${t.side}) en (${t.at.q},${t.at.r}) détruite — force ${view.forceOf(t)}` +
          (wave > 1 ? ' [cascade F11]' : ''),
      })
    }
    const doomedUids = doomed.map((t) => t.uid)
    if (recorder && spaces) {
      const names = doomed.map((t) => t.typeId).join(', ')
      recorder.pushDestroy(
        wave === 1
          ? `${doomed.length > 1 ? 'Destructions' : 'Destruction'} : ${names} tombe${doomed.length > 1 ? 'nt' : ''} à 0 ou moins (F10).`
          : `Cascade (F11) vague ${wave} : ${names} — une aura perdue les fait tomber.`,
        current,
        spaces,
        doomedUids,
        focusUid ?? null,
      )
    }
    const doomedSet = new Set(doomedUids)
    current = current.filter((t) => !doomedSet.has(t.uid))
  }
  return { tiles: current, log, destroyedUids }
}

/** E1..E9 : effets `onPlace` de la Tuile posée. Une étape par effet. */
function applyOnPlaceEffects(
  config: GameConfig,
  tiles: readonly PlacedTile[],
  spaces: readonly HexSpace[],
  placedUid: number,
  turn: number,
  recorder: StepRecorder,
): { tiles: PlacedTile[]; spaces: HexSpace[]; log: LogEntry[] } {
  const log: LogEntry[] = []
  const view = viewBoard(config, tiles)
  const placed = view.byUid.get(placedUid)
  if (!placed) return { tiles: [...tiles], spaces: [...spaces], log }

  const def = view.defOf(placed)
  if (def.onPlace.length === 0) return { tiles: [...tiles], spaces: [...spaces], log }

  // E7 : une Tuile posée alors qu'elle est DÉJÀ muette ne déclenche pas ses effets.
  if (view.isSilenced(placed)) {
    const text = `${def.id} est muette (N01 adjacente, E7) : aucun effet à la pose.`
    log.push({ turn, kind: 'effect', text })
    recorder.push('effect', text, tiles, tiles, spaces, placedUid)
    return { tiles: [...tiles], spaces: [...spaces], log }
  }

  let currentTiles = [...tiles]
  let currentSpaces = [...spaces]

  // E5 : dans l'ordre de déclaration du type.
  for (const effect of def.onPlace) {
    const beforeTiles = currentTiles
    const labels: string[] = []

    switch (effect.kind) {
      case 'gainShields': {
        currentTiles = currentTiles.map((t) =>
          t.uid === placedUid ? { ...t, grantedShields: t.grantedShields + effect.amount } : t,
        )
        labels.push(`${def.id} gagne ${effect.amount} bouclier(s) à la pose.`)
        break
      }
      case 'damage': {
        // E6 : les dégâts d'effet IGNORENT les boucliers (F9).
        const damage: DamageMap = new Map()
        for (const other of view.neighborsOf(placed)) {
          if (!matchesTarget(effect.target, placed.side, other.side)) continue
          addDamage(damage, other.uid, effect.amount)
          labels.push(
            `${def.id} : −${effect.amount} force à ${other.typeId} (${other.side}) en (${other.at.q},${other.at.r}) — boucliers ignorés (E6).`,
          )
        }
        currentTiles = applyDamage(currentTiles, damage)
        break
      }
      case 'recolorSpaces': {
        // C11 : Espaces adjacents, libres comme occupés, jamais les bloqués.
        const targets = new Set(neighbors(placed.at).map(hexKey))
        let count = 0
        if (config.activeColors.includes(effect.color)) {
          currentSpaces = currentSpaces.map((s) => {
            if (!targets.has(hexKey(s.at)) || s.blocked) return s
            count += 1
            return { ...s, color: effect.color as ColorId }
          })
        }
        if (count > 0) labels.push(`${def.id} repeint ${count} Espace(s) adjacent(s) en ${effect.color} (C11).`)
        break
      }
    }

    for (const text of labels) log.push({ turn, kind: 'effect', text })
    if (labels.length > 0) {
      recorder.push('effect', labels.join(' '), beforeTiles, currentTiles, currentSpaces, placedUid)
    }
  }

  return { tiles: currentTiles, spaces: currentSpaces, log }
}

/** F5 : les 3 étapes, sur instantané, écritures simultanées. */
function resolveCombat(
  config: GameConfig,
  tiles: readonly PlacedTile[],
  spaces: readonly HexSpace[],
  placedUid: number,
  turn: number,
  recorder: StepRecorder,
): { tiles: PlacedTile[]; log: LogEntry[] } {
  const log: LogEntry[] = []
  const view = viewBoard(config, tiles)
  const placed = view.byUid.get(placedUid)
  if (!placed) return { tiles: [...tiles], log }

  // --- Étape 1 : instantané de TOUTES les Tuiles.
  const snapshot = new Map<number, { force: number; shields: number }>()
  for (const t of tiles) snapshot.set(t.uid, { force: view.forceOf(t), shields: view.shieldsOf(t) })
  const snapOf = (t: PlacedTile) => snapshot.get(t.uid) ?? { force: 0, shields: 0 }

  const attacker = snapOf(placed)
  // T7 : « adverse » se lit depuis la Tuile posée — les neutres sont hors combat.
  const enemies = view.neighborsOf(placed).filter((other) => isEnemyOf(placed.side, other.side))

  // --- Étape 2 : attaque en aire.
  const attackDamage: DamageMap = new Map()
  const attackLabels: string[] = []
  for (const target of enemies) {
    const snap = snapOf(target)
    const dealt = Math.max(0, attacker.force - snap.shields)
    addDamage(attackDamage, target.uid, dealt)
    const text = `${placed.typeId} (force ${attacker.force}) → ${target.typeId} (${target.side}) : ${attacker.force} − ${snap.shields} bouclier(s) = ${dealt} dégât(s).`
    log.push({ turn, kind: 'attack', text })
    attackLabels.push(text)
  }
  const afterAttack = applyDamage(tiles, attackDamage)
  if (enemies.length > 0) {
    recorder.push(
      'attack',
      `Attaque en aire : ${placed.typeId} frappe ${enemies.length} Tuile(s) adverse(s) avec ${attacker.force} de force (F8).`,
      tiles,
      afterAttack,
      spaces,
      placedUid,
    )
  }

  // --- Étape 3 : riposte plafonnée au MAXIMUM, lue dans l'instantané (F8).
  const riposteDamage: DamageMap = new Map()
  if (enemies.length > 0) {
    const maxForce = Math.max(...enemies.map((e) => snapOf(e).force))
    const taken = Math.max(0, maxForce - attacker.shields)
    addDamage(riposteDamage, placed.uid, taken)
    const text = `Riposte : max des forces adverses adjacentes = ${maxForce} (instantané), − ${attacker.shields} bouclier(s) = ${taken} dégât(s) sur ${placed.typeId}.`
    log.push({ turn, kind: 'riposte', text })
    const afterRiposte = applyDamage(afterAttack, riposteDamage)
    recorder.push(
      'riposte',
      `Riposte : seule la plus forte adverse répond — ${maxForce} de force, ${taken} dégât(s) encaissé(s) (F8).`,
      afterAttack,
      afterRiposte,
      spaces,
      placedUid,
    )
    return { tiles: afterRiposte, log }
  }

  return { tiles: afterAttack, log }
}

/** Étapes 5 et 6 de A3, chacune suivie de son contrôle de destruction (F10). */
export function resolvePlacement(
  config: GameConfig,
  tiles: readonly PlacedTile[],
  spaces: readonly HexSpace[],
  placedUid: number,
  turn: number,
  trace = false,
): ResolutionResult {
  const log: LogEntry[] = []
  const destroyedUids: number[] = []
  const recorder = new StepRecorder(config, trace)

  const placedTile = tiles.find((t) => t.uid === placedUid)
  if (placedTile) {
    const before = tiles.filter((t) => t.uid !== placedUid)
    recorder.push(
      'place',
      `${placedTile.typeId} posée en (${placedTile.at.q},${placedTile.at.r})` +
        (placedTile.placementBonus > 0 ? ` — +${placedTile.placementBonus} de force par allié adjacent (F3).` : '.'),
      before,
      tiles,
      spaces,
      placedUid,
    )
  }

  const effects = applyOnPlaceEffects(config, tiles, spaces, placedUid, turn, recorder)
  log.push(...effects.log)
  const afterEffects = resolveDestruction(config, effects.tiles, turn, recorder, effects.spaces, placedUid)
  log.push(...afterEffects.log)
  destroyedUids.push(...afterEffects.destroyedUids)

  const combat = resolveCombat(config, afterEffects.tiles, effects.spaces, placedUid, turn, recorder)
  log.push(...combat.log)
  const afterCombat = resolveDestruction(config, combat.tiles, turn, recorder, effects.spaces, placedUid)
  log.push(...afterCombat.log)
  destroyedUids.push(...afterCombat.destroyedUids)

  return {
    tiles: afterCombat.tiles,
    spaces: effects.spaces,
    log,
    destroyedUids,
    steps: recorder.all(),
  }
}

export { viewBoard, StepRecorder, type BoardView }
