import { useMemo, useState, type DragEvent } from 'react'
import { config } from '../core/config'
import { BET_TYPES, BET_TYPE_ARTEFACT, betRefusal, betType, betUnlocked, bettingClosed, currentMultiplier, evaluateBet, fmtMultiplier, potentialPayout, raceProgress, slotCount, type Bet, type BetTier, type BetTypeId } from '../core/rules/bets'
import { isInBetZone, ranking, type RaceState, type Roll } from '../core/rules/race'
import type { Phase } from './useRace'
import { ItemLockBadge, LockBadge, itemLockTitle, lockTitle } from './LockBadge'
import { MoneyGauge } from './MoneyGauge'
import { fmtDistance, soulColor } from './souls'
import { BETS, BET_LIVE, BET_TIERS, BET_TYPE_TEXTS, HUD, UI, fill, plural } from './texts'
import { betRefusalText, itemNameOf } from './messages'

/** Brouillon de ticket : type choisi et âmes désignées. Partagé avec le plateau (spec 03/C2). */
export interface BetDraft {
  type: BetTypeId
  souls: number[]
  /**
   * Mise posée dans le logement, ou null tant que le joueur n'a rien choisi (le panneau prend
   * alors le plus petit jeton du cercle). Elle fait partie du brouillon : un ticket à moitié
   * rempli doit se retrouver entier après un détour par la boutique.
   */
  stake?: number | null
}

export const EMPTY_DRAFT: BetDraft = { type: 'winner', souls: [], stake: null }

/** Ajoute ou retire une âme du brouillon, sans dépasser `slots` : même règle pour les chips et les jetons. */
export function toggleDraftSoul(draft: BetDraft, id: number, slots: number): BetDraft {
  if (draft.souls.includes(id)) return { ...draft, souls: draft.souls.filter((x) => x !== id) }
  if (draft.souls.length >= slots) return draft
  return { ...draft, souls: [...draft.souls, id] }
}

interface Props {
  race: RaceState
  money: number
  /** Échelle des mises du cercle en cours (`stakesAtCircle`), croissante. */
  stakes: readonly number[]
  /** Prix du cercle, pour la jauge. */
  price: number
  bets: readonly Bet[]
  /** Peut-on poser un pari en ce moment ? */
  open: boolean
  phase: Phase
  /** Niveau du stagiaire : les types de paris au-dessus sont affichés verrouillés. */
  level: number
  /** Artefacts possédés : certains guichets (paris exotiques) n'existent que par eux. */
  owned: readonly string[]
  /** Dés lancés (Œil du parieur) : rappelés en tête, puisque le panneau recouvre la zone des dés. */
  roll?: Roll | null
  /** Œil du parieur : null si non possédé. */
  lateBet: { charges: number; active: boolean } | null
  onUseLateBet: () => void
  onPlace: (type: BetTypeId, souls: readonly number[], stake: number) => string | null
  /** Retrait d'un pari (préparation seulement) : absent = pas d'annulation possible. */
  onCancel?: (id: number) => string | null
  /** Cote de base d'un type, artefacts compris. */
  baseFor: (type: BetTypeId) => number
  /** Brouillon contrôlé par l'écran (sélection d'âmes sur le plateau) ; sinon état interne. */
  draft?: BetDraft
  onDraftChange?: (draft: BetDraft) => void
  /** Survol croisé chip ↔ jeton du plateau. */
  highlightSoul?: number | null
  onHoverSoul?: (id: number | null) => void
  /** En préparation : lancer la course et ouvrir la boutique depuis le panneau. */
  onStart?: () => void
  onOpenShop?: () => void
  onClose?: () => void
}

const TIERS: readonly BetTier[] = ['simple', 'intermediate', 'advanced', 'exotic']
const NUMERALS = ['I', 'II', 'III'] as const

/**
 * Jetons peints (`public/table/chips/`), un par palier de mise. L'échelle du cercle est libre :
 * au-delà de quatre mises, les visuels se répètent — la valeur reste portée par le chiffre. Le
 * jeton est choisi par **position** dans l'échelle, pas par valeur : quand les mises grandissent
 * avec le cercle (`stakesAtCircle`), les quatre jetons restent les mêmes, seuls les chiffres changent.
 */
