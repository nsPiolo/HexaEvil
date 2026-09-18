/**
 * Boutique — GDD §6.1. Accessible après les paris initiaux, avant la course.
 * Vitrine tirée au sort parmi le catalogue, achats débités de l'argent des paris.
 */
import type { RaceConfig } from '../config/schema'
import { baseDie, type DistanceDie, type Face } from '../rules/dice'
import { growWithCircle } from '../rules/growth'
import type { Rng } from '../rules/rng'
import type { ArtefactId, DieItem, ForgeId, Rarity, ShopConfig, ShopItem } from './items'

/** Ce que le joueur emporte de course en course. */
export interface Inventory {
  artefacts: ArtefactId[]
  dice: DistanceDie[]
}

export function priceAtCircle(base: number, circle: number, growth: number): number {
  return growWithCircle(base, circle, growth)
}

/** Remises de boutique ouvertes par les artefacts (artefacts.md n°26 et n°30). */
export interface PriceRules {
  /** Rabais de Ploutos : part retirée de tout ce que vend la boutique, renouvellement compris. */
  globalDiscount?: number
  /** Marteau d'Héphaïstos : remise sur les altérations de forge. */
  forgeDiscount?: number
  /** Marteau d'Héphaïstos : la première forge du cercle est offerte tant que ce drapeau est faux. */
  forgeFreeAvailable?: boolean
}

/**
 * Prix réellement demandé pour un objet : prix du cercle, puis les remises. La forge gratuite
 * du Marteau passe avant tout le reste — offert veut dire 0, pas « 0 moins 3 % ».
 */
export function effectivePrice(item: ShopItem, circle: number, growth: number, rules: PriceRules = {}): number {
  if (item.kind === 'forge' && rules.forgeFreeAvailable) return 0
  let price = priceAtCircle(item.price, circle, growth)
  if (item.kind === 'forge' && rules.forgeDiscount) price *= 1 - rules.forgeDiscount
  if (rules.globalDiscount) price *= 1 - rules.globalDiscount
  return Math.max(0, Math.round(price))
}

/** Prix du renouvellement de vitrine, Rabais de Ploutos compris. */
export function effectiveRerollCost(shop: ShopConfig, rules: PriceRules = {}): number {
  return Math.max(0, Math.round(shop.rerollCost * (1 - (rules.globalDiscount ?? 0))))
}

export function findItem(shop: ShopConfig, id: string): ShopItem {
  const it = shop.items.find((i) => i.id === id)
  if (!it) throw new Error(`objet de boutique inconnu : ${id}`)
  return it
}

/**
 * Un objet tiré dans un vivier non vide, chaque rareté pesant son poids `rarityWeights`.
 * Partagé par la vitrine et le déblocage de fin de cercle (`shop/unlocks.ts`).
 */
export function weightedPick<T extends { rarity: Rarity }>(pool: readonly T[], weights: Readonly<Record<Rarity, number>>, rng: Rng): T {
  const total = pool.reduce((s, it) => s + weights[it.rarity], 0)
  let r = rng.next() * total
  for (const it of pool) {
    r -= weights[it.rarity]
    if (r < 0) return it
  }
  return pool[pool.length - 1]!
}

/**
 * Emplacements d'artefacts ouverts au joueur : ceux de la configuration, plus un par grade
 * franchi (artefacts.md : 5 au départ, +1 aux rangs 2 et 4).
 */
export function artefactSlotsAt(shop: ShopConfig, level: number): number {
  return shop.artefactSlots + shop.artefactSlotLevels.filter((l) => level >= l).length
}

/** Faces altérables sur un même dé à ce grade (forge.md : 2, puis 3 au grade avancé). */
export function maxAlteredFaces(shop: ShopConfig, level: number): number {
  return level >= shop.forge.advancedLevel ? shop.forge.maxAlteredAdvanced : shop.forge.maxAltered
}

/** Somme rendue en revendant un artefact acquis au prix `paid`. */
export function resaleValue(shop: ShopConfig, price: number): number {
  return Math.round(price * shop.resaleRatio)
}

