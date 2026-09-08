/** Les décisions du joueur — tout ce qui arrête le moteur (`U11`, `U12`). */

import { useState } from 'react'
import type { Answer, Ask } from '../core/rules/asks'
import { CardView, DieView } from './bits'
import { CATEGORY_LABEL, diceHandLabel, EFFECT_LABEL, EFFECT_SYMBOL, REWARD_LABEL } from './labels'
import type { View } from './viewModel'

interface Props {
  ask: Ask
  view: View
  names: readonly string[]
  ladderSize: number
  onAnswer: (answer: Answer) => void
}

export function Prompt(props: Props) {
  // La clé remet à zéro l'état local à chaque nouvelle question.
  return <PromptBody {...props} key={promptKey(props.ask)} />
}

function promptKey(ask: Ask): string {
  if (ask.kind === 'turn') return `turn-${ask.context.who}-${ask.context.throwNo}-${ask.context.phase}`
  if (ask.kind === 'mulligan') return `mull-${ask.pass}-${ask.hand.map((c) => c.uid).join('.')}`
  return ask.kind
}

function PromptBody({ ask, view, names, ladderSize, onAnswer }: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [keep, setKeep] = useState<boolean[]>([])
  const [flipMode, setFlipMode] = useState(false)

  switch (ask.kind) {
    case 'mulligan': {
      const toggle = (i: number) =>
        setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
      return (
        <Panel
          title={`Changement ${ask.pass} sur ${ask.total}`}
          help={`Votre main : ${CATEGORY_LABEL[ask.rank.category]} — ${ask.rank.rank + 1}ᵉ sur ${ladderSize}. Cliquez les cartes à échanger, ou passez.`}
        >
          <div className="hand hand--interactive">
            {ask.hand.map((card, i) => (
              <CardView key={card.uid} card={card} marked={selected.includes(i)} onClick={() => toggle(i)} />
            ))}
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={selected.length === 0}
              onClick={() => onAnswer({ kind: 'mulligan', swap: selected })}
            >
              Échanger {selected.length} carte{selected.length > 1 ? 's' : ''}
            </button>
            <button type="button" className="btn" onClick={() => onAnswer({ kind: 'mulligan', swap: [] })}>
              Passer
            </button>
          </div>
        </Panel>
      )
    }

    case 'coin':
      return (
        <Panel title="Pile ou face" help={`${ask.reason}. Vous annoncez, la pièce tranche.`}>
          <div className="actions">
            <button type="button" className="btn btn--primary" onClick={() => onAnswer({ kind: 'coin', side: 'pile' })}>
              Pile
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onAnswer({ kind: 'coin', side: 'face' })}>
              Face
            </button>
          </div>
        </Panel>
      )

    case 'reward':
      // `U8c` : les récompenses sont déjà à l'écran, dans la bande. On les y
      // rend cliquables au lieu d'en dessiner une seconde rangée ici.
      return (
        <Panel
          title="Vous remportez la bataille"
          help="Cliquez la récompense que vous prenez, dans la bande au-dessus. Ce qui reste ne reviendra pas."
        >
          <></>
        </Panel>
      )

    case 'rewardTarget':
      return (
        <Panel title={REWARD_LABEL[ask.id]} help="Sur quel adversaire ?">
          <div className="actions">
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
          </div>
        </Panel>
      )

    case 'chooseRerolls':
      return (
        <Panel
          title="Combien de relances ?"
          help="Le réglage s’applique à tout le monde, vous compris. Moins de relances, plus de hasard."
        >
          <div className="actions">
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
          </div>
        </Panel>
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
          <Panel
            title="Retourner un dé"
            help="Le dé montre sa face opposée, telle qu’elle est gravée. Une seule fois par partie."
          >
            <div className="dice dice--interactive">
              {values.map((v, i) => (
                <DieView
                  key={i}
                  value={v}
                  onClick={() => onAnswer({ kind: 'turn', action: { type: 'flip', dieIndex: i } })}
                />
              ))}
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setFlipMode(false)}>
                Annuler
              </button>
            </div>
          </Panel>
        )
      }

      const roll = (useSet42 = false) =>
        onAnswer({
          kind: 'turn',
          action: { type: 'roll', keep: first ? new Array<boolean>(n).fill(false) : keepMask, useSet42 },
        })

      return (
        <Panel
          title={first ? `À vous — ${n} dés, jet 1 sur ${c.maxThrows}` : `Jet ${c.throwNo + 1} sur ${c.maxThrows}`}
          help={
            (first
              ? `Vous lancez ${n} dés ; le jeu retient toujours la meilleure combinaison de trois. `
              : `Cliquez les dés à garder, puis relancez — ou arrêtez-vous là. ${
                  slot?.hand ? `Actuellement : ${diceHandLabel(slot.hand)} — ${slot.hand.chipValue} jetons. ` : ''
                }`) +
            // `D4` : le plafond vient du meneur, et il faut le dire.
            (c.isLeader
              ? `Vous menez : le nombre de jets que vous utilisez plafonnera les autres.`
              : `Le meneur s’est arrêté après ${c.maxThrows} jet${c.maxThrows > 1 ? 's' : ''} : c’est votre plafond.`)
          }
        >
          {!first && (
            <div className="dice dice--interactive">
              {values.map((v, i) => (
                <DieView
                  key={i}
                  value={v}
                  effect={c.effects[i] ?? null}
                  kept={keepMask[i]}
                  dimmed={!c.kept.includes(i)}
                  onClick={() =>
                    setKeep(() => keepMask.map((x, j) => (j === i ? !x : x)))
                  }
                  title={keepMask[i] ? 'Gardé' : 'Sera relancé'}
                />
              ))}
            </div>
          )}
          <div className="actions">
            {throwsLeft > 0 && (
              <button type="button" className="btn btn--primary" onClick={() => roll()}>
                {first ? 'Lancer' : `Relancer ${rerolled} dé${rerolled > 1 ? 's' : ''}`}
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
          </div>
        </Panel>
      )
    }
  }
}

function Panel({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="prompt">
      <div className="prompt__head">
        <strong>{title}</strong>
        <span>{help}</span>
      </div>
      {children}
    </div>
  )
}