const CHIP_ART = ['/table/chips/chip-1.webp', '/table/chips/chip-2.webp', '/table/chips/chip-3.webp', '/table/chips/chip-4.webp'] as const
const chipArtIn = (stakes: readonly number[], v: number): string => CHIP_ART[Math.max(0, stakes.indexOf(v)) % CHIP_ART.length] as string
const STAKE_MIME = 'application/x-sinnersbet-stake'
function readStake(e: DragEvent): number | null {
  const raw = e.dataTransfer.getData(STAKE_MIME)
  return /^\d+$/.test(raw) ? Number(raw) : null
}

export function BetPanel({ race, money, stakes, price, bets, open, phase, level, owned, roll = null, lateBet, onUseLateBet, onPlace, onCancel, baseFor, draft, onDraftChange, highlightSoul, onHoverSoul, onStart, onOpenShop, onClose }: Props) {
  const [localDraft, setLocalDraft] = useState<BetDraft>(EMPTY_DRAFT)
  const d = draft ?? localDraft
  const setDraft = onDraftChange ?? setLocalDraft
  const { type, souls } = d
  /**
   * Palier affiché. Il s'initialise sur celui du brouillon en cours, pas sur « Simples » : le
   * panneau est démonté quand la boutique prend sa place, et un ticket à moitié rempli doit se
   * retrouver à l'endroit où on l'a laissé, pas se cacher derrière un onglet.
   */
  const [tier, setTier] = useState<BetTier>(() => betType(d.type).tier)
  // La mise vit dans le brouillon, pas dans le panneau : elle survit à son démontage.
  const stake = d.stake ?? stakes[0] ?? 5
  const setStake = (v: number): void => setDraft({ ...d, stake: v })
  const chipArt = (v: number): string => chipArtIn(stakes, v)
  /** La mise la plus forte du cercle, la seule qui prenne feu dans le logement. */
  const hottest = Math.max(...stakes)
  const [error, setError] = useState<string | null>(null)

  const prep = phase === 'prep'
  const closed = bettingClosed(race)
  const def = betType(type)
  const slots = slotCount(def, race.souls.length)
  const progress = raceProgress(race)
  const decay = config.economy.decay
  const multOf = (id: BetTypeId): number => currentMultiplier(baseFor(id), progress, decay)
  const unlock = config.economy.betUnlockLevel
  const isLocked = (id: BetTypeId): boolean => !betUnlocked(id, level, unlock, owned)
  /** L'objet qui ouvre ce guichet, tant qu'on ne l'a pas : le verrou n'est alors pas un grade. */
  const lockingItem = (id: BetTypeId): string | null => {
    const needed = BET_TYPE_ARTEFACT[id]
    return needed !== undefined && !owned.includes(needed) ? itemNameOf(needed) : null
  }
  const mult = multOf(type)
  const refusal = useMemo(() => betRefusal(race, type, souls, stake, money, bets), [race, type, souls, stake, money, bets])
  const missing = Math.max(0, slots - souls.length)
  const net = potentialPayout(stake, mult) - stake
  const staked = bets.filter((b) => b.status === 'open').reduce((s, b) => s + b.stake, 0)
  const ready = open && missing === 0 && !refusal
  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`

  /**
   * Paliers montrés au joueur. Un palier fermé par le **grade** reste affiché, désactivé : il
   * s'ouvrira tout seul en jouant, et l'annoncer fait partie de la progression (01/C3). Un
   * palier fermé par un **objet** est masqué tant qu'on ne l'a pas — il ne s'ouvrira jamais de
   * lui-même, et un onglet mort qui nomme un objet encore inconnu encombre la grille des trois
   * paliers ordinaires plus qu'il ne renseigne. C'est la carte de boutique du Registre qui dit
   * ce qu'il ouvre (artefacts.md n°39).
   */
  const shownTiers = TIERS.filter((t) => BET_TYPES.some((b) => b.tier === t && (!isLocked(b.id) || lockingItem(b.id) === null)))

  /** Fourchette de cotes des types ouverts d'un palier, pour l'onglet ; « verrouillé » si aucun. */
  const range = (t: BetTier): string => {
    const m = BET_TYPES.filter((b) => b.tier === t && !isLocked(b.id)).map((b) => multOf(b.id))
    if (m.length === 0) return BETS.tierLocked
    const lo = Math.min(...m)
    const hi = Math.max(...m)
    return lo === hi ? fmtMultiplier(lo) : `${fmtMultiplier(lo)} – ${fmtMultiplier(hi)}`
  }

  const changeType = (id: BetTypeId): void => {
    // Changer de type vide les âmes désignées, mais garde la mise : le jeton posé dans le
    // logement est un choix à part, il n'a pas à être refait à chaque changement de guichet.
    setDraft({ ...d, type: id, souls: [] })
    setError(null)
  }
  const changeTier = (t: BetTier): void => {
    setTier(t)
    const first = BET_TYPES.find((b) => b.tier === t && !isLocked(b.id))
    if (first && betType(type).tier !== t) changeType(first.id)
  }
  const toggleSoul = (id: number): void => {
    setError(null)
    setDraft(toggleDraftSoul(d, id, slots))
  }
  const place = (): void => {
    const err = onPlace(type, souls, stake)
    setError(err)
    if (!err) setDraft({ ...d, souls: [] })
  }

  // Mise : glisser un jeton dans le logement, ou le cliquer (même alternative que l'appariement des dés).
  const [dragStake, setDragStake] = useState<number | null>(null)
  const [overSocket, setOverSocket] = useState(false)
  const chooseStake = (v: number): void => {
    setStake(v)
    setError(null)
  }
  const startStakeDrag = (v: number) => (e: DragEvent): void => {
    e.dataTransfer.setData(STAKE_MIME, String(v))
    e.dataTransfer.effectAllowed = 'move'
    setDragStake(v)
  }
  const endStakeDrag = (): void => {
    setDragStake(null)
    setOverSocket(false)
  }
  const allowStakeDrop = (e: DragEvent): void => {
    const v = dragStake ?? readStake(e)
    if (v === null || v > money) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!overSocket) setOverSocket(true)
  }
  const dropStake = (e: DragEvent): void => {
    e.preventDefault()
    const v = dragStake ?? readStake(e)
    if (v !== null && v <= money) chooseStake(v)
    endStakeDrag()
  }

  // Sous-titre de l'en-tête hors préparation : pourquoi les paris sont fermés.
  let status: string
  if (error) {
    status = error
  } else if (!open) {
    status = race.finished ? UI.bets.raceOver : closed ? fill(UI.bets.thresholdPassed, { pct: Math.round(race.track.betThresholdRatio * 100) }) : phase === 'pairing' ? UI.bets.rolled : UI.bets.resolving
  } else if (missing > 0) {
    status = fill(UI.bets.pickMore, { n: missing, s: plural(missing) })
  } else if (refusal) {
    status = betRefusalText(refusal)
  } else {
    status = fill(UI.bets.draft, { type: BET_TYPE_TEXTS[type].label, stake, mult: fmtMultiplier(mult) })
  }

  return (
    <section className="bet-panel" aria-label={UI.bets.panel}>
      <header className={'bp-head' + (onClose ? ' bp-head-hideable' : '')}>
        <div className="bp-title">
          <h2 className="serif">{UI.bets.open}</h2>
          <p className="muted">
            {prep ? UI.bets.needOne : open ? UI.bets.lastCall : status}
            {progress > 0 && open && <>{fill(UI.bets.decayed, { pct: Math.round(progress * 100) })}</>}
          </p>
          {roll && phase === 'pairing' && <p className="small bp-dice">{fill(BETS.diceSeen, { souls: roll.soul.map((id) => soulName(id)).join(' · '), dist: roll.distance.map(fmtDistance).join(' / ') })}</p>}
        </div>
        {/* Le solde n'est pas répété ici : la jauge juste en dessous l'écrit déjà, en regard
            du prix du cercle, qui est la seule lecture utile au moment de miser. */}
        <div className="bp-money">
          <MoneyGauge money={money} price={price} staked={staked} />
        </div>
        {/* Replier le panneau n'a de sens qu'en course, quand la piste est derrière : en
            préparation on en sort par « Lancer la course », pas en le masquant. GameScreen
            ne passe donc `onClose` qu'une fois la course partie. */}
        {onClose && (
          <button type="button" className="btn-stone btn-stone-sm bp-hide" onClick={onClose}>
            {UI.bets.hide}
          </button>
        )}
      </header>

      {!open && phase === 'pairing' && !closed && lateBet && (
        <div className="bp-late">
          <button type="button" className="btn btn-artefact" disabled={lateBet.charges <= 0} onClick={onUseLateBet}>
            Œil du parieur : parier après le lancer ({lateBet.charges} charge{lateBet.charges > 1 ? 's' : ''})
          </button>
        </div>
      )}
      {open && phase === 'pairing' && <p className="hint small bp-late">Œil du parieur actif : tu paries en connaissant tes dés.</p>}

      {/* Sections en colonnes côte à côte (spec 08/C2) : type · âmes · mise. */}
      <div className="bp-body">
        <div className="bp-col">
          <h3 className="bp-section">
            <span className="numeral">{NUMERALS[0]}</span> Type de pari
          </h3>
          {/* `data-count` : les trois paliers ordinaires tiennent sur une ligne de trois ; le
              palier exotique, quand il apparaît, prend la largeur entière plutôt que d'ouvrir
              une seconde ligne aux deux tiers vide. */}
          <div className="tiers" role="tablist" data-count={shownTiers.length}>
            {shownTiers.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tier === t} className={'tier' + (tier === t ? ' tier-on' : '')} disabled={!open || BET_TYPES.every((b) => b.tier !== t || isLocked(b.id))} onClick={() => changeTier(t)}>
                <span className="tier-name">{BET_TIERS[t]}</span>
                <span className="tier-range">{range(t)}</span>
              </button>
            ))}
          </div>
          <ul className="types">
            {BET_TYPES.filter((b) => b.tier === tier).map((b) => {
              const locked = isLocked(b.id)
              // Un pari fermé par un objet dans un palier par ailleurs ouvert : le cas ne se
              // présente pas aujourd'hui (les deux guichets exotiques partagent le Registre, et
              // leur palier est masqué sans lui), mais dire « dès Stagiaire » le jour où il se
              // présentera serait le retour exact du défaut qu'on vient de corriger.
              const item = locked ? lockingItem(b.id) : null
              return (
                <li key={b.id}>
                  <button type="button" className={'type' + (type === b.id ? ' type-on' : '') + (locked ? ' type-locked' : '')} disabled={!open || locked} onClick={() => changeType(b.id)} aria-pressed={type === b.id} title={locked ? (item ?? '') !== '' ? itemLockTitle(item!) : lockTitle(unlock[b.id]) : undefined}>
                    <span className="type-text">
                      <span className="type-name">{BET_TYPE_TEXTS[b.id].label}</span>
                      <span className="type-desc">{BET_TYPE_TEXTS[b.id].description}</span>
                    </span>
                    {locked ? (item ? <ItemLockBadge name={item} /> : <LockBadge level={unlock[b.id]} />) : <span className="mult-badge serif">{fmtMultiplier(multOf(b.id))}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="bp-col">
          <h3 className="bp-section">
            <span className="numeral">{NUMERALS[1]}</span> {def.ordered && slots > 1 ? UI.ticket.soulsOrdered : slots > 1 ? UI.ticket.souls : UI.ticket.soul}
            <span className="bp-count">
              {souls.length}/{slots}
            </span>
          </h3>
          <div className="bet-slots">
            {Array.from({ length: slots }, (_, i) => {
              const id = souls[i]
              const label = BET_TYPE_TEXTS[type].slots?.[i] ?? (def.ordered ? `${i + 1}` : null)
              return (
                <button key={i} type="button" className={'bet-slot' + (id !== undefined ? ' bet-slot-filled' : '')} style={id !== undefined ? { ['--soul' as string]: soulColor(id) } : undefined} onClick={() => id !== undefined && toggleSoul(id)} disabled={id === undefined || !open} title={id !== undefined ? 'Retirer' : ''} aria-label={id === undefined ? BETS.emptySlot : undefined}>
                  {label && <span className="bet-slot-tag">{label}</span>}
                  {id !== undefined && <span className="lane-dot" style={{ background: soulColor(id) }} />}
                  {/* Vide, l'emplacement ne montre que le vortex ; le span reste pour tenir la hauteur. */}
                  <span className="bet-slot-name">{id !== undefined ? soulName(id) : ''}</span>
                </button>
              )
            })}
          </div>
          <div className="bet-souls">
            {race.souls.map((s) => {
              const zone = isInBetZone(race.track, s.position)
              const picked = souls.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={'chip soul-chip' + (picked ? ' chip-on' : '') + (highlightSoul === s.id ? ' chip-hot' : '')}
                  style={{ ['--soul' as string]: soulColor(s.id) }}
                  disabled={!open || zone || (!picked && souls.length >= slots)}
                  onClick={() => toggleSoul(s.id)}
                  onMouseEnter={() => onHoverSoul?.(s.id)}
                  onMouseLeave={() => onHoverSoul?.(null)}
                  onFocus={() => onHoverSoul?.(s.id)}
                  onBlur={() => onHoverSoul?.(null)}
                  title={zone ? BETS.overThreshold : `case ${s.position}`}
                >
                  <span className="lane-dot" style={{ background: soulColor(s.id) }} />
                  {s.name}
                  {zone && <span className="chip-zone">{Math.round(race.track.betThresholdRatio * 100)} %</span>}
                </button>
              )
            })}
          </div>
          {/* Le gain potentiel se range sous la liste des âmes : la colonne a la place libre,
              alors que sous la mise il allongeait le panneau dès que le pari devenait complet. */}
          {ready && (
            <div className="bp-ticket" aria-live="polite">
              <span className="bp-ticket-gain good">{fill(BETS.gain, { net, mult: fmtMultiplier(mult).slice(1) })}</span>
              <span className="bp-ticket-after muted">{fill(BETS.after, { n: money - stake })}</span>
            </div>
          )}
        </div>

        <div className="bp-col">
          <h3 className="bp-section">
            <span className="numeral">{NUMERALS[2]}</span> Mise
          </h3>
          <div className="stake-zone">
            {/* Le logement : cible du dépôt, et socle du jeton en cours. Le chiffre reste du texte. */}
            <div
              className={'stake-socket' + (dragStake !== null ? ' stake-socket-armed' : '') + (overSocket ? ' stake-socket-over' : '')}
              data-testid="stake-socket"
              onDragOver={open ? allowStakeDrop : undefined}
              onDragLeave={() => overSocket && setOverSocket(false)}
              onDrop={open ? dropStake : undefined}
            >
              {/* Les flammes ne saluent que le tapis maximum : le feu dit « tu joues gros », pas « tu as choisi ». */}
              {stake === hottest && <span className="stake-flames" aria-hidden="true" />}
              <span key={stake} className="stake-chip stake-chip-active" style={{ backgroundImage: `url(${chipArt(stake)})` }} aria-hidden="true">
                {stake}
              </span>
            </div>
            <div className="stake-tray" role="group" aria-label={BETS.trayLabel}>
              {stakes.map((v) => {
                const chosen = v === stake
                const tooRich = v > money
                return (
                  <button
                    key={v}
                    type="button"
                    className={'stake-chip' + (chosen ? ' stake-chip-gone' : '') + (dragStake === v ? ' stake-chip-dragging' : '')}
                    style={chosen ? undefined : { backgroundImage: `url(${chipArt(v)})` }}
                    draggable={open && !tooRich && !chosen}
                    onDragStart={startStakeDrag(v)}
                    onDragEnd={endStakeDrag}
                    disabled={!open || tooRich}
                    aria-pressed={chosen}
                    aria-label={chosen ? String(v) : undefined}
                    title={tooRich ? fill(BETS.tooRich, { n: money }) : chosen ? BETS.chipChosen : BETS.chipHint}
                    onClick={() => chooseStake(v)}
                  >
                    {chosen ? null : v}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Paris posés : la liste apparaît dès le premier ticket et reste ouverte. Elle remplace
          le compteur repliable de l'en-tête — à zéro pari il n'y avait rien à replier. */}
      {bets.length > 0 && (
        <section id="bp-placed" className="bp-placed" aria-label={UI.bets.placed}>
          <BetList race={race} bets={bets} live={!prep} {...(onCancel ? { onCancel } : {})} />
        </section>
      )}

      <footer className="bp-foot">
        <div className="bp-actions">
          <button type="button" className="btn btn-primary bp-place" disabled={!open || refusal !== null} onClick={place}>
            {/* Le parchemin est un décor : il déborde du bouton et ne doit rien dire aux lecteurs d'écran. */}
            <span className="bp-place-art" aria-hidden="true" />
            <span className="bp-place-label">{UI.bets.submit}</span>
          </button>
          {prep && onOpenShop && (
            <button type="button" className="btn btn-gold bp-shop" disabled={bets.length === 0} onClick={onOpenShop} title={bets.length === 0 ? UI.bets.shopNeedsBet : undefined}>
              <span className="bp-shop-art" aria-hidden="true" />
              <span className="bp-shop-label">{HUD.shop}</span>
            </button>
          )}
          {prep && onStart && (
            <button type="button" className="btn bp-start" disabled={bets.length === 0} onClick={onStart}>
              <span className="bp-start-glow" aria-hidden="true" />
              <span className="bp-start-art" aria-hidden="true" />
              <span className="bp-start-label">
                {bets.length === 0 ? UI.bets.raceNeedsBet : HUD.toRace}
              </span>
            </button>
          )}
        </div>
      </footer>
    </section>
  )
}

/** Liste des paris posés, avec leur état. Utilisée dans le panneau de paris et sur la table. */
export function BetList({ race, bets, compact, live, onCancel }: { race: RaceState; bets: readonly Bet[]; compact?: boolean; /** En course : état provisoire de chaque pari ouvert d'après les positions actuelles. */ live?: boolean; onCancel?: (id: number) => string | null }) {
  const soulName = (id: number): string => race.souls[id]?.name ?? `#${id}`
  if (bets.length === 0) return <p className="muted small">{UI.bets.none}</p>
  const provisional = live && race.souls.some((s) => s.position > 0) ? ranking(race) : null
  return (
    <ul className={'bets' + (compact ? ' bets-compact' : '') + (onCancel ? ' bets-cancellable' : '')}>
      {bets.map((b) => {
        const onTrack = provisional && b.status === 'open' ? evaluateBet(b, provisional) : null
        return (
          <li key={b.id} className={`bet bet-${b.status}` + (onTrack === null ? '' : onTrack ? ' bet-on-track' : ' bet-at-risk')} data-live={onTrack === null ? undefined : onTrack ? 'on-track' : 'at-risk'}>
            <span className="bet-type">{BET_TYPE_TEXTS[b.type].label}</span>
            <span className="bet-targets">
              {b.souls.map((id, i) => (
                <span key={id}>
                  {i > 0 && <span className="muted">{betType(b.type).ordered ? ' › ' : ', '}</span>}
                  <span style={{ color: soulColor(id) }}>{soulName(id)}</span>
                </span>
              ))}
            </span>
            <span className="bet-stake">
              {b.stake} {fmtMultiplier(b.multiplier)}
              {b.turn > 0 && !compact && <span className="muted">{fill(UI.ticket.turn, { n: b.turn })}</span>}
            </span>
            <span className="bet-status">
              {b.status === 'open' && onTrack === null && fill(UI.ticket.ifWon, { net: potentialPayout(b.stake, b.multiplier) - b.stake })}
              {b.status === 'open' && onTrack !== null && (
                <span className="bet-live" title={BET_LIVE.title}>
                  {onTrack ? BET_LIVE.onTrack : BET_LIVE.atRisk} <span className="muted">· {BET_LIVE.provisional}</span>
                </span>
              )}
              {b.status === 'won' && fill(UI.ticket.won, { net: b.payout - b.stake })}
              {b.status === 'lost' && fill(UI.ticket.lost, { stake: b.stake })}
            </span>
            {onCancel && b.status === 'open' && (
              <button type="button" className="bet-cancel" onClick={() => onCancel(b.id)} title={fill(BETS.cancelTitle, { stake: b.stake })}>
                {BETS.cancel}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
