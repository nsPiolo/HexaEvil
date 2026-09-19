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
 * - course en 7 tours ; le pari auto « Vainqueur pur · Homère » est gagné : 80 + 20 d'avance − 5 + 11
 *   = 106 pièces, donc « encore 44 ¤ à trouver en 2 courses » avec un cercle 1 à 150 (06-B).
 *   Le gain suit la cote « Vainqueur pur » (`economy.multipliers.winner`) : il a changé avec
 *   elle le 18 septembre 2026 (×3,5 → ×2,2), la graine, elle, n'a pas bougé.
 */
export const RACE_SEED = 97
export const RACE_SEED_EXPECT = { firstMove: { soul: 'Socrate', to: 2 }, collisionTurn: 2, zoneTurn: 4, finalMoney: 106, missing: 44 }

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

/** Objets présentés par la boutique (`shop.slots`) : la vitrine en montre exactement autant. */
export const SHOP_SLOTS = 3

/**
 * Courses par cercle (`run.racesPerCircle`). Sert à se placer à un cercle donné : `race = n *
 * RACES_PER_CIRCLE` démarre à la première course du cercle n + 1, donc au grade que le
 * stagiaire a gagné en payant les n cercles précédents.
 */
export const RACES_PER_CIRCLE = 3

/**
 * Vitrine du cercle 1, inventaire de départ (la vitrine est tirée à la première ouverture de la
 * boutique, avant tout lancer) : Dé des Limbes 30 (sûr), Verrou de Minos 85 (ambitieux, ≥ seuil
 * de confirmation), Face explosive 55 (danger ⚠). Tous les prix dépassent 15 : à 0 pièce
 * apportée (20 d'avance − 5 de mise), tout est trop cher (04-D).
 *
 * Re-cherchée cinq fois : à l'élargissement du catalogue (16 → 47 objets), au passage de la
 * vitrine de 4 à 3 objets, à l'arrivée du Dé du Décathlon (47 → 48 objets, le tirage se fait
 * sur tout le catalogue en mode e2e), à celle des onze masques de personnalité (48 → 59), puis
 * à celle des seize objets de la vague 2 (59 → 75). L'outil de recherche est `sim/findseed.ts`.
 * Les trois objets attendus n'ont jamais changé : c'est la graine qui les redonne qu'on
 * cherche, pour que les attentes ci-dessous restent lisibles d'une version à l'autre.
 * Contraintes à retrouver si elle saute encore :
 * `SHOP_SLOTS` objets triés sûr, ambitieux, danger ; un dé à remplacer, sûr, sous le seuil de
 * confirmation et payable à 67 ; un artefact ambitieux entre 68 et 95 (achetable à 95, refusé
 * à 67) ; un objet à contrepartie ; rien sous 16.
 */
export const SHOP_SEED = 120271
export const SHOP_SEED_EXPECT = {
  order: ['Sûr', 'Ambitieux', 'Danger ⚠'],
  danger: { name: 'Face explosive', warning: "sans percussion, l'âme recule d'une case après coup", impact: 'fort' },
  confirm: { name: 'Verrou de Minos', price: 85 },
  die: { name: 'Dé des Limbes', price: 30, faces: ['+1', '+1', '+2', '+2'] },
  cheapest: 30,
}

/**
 * Vitrine du cercle 1 qui contient un masque de personnalité (GDD §6.5), pour le test d'achat :
 * Masque du Résolu 50, Face du parieur 55, Dé de Glace 60. Le masque est le moins cher des
 * trois, donc achetable sans que le test ait à choisir entre les cartes.
 *
 * Contrainte à retrouver si elle saute (`npx vite-node sim/findseed.ts mask`) : un objet
 * `kind: personality` dont `personality` n'est pas null, à 50 pièces ou moins, et le moins cher
 * de la vitrine de la première ouverture.
 */
export const MASK_SEED = 62
export const MASK_SEED_EXPECT = {
  name: 'Masque du Résolu',
  personality: 'Le Résolu',
  /** Le glyphe du Résolu (`PERSONALITY_GLYPH`, presentation/PersonalityMark.tsx). */
  glyph: '⊘',
  /** Âmes en course au cercle 1 : autant de choix proposés par le masque. */
  souls: 5,
}

/**
 * Première course du cercle 3 : c'est à sa fin que joue la première révélation de
 * personnalité (`revealsPersonality`, core/rules/personalities.ts). Index de course =
 * (3 − 1) × RACES_PER_CIRCLE.
 */
export const REVEAL_RACE_INDEX = 6

/**
 * Cercle 1, course 1 : au tour 1, les trois dés Âme désignent Virgile et les dés Distance font
 * +2 et −1 (08-C3 : une seule carte fusionnée « Virgile +1 », prévisualisée sur la case 1).
 */
export const CUMUL_SEED = 22
