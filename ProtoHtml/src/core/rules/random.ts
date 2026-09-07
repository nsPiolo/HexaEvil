/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * Le hasard du proto doit être **rejouable** : sans ça, comparer deux réglages
 * de recettes n'a plus de sens, puisque la différence observée pourrait venir de
 * la pioche (même exigence de comparabilité que `X5`). L'état du générateur
 * voyage donc dans l'état de la partie, et la germe utilisée y est conservée.
 */
export type RngState = { rngState: number }

/** Tire un flottant dans [0, 1) et fait avancer l'état. */
export const nextRandom = (state: RngState): number => {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0
  let t = state.rngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Entier dans [0, bound). `bound` doit être strictement positif. */
export const nextIndex = (state: RngState, bound: number): number =>
  Math.min(bound - 1, Math.floor(nextRandom(state) * bound))

/** Germe issue de l'horloge, quand la configuration n'en fixe pas. */
export const randomSeed = (): number => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0
