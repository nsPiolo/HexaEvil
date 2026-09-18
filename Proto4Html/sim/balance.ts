/**
 * Rapport d'équilibrage : `npm run balance [-- --runs=500] [-- --circles=15] [-- --from=6 --money=40]`.
 *
 * `--from=N --money=M` fait partir chaque run du cercle N avec M pièces en poche (inventaire de
 * départ) : c'est ainsi qu'on mesure la fin de la courbe des prix, que trop peu de runs partis du
 * début atteignent pour que leurs taux veuillent dire quelque chose.
 *
 * Joue N runs par profil (`profiles.ts`) et imprime, cercle par cercle, la part des runs qui
 * réunissent le prix. C'est l'outil pour régler les montants de `config/race.json` — prix des
 * cercles, avance de course, cotes — et voir tout de suite ce que ça déplace.
 *
 * Les graines sont fixes : deux exécutions de suite donnent le même tableau. Changer un montant
 * change les chiffres, pas le hasard.
 */
import { config } from '../src/core/config'
import { circleAt } from '../src/core/rules/circles'
import { PROFILES, type Profile } from './profiles'
import { measureOdds, simulateMany, type RunResult, type Start } from './run'

interface Options {
  runs: number
  circles: number
  start: Start
}

function parseOptions(argv: readonly string[]): Options {
  const read = (name: string, fallback: number): number => {
    const arg = argv.find((a) => a.startsWith(`--${name}=`))
    const n = arg ? Number(arg.slice(name.length + 3)) : NaN
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
  }
  const from = read('from', 1)
  return { runs: read('runs', 400), circles: read('circles', config.run.circles.length), start: { circle: from, money: read('money', from === 1 ? config.economy.startingMoney : 40) } }
}

