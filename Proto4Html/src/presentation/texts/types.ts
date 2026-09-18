/**
 * Ossature du lexique : les types partagés par toutes les langues, et les quelques
 * fonctions qui ne dépendent d'aucune (`fill`, `portraitSrc`).
 *
 * Une langue = un fichier qui exporte un objet `Pack` (voir `fr.ts`, `en.ts`). Le français
 * est la référence : `Pack` se déduit de lui (`Translatable<typeof FR>`), si bien qu'une
 * clé ajoutée en français et oubliée ailleurs est une erreur de compilation, pas une chaîne
 * manquante à l'écran.
 */

export type Speaker = 'demon' | 'player' | 'boss'

/**
 * Expressions du stagiaire, disponibles au grade 0 seulement (public/menu/perso/stagiaire_0_*.webp).
 * Aux grades suivants il n'y a qu'un portrait : la `face` d'une ligne y est ignorée.
 */
export type Face = 'normal' | 'neutre' | 'doute' | 'fier' | 'degout'

export interface Line {
  who: Speaker
  text: string
  /** Nom affiché au-dessus de la bulle ; absent = nom par défaut du locuteur (SPEAKERS). Le démon change de nom quand il monte en grade. */
  label?: string
  /** Expression demandée pour cette réplique du démon (grade 0 uniquement) ; absente = `normal`. */
  face?: Face
  /** Portrait affiché pendant la réplique, posé par `spokenBy` (demon.ts) d'après le grade et `face`. */
  portrait?: string
}

/** Fabriques de répliques, communes à tous les packs : démon, joueur, boss. */
export const D = (text: string, face?: Face): Line => (face ? { who: 'demon', text, face } : { who: 'demon', text })
export const P = (text: string): Line => ({ who: 'player', text })
export const B = (text: string): Line => ({ who: 'boss', text })

/**
 * Grades du démon (boutique-README.md « Déblocage par la hiérarchie du stagiaire »).
 * Un grade est obtenu quand le boss du cercle `afterCircle` est battu et le prix payé ;
 * ses `lines` sont dites dans le dialogue de fin de ce cercle, juste avant l'annonce du
 * cercle suivant. `label` — le nom du démon suivi de son grade — change dans les bulles à partir de là, et
 * `portrait` le costume affiché — cinq dessins pour six grades : les deux derniers partagent
 * le costume du boss, le sixième n'étant atteint qu'à l'évasion.
 * Pas encore d'effet sur la boutique : le grade est narratif pour l'instant.
 *
 * `afterCircle`, `portrait` et `faces` ne se traduisent pas : `texts.test.ts` vérifie que
 * toutes les langues donnent les mêmes.
 */
export interface DemonRank {
  name: string
  label: string
  afterCircle: number
  lines: readonly Line[]
  /** Fichier du portrait dans public/menu/perso, sans extension ; avec `faces`, le suffixe d'expression s'y ajoute. */
  portrait: string
  /** Vrai quand ce grade a un fichier par expression (`portrait` + `_` + Face). Seul le stagiaire en a. */
  faces?: boolean
}

export interface CircleTexts {
  /** Nom ordinal affiché en overlay : « 1er Cercle », « 1st Circle ». */
  ordinal: string
  /** Écran de transition après le cercle, prix payé. Dit ce qui change au cercle suivant. */
  success: readonly Line[]
  /** Écran de transition après le cercle, prix impayable : fin de run. */
  failure: readonly Line[]
  /**
   * Scène jouée juste avant la course du boss (la dernière du cercle) : le boss se présente,
   * le stagiaire commente. `{boss}` est son nom et `{price}` le prix de sortie du cercle.
   */
  bossIntro: readonly Line[]
}

/**
 * Page d'aide (bouton « Aide » du HUD) : un index à gauche, une section à la fois
 * à droite. Le contenu reprend docs/proto4/regles-du-jeu.md. Balisage inline
 * accepté dans les textes : **gras** et *italique* (rendu par HelpPanel).
 */
export interface HelpBlock {
  /** 'p' paragraphe · 'h' sous-titre · 'ul' puces · 'ol' étapes numérotées. */
  kind: 'p' | 'h' | 'ul' | 'ol'
  text?: string
  items?: readonly string[]
}

export interface HelpSection {
  /** Identifiant stable, le même dans toutes les langues (c'est l'ancre de navigation). */
  id: string
  /** Libellé dans l'index de gauche, titre de la carte de droite. */
  title: string
  icon: string
  blocks: readonly HelpBlock[]
}

/**
 * Les trois règles d'écriture qui changent d'une langue à l'autre et qu'aucune table de
 * chaînes ne peut porter : le rang écrit d'un nombre, la marque de pluriel, l'écriture
 * d'une décimale.
 */
export interface Fmt {
  /**
   * Rang d'un cercle au-delà de ceux qui ont un texte écrit : « 23e », « 23rd ».
   * Les cercles écrits donnent le leur dans `CIRCLES[].ordinal`.
   */
  ordinal(n: number): string
  /**
   * Marque de pluriel passée à `fill` sous la clé `s`, pour les phrases qui comptent
   * quelque chose : « recule de {n} case{s} », « moves back {n} space{s} ».
   */
  plural(n: number): string
  /** Une cote prête à citer dans un texte : « 2,2 » en français, « 2.2 » en anglais. */
  odds(multiplier: number): string
}

/**
 * Type d'un pack de langue, déduit du français. Les chaînes y sont élargies (`'Continuer'`
 * devient `string`) pour qu'une autre langue puisse en mettre d'autres, mais les formes qui
 * portent du sens pour le code — `Line`, `HelpBlock`, `HelpSection`, les nombres, les clés
 * des tables — sont gardées telles quelles.
 */
export type Translatable<T> =
  T extends (...args: never[]) => unknown ? T
  : T extends Line ? Line
  : T extends HelpSection ? HelpSection
  : T extends HelpBlock ? HelpBlock
  : T extends string ? string
  : T extends number | boolean ? T
  : { [K in keyof T]: Translatable<T[K]> }

/** Expression du démon quand la réplique n'en demande pas. */
const DEFAULT_FACE: Face = 'normal'

/**
 * Portrait à afficher pendant une réplique : le costume vient du grade, la tête de
 * l'expression. Les fichiers ne dépendent pas de la langue.
 */
export function portraitSrc(rank: DemonRank, face?: Face): string {
  return `/menu/perso/${rank.faces ? `${rank.portrait}_${face ?? DEFAULT_FACE}` : rank.portrait}.webp`
}

/** Remplace les {clés} d'un texte. Même règle dans toutes les langues. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (values[k] !== undefined ? String(values[k]) : `{${k}}`))
}

/** Intitulés d'un type de pari : ce que le noyau (`core/rules/bets.ts`) ne porte pas. */
export interface BetTypeText {
  label: string
  description: string
  /** Intitulé de chaque emplacement d'âme ; absent = numéro générique. */
  slots?: readonly string[]
}