/**
 * Tirage pondéré par rareté, sans remise, en excluant les artefacts déjà possédés.
 * Le vivier se limite aux objets **débloqués** (`unlocked`, voir `shop/unlocks.ts`) et à ceux
 * que le grade du stagiaire autorise (`minRank`) : le reste du catalogue n'existe pas encore
 * pour ce joueur. Les emplacements pleins n'excluent plus les artefacts — on peut en remplacer un.
 */
export function generateVitrine(shop: ShopConfig, inventory: Inventory, unlocked: readonly string[], rng: Rng, level = Number.POSITIVE_INFINITY): ShopItem[] {
  const open = new Set(unlocked)
  const pool0 = shop.items.filter((it) => open.has(it.id) && it.minRank <= level && !(it.kind === 'artefact' && inventory.artefacts.includes(it.id)))
  let pool = pool0
  const out: ShopItem[] = []
  while (out.length < shop.slots && pool.length > 0) {
    const pick = weightedPick(pool, shop.rarityWeights, rng)
    out.push(pick)
    pool = pool.filter((it) => it !== pick)
  }
  return out
}

/**
 * Applique une altération de forge à une face (forge.md). La valeur est ce que la face vaut
 * quand rien d'autre ne joue ; l'effet dit où la règle se termine — au lancer (`mirror`,
 * `willOWisp`), à l'association (`gold`, `momentum`) ou contre le plateau (`leap`, `explosive`,
 * `magnet`, `freeze`, `betSeal`). Voir `FaceEffect` dans `rules/dice.ts`.
 */
export function forgeFace(id: ForgeId, face: Face): Face {
  switch (id) {
    case 'limee':
      return { value: 0, effect: null, altered: id, original: face.original ?? face.value }
    case 'retournee':
      return { value: 1, effect: null, altered: id, original: face.original ?? face.value }
    case 'doree':
      return { value: 1, effect: 'gold', altered: id, original: face.original ?? face.value }
    case 'explosive':
      return { value: 2, effect: 'explosive', altered: id, original: face.original ?? face.value }
    case 'bond':
      return { value: 3, effect: 'leap', altered: id, original: face.original ?? face.value }
    case 'miroir':
      return { value: 1, effect: 'mirror', altered: id, original: face.original ?? face.value }
    // Feu follet : la face est toujours relancée, sa valeur ne sert que si le Feu follet ressort.
    case 'feuFollet':
      return { value: 2, effect: 'willOWisp', altered: id, original: face.original ?? face.value }
    case 'elan':
      return { value: 2, effect: 'momentum', altered: id, original: face.original ?? face.value }
    case 'gel':
      return { value: 0, effect: 'freeze', altered: id, original: face.original ?? face.value }
    case 'aimant':
      return { value: 1, effect: 'magnet', altered: id, original: face.original ?? face.value }
    case 'sceau':
      return { value: 1, effect: 'betSeal', altered: id, original: face.original ?? face.value }
  }
  return face
}

export function specialDie(item: DieItem): DistanceDie {
  return {
    kind: item.id,
    name: item.name,
    faces: item.faces.map((v, i) => (i === item.wildFace ? { value: v, effect: null, altered: null, wild: true } : { value: v, effect: null, altered: null })),
    costPerUse: item.costPerUse,
  }
}

/** Contrepartie de la Face retournée : dérivée des dés, pas stockée. */
export function opponentNegativesFlipped(inventory: Inventory): boolean {
  return inventory.dice.some((d) => d.faces.some((f) => f.altered === 'retournee'))
}

export type PurchaseTarget = {
  dieIndex: number
  faceIndex?: number
  /** Artefact à détruire pour faire de la place, quand les emplacements sont pleins. */
  replaceArtefact?: ArtefactId
}

export interface PurchaseResult {
  inventory: Inventory
  /** Message pour le journal. */
  text: string
}

/**
 * Applique un achat déjà payé. Lance si la cible manque ou si l'objet ne peut pas
 * être appliqué ; l'appelant vérifie l'argent et les emplacements avant.
 */
/**
 * Décapage (forge.md) : la face retrouve sa valeur d'origine et redevient altérable. Sans
 * `original` — face forgée par une version antérieure — on refuse plutôt que de deviner.
 */
