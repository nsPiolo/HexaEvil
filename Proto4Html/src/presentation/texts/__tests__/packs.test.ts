/**
 * Ce que le compilateur ne dit pas déjà.
 *
 * `Pack` se déduit du français, donc une clé manquante ou en trop dans une autre langue ne
 * compile pas : ces tests-là seraient redondants. Restent trois choses qu'un type ne voit
 * pas : les parties de `DEMON_RANKS` qui ne se traduisent pas et qui doivent rester
 * identiques d'une langue à l'autre, les listes qui doivent garder la même longueur et les
 * mêmes ancres, et les {clés} de substitution, qu'une traduction peut avoir perdues en
 * route — une phrase à qui il manque `{price}` n'annonce plus de prix.
 */
import { describe, expect, it } from 'vitest'
import { BOSS_EFFECT_IDS } from '../../../core/rules/boss'
import { BET_TYPE_IDS } from '../../../core/rules/betTypes'
import { EN } from '../en'
import { FR } from '../fr'
import type { Pack } from '../index'
import type { Line } from '../types'

const PACKS: readonly (readonly [string, Pack])[] = [
  ['fr', FR],
  ['en', EN],
]
/** Les langues à comparer au français ; le français est la référence, il ne se compare pas à lui-même. */
const OTHERS = PACKS.filter(([id]) => id !== 'fr')

/** Les {clés} d'un texte, sans doublon et triées : deux langues doivent annoncer les mêmes. */
function keysOf(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1]!))].sort()
}

/** Toutes les chaînes d'un groupe, avec le chemin où les retrouver. */
function walk(value: unknown, path: string, out: Map<string, string>): Map<string, string> {
  if (typeof value === 'string') out.set(path, value)
  else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, out))
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) walk(v, path === '' ? k : `${path}.${k}`, out)
  }
  return out
}

const lineTexts = (lines: readonly Line[]): string[] => lines.map((l) => l.text)

