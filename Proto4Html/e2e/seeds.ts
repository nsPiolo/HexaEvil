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
 * - course en 7 tours ; le pari auto « Vainqueur pur · Homère » est gagné : 80 + 20 d'avance − 5 + 18
 *   = 113 pièces, donc « encore 37 ¤ à trouver en 2 courses » avec un cercle 1 à 150 (06-B).
 */
export const RACE_SEED = 97
export const RACE_SEED_EXPECT = { firstMove: { soul: 'Socrate', to: 2 }, collisionTurn: 2, zoneTurn: 4, finalMoney: 113, missing: 37 }

/** Avance versée par le stagiaire au début de chaque course (`economy.raceAllowance`) : 80 de capital + 20 → 100 à la table. */
export const ALLOWANCE = 20
export const START_MONEY = 80 + ALLOWANCE

/**
 * Cercle 2, course 1 (`race=3`, graine effective 34) : deux couloirs ; au classement final,
 * exactement une paire d'âmes consécutives partage une colonne sur deux couloirs différents
 * (06-C : une seule ligne de départage). Course en 6 tours.
 */
export const TIE_SEED = 31
export const TIE_RACE_INDEX = 3

/**
 * Vitrine du cercle 1, inventaire de départ (la vitrine est tirée à la première ouverture de la
 * boutique, avant tout lancer) : Face de gel 40 (sûr), Dé des Limbes 30 (sûr), Œil du parieur 80
 * (ambitieux, ≥ seuil de confirmation), Bât de chameau 95 (danger ⚠). Tous les prix dépassent
 * 15 : à 0 pièce apportée (20 d'avance − 5 de mise), tout est trop cher (04-D).
 *
 * Re-cherchée après l'élargissement du catalogue (16 → 47 objets), qui a invalidé la graine 171.
 * Contraintes à retrouver si elle saute à son tour : quatre objets triés sûr, sûr, ambitieux,
 * danger ; un dé à remplacer, sûr, sous le seuil de confirmation et payable à 67 ; un artefact
 * ambitieux entre 68 et 95 (achetable à 95, refusé à 67) ; un objet à contrepartie ; rien sous 16.
 */
export const SHOP_SEED = 210
export const SHOP_SEED_EXPECT = {
  order: ['Sûr', 'Sûr', 'Ambitieux', 'Danger ⚠'],
  danger: { name: 'Bât de chameau', warning: "la fusion dure toute la course et vous ne la choisissez qu'une fois", impact: 'fort' },
  confirm: { name: 'Œil du parieur', price: 80 },
  die: { name: 'Dé des Limbes', price: 30, faces: ['+1', '+1', '+2', '+2'] },
  cheapest: 30,
}

/**
 * Cercle 1, course 1 : au tour 1, les trois dés Âme désignent Virgile et les dés Distance font
 * +2 et −1 (08-C3 : une seule carte fusionnée « Virgile +1 », prévisualisée sur la case 1).
 */
export const CUMUL_SEED = 22
