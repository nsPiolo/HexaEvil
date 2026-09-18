/**
 * Tous les textes affichés au joueur, dans la langue choisie dans les options.
 *
 * L'écran importe d'ici et seulement d'ici (`import { MENU } from './texts'`), exactement
 * comme avant qu'il y ait deux langues : les groupes exportés sont des liaisons vivantes
 * (`export let`), et `setLanguage` les fait toutes basculer d'un coup sur l'autre pack.
 * Les composants relisent la valeur au rendu suivant, que `App` déclenche en changeant
 * l'option — il n'y a donc ni contexte React à câbler ni `useTranslation` à appeler.
 *
 * Ce qui a déjà été fabriqué reste dans la langue d'alors : le journal d'une course en
 * cours, un dialogue ouvert. C'est voulu — on change de langue depuis le menu, pas au
 * milieu d'un tour, et rien ne justifie de réécrire l'historique.
 *
 * Ajouter une langue = un fichier `xx.ts` sur le modèle de `fr.ts`, une entrée dans
 * `PACKS`, une entrée dans `LANGUAGES`, et sa colonne dans `config/i18n/` pour les noms
 * d'âmes, de cercles et d'objets.
 */
import { EN } from './en'
import { FR } from './fr'
import type { Translatable } from './types'

export type { CircleTexts, DemonRank, Face, Fmt, HelpBlock, HelpSection, Line, Speaker } from './types'
export { fill, portraitSrc } from './types'

/** Forme d'un pack de langue : celle du français, chaînes élargies (voir `types.ts`). */
export type Pack = Translatable<typeof FR>

const PACKS = { fr: FR, en: EN } satisfies Record<string, Pack>

/** Langues réellement traduites. Le type ne connaît que celles-là : une option stockée hors de cette liste retombe sur `DEFAULT_LANGUAGE`. */
export type Language = keyof typeof PACKS

export const DEFAULT_LANGUAGE: Language = 'fr'

/** Liste pour le sélecteur des options : l'étiquette d'une langue est écrite dans cette langue. */
export const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
]

export function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && v in PACKS
}

let current: Language = DEFAULT_LANGUAGE
let pack: Pack = PACKS[current]

export function currentLanguage(): Language {
  return current
}

/* Les groupes de textes. `let` et non `const` : c'est `setLanguage` qui les repose. */
export let GAME_NAME = pack.GAME_NAME
export let SPEAKERS = pack.SPEAKERS
export let MENU = pack.MENU
export let INTRO = pack.INTRO
export let BOSS_ANNOUNCE = pack.BOSS_ANNOUNCE
export let BOSS_ANNOUNCE_NEXT = pack.BOSS_ANNOUNCE_NEXT
export let BOSS_ANNOUNCE_SELF = pack.BOSS_ANNOUNCE_SELF
export let DEMON_RANKS = pack.DEMON_RANKS
export let CIRCLES = pack.CIRCLES
export let ENDINGS = pack.ENDINGS
export let HUD = pack.HUD
export let MAP = pack.MAP
export let STATS = pack.STATS
export let COLLECTION = pack.COLLECTION
export let UNLOCK = pack.UNLOCK
export let DEBT = pack.DEBT
export let OPTIONS = pack.OPTIONS
export let BETS = pack.BETS
export let GAUGE = pack.GAUGE
export let SHOP = pack.SHOP
export let ITEMS = pack.ITEMS
export let RACE = pack.RACE
export let BET_LIVE = pack.BET_LIVE
export let BOARD = pack.BOARD
export let RESULTS = pack.RESULTS
export let GLOSSARY = pack.GLOSSARY
export let HELP = pack.HELP
export let DEV = pack.DEV
export let BOSS_EFFECTS = pack.BOSS_EFFECTS
export let BET_TIERS = pack.BET_TIERS
export let BET_TYPE_TEXTS = pack.BET_TYPE_TEXTS
export let BET_REFUSALS = pack.BET_REFUSALS
export let CANCEL_REFUSALS = pack.CANCEL_REFUSALS
export let ITEM_KINDS = pack.ITEM_KINDS
export let RARITIES = pack.RARITIES
export let PURCHASE_LOG = pack.PURCHASE_LOG
export let MOVE = pack.MOVE
export let MOVE_NOTES = pack.MOVE_NOTES
export let LOG = pack.LOG
export let UI = pack.UI

