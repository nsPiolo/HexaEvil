/**
 * Un seul endroit où l'on change de langue.
 *
 * Il y a deux réserves de texte, et elles n'ont pas le même point d'entrée : le lexique
 * (`texts`, tout ce qui est écrit pour l'écran) et les noms de la configuration (`core/config`,
 * collés aux nombres qu'ils décrivent). `applyLanguage` bascule les deux ensemble — appeler
 * l'un sans l'autre donnerait un menu anglais et des âmes françaises.
 *
 * Les groupes exportés par `texts` et les `config`/`shop` de `core/config` sont des liaisons
 * vivantes : après cet appel, il suffit d'un rendu pour que tout l'écran suive. `App` le
 * provoque en enregistrant l'option, ce qui repose son état.
 */
import { setConfigLanguage } from '../core/config'
import { DEFAULT_LANGUAGE, isLanguage, setLanguage, type Language } from './texts'
import { urlLanguage } from './urlParams'

export function applyLanguage(lang: Language): void {
  setLanguage(lang)
  setConfigLanguage(lang)
}

/**
 * Langue au démarrage : `?lang=en` l'emporte sur l'option enregistrée, pour qu'un test de
 * bout en bout ou un lien de démonstration ouvre la bonne version sans passer par le menu.
 */
export function startingLanguage(saved: Language): Language {
  const forced = urlLanguage()
  return forced ?? (isLanguage(saved) ? saved : DEFAULT_LANGUAGE)
}
