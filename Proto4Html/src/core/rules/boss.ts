/**
 * Pouvoirs de boss (GDD §5.1) et leur génération pour les cercles au-delà des écrits (§8.1).
 *
 * Un pouvoir est une liste d'**effets typés**, pas un texte : le texte de `config/race.json`
 * reste l'annonce faite au joueur, les effets sont ce que le moteur applique. Chaque effet est
 * assez indépendant pour se combiner aux autres sans produire de règle illisible — c'est la
 * contrainte que pose le GDD pour la génération procédurale, et elle vaut aussi pour les boss
 * écrits à la main.
 *
 * Les effets ne valent que sur la **course du boss**, la dernière du cercle.
 */
import type { Rng } from './rng'

export const BOSS_EFFECT_IDS = [
  'extraPairs',
  'harshNegatives',
  'bite',
  'costlyLateBets',
  'pushBack',
  'betThreshold',
  'opponentBoost',
  'lyingSoulDice',
  'targetBettedSouls',
  'slowWater',
  'chained',
  'closeWindow',
  'frozenLanes',
  'backdraft',
  'replayTurn',
] as const

export type BossEffectId = (typeof BOSS_EFFECT_IDS)[number]

export interface BossEffect {
  id: BossEffectId
  /** Amplitude de l'effet ; son sens dépend de l'id (voir `BOSS_EFFECTS` du lexique). */
  value: number
}

/**
 * Valeur retenue pour chaque effet quand la configuration n'en donne pas. Ce que `value`
 * veut dire, effet par effet, est écrit dans la phrase d'annonce correspondante
 * (`BOSS_EFFECTS` du lexique) : une règle de boss se lit, elle ne s'épelle pas.
 */
export const BOSS_EFFECT_FALLBACK: Readonly<Record<BossEffectId, number>> = {
  extraPairs: 1,
  harshNegatives: 1,
  bite: 1,
  costlyLateBets: 2,
  pushBack: 1,
  betThreshold: 40,
  opponentBoost: 1,
  lyingSoulDice: 4,
  targetBettedSouls: 1,
  slowWater: 1,
  chained: 1,
  closeWindow: 1,
  frozenLanes: 1,
  backdraft: 1,
  replayTurn: 1,
}

export function isBossEffectId(id: string): id is BossEffectId {
  return (BOSS_EFFECT_IDS as readonly string[]).includes(id)
}

/** Amplitude d'un effet présent, ou null s'il ne l'est pas. Un seul point d'entrée pour tout le moteur. */
export function bossValue(effects: readonly BossEffect[], id: BossEffectId): number | null {
  const found = effects.find((e) => e.id === id)
  return found ? found.value : null
}

export function hasBoss(effects: readonly BossEffect[], id: BossEffectId): boolean {
  return effects.some((e) => e.id === id)
}

/**
 * Effets qui ne se combinent pas : les garder ensemble produirait une course illisible ou une
 * règle qui s'annule. `slowWater` retire aux distances positives ce que `opponentBoost` leur
 * ajoute ; `frozenLanes` supprime le déport que `pushBack` et `bite` supposent résolu.
 */
const INCOMPATIBLE: readonly (readonly [BossEffectId, BossEffectId])[] = [
  ['slowWater', 'opponentBoost'],
  ['frozenLanes', 'pushBack'],
  ['replayTurn', 'backdraft'],
]

function compatible(chosen: readonly BossEffectId[], id: BossEffectId): boolean {
  return !INCOMPATIBLE.some(([a, b]) => (a === id && chosen.includes(b)) || (b === id && chosen.includes(a)))
}

/**
 * Boss généré par assemblage (GDD §8.1) : 2 à 4 effets tirés sans remise, en écartant les
 * paires incompatibles. Déterministe à graine égale — un même cercle donne toujours le même
 * boss, sinon son pouvoir changerait entre l'annonce sur la carte et la course.
 */
export function generateBossEffects(rng: Rng, min = 2, max = 4): BossEffect[] {
  const count = min + rng.int(Math.max(1, max - min + 1))
  const pool = [...BOSS_EFFECT_IDS]
  const chosen: BossEffectId[] = []
  while (chosen.length < count && pool.length > 0) {
    const pick = pool.splice(rng.int(pool.length), 1)[0]!
    if (compatible(chosen, pick)) chosen.push(pick)
  }
  return chosen.map((id) => ({ id, value: BOSS_EFFECT_FALLBACK[id] }))
}