describe('packs de langue', () => {
  it('donnent les mêmes grades au démon : portrait, expressions et cercle de promotion ne se traduisent pas', () => {
    for (const [id, pack] of OTHERS) {
      expect(pack.DEMON_RANKS.length, id).toBe(FR.DEMON_RANKS.length)
      pack.DEMON_RANKS.forEach((rank, i) => {
        const ref = FR.DEMON_RANKS[i]!
        expect({ id, ...rank, name: '', label: '', lines: [] }).toEqual({ id, ...ref, name: '', label: '', lines: [] })
      })
    }
  })

  it('gardent le même nombre de cercles et les mêmes répliques par scène', () => {
    for (const [id, pack] of OTHERS) {
      expect(pack.CIRCLES.length, id).toBe(FR.CIRCLES.length)
      pack.CIRCLES.forEach((circle, i) => {
        const ref = FR.CIRCLES[i]!
        // Le même nombre de répliques et les mêmes locuteurs : une scène traduite ne
        // s'abrège pas, et le boss ne prend pas la réplique du stagiaire.
        for (const scene of ['success', 'failure', 'bossIntro'] as const) {
          expect(circle[scene].map((l) => l.who), `${id} cercle ${i + 1} ${scene}`).toEqual(ref[scene].map((l) => l.who))
        }
      })
    }
  })

  it('gardent les mêmes ancres et le même nombre de blocs dans l’aide', () => {
    for (const [id, pack] of OTHERS) {
      expect(pack.HELP.sections.map((s) => s.id), id).toEqual(FR.HELP.sections.map((s) => s.id))
      expect(pack.HELP.sections.map((s) => s.icon), id).toEqual(FR.HELP.sections.map((s) => s.icon))
      pack.HELP.sections.forEach((section, i) => {
        expect(section.blocks.map((b) => b.kind), `${id} ${section.id}`).toEqual(FR.HELP.sections[i]!.blocks.map((b) => b.kind))
      })
    }
  })

  it('gardent les listes de même longueur', () => {
    for (const [id, pack] of OTHERS) {
      expect(pack.HUD.steps.length, id).toBe(FR.HUD.steps.length)
      expect(pack.HUD.raceOrdinals.length, id).toBe(FR.HUD.raceOrdinals.length)
      expect(pack.RACE.phases.length, id).toBe(FR.RACE.phases.length)
      expect(pack.INTRO.length, id).toBe(FR.INTRO.length)
      expect(pack.BOSS_ANNOUNCE_NEXT.length, id).toBe(FR.BOSS_ANNOUNCE_NEXT.length)
      expect(pack.HELP.intro.length, id).toBe(FR.HELP.intro.length)
    }
  })

  it('nomment tous les effets de boss et tous les types de pari', () => {
    for (const [id, pack] of PACKS) {
      for (const effect of BOSS_EFFECT_IDS) expect(pack.BOSS_EFFECTS[effect], `${id} ${effect}`).toBeTruthy()
      for (const bet of BET_TYPE_IDS) {
        expect(pack.BET_TYPE_TEXTS[bet].label, `${id} ${bet}`).toBeTruthy()
        expect(pack.BET_TYPE_TEXTS[bet].description, `${id} ${bet}`).toBeTruthy()
      }
    }
  })

  it('gardent les mêmes {clés} de substitution que le français', () => {
    const reference = walk(FR, '', new Map())
    for (const [id, pack] of OTHERS) {
      const translated = walk(pack, '', new Map())
      for (const [path, text] of reference) {
        const other = translated.get(path)
        if (other === undefined) continue
        expect(keysOf(other), `${id} · ${path}`).toEqual(keysOf(text))
      }
    }
  })

  it('n’écrivent aucun texte vide', () => {
    for (const [id, pack] of PACKS) {
      for (const [path, text] of walk(pack, '', new Map())) {
        // `STATS.none` est un tiret cadratin et `RESULTS.hidden` un point d'interrogation :
        // des marques, pas des phrases. Elles ne sont pas vides pour autant.
        expect(text.trim(), `${id} · ${path}`).not.toBe('')
      }
    }
  })

  it('annoncent les mêmes rangs de cercle que leurs règles d’écriture', () => {
    // Les cercles écrits donnent leur ordinal ; au-delà c'est `fmt.ordinal` qui compte.
    expect(FR.fmt.ordinal(23)).toBe('23e')
    expect(EN.fmt.ordinal(1)).toBe('1st')
    expect(EN.fmt.ordinal(2)).toBe('2nd')
    expect(EN.fmt.ordinal(3)).toBe('3rd')
    expect(EN.fmt.ordinal(4)).toBe('4th')
    expect(EN.fmt.ordinal(11)).toBe('11th')
    expect(EN.fmt.ordinal(12)).toBe('12th')
    expect(EN.fmt.ordinal(13)).toBe('13th')
    expect(EN.fmt.ordinal(21)).toBe('21st')
    expect(EN.fmt.ordinal(112)).toBe('112th')
    // Chaque cercle écrit annonce le rang que la règle donnerait, sinon le HUD compterait
    // « 9e, 10e, 11e » puis repartirait sur une autre forme au premier cercle non écrit.
    EN.CIRCLES.forEach((c, i) => expect(c.ordinal).toBe(EN.fmt.ordinal(i + 1)))
  })

  it('accordent le pluriel selon la langue', () => {
    expect(FR.fmt.plural(1)).toBe('')
    expect(FR.fmt.plural(2)).toBe('s')
    expect(EN.fmt.plural(1)).toBe('')
    expect(EN.fmt.plural(2)).toBe('s')
    // Le français garde le singulier à zéro, l'anglais non.
    expect(FR.fmt.plural(0)).toBe('')
    expect(EN.fmt.plural(0)).toBe('s')
  })

  it('écrivent la décimale d’une cote selon la langue', () => {
    expect(FR.fmt.odds(2.2)).toBe('2,2')
    expect(EN.fmt.odds(2.2)).toBe('2.2')
    expect(FR.fmt.odds(4)).toBe('4')
    expect(EN.fmt.odds(4)).toBe('4')
  })

  it('ne laissent pas les mêmes mots que le français là où il faut traduire', () => {
    // Filet grossier mais efficace contre le copier-coller : les grands blocs narratifs
    // d'une autre langue ne peuvent pas être mot pour mot ceux du français.
    for (const [id, pack] of OTHERS) {
      expect(lineTexts(pack.INTRO), id).not.toEqual(lineTexts(FR.INTRO))
      expect(pack.HELP.intro, id).not.toEqual(FR.HELP.intro)
      pack.CIRCLES.forEach((c, i) => expect(lineTexts(c.success), `${id} cercle ${i + 1}`).not.toEqual(lineTexts(FR.CIRCLES[i]!.success)))
    }
  })
})
