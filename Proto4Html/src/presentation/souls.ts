/** Couleurs des jetons, une par âme (indice = id). */
export const SOUL_COLORS = ['#e0a83c', '#6fa8d8', '#4ea86a', '#d0453c', '#b07cd8', '#e07a9c', '#5cc8c0', '#c9a27a'] as const

export function soulColor(id: number): string {
  return SOUL_COLORS[id % SOUL_COLORS.length] ?? '#ffffff'
}

/*
 * Face de dé par âme : `public/table/dice/<couleur sans #>.webp`. Le nom du fichier EST la
 * couleur, donc ajouter une âme se résume à ajouter une entrée dans SOUL_COLORS et le
 * fichier qui va avec. Sans fichier, on teinte le dé d'os à la couleur de l'âme
 * (`background-blend-mode: color` garde le modelé de la céramique et n'en change que la
 * teinte) plutôt que de lui prêter le dé d'une autre âme.
 *
 * Toutes les faces mesurées tiennent entre 5,1:1 et 7,1:1 avec l'encre sombre : il n'y a pas
 * de cas qui demande une encre claire, le CSS en pose donc une seule.
 */
const SOUL_DICE: ReadonlySet<string> = new Set(['e0a83c', '6fa8d8', '4ea86a', 'd0453c', 'b07cd8', 'e07a9c', '5cc8c0', 'c9a27a'])

/** Variables CSS d'un dé Âme : teinte du jeton, face et mode de fusion. */
export function soulDieStyle(id: number): Record<string, string> {
  const color = soulColor(id)
  const hex = color.slice(1)
  return SOUL_DICE.has(hex)
    ? { '--soul': color, '--soul-die': `url('/table/dice/${hex}.webp')`, '--soul-blend': 'normal' }
    : { '--soul': color, '--soul-die': `linear-gradient(${color}, ${color})`, '--soul-blend': 'color' }
}

/**
 * Inclinaison d'un dé, tirée de sa position. Des dés parfaitement alignés font gabarit ;
 * un angle retiré au hasard à chaque rendu ferait vibrer l'interface à chaque changement
 * d'état. L'angle est donc déterministe : même dé, même inclinaison, toute la partie.
 */
export function dieTilt(seed: number): string {
  const n = Math.sin((seed + 1) * 12.9898) * 43758.5453
  return `${((n - Math.floor(n)) * 6.4 - 3.2).toFixed(2)}deg`
}

export function fmtDistance(d: number): string {
  return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0'
}
