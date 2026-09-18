/**
 * Hiérarchie du démon stagiaire (GDD §5.2, boutique-README « Déblocage par la
 * hiérarchie du stagiaire »). Le grade se déduit du nombre de cercles payés : rien
 * n'est sauvegardé en plus. Ici on assemble les dialogues de transition avec les
 * lignes de promotion et le nom du démon qui change dans les bulles.
 */
import { config } from '../core/config'
import { circleAt } from '../core/rules/circles'
import { bossPortrait } from './art'
import { BOSS_ANNOUNCE, BOSS_ANNOUNCE_NEXT, CIRCLES, DEMON_RANKS, fill, portraitSrc, type DemonRank, type Line } from './texts'

/** Niveau (index dans DEMON_RANKS) atteint après `circlesPaid` cercles payés (0 au départ). */
export function demonLevel(circlesPaid: number): number {
  let level = 0
  DEMON_RANKS.forEach((r, i) => {
    if (r.afterCircle <= circlesPaid) level = i
  })
  return level
}

/** Grade atteint après `circlesPaid` cercles payés (0 au départ). */
export function demonRank(circlesPaid: number): DemonRank {
  return DEMON_RANKS[demonLevel(circlesPaid)]!
}

/** Grade d'un niveau, le dernier au-delà de la liste. */
export function rankOfLevel(level: number): DemonRank {
  return DEMON_RANKS[Math.min(level, DEMON_RANKS.length - 1)]!
}

/** Niveau pendant la course d'index `raceIndex` (les cercles précédents sont payés). */
export function demonLevelAtRace(raceIndex: number): number {
  return demonLevel(Math.floor(raceIndex / config.run.racesPerCircle))
}

/** Grade pendant la course d'index `raceIndex`. */
export function demonRankAtRace(raceIndex: number): DemonRank {
  return rankOfLevel(demonLevelAtRace(raceIndex))
}

/** Lignes de promotion : les {clés} sont les cotes de base des paris (config economy.multipliers). */
function promotionLines(rank: DemonRank): Line[] {
  return rank.lines.map((l) => ({ ...l, text: fill(l.text, config.economy.multipliers) }))
}

/** Donne au démon le nom et le portrait de son grade dans chaque ligne (le joueur garde le sien). */
export function spokenBy(lines: readonly Line[], rank: DemonRank): Line[] {
  return lines.map((l) => (l.who === 'demon' ? { ...l, label: rank.label, portrait: portraitSrc(rank, l.face) } : l))
}

/** Textes d'un cercle, le dernier servant de repli au-delà de la liste. */
export function circleTexts(circle: number) {
  return CIRCLES[circle - 1] ?? CIRCLES[CIRCLES.length - 1]!
}

/**
 * Scène jouée juste avant la course du boss : il se présente sous son nom (`config/race.json`)
 * et son portrait, le stagiaire commente avec son grade du moment. Le boss du dernier cercle
 * est le stagiaire lui-même, promu : son portrait est celui du neuvième cercle.
 */
export function bossIntro(circle: number): Line[] {
  const cfg = circleAt(config.run, circle)
  const label = cfg.boss
  const portrait = bossPortrait(circle)
  const lines = circleTexts(circle).bossIntro.map((l) => ({ ...l, text: fill(l.text, { boss: label, price: cfg.price }) }))
  return spokenBy(lines, demonRank(circle - 1)).map((l) => (l.who === 'boss' ? { ...l, label, portrait } : l))
}

/**
 * Annonce du boss à la fin de l'avant-dernière course du cercle. Le premier cercle a la sienne —
 * c'est là qu'on apprend qu'un boss existe ; les suivants tournent sur les variantes, qui ne
 * présentent personne : chaque boss se présente lui-même avant sa course (`bossIntro`).
 */
export function bossAnnounce(circle: number): Line[] {
  const price = circleAt(config.run, circle).price
  const variants = circle <= 1 ? BOSS_ANNOUNCE : BOSS_ANNOUNCE_NEXT[(circle - 2) % BOSS_ANNOUNCE_NEXT.length]!
  const lines = variants.map((l) => ({ ...l, text: fill(l.text, { price }) }))
  return spokenBy(lines, demonRank(circle - 1))
}

/** Fin de cercle sans l'argent du prix : le démon garde son grade actuel. */
export function circleFailure(circle: number): Line[] {
  return spokenBy(circleTexts(circle).failure, demonRank(circle - 1))
}

/**
 * Fin de cercle, prix payé. Si ce cercle fait monter le démon en grade, ses lignes de
 * promotion sont dites avec le nouveau nom, insérées juste avant la dernière ligne du texte
 * de réussite — celle qui annonce le cercle suivant. Il y a toujours un cercle suivant : au
 * bout de la liste, le dernier se rejoue (circles.ts).
 */
export function circleSuccess(circle: number): Line[] {
  const before = demonRank(circle - 1)
  const after = demonRank(circle)
  const next = circleAt(config.run, circle + 1)
  const success = circleTexts(circle).success.map((l) => ({ ...l, text: fill(l.text, { souls: next.souls, price: next.price }) }))
  if (after === before || after.lines.length === 0) return spokenBy(success, after.afterCircle === circle ? after : before)
  const cut = success.length - 1
  return [...spokenBy(success.slice(0, cut), before), ...spokenBy(promotionLines(after), after), ...spokenBy(success.slice(cut), after)]
}
