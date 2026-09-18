/**
 * Cotes réelles des paris, mesurées sur le moteur : `npm run odds [-- --races=5000] [-- --circles=9]`.
 *
 * Pourquoi cet outil existe : la config donne, en commentaire, les « cotes équitables à 5 âmes »
 * calculées sur une course au hasard — vainqueur 5, podium exact 60, etc. Mais la course n'est
 * **pas** au hasard. Le joueur lance `dice.distanceDice` dés Distance et `dice.soulDice` dés Âme
 * par tour quand l'adversaire n'en lance qu'une paire, et c'est lui qui décide quelle âme prend
 * quelle distance. Son âme portée gagne donc bien plus souvent qu'une sur N, et une cote posée
 * sur 1/N paie une quasi-certitude au prix d'un pari : la bourse enfle, et les cercles suivants
 * n'ont plus d'enjeu.
 *
 * Ce que le tableau mesure, pour chaque cercle et chaque type de pari :
 *
 * - `p` — la probabilité observée que le ticket **passe**, le joueur jouant toute la course pour
 *   ce ticket-là (il pousse les âmes qu'il a désignées, il freine celles qui les gênent) ;
 * - `équitable` — 1/p, la cote qui rendrait le pari neutre à long terme ;
 * - `config` — le multiplicateur de `config/race.json` ;
 * - `retour` — p × cote, ce que rapporte en moyenne une pièce misée. Au-dessus de 1, le guichet
 *   perd à chaque course ; c'est le seul chiffre qui dit si une cote est tenable.
 *
 * Ce que la mesure ne joue pas : les artefacts, les paris posés en course (cote décotée mais
 * issue plus sûre) et la course du boss. Elle mesure une course ordinaire, deux sur trois, avec
 * un joueur qui joue bien — c'est volontairement le haut de la fourchette, puisque c'est lui qui
 * casse l'économie.
 */
import { config } from '../src/core/config'
import { BET_TYPES, evaluateBet, slotCount, type BetTypeDef, type BetTypeId } from '../src/core/rules/bets'
import { DEMON_RANKS } from '../src/presentation/texts'
import { circleAt } from '../src/core/rules/circles'
import { applyMove, buildMoves, createRace, endTurn, naturalCombinations, ranking, rollOpponentPair, rollPlayerDice, type Combination, type RaceState, type Roll } from '../src/core/rules/race'
import { seededRng } from '../src/core/rules/rng'
import { terrainFor } from '../src/core/rules/terrain'
import { defaultInventory } from '../src/core/shop/shop'

interface Options {
  races: number
  circles: number
  /** Cible de retour (p × cote) des cotes proposées par `--suggest`. */
  suggest: number | null
}

function parseOptions(argv: readonly string[]): Options {
  const read = (name: string, fallback: number): number => {
    const arg = argv.find((a) => a.startsWith(`--${name}=`))
    const n = arg ? Number(arg.slice(name.length + 3)) : NaN
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
  }
  const suggest = argv.some((a) => a === '--suggest' || a.startsWith('--suggest='))
  return { races: read('races', 5000), circles: read('circles', config.run.circles.length), suggest: suggest ? read('suggest', 95) / 100 : null }
}

/**
 * Premier cercle où un type de pari est ouvert : son guichet s'ouvre avec le grade du stagiaire
 * (`economy.betUnlockLevel`), et un grade s'obtient à la fin du cercle `afterCircle`. Une cote se
 * calibre sur les cercles où elle est jouable, pas sur ceux où elle n'existe pas.
 */
function opensAtCircle(type: BetTypeId): number {
  const level = config.economy.betUnlockLevel[type]
  return (DEMON_RANKS[Math.min(level, DEMON_RANKS.length - 1)]?.afterCircle ?? 0) + 1
}

/**
 * Un ticket et la course qu'il fait jouer : les âmes qu'on pousse, celles qu'on freine. Un pari
 * « contre » (dernière place, pas dans le top 3) inverse simplement les deux listes — c'est le
 * même joueur, il joue juste dans l'autre sens.
 */
interface Ticket {
  def: BetTypeDef
  souls: number[]
  forward: readonly number[]
  backward: readonly number[]
}