export function decapFace(inventory: Inventory, target: { dieIndex: number; faceIndex: number }): PurchaseResult {
  const die = inventory.dice[target.dieIndex]
  const face = die?.faces[target.faceIndex]
  if (!die || !face) throw new Error('face introuvable')
  if (!face.altered) throw new Error('cette face n’est pas forgée')
  if (face.original === undefined) throw new Error('valeur d’origine inconnue : cette face ne se décape pas')
  const faces = die.faces.map((f, i) => (i === target.faceIndex ? { value: face.original!, effect: null, altered: null } : f))
  const dice = inventory.dice.map((d, i) => (i === target.dieIndex ? { ...d, faces } : d))
  return { inventory: { ...inventory, dice }, text: `Face décapée sur le ${die.name} n°${target.dieIndex + 1} : elle revaut ${face.original > 0 ? '+' : ''}${face.original}.` }
}

/** Revente d'un artefact (artefacts.md) : il quitte l'inventaire, la somme est rendue par l'appelant. */
export function sellArtefact(inventory: Inventory, id: ArtefactId): PurchaseResult {
  if (!inventory.artefacts.includes(id)) throw new Error('artefact non possédé')
  return { inventory: { ...inventory, artefacts: inventory.artefacts.filter((a) => a !== id) }, text: `Artefact revendu : ${id}.` }
}

export function applyPurchase(item: ShopItem, inventory: Inventory, target: PurchaseTarget | null, maxAltered?: number): PurchaseResult {
  switch (item.kind) {
    case 'artefact': {
      if (inventory.artefacts.includes(item.id)) throw new Error('artefact déjà possédé')
      // Emplacements pleins : l'achat remplace l'artefact désigné, qui est détruit sans
      // remboursement (artefacts.md). C'est l'appelant qui vérifie qu'une cible est nécessaire.
      const replaced = target?.replaceArtefact
      if (replaced !== undefined) {
        if (!inventory.artefacts.includes(replaced)) throw new Error('artefact à remplacer introuvable')
        const artefacts = inventory.artefacts.map((a) => (a === replaced ? item.id : a))
        return { inventory: { ...inventory, artefacts }, text: `${item.name} remplace ${replaced} — l'ancien est détruit.` }
      }
      return { inventory: { ...inventory, artefacts: [...inventory.artefacts, item.id] }, text: `Artefact acquis : ${item.name}.` }
    }
    case 'die': {
      // Troisième dé Distance : il s'ajoute au lancer, il n'y a donc rien à désigner.
      if (item.mode === 'add') {
        const dice = [...inventory.dice, specialDie(item)]
        return { inventory: { ...inventory, dice }, text: `${item.name} rejoint le lancer : ${dice.length} dés Distance.` }
      }
      if (!target) throw new Error('choisissez le dé à remplacer')
      const old = inventory.dice[target.dieIndex]
      if (!old) throw new Error('dé introuvable')
      const dice = inventory.dice.map((d, i) => (i === target.dieIndex ? specialDie(item) : d))
      return { inventory: { ...inventory, dice }, text: `${item.name} remplace le ${old.name} n°${target.dieIndex + 1}.` }
    }
    case 'forge': {
      if (!target || target.faceIndex === undefined) throw new Error('choisissez la face à forger')
      const die = inventory.dice[target.dieIndex]
      const face = die?.faces[target.faceIndex]
      if (!die || !face) throw new Error('face introuvable')
      if (face.altered) throw new Error('cette face est déjà forgée')
      if (maxAltered !== undefined && die.faces.filter((f) => f.altered).length >= maxAltered) {
        throw new Error(`ce dé a déjà ${maxAltered} face${maxAltered > 1 ? 's' : ''} forgée${maxAltered > 1 ? 's' : ''} : décapez-en une d’abord`)
      }
      const faces = die.faces.map((f, i) => (i === target.faceIndex ? forgeFace(item.id, f) : f))
      if (!faces.some((f) => f.value > 0)) throw new Error('un dé doit garder une face positive')
      const dice = inventory.dice.map((d, i) => (i === target.dieIndex ? { ...d, faces } : d))
      return { inventory: { ...inventory, dice }, text: `${item.name} gravée sur le ${die.name} n°${target.dieIndex + 1}, face ${face.value > 0 ? '+' : ''}${face.value}.` }
    }
  }
}

export function defaultInventory(config: RaceConfig): Inventory {
  return { artefacts: [], dice: Array.from({ length: config.dice.distanceDice }, () => baseDie(config)) }
}
