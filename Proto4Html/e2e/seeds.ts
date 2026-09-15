/**
 * Graines de référence (spec 07 § Graines de référence), cherchées une fois par simulation du
 * noyau (mulberry32, `core/rules/rng.ts`) puis figées. La course d'index N joue avec `seed + N`
 * (`src/presentation/urlParams.ts`). Si un changement de règles ou de catalogue invalide une
 * graine, le test concerné échoue avec un message qui renvoie ici : re-chercher la graine
 * (simulation : `createRace` + `rollPlayerDice` + `naturalCombinations` + `rollOpponentPair`,
 * pari auto « Vainqueur pur » sur l'âme 0, mise 5), puis mettre à jour ce fichier.
 */

/**
 * Cercle 1, course 1, sans ouvrir la boutique, appariement naturel (dé Âme i ↔ dé Distance i) :
 * - tour 1 : premier déplacement Socrate +2 (case 0 → 2), sans qu'aucun autre déplacement du
 *   tour ne le touche (05-B : le fantôme et la position finale coïncident) ; les deux dés Âme
 *   associés désignent deux âmes différentes ;
 * - tour 2 : le joueur provoque une collision (05-F) ;
 * - après le tour 4 : une âme est dans la zone de fin, la course continue (03-C) ;
 * - course en 7 tours ; le pari auto « Vainqueur pur · Homère » est gagné : 100 − 5 + 18 = 113
 *   pièces, donc « encore 87 ¤ à trouver en 2 courses » (06-B).
 */
export const RACE_SEED = 97
export const RACE_SEED_EXPECT = { firstMove: { soul: 'Socrate', to: 2 }, collisionTurn: 2, zoneTurn: 4, finalMoney: 113, missing: 87 }

/**
 * Cercle 2, course 1 (`race=3`, graine effective 34) : deux couloirs ; au classement final,
 * exactement une paire d'âmes consécutives partage une colonne sur deux couloirs différents
 * (06-C : une seule ligne de départage). Course en 6 tours.
 */
export const TIE_SEED = 31
export const TIE_RACE_INDEX = 3

/**
 * Vitrine du cercle 1, inventaire de départ (la vitrine est tirée à la première ouverture de la
 * boutique, avant tout lancer) : Dé des Limbes 30 (sûr), Clepsydre fêlée 40 (sûr), Œil du
 * parieur 80 (ambitieux, ≥ seuil de confirmation), Dé de Prodigalité 80 (danger ⚠).
 */
export const SHOP_SEED = 6
export const SHOP_SEED_EXPECT = {
  order: ['Sûr', 'Sûr', 'Ambitieux', 'Danger ⚠'],
  danger: { name: 'Dé de Prodigalité', warning: 'chaque association coûte 3 ¤' },
  confirm: { name: 'Œil du parieur', price: 80 },
  die: { name: 'Dé des Limbes', price: 30, faces: ['+1', '+1', '+2', '+2'] },
  cheapest: 30,
}
