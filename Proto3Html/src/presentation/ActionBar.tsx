/**
 * Les commandes du joueur, posées **au-dessus de sa zone de jeu** — spéc.
 * interface, « Batailles » et « Phases de dés ».
 *
 * La barre ne contient que des boutons et une ligne d'aide : les cartes et les
 * dés qu'on y désigne sont ceux de la table, pas des copies. C'est ce qui rend
 * l'écran lisible — un seul jeu de cartes visible, un seul jeu de dés.
 */

import type { Answer, Ask } from '../core/rules/asks'
import { CATEGORY_LABEL, diceHandLabel, EFFECT_LABEL, EFFECT_SYMBOL, REWARD_LABEL } from './labels'
import type { View } from './viewModel'

export interface ActionBarProps {
  ask: Ask
  view: View
  names: readonly string[]
  ladderSize: number
  /** Indices des cartes cochées pour l'échange. */
  swap: readonly number[]
  /** Masque des dés gardés pour la relance. */
  keep: readonly boolean[]
  flipMode: boolean
  setFlipMode: (on: boolean) => void
  onAnswer: (answer: Answer) => void
}

export function ActionBar(props: ActionBarProps) {
  const { ask, view, names, ladderSize, swap, keep, flipMode, setFlipMode, onAnswer } = props

  switch (ask.kind) {
    case 'mulligan':
      return (
        <Bar
          help={`Votre main : ${CATEGORY_LABEL[ask.rank.category]} — ${ask.rank.rank + 1}ᵉ sur ${ladderSize}. Vous pouvez échanger des cartes jusqu’à ${ask.total} fois (passe ${ask.pass}).`}
        >
          <button
            type="button"
            className="btn btn--primary"
            disabled={swap.length === 0}
            onClick={() => onAnswer({ kind: 'mulligan', swap: [...swap] })}
          >
            Échanger {swap.length} carte{swap.length > 1 ? 's' : ''}
          </button>
          <button type="button" className="btn" onClick={() => onAnswer({ kind: 'mulligan', swap: [] })}>
            Passer
          </button>
        </Bar>
      )

    case 'coin':
      return (
        <Bar help={`${ask.reason}. Vous annoncez, la pièce tranche.`}>
          <button type="button" className="btn btn--primary" onClick={() => onAnswer({ kind: 'coin', side: 'pile' })}>
            Pile
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onAnswer({ kind: 'coin', side: 'face' })}>
            Face
          </button>
        </Bar>
      )

    case 'reward':
      // `U8c` : les tuiles sont déjà sur le tapis, on les y clique.
      return (
        <Bar help="Vous remportez la bataille — cliquez la tuile que vous prenez, au centre de la table. Ce qui reste ne reviendra pas.">
          <></>
        </Bar>
      )

    case 'rewardTarget':
      return (
        <Bar help={`${REWARD_LABEL[ask.id]} — sur quel adversaire ?`}>
          {ask.candidates.map((i) => (
            <button
              key={i}
              type="button"
              className="btn btn--primary"
              onClick={() => onAnswer({ kind: 'rewardTarget', target: i })}
            >
              {names[i]}
            </button>
          ))}
        </Bar>
      )

    case 'chooseRerolls':
      return (
        <Bar help="Le réglage s’applique à tout le monde, vous compris. Moins de relances, plus de hasard.">
          {ask.options.map((v) => (
            <button
              key={v}
              type="button"
              className="btn btn--primary"
              onClick={() => onAnswer({ kind: 'chooseRerolls', value: v })}
            >
              {v} relance{v > 1 ? 's' : ''}
            </button>
          ))}
        </Bar>
      )

    case 'turn': {
      const c = ask.context
      const slot = view.dice[c.who]
      const values = c.values ?? slot?.values ?? []
      const n = c.diceCount
      const throwsLeft = c.maxThrows - c.throwNo
      const first = c.values === null
      const keepMask = keep.length === n ? keep : new Array<boolean>(n).fill(false)
      const rerolled = keepMask.filter((k) => !k).length

      if (flipMode) {
        return (
          <Bar help="Cliquez le dé à retourner : il montrera sa face opposée, telle qu’elle est gravée.">
            <button type="button" className="btn" onClick={() => setFlipMode(false)}>
              Annuler
            </button>
          </Bar>
        )
      }

      const roll = (useSet42 = false) =>
        onAnswer({
          kind: 'turn',
          action: { type: 'roll', keep: first ? new Array<boolean>(n).fill(false) : [...keepMask], useSet42 },
        })

      const help = first
        ? `Vous lancez ${n} dés ; le jeu retient toujours la meilleure combinaison de trois.`
        : `Cliquez les dés à garder, puis relancez les autres.${
            slot?.hand ? ` Actuellement : ${diceHandLabel(slot.hand)} — ${slot.hand.chipValue} jetons.` : ''
          }`
      // `D4` : le plafond vient du meneur, et il faut le dire.
      const cap = c.isLeader
        ? `Vous menez : le nombre de jets que vous utilisez plafonnera les autres.`
        : `Le meneur s’est arrêté après ${c.maxThrows} jet${c.maxThrows > 1 ? 's' : ''} : c’est votre plafond.`

      return (
        <Bar help={`${help} ${cap}`} tag={`Jet ${c.throwNo + 1} sur ${c.maxThrows}`}>
          {throwsLeft > 0 && (
            <button type="button" className="btn btn--primary" onClick={() => roll()}>
              {first ? `Lancer ${n} dés` : `Relancer ${rerolled} dé${rerolled > 1 ? 's' : ''}`}
            </button>
          )}
          {!first && (
            <button type="button" className="btn" onClick={() => onAnswer({ kind: 'turn', action: { type: 'stop' } })}>
              M’arrêter là
            </button>
          )}
          {/* `F10` : une relance gratuite ne coûte pas de jet — bouton par dé concerné. */}
          {c.freeRerolls.map((i) => (
            <button
              key={i}
              type="button"
              className="btn btn--bonus"
              title={EFFECT_LABEL.freeReroll}
              onClick={() => onAnswer({ kind: 'turn', action: { type: 'freeReroll', dieIndex: i } })}
            >
              {EFFECT_SYMBOL.freeReroll} relancer le {values[i]} gratuitement
            </button>
          ))}
          {c.canFlip && (
            <button type="button" className="btn btn--bonus" onClick={() => setFlipMode(true)}>
              Retourner un dé
            </button>
          )}
          {c.canSet42 && (
            <button type="button" className="btn btn--bonus" onClick={() => roll(true)}>
              Fixer 4 et 2 — jet définitif
            </button>
          )}
        </Bar>
      )
    }
  }
}

function Bar({ help, tag, children }: { help: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="bar">
      <div className="bar__buttons">
        {tag && <span className="bar__tag">{tag}</span>}
        {children}
      </div>
      <p className="bar__help">{help}</p>
    </div>
  )
}