const pct = (part: number, whole: number): string => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)} %`)

/** Médiane d'une liste de nombres (liste vide : 0). */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!
}

function column(text: string, width: number, align: 'left' | 'right' = 'right'): string {
  return align === 'left' ? text.padEnd(width) : text.padStart(width)
}

/** Une ligne par cercle : combien de runs s'y présentent, combien passent, avec quelle marge. */
function circleTable(results: readonly RunResult[], circles: number): void {
  const head = ['Cercle', 'Prix', 'Arrivés', 'Payé', 'Taux', 'Solde méd.', 'Marge méd.']
  const widths = [7, 8, 8, 6, 7, 11, 11]
  console.log(head.map((h, i) => column(h, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  console.log(widths.map((w) => '─'.repeat(w)).join(' '))
  for (let n = results[0]?.circles[0]?.circle ?? 1; n <= circles; n++) {
    const reached = results.map((r) => r.circles.find((c) => c.circle === n)).filter((c) => c !== undefined)
    if (reached.length === 0) break
    const paid = reached.filter((c) => c.paid)
    const price = circleAt(config.run, n).price
    const cells = [
      `${n}. ${circleAt(config.run, n).name}`,
      String(price),
      String(reached.length),
      String(paid.length),
      pct(paid.length, reached.length),
      String(median(reached.map((c) => c.money))),
      String(median(reached.map((c) => c.money - c.price))),
    ]
    console.log(cells.map((c, i) => column(c, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  }
}

/** Où les runs s'arrêtent : c'est la courbe que l'équilibrage cherche à lisser. */
function deathCurve(results: readonly RunResult[]): void {
  const counts = new Map<number, number>()
  for (const r of results) counts.set(r.cleared, (counts.get(r.cleared) ?? 0) + 1)
  const max = Math.max(...counts.values())
  const keys = [...counts.keys()].sort((a, b) => a - b)
  console.log('\n  Cercles franchis (dernier prix payé) :')
  for (const k of keys) {
    const n = counts.get(k)!
    console.log(`  ${column(String(k), 3)} │ ${'█'.repeat(Math.round((n / max) * 40)).padEnd(40)} ${column(String(n), 4)} ${column(pct(n, results.length), 6)}`)
  }
}

/**
 * D'où vient l'argent et où il va, par cercle joué : c'est ce tableau qui dit quel montant
 * toucher. Le retour sur mise (rendu ÷ misé) est le levier des cotes ; l'avance et la boutique
 * sont les deux autres robinets.
 */
function moneyFlow(results: readonly RunResult[]): void {
  const played = results.flatMap((r) => r.circles)
  const sum = (pick: (c: (typeof played)[number]) => number): number => played.reduce((t, c) => t + pick(c), 0)
  const allowance = sum((c) => c.allowance)
  const staked = sum((c) => c.staked)
  const returned = sum((c) => c.returned)
  const spent = sum((c) => c.spent)
  console.log('\n  Flux d’argent, tous cercles joués confondus :')
  console.log(`    avance du stagiaire  ${column(String(allowance), 10)}`)
  console.log(`    misé                 ${column(String(staked), 10)}`)
  console.log(`    rendu                ${column(String(returned), 10)}   retour sur mise ×${(returned / Math.max(1, staked)).toFixed(2)}`)
  console.log(`    dépensé en boutique  ${column(String(spent), 10)}`)
  console.log(`    net des paris        ${column(String(returned - staked), 10)}`)
}

function report(profile: Profile, options: Options): void {
  const results = simulateMany(profile, options.runs, 1, options.start)
  const escaped = results.filter((r) => r.escaped).length
  console.log(`\n\n━━ Profil « ${profile.name} » ━━ ${options.runs} runs · appariement ${profile.pairing} · paris ${profile.betting} · boutique ${profile.shopping} · ${Math.round(profile.stakeShare * 100)} % du solde misé`)
  console.log()
  circleTable(results, options.circles)
  deathCurve(results)
  moneyFlow(results)
  console.log(`\n  Évasion (cercle ${config.run.escapeCircle} payé) : ${escaped} runs sur ${options.runs} — ${pct(escaped, options.runs)}`)
  console.log(`  Cercle franchi médian : ${median(results.map((r) => r.cleared))}`)
}

/**
 * Le levier de jeu, mesuré avant tout le reste : ce que l'âme pariée gagne vraiment, selon que
 * le joueur apparie ses dés au hasard ou avec soin. La cote équitable en découle ; la cote du
 * jeu doit rester en dessous pour un joueur négligent et au-dessus pour un joueur appliqué,
 * sinon le levier ne sert à rien.
 */
function leverage(circles: readonly number[], races: number): void {
  console.log('\n\n━━ Le levier : chances de l’âme pariée selon l’appariement ━━\n')
  const widths = [22, 11, 11, 13, 11]
  console.log(['Cercle · appariement', 'Vainqueur', 'Top 3', 'Cote éq. vq.', 'Cote jeu'].map((h, i) => column(h, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
  console.log(widths.map((w) => '─'.repeat(w)).join(' '))
  for (const circle of circles) {
    for (const pairing of ['naturelle', 'favorite'] as const) {
      const odds = measureOdds(circle, pairing, races)
      const fair = odds.winner > 0 ? (1 / odds.winner).toFixed(2) : '∞'
      const cells = [
        `${circle}. ${circleAt(config.run, circle).name.slice(0, 11)} ${pairing === 'favorite' ? 'soigné' : 'au hasard'}`,
        `${(odds.winner * 100).toFixed(1)} %`,
        `${(odds.top3 * 100).toFixed(1)} %`,
        `×${fair}`,
        `×${config.economy.multipliers.winner}`,
      ]
      console.log(cells.map((c, i) => column(c, widths[i]!, i === 0 ? 'left' : 'right')).join(' '))
    }
  }
}

const options = parseOptions(process.argv.slice(2))
console.log(`Équilibrage — ${options.runs} runs par profil, graines fixes${options.start.circle > 1 ? ` · départ au cercle ${options.start.circle} avec ${options.start.money} pièces` : ''}.`)
console.log(`Avance par course : ${config.economy.raceAllowance} · capital de départ : ${config.economy.startingMoney} · ${config.run.racesPerCircle} courses par cercle.`)
leverage([1, 5, 9], Math.max(200, options.runs))
for (const profile of PROFILES) report(profile, options)
console.log('\nLes montants se règlent dans config/race.json (economy, run.circles[].price).\n')
