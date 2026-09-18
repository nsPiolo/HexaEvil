/**
 * Traduction des noms qui vivent dans la configuration : âmes, cercles, boss, pouvoirs,
 * terrains, objets de boutique.
 *
 * Ils ne pouvaient pas rejoindre `presentation/texts` — ils sont collés aux nombres qu'ils
 * décrivent (le prix d'un cercle, les faces d'un dé), et les dédoubler par langue aurait
 * dédoublé l'équilibrage avec eux. Une langue pose donc ici une simple couche de mots
 * par-dessus `config/race.json` et `config/shop.json`, avant validation : le français reste
 * la version écrite une fois pour toutes, les autres langues n'en remplacent que les mots.
 *
 * Une entrée absente laisse le texte français en place plutôt que de casser la partie ;
 * c'est `__tests__/i18n.test.ts` qui échoue quand une traduction manque, pas le joueur.
 */
import en from '../../../config/i18n/en.json'

interface CircleNames {
  name?: string
  boss?: string
  power?: string
  /** Dans l'ordre de `circles[].terrains` de race.json. */
  terrains?: readonly string[]
}

interface ItemNames {
  name?: string
  description?: string
  warning?: string
}

interface Overlay {
  /** Dans l'ordre de `souls.names` de race.json. */
  souls?: readonly string[]
  /** Dans l'ordre de `run.circles` de race.json. */
  circles?: readonly CircleNames[]
  /** Par id d'objet : l'ordre de `shop.items` n'entre pas en jeu. */
  items?: Readonly<Record<string, ItemNames>>
}

/** Le français est la langue écrite dans les fichiers de config : il n'a pas de couche. */
const OVERLAYS: Readonly<Record<string, Overlay>> = { en }

type Json = Record<string, unknown>

function isObj(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Remplace une chaîne si la traduction existe et n'est pas vide. */
function pick(translated: string | undefined, original: unknown): unknown {
  return typeof translated === 'string' && translated !== '' ? translated : original
}

function translateCircle(raw: unknown, names: CircleNames | undefined): unknown {
  if (!isObj(raw) || names === undefined) return raw
  const terrains = Array.isArray(raw.terrains)
    ? raw.terrains.map((t, i) => (isObj(t) ? { ...t, name: pick(names.terrains?.[i], t.name) } : t))
    : raw.terrains
  return { ...raw, name: pick(names.name, raw.name), boss: pick(names.boss, raw.boss), power: pick(names.power, raw.power), terrains }
}

/**
 * `config/race.json` traduit : noms d'âmes, puis nom, boss, pouvoir et terrains de chaque
 * cercle. Tout le reste — prix, couloirs, cases bloquées, effets — passe tel quel.
 */
export function translateRaceConfig(raw: unknown, lang: string): unknown {
  const overlay = OVERLAYS[lang]
  if (overlay === undefined || !isObj(raw)) return raw
  const out: Json = { ...raw }
  if (isObj(raw.souls) && Array.isArray(raw.souls.names) && overlay.souls !== undefined) {
    out.souls = { ...raw.souls, names: raw.souls.names.map((n, i) => pick(overlay.souls?.[i], n)) }
  }
  if (isObj(raw.run) && Array.isArray(raw.run.circles) && overlay.circles !== undefined) {
    out.run = { ...raw.run, circles: raw.run.circles.map((c, i) => translateCircle(c, overlay.circles?.[i])) }
  }
  return out
}

/**
 * `config/shop.json` traduit : nom, description et contrepartie de chaque objet, appariés
 * par id. Prix, raretés, faces et paramètres passent tels quels.
 */
export function translateShopConfig(raw: unknown, lang: string): unknown {
  const overlay = OVERLAYS[lang]
  if (overlay?.items === undefined || !isObj(raw) || !Array.isArray(raw.items)) return raw
  const items = overlay.items
  return {
    ...raw,
    items: raw.items.map((it) => {
      if (!isObj(it) || typeof it.id !== 'string') return it
      const t = items[it.id]
      if (t === undefined) return it
      return { ...it, name: pick(t.name, it.name), description: pick(t.description, it.description), warning: pick(t.warning, it.warning) }
    }),
  }
}

/** Les langues qui ont une couche ici. Le français n'en a pas : il est déjà dans les fichiers. */
export function translatedConfigLanguages(): readonly string[] {
  return Object.keys(OVERLAYS)
}
