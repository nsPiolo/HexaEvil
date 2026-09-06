/**
 * Le Tick : les 6 phases de `C2`, dans l'ordre strict, entités traitées une par
 * une par ID croissant (`C3`).
 *
 * Ce module travaille **en mutation sur un état déjà cloné** par `encounter.ts` :
 * la frontière publique reste pure (`runTick(state) => nouvel état`), mais
 * l'intérieur d'un Tick est séquentiel par nature (`C3`) et s'écrit bien mieux
 * ainsi qu'en reconstruisant l'état à chaque entité.
 */
import { key } from '../hex/hexCoord'
import { destinationThrough, isWorkableBy, spawnersOf, tileAt } from './board'
import { acceptsAsInput, chooseRecipeIndex, tileType } from './recipes'
import { addTo, firstAvailable, removeFrom, removeOne } from './storage'
import type { EntityState, GameState, RecipeDef, Side, SpendCause, TileState } from './types'

const SIDE_ORDER: readonly Side[] = ['player', 'demon']

const budgetOf = (state: GameState, side: Side): number =>
  side === 'player' ? state.config.soulBudget : state.config.minionBudget

const nameOf = (side: Side): string => (side === 'player' ? 'Âme' : 'Sbire')

const log = (state: GameState, side: Side | 'system', text: string): void => {
  state.log.push({ tick: state.tick, side, text })
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400)
}

const recipeOf = (state: GameState, tile: TileState, index: number): RecipeDef => {
  const recipe = tileType(state.config, tile.typeId).recipes?.[index]
  if (!recipe) throw new Error(`Recette ${index} absente de « ${tile.typeId} »`)
  return recipe
}

/**
 * Retire une entité du jeu et ventile la cause (`K1`). `P8` : les Ressources IN
 * d'une production en cours sont remboursées.
 *
 * Exporté parce que `P8` est aujourd'hui inatteignable par le jeu normal (une
 * entité en production ne se déplace pas, `D7`) : c'est la seule façon de le
 * couvrir par un test, et le point d'entrée des futures règles de destruction.
 */
export const destroyEntity = (state: GameState, entity: EntityState, cause: SpendCause): void => {
  if (entity.production) {
    // P8 — les Ressources IN déjà consommées retournent dans l'inputStorage.
    const tile = tileAt(state, entity.space)
    const recipe = tile ? recipeOf(state, tile, entity.production.recipeIndex) : undefined
    if (tile && recipe?.in) {
      addTo(tile.input, recipe.in)
      log(state, entity.side, `${nameOf(entity.side)} #${entity.id} détruite : production remboursée (P8).`)
    }
  }
  state.entities = state.entities.filter((e) => e.id !== entity.id)
  state.spent[entity.side][cause] += 1
}

/** Phase 1 / 4 — Apparition (`C4`, `C5`, `X1`). */
export const spawnPhase = (state: GameState, side: Side): void => {
  const budget = budgetOf(state, side)
  for (const spawner of spawnersOf(state.config, state, side)) {
    if (state.spawned[side] >= budget) return // C5 — la réserve est épuisée
    const entity: EntityState = {
      id: state.nextEntityId++,
      side,
      space: spawner.coord,
      visited: [key(spawner.coord)],
      producedHere: false,
    }
    state.entities.push(entity)
    state.spawned[side] += 1
  }
}

/** Applique la progression d'une Recette, bornée à 0 (`R6`, `R8`, `E8`). */
const applyProgress = (state: GameState, amount: number): void => {
  if (amount >= 0) {
    state.progress += amount
    return
  }
  const before = state.progress
  state.progress = Math.max(0, state.progress + amount)
  const applied = before - state.progress
  state.drain.applied += applied
  state.drain.absorbed += -amount - applied
}

/** `P4`, `P5` — dépose les OUT, fait varier la progression, libère l'entité. */
const completeProduction = (state: GameState, entity: EntityState, tile: TileState, recipe: RecipeDef): void => {
  if (recipe.out) addTo(tile.output, recipe.out)
  if (recipe.progress !== undefined) {
    applyProgress(state, recipe.progress)
    const verb = recipe.progress >= 0 ? 'fait progresser de' : 'retire'
    log(
      state,
      entity.side,
      `${nameOf(entity.side)} #${entity.id} ${verb} ${Math.abs(recipe.progress)} l’Escalier ` +
        `(total ${state.progress}).`,
    )
  }
  tile.productionsDone += 1
  entity.production = undefined
  entity.producedHere = true // P1 — pas de seconde production sur le même Espace
}

/** Phase 2 / 5 — Production (`P1`-`P8`). */
export const productionPhase = (state: GameState, side: Side): void => {
  for (const entity of [...state.entities].filter((e) => e.side === side).sort((a, b) => a.id - b.id)) {
    const tile = tileAt(state, entity.space)
    if (!tile) continue

    if (entity.production) {
      // Production en cours : elle est menée à terme par l'entité qui l'a démarrée (`P3`).
      const recipe = recipeOf(state, tile, entity.production.recipeIndex)
      entity.production.ticksDone += 1
      if (entity.production.ticksDone >= recipe.ticks) completeProduction(state, entity, tile, recipe)
      continue
    }

    // P1 — démarrage : Bâtiment exploitable, mains vides, pas déjà produit ici.
    if (!isWorkableBy(tile, side)) continue
    if (entity.carrying !== undefined) continue
    if (entity.producedHere) continue

    const type = tileType(state.config, tile.typeId)
    const index = chooseRecipeIndex(type, side, tile.input)
    if (index === undefined) continue // P2 — réserve insuffisante, l'entité n'est pas bloquée (P7)

    const recipe = recipeOf(state, tile, index)
    if (recipe.in) removeFrom(tile.input, recipe.in) // P2
    entity.production = { recipeIndex: index, ticksDone: 1 }
    if (recipe.ticks <= 1) completeProduction(state, entity, tile, recipe) // P5
  }
}

