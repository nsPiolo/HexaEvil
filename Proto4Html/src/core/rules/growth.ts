/**
 * Ce qui grandit avec le cercle — prix de la boutique, échelle des mises — suit la même
 * règle : linéaire en nombre de cercles, arrondi à 5 pièces.
 * `base` est la valeur du cercle 1 ; `growth` la part de cette base ajoutée à chaque cercle
 * (0,25 = +25 % par cercle : ×2 au cercle 5, ×3 au cercle 9).
 */
export function growWithCircle(base: number, circle: number, growth: number): number {
  return Math.round((base * (1 + growth * (Math.max(1, circle) - 1))) / 5) * 5
}
