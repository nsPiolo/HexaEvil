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
  /** Amplitude de l'effet ; son sens dépend de l'id (voir `BOSS_EFFECT_DOC`). */
  value: number
}

/**
 * Ce que `value` veut dire pour chaque effet, la valeur retenue quand la config n'en donne pas,
 * et la phrase d'annonce. `{n}` y est remplacé par la valeur : une annonce de boss doit se lire
 * comme une règle, pas comme une fiche technique.
 */
export const BOSS_EFFECT_DOC: Readonly<Record<BossEffectId, { label: string; sentence: string; fallback: number }>> = {
  extraPairs: { label: 'Cadence', sentence: 'L’adversaire lance {n} paire(s) de plus par tour.', fallback: 1 },
  harshNegatives: { label: 'Reculs aggravés', sentence: 'Toute distance négative recule de {n} case(s) de plus, des deux côtés.', fallback: 1 },
  bite: { label: 'Morsure', sentence: 'Une âme percutée est mordue : elle recule de {n} case(s) après le saut.', fallback: 1 },
  costlyLateBets: { label: 'Guichet gourmand', sentence: 'Un pari posé en course coûte {n} fois sa mise.', fallback: 2 },
  pushBack: { label: 'Poussée', sentence: 'Reculer sur une âme la pousse en arrière au lieu d’échanger.', fallback: 1 },
  betThreshold: { label: 'Guichet avancé', sentence: 'Le seuil de pari tombe à {n} % du parcours.', fallback: 40 },
  opponentBoost: { label: 'Charge', sentence: 'Les distances positives de l’adversaire gagnent {n} case(s).', fallback: 1 },
  lyingSoulDice: { label: 'Dés menteurs', sentence: 'Une fois sur {n}, un dé Âme désigne l’âme voisine.', fallback: 4 },
  targetBettedSouls: { label: 'Il lit vos tickets', sentence: 'Les paires adverses visent vos âmes pariées et les font reculer.', fallback: 1 },
  slowWater: { label: 'Eaux lourdes', sentence: 'Toute distance positive perd {n} case(s), des deux côtés.', fallback: 1 },
  chained: { label: 'Chaînes', sentence: 'Une âme percutée est enchaînée : elle ne bouge plus pendant {n} tour(s).', fallback: 1 },
  closeWindow: { label: 'Guichet fermé', sentence: '{n} type(s) de pari deviennent indisponibles, en rotation à chaque tour.', fallback: 1 },
  frozenLanes: { label: 'Couloirs gelés', sentence: 'Une âme ne se déporte plus dans un autre couloir : elle percute.', fallback: 1 },
  backdraft: { label: 'Souffle', sentence: 'À la fin de chaque tour, toutes les âmes reculent de {n} case(s).', fallback: 1 },
  replayTurn: { label: 'Tour rejoué', sentence: 'Le tour d’arrivée est résolu une seconde fois, adversaire compris.', fallback: 1 },
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
  return chosen.map((id) => ({ id, value: BOSS_EFFECT_DOC[id].fallback }))
}

/**
 * Annonce lisible d'un pouvoir assemblé : une phrase par effet, dans l'ordre du tirage. `{n}`
 * prend la valeur et `(s)` s'accorde avec elle — une règle de boss se lit, elle ne s'épelle pas.
 */
export function describeBossEffects(effects: readonly BossEffect[]): string {
  return effects
    .map((e) => {
      const plural = Math.abs(e.value) > 1
      return BOSS_EFFECT_DOC[e.id].sentence.replace('{n}', String(e.value)).replace(/\(s\)/g, plural ? 's' : '')
    })
    .join(' ')
}