/** La Sortie désignée par le tourniquet (`D8`), sans faire avancer le compteur. */
const currentExit = (tile: TileState): number | undefined => {
  if (tile.exits.length === 0) return undefined
  return tile.exits[tile.roundRobin % tile.exits.length]
}

/** `D12` — ramassage au départ, dans la limite de la capacité de portage (`R7`). */
const pickUp = (state: GameState, entity: EntityState, tile: TileState): void => {
  if (entity.carrying !== undefined) return
  if (state.config.carryCapacity[entity.side] < 1) return
  const resource = firstAvailable(tile.output)
  if (resource === undefined) return
  removeOne(tile.output, resource)
  entity.carrying = resource
}

/** `D10`, `D11` — dépôt à l'arrivée si la Ressource est un IN de la Recette. */
const deposit = (state: GameState, entity: EntityState, tile: TileState): void => {
  if (entity.carrying === undefined) return
  if (!isWorkableBy(tile, entity.side)) return
  const type = tileType(state.config, tile.typeId)
  if (!acceptsAsInput(type, entity.side, entity.carrying)) return // D11 — elle la conserve
  addTo(tile.input, { [entity.carrying]: 1 })
  entity.carrying = undefined
}

/** Phase 3 / 6 — Déplacement (`D4`-`D18`). */
export const movementPhase = (state: GameState, side: Side): void => {
  for (const entity of [...state.entities].filter((e) => e.side === side).sort((a, b) => a.id - b.id)) {
    if (entity.production) continue // D7 — en production, l'entité ne se déplace pas

    const tile = tileAt(state, entity.space)
    if (!tile) continue

    const exit = currentExit(tile)
    const target = exit === undefined ? undefined : destinationThrough(state, tile, exit)

    if (target === undefined) {
      // D6 — déplacement impossible : l'entité est détruite. D9 : le compteur ne bouge pas.
      const cause: SpendCause = tile.exits.length === 0 && isDeliveryTile(state, tile, side) ? 'delivered' : 'blocked'
      log(
        state,
        side,
        cause === 'delivered'
          ? `${nameOf(side)} #${entity.id} se consume à l’Escalier après sa livraison (D6).`
          : `${nameOf(side)} #${entity.id} détruite : aucun déplacement possible depuis (${tile.coord.q},${tile.coord.r}) (D6).`,
      )
      destroyEntity(state, entity, cause)
      continue
    }

    if (entity.visited.includes(key(target))) {
      // D16 / D17 — retour en arrière : détruite avant d'entrer, charge perdue.
      log(
        state,
        side,
        `${nameOf(side)} #${entity.id} détruite : retour sur (${target.q},${target.r}), déjà traversé (D16).`,
      )
      destroyEntity(state, entity, 'backtrack')
      continue
    }

    pickUp(state, entity, tile) // D12 — au départ
    tile.roundRobin += 1 // D9 — le compteur n'avance que sur un départ effectif
    entity.space = target
    entity.visited.push(key(target))
    entity.producedHere = false

    const targetTile = tileAt(state, target)
    if (targetTile) deposit(state, entity, targetTile) // D10 — à l'arrivée
  }
}

/** Une Tuile sans Sortie où `side` a une Recette : on y livre, on y meurt (`D6`, `T4`). */
const isDeliveryTile = (state: GameState, tile: TileState, side: Side): boolean => {
  const type = tileType(state.config, tile.typeId)
  return isWorkableBy(tile, side) && (type.recipes?.length ?? 0) > 0
}

/** `E1` — la victoire est immédiate, dès que la cible est atteinte. */
export const checkVictory = (state: GameState): void => {
  if (state.outcome !== 'ongoing') return
  if (state.progress < state.config.stairwayTarget) return
  state.outcome = 'victory'
  state.phase = 'over'
  log(state, 'system', `L’Escalier est achevé (${state.progress}/${state.config.stairwayTarget}).`)
}

/**
 * `E2`, `E3` — la défaite ne se teste qu'en **fin de Tick** : les Âmes en
 * transit ou en production finissent leur course, et une livraison de dernière
 * minute peut encore faire gagner.
 */
export const checkDefeat = (state: GameState): void => {
  if (state.outcome !== 'ongoing') return
  const reserveSpent = state.spawned.player >= state.config.soulBudget
  const noneAlive = !state.entities.some((e) => e.side === 'player')
  if (!reserveSpent || !noneAlive) return
  state.outcome = 'defeat'
  state.phase = 'over'
  log(
    state,
    'system',
    `Plus une seule Âme et l’Escalier inachevé (${state.progress}/${state.config.stairwayTarget}).`,
  )
}

/** Un Tick complet : les 6 phases de `C2`, puis le test de défaite (`E3`). */
export const runTickInPlace = (state: GameState): void => {
  if (state.outcome !== 'ongoing') return
  state.tick += 1
  for (const side of SIDE_ORDER) {
    spawnPhase(state, side)
    productionPhase(state, side)
    checkVictory(state)
    if (state.outcome !== 'ongoing') return
    movementPhase(state, side)
    checkVictory(state)
    if (state.outcome !== 'ongoing') return
  }
  checkDefeat(state)
}