/**
 * Bascule le lexique. Ne touche pas aux noms d'âmes, de cercles et d'objets, qui viennent
 * de la configuration : `applyLanguage` (presentation/i18n.ts) appelle les deux.
 */
export function setLanguage(lang: Language): void {
  current = lang
  pack = PACKS[lang]
  GAME_NAME = pack.GAME_NAME
  SPEAKERS = pack.SPEAKERS
  MENU = pack.MENU
  INTRO = pack.INTRO
  BOSS_ANNOUNCE = pack.BOSS_ANNOUNCE
  BOSS_ANNOUNCE_NEXT = pack.BOSS_ANNOUNCE_NEXT
  BOSS_ANNOUNCE_SELF = pack.BOSS_ANNOUNCE_SELF
  DEMON_RANKS = pack.DEMON_RANKS
  CIRCLES = pack.CIRCLES
  ENDINGS = pack.ENDINGS
  HUD = pack.HUD
  MAP = pack.MAP
  STATS = pack.STATS
  COLLECTION = pack.COLLECTION
  UNLOCK = pack.UNLOCK
  DEBT = pack.DEBT
  OPTIONS = pack.OPTIONS
  BETS = pack.BETS
  GAUGE = pack.GAUGE
  SHOP = pack.SHOP
  ITEMS = pack.ITEMS
  RACE = pack.RACE
  BET_LIVE = pack.BET_LIVE
  BOARD = pack.BOARD
  RESULTS = pack.RESULTS
  GLOSSARY = pack.GLOSSARY
  HELP = pack.HELP
  DEV = pack.DEV
  BOSS_EFFECTS = pack.BOSS_EFFECTS
  BET_TIERS = pack.BET_TIERS
  BET_TYPE_TEXTS = pack.BET_TYPE_TEXTS
  BET_REFUSALS = pack.BET_REFUSALS
  CANCEL_REFUSALS = pack.CANCEL_REFUSALS
  ITEM_KINDS = pack.ITEM_KINDS
  RARITIES = pack.RARITIES
  PURCHASE_LOG = pack.PURCHASE_LOG
  MOVE = pack.MOVE
  MOVE_NOTES = pack.MOVE_NOTES
  LOG = pack.LOG
  UI = pack.UI
}

/**
 * Rang du cercle affiché dans le HUD (« 1er », « 9e », « 23e » ; « 1st », « 23rd »). Les
 * cercles écrits ont leur forme dans CIRCLES ; au-delà, le jeu continue de compter
 * (GDD §8.1) et c'est la règle de la langue qui écrit le rang.
 */
export function ordinalOf(circle: number): string {
  return CIRCLES[circle - 1]?.ordinal ?? pack.fmt.ordinal(circle)
}

/**
 * Cotes prêtes à citer dans un texte, avec la décimale de la langue (2.2 → « 2,2 » en
 * français, « 2.2 » en anglais). Tout texte qui annonce une cote — lignes de promotion,
 * page d'aide — passe par ici plutôt que d'écrire le chiffre en dur : les cotes se
 * recalibrent (`npm run odds -- --suggest`) et les textes suivent d'eux-mêmes.
 */
export function oddsText(multipliers: Readonly<Record<string, number>>): Record<string, string> {
  return Object.fromEntries(Object.entries(multipliers).map(([id, m]) => [id, pack.fmt.odds(m)]))
}

/**
 * Marque de pluriel à passer à `fill` sous la clé `s`, pour les phrases qui comptent
 * quelque chose : « recule de {n} case{s} », « moves back {n} space{s} ».
 */
export function plural(n: number): string {
  return pack.fmt.plural(n)
}