/** Le ticket qu'un joueur pose sur ce type de pari, et le plan de course qui va avec. */
function ticketFor(def: BetTypeDef, soulCount: number): Ticket {
  const all = Array.from({ length: soulCount }, (_, i) => i)
  const souls = all.slice(0, slotCount(def, soulCount))
  const others = all.filter((id) => !souls.includes(id))
  switch (def.id) {
    // Parier contre une âme, c'est la freiner et laisser filer tout le monde.
    case 'notTop3':
    case 'last':
      return { def, souls, forward: others, backward: souls }
    // Les deux bouts de la course : on porte la première, on coule la seconde.
    case 'duel':
    case 'winnerAndLast':
      return { def, souls, forward: [souls[0]!], backward: [souls[1]!] }
    default:
      return { def, souls, forward: souls, backward: others }
  }
}

/**
 * Appariement des dés pour ce ticket. Les grandes distances d'abord, elles méritent la meilleure
 * cible ; une distance positive va à l'âme poussée qui en a le plus besoin, une négative à celle
 * qu'on freine et qui est allée trop loin. Sur un pari **ordonné**, « en avoir le plus besoin »
 * veut dire être la première du ticket qui n'a pas encore doublé la suivante.
 */
function playFor(roll: Roll, state: RaceState, ticket: Ticket): Combination[] {
  const position = (soul: number): number => state.souls[soul]?.position ?? 0
  const distances = roll.distance.map((value, index) => ({ value, index })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  const combos: Combination[] = []
  for (const d of distances) {
    const available = roll.soul.map((soul, index) => ({ soul, index })).filter((s) => !combos.some((c) => c.soulDie === s.index))
    if (available.length === 0) break
    const behind = (list: typeof available): typeof available => [...list].sort((a, b) => position(a.soul) - position(b.soul))
    const ahead = (list: typeof available): typeof available => [...list].sort((a, b) => position(b.soul) - position(a.soul))
    let chosen
    if (d.value >= 0) {
      const pushed = available.filter((s) => ticket.forward.includes(s.soul))
      // Pari ordonné : la première âme du ticket qui n'est pas devant la suivante.
      const outOfOrder = ticket.def.ordered
        ? pushed.find((s) => {
            const rank = ticket.souls.indexOf(s.soul)
            const next = ticket.souls[rank + 1]
            return rank >= 0 && next !== undefined && position(s.soul) <= position(next)
          })
        : undefined
      chosen = outOfOrder ?? behind(pushed)[0] ?? behind(available.filter((s) => !ticket.backward.includes(s.soul)))[0] ?? available[0]
    } else {
      chosen = ahead(available.filter((s) => ticket.backward.includes(s.soul)))[0] ?? ahead(available.filter((s) => !ticket.forward.includes(s.soul)))[0] ?? available[0]
    }
    if (!chosen) break
    combos.push({ soulDie: chosen.index, distanceDie: d.index })
  }
  return combos
}

/** Part des tickets gagnants d'un type, sur `races` courses d'un cercle jouées pour lui. */
function measure(circle: number, def: BetTypeDef, races: number, firstSeed = 1): number {
  const cfg = circleAt(config.run, circle)
  const inventory = defaultInventory(config)
  const ticket = ticketFor(def, cfg.souls)
  let won = 0
  for (let i = 0; i < races; i++) {
    const seed = (firstSeed + i * 7919) >>> 0
    const rng = seededRng(seed)
    const terrain = terrainFor(cfg.terrains, seed)
    let state = createRace(config, { soulCount: cfg.souls, lanes: cfg.lanes, blocked: terrain.blocked, specials: terrain.specials })
    let guard = 0
    while (!state.finished && guard++ < 200) {
      const roll = rollPlayerDice(config, state.souls.length, rng, inventory.dice)
      const combos = playFor(roll, state, ticket)
      for (const move of buildMoves(roll, combos, 'player', { turn: state.turn, clepsydre: false, bettedSouls: new Set(), sealBonus: 2 })) state = applyMove(state, move).state
      for (let k = 0; k < config.opponent.rollsPerTurn; k++) {
        const opponent = rollOpponentPair(config, state.souls.length, rng)
        for (const move of buildMoves(opponent, naturalCombinations(opponent), 'opponent')) state = applyMove(state, move).state
      }
      state = endTurn(state)
    }
    if (evaluateBet({ type: def.id, souls: ticket.souls }, ranking(state))) won += 1
  }
  return won / races
}

/** Cotes mesurées d'un cercle, un type de pari à la fois : chacun fait jouer sa propre course. */
export function measureBetOdds(circle: number, races: number, firstSeed = 1): Record<BetTypeId, number> {
  return Object.fromEntries(BET_TYPES.map((def) => [def.id, measure(circle, def, races, firstSeed)])) as Record<BetTypeId, number>
}

const column = (text: string, width: number, align: 'left' | 'right' = 'right'): string => (align === 'left' ? text.padEnd(width) : text.padStart(width))
const pct = (p: number): string => `${(p * 100).toFixed(1)} %`
/** Cote équitable : 1/p, « ∞ » quand aucun ticket n'est passé sur l'échantillon. */
const fair = (p: number): string => (p === 0 ? '∞' : (1 / p).toFixed(1))

function table(circle: number, races: number): void {
  const cfg = circleAt(config.run, circle)
  const odds = measureBetOdds(circle, races)
  console.log(`\nCercle ${circle} — ${cfg.name} · ${cfg.souls} âmes · ${cfg.lanes} couloir(s)`)
  const head = ['Pari', 'p', 'équitable', 'config', 'retour']
  const widths = [26, 8, 10, 8, 8]
  console.log(head.map((h, i) => column(h, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  console.log(widths.map((w) => '─'.repeat(w)).join(' '))
  for (const def of BET_TYPES) {
    const p = odds[def.id]
    const m = config.economy.multipliers[def.id]
    const row = [def.label, pct(p), fair(p), `×${m}`, (p * m).toFixed(2)]
    console.log(row.map((c, i) => column(c, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  }
}

/**
 * Cotes proposées pour atteindre un retour `target` : chaque type est calibré sur la **moyenne**
 * de ses probabilités aux cercles où son guichet est ouvert. Calibrer sur le premier cercle
 * ouvert rendrait le pari équitable à ses débuts et ruineux ensuite ; sur la moyenne, il tient
 * sur toute sa durée de vie, un peu généreux au début, un peu sec à la fin.
 */
function suggestions(circles: number, races: number, target: number): void {
  const odds = Array.from({ length: circles }, (_, k) => measureBetOdds(k + 1, races))
  console.log(`\nCotes proposées pour un retour cible de ×${target.toFixed(2)} (moyenne des cercles où le guichet est ouvert)`)
  const head = ['Pari', 'ouvert dès', 'p moyen', 'équitable', 'config', 'proposée', 'retour']
  const widths = [26, 11, 8, 10, 8, 9, 8]
  console.log(head.map((h, i) => column(h, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  console.log(widths.map((w) => '─'.repeat(w)).join(' '))
  for (const def of BET_TYPES) {
    const from = opensAtCircle(def.id)
    const open = odds.slice(from - 1).map((o) => o[def.id])
    const p = open.length === 0 ? 0 : open.reduce((a, b) => a + b, 0) / open.length
    const raw = p === 0 ? 0 : target / p
    // Arrondis lisibles : une cote se lit au guichet, elle ne s'épelle pas à trois décimales.
    const proposed = raw >= 20 ? Math.round(raw / 10) * 10 : raw >= 5 ? Math.round(raw) : Math.round(raw * 20) / 20
    const row = [def.label, `c${from}`, pct(p), fair(p), `×${config.economy.multipliers[def.id]}`, `×${proposed}`, (p * proposed).toFixed(2)]
    console.log(row.map((c, i) => column(c, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  }
}

const { races, circles, suggest } = parseOptions(process.argv.slice(2))
console.log(`Cotes mesurées sur ${races} courses par cercle et par type. Joueur : ${config.dice.distanceDice} dés Distance + ${config.dice.soulDice} dés Âme par tour, appariés pour le ticket ; adversaire : ${config.opponent.rollsPerTurn} paire(s).`)
if (suggest !== null) suggestions(circles, races, suggest)
else for (let n = 1; n <= circles; n++) table(n, races)
