/** Types des objets de boutique. Les données (noms, prix, textes) vivent dans config/shop.json. */
/**
 * Artefacts implémentés, numérotés comme dans docs/proto4/artefacts.md. Un id ne peut entrer
 * dans `config/shop.json` que s'il figure ici : le chargeur refuse un objet sans code derrière.
 * Manque encore le Sceau du stagiaire (n°25), qui porte sur les personnalités — système absent
 * du proto — et les objets qui demandent des dés Âme modélisés.
 */
export const ARTEFACT_IDS = [
  // Dés et combinaisons
  'relanceJumelle', 'quatriemeTete', 'boussole', 'clepsydre', 'fioleDeSang', 'verrouDeMinos',
  // Collisions
  'semellesDePlomb', 'batDeChameau', 'balanceTruquee', 'chaineDuCoccyte',
  // Paris
  'ferACheval', 'sablier', 'ticketPremiereHeure', 'livreDesComptes', 'quatriemeMarche',
  'encensoirDuDernier', 'pieceADeuxFaces', 'lateBet', 'denierDuCercle', 'baumeDuPerdant',
  // Argent
  'boursePercee', 'tribuneInfernale', 'detteInfernale', 'tirelire', 'pourboireDuStagiaire',
  // Information et tour adverse
  'oeilDeCharon', 'fouetDuContremaitre', 'miroirDeNarcisse',
  // Boutique
  'marteauHephaistos', 'rabaisDePloutos',
] as const
export type ArtefactId = (typeof ARTEFACT_IDS)[number]

/** Altérations de forge implémentées, numérotées comme dans docs/proto4/forge.md. */
export const FORGE_IDS = ['limee', 'retournee', 'doree', 'explosive', 'bond', 'miroir', 'feuFollet', 'elan', 'gel', 'aimant', 'sceau'] as const
export type ForgeId = (typeof FORGE_IDS)[number]

export type Rarity = 'common' | 'rare' | 'legendary'
export type ItemKind = 'artefact' | 'die' | 'forge'
/** Échelle d'impact (boutique-README § Échelle d'impact) : ce que l'objet change dans la partie. */
export type Impact = 'faible' | 'moyen' | 'fort' | 'extreme'
export const IMPACTS: readonly Impact[] = ['faible', 'moyen', 'fort', 'extreme']

/** Impact par défaut quand la config n'en donne pas : déduit de la rareté. */
export const IMPACT_OF_RARITY: Readonly<Record<Rarity, Impact>> = { common: 'faible', rare: 'moyen', legendary: 'fort' }

/** Niveau de risque affiché en tête de carte : sûr / ambitieux / dangereux. */
export type Risk = 'safe' | 'bold' | 'danger'

interface ItemBase {
  name: string
  description: string
  rarity: Rarity
  /** Prix au cercle 1. */
  price: number
  params: Readonly<Record<string, number>>
  impact: Impact
  /** Contrepartie explicite (ex. « chaque association coûte 3 ¤ »), ou null si l'objet n'en a pas. */
  warning: string | null
}

export interface ArtefactItem extends ItemBase {
  kind: 'artefact'
  id: ArtefactId
}

export interface DieItem extends ItemBase {
  kind: 'die'
  id: string
  faces: readonly number[]
  costPerUse: number
  /**
   * `replace` : le dé prend la place d'un dé Distance existant (le cas courant).
   * `add` : il s'ajoute au lancer (Troisième dé Distance, des.md n°6) — une combinaison de plus
   * par tour, et le dé Âme inutilisé disparaît.
   */
  mode: 'replace' | 'add'
  /** Index de la face « ? » du Dé de Fraude : elle copie la meilleure autre face du lancer. */
  wildFace: number | null
}

export interface ForgeItem extends ItemBase {
  kind: 'forge'
  id: ForgeId
  /** Valeur de face conseillée comme cible. */
  target: number
}

export type ShopItem = ArtefactItem | DieItem | ForgeItem

export interface ShopConfig {
  slots: number
  rerollCost: number
  priceGrowthPerCircle: number
  artefactSlots: number
  rarityWeights: Readonly<Record<Rarity, number>>
  /** Prix effectif à partir duquel un achat demande une confirmation (second clic). */
  confirmThreshold: number
  /** Délai avant que le bouton « Confirmer » redevienne « Acheter » sans second clic. */
  confirmResetMs: number
  /**
   * Objets en rayon au tout premier lancement. Les autres sont scellés : un cercle payé en
   * débloque un, définitivement, d'un run à l'autre (`shop/unlocks.ts`).
   */
  unlockedAtStart: readonly string[]
  items: readonly ShopItem[]
}

/**
 * Triade sûr / ambitieux / dangereux d'un objet : DANGER dès qu'il a une contrepartie,
 * AMBITIEUX si son impact est fort ou extrême, SÛR sinon.
 */
export function riskOf(item: Pick<ShopItem, 'impact' | 'warning'>): Risk {
  if (item.warning) return 'danger'
  if (item.impact === 'fort' || item.impact === 'extreme') return 'bold'
  return 'safe'
}

const RISK_ORDER: Readonly<Record<Risk, number>> = { safe: 0, bold: 1, danger: 2 }

/** Vitrine triée du plus sûr au plus dangereux (puis par impact croissant), ordre d'origine conservé à égalité. */
export function sortByRisk<T extends Pick<ShopItem, 'impact' | 'warning'>>(items: readonly T[]): T[] {
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => RISK_ORDER[riskOf(a.it)] - RISK_ORDER[riskOf(b.it)] || IMPACTS.indexOf(a.it.impact) - IMPACTS.indexOf(b.it.impact) || a.i - b.i)
    .map((x) => x.it)
}

export function isArtefactId(id: string): id is ArtefactId {
  return (ARTEFACT_IDS as readonly string[]).includes(id)
}

export function isForgeId(id: string): id is ForgeId {
  return (FORGE_IDS as readonly string[]).includes(id)
}
