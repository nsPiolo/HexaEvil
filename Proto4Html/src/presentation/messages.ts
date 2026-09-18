/**
 * Mise en phrase de ce que le moteur renvoie sous forme de code : refus de pari, journal
 * d'achat, nom d'un dé, pouvoir d'un boss.
 *
 * Le noyau ne rédige rien — il dirait le français à un joueur anglais — et l'écran ne
 * connaît pas les règles d'accord. Les deux se rejoignent ici : un code d'un côté, une
 * ligne du lexique de l'autre.
 */
import { shop } from '../core/config'
import type { BetRefusal, CancelRefusal } from '../core/rules/bets'
import type { BetTypeId } from '../core/rules/betTypes'
import type { BossEffect } from '../core/rules/boss'
import type { MoveNote } from '../core/rules/race'
import type { PurchaseLog } from '../core/shop/shop'
import { BET_REFUSALS, BET_TYPE_TEXTS, BOSS_EFFECTS, CANCEL_REFUSALS, MOVE_NOTES, PURCHASE_LOG, UI, fill, plural } from './texts'

/** Intitulé d'un type de pari : « Duel », « Duel ». */
export function betLabel(type: BetTypeId): string {
  return BET_TYPE_TEXTS[type].label
}

export function betRefusalText(r: BetRefusal): string {
  const text = BET_REFUSALS[r.kind]
  return r.kind === 'missingSouls' ? fill(text, { needed: r.needed, given: r.given, s: plural(r.needed) }) : text
}

export function cancelRefusalText(r: CancelRefusal): string {
  return CANCEL_REFUSALS[r]
}

/**
 * Nom affiché d'un dé Distance, tiré de son `kind` et non d'un nom recopié à l'achat :
 * un dé acheté en français se lit en anglais dès que la langue change.
 */
export function dieName(kind: string): string {
  if (kind === 'base') return UI.inventory.baseDie
  return shop.items.find((i) => i.id === kind)?.name ?? kind
}

/** Mention portée par un déplacement : « Morsure », « Clepsydre : -1 → +1 ». */
export function noteText(note: MoveNote): string {
  return fill(MOVE_NOTES[note.id], {
    ...(note.value === undefined ? {} : { value: note.value }),
    ...(note.from === undefined ? {} : { from: note.from }),
    ...(note.to === undefined ? {} : { to: note.to }),
  })
}

/** Nom affiché d'un objet de boutique, ou son id s'il a quitté le catalogue. */
export function itemNameOf(id: string): string {
  return shop.items.find((i) => i.id === id)?.name ?? id
}

/** Valeur de face signée, telle qu'elle se lit dans le journal : « +2 », « -1 ». */
function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/** Ligne de journal d'un achat, d'une revente ou d'un décapage. */
export function purchaseLogText(log: PurchaseLog): string {
  const text = PURCHASE_LOG[log.kind]
  switch (log.kind) {
    case 'decap':
      return fill(text, { die: dieName(log.dieKind), n: log.dieIndex + 1, value: signed(log.value) })
    case 'artefactSold':
      return fill(text, { name: itemNameOf(log.id) })
    case 'artefactReplaced':
      return fill(text, { name: log.name, replaced: itemNameOf(log.replaced) })
    case 'artefactBought':
      return fill(text, { name: log.name })
    case 'dieAdded':
      return fill(text, { name: log.name, count: log.count })
    case 'dieReplaced':
      return fill(text, { name: log.name, die: dieName(log.dieKind), n: log.dieIndex + 1 })
    case 'faceForged':
      return fill(text, { name: log.name, die: dieName(log.dieKind), n: log.dieIndex + 1, value: signed(log.value) })
  }
}

/**
 * Annonce lisible d'un pouvoir assemblé : une phrase par effet, dans l'ordre du tirage.
 * `{n}` prend la valeur et `(s)` s'accorde avec elle — une règle de boss se lit, elle ne
 * s'épelle pas.
 */
export function describeBossEffects(effects: readonly BossEffect[]): string {
  return effects.map((e) => BOSS_EFFECTS[e.id].replace('{n}', String(e.value)).replace(/\(s\)/g, plural(Math.abs(e.value)))).join(' ')
}
