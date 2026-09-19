/**
 * English lexicon. Mirrors `fr.ts` key for key — French is the reference language, so
 * anything added there and missing here is a compile error, not a blank on screen.
 *
 * Nothing imports from this file directly: screens go through `./index`, which serves the
 * pack for the language picked in the options.
 *
 * Two things that are NOT translated here, on purpose: `DEMON_RANKS[].portrait` /
 * `afterCircle` / `faces` (artwork and progression, checked identical across languages by
 * `texts.test.ts`), and the soul / circle / boss / shop-item names, which live in
 * `config/i18n/en.json` next to the numbers they belong to.
 */
import type { BetRefusal, BetTier, CancelRefusal } from '../../core/rules/bets'
import type { BetTypeId } from '../../core/rules/betTypes'
import type { BossEffectId } from '../../core/rules/boss'
import type { PersonalityId } from '../../core/rules/personalities'
import type { MoveNoteId } from '../../core/rules/race'
import type { ItemKind, Rarity } from '../../core/shop/items'
import type { PurchaseLog } from '../../core/shop/shop'
import { B, D, P, type BetTypeText, type CircleTexts, type DemonRank, type Fmt, type HelpSection, type Line, type Speaker } from './types'

/** Judas Iscariot: the traitor, who ends up running the ninth circle. */
const DEMON_NAME = 'Iscariot'

/** Default speaker names in the bubbles; the boss takes his own from `config/race.json`. */
const SPEAKERS: Record<Speaker, string> = { demon: `${DEMON_NAME}, intern`, player: 'You', boss: 'The circle boss' }

const GAME_NAME = "Sinner's Bet"

const MENU = {
  continue: 'Continue',
  newRun: 'Start a new escape',
  stats: 'Statistics',
  collection: 'Collection',
  options: 'Options',
  back: 'Back',
  next: 'Next',
  skipIntro: 'Skip the introduction',
  skip: 'Skip',
} as const

const INTRO: readonly Line[] = [
  D('Congratulations, you’re dead!', 'fier'),
  D('We looked over your file, and to nobody’s surprise, you ended up here.', 'neutre'),
  D('Iscariot, demon intern. I don’t have the clearance to assign you your proper punishment… *and it’s under repair anyway*.', 'normal'),
  D('…so we’ll have to wait for the boss. Sorry about that.', 'doute'),
  D('Fancy a little wager while we wait? You’ve got eternity ahead of you, may as well lose a piece of it.', 'fier'),
  P('No thanks. I already lost everything once.'),
  D('Exactly, you know the drill. And I’m bored stiff: I’ll lend you a stake, you keep your winnings.', 'doute'),
  P('Fine. But no funny business.'),
  D('None whatsoever. You have my word… *and on that point, believe me, I have a reputation*.', 'fier'),
  D('Down here we bet on a race of damned souls, so here’s {money} coins to start. And before every race, I’ll advance you {allowance} more.', 'neutre'),
  D('Oh, and I’m only cleared to take simple bets: winner, top 3, outside the top 3, last. Anything that puts two souls on one ticket is above my grade. For now.', 'doute'),
  D('One last thing, do what you like with it: down here, everything has a price. The punishments, the passages… the doors. Win enough, and you might not be staying.', 'neutre'),
]

/**
 * End of the second-to-last race of the **first** circle: the player doesn’t yet know a boss
 * closes every circle, so this is where they find out.
 */
const BOSS_ANNOUNCE: readonly Line[] = [
  D('My boss is back, he saw us playing. He wants his cut: {price} coins at the end of the circle, and he’ll run the last race himself.', 'normal'),
  D('You pay, he lets you climb a circle. You don’t pay, he keeps you… *it’s his job, and he’s good at it*.', 'doute'),
]

/**
 * Same moment, in the circles after. The rule is known by now: the intern only reminds you
 * that the next race is the boss’s and what it costs. He introduces none of them — each
 * circle boss introduces himself right before his race (`bossIntro`), and doubling him up
 * here would rob him of his entrance. One variant per circle, looped past the end of the
 * list: the same line nine times running would stop being heard.
 */
const BOSS_ANNOUNCE_NEXT: readonly (readonly Line[])[] = [
  [D('You know the house rules now: the last race of the circle belongs to the boss. {price} coins in hand at the finish and we move on.', 'neutre')],
  [D('Next race, last of the circle. The landlord comes down to work the counter himself, and it’ll take {price} coins for him to open the door.', 'normal')],
  [D('One more, then it’s the boss’s. I’ll be straight with you: without {price} coins at the end, we don’t leave this circle.', 'doute')],
  [D('The boss booked the last race. He always books… *there’s never anyone*. {price} coins at the end, not one less: I keep the books.', 'neutre')],
  [D('Last race of the circle, so last chance to scrape together the {price} coins. The boss doesn’t take instalments.', 'normal')],
  [D('The next one’s the boss’s… *they all insist, it’s their one moment of glory*. {price} coins and we’re off to the next circle.', 'fier')],
  [D('We’re at the end of the circle, and the end of a circle is always a boss. {price} coins at the finish, or we stay.', 'neutre')],
]

/**
 * Last circle before the escape: the boss of Treachery is the intern himself, promoted one
 * circle earlier. The generic variant would spoil the only twist in the game — so he
 * announces a boss he knows well, without naming himself, and `bossIntro` does the rest.
 */
const BOSS_ANNOUNCE_SELF: readonly Line[] = [
  D('Last race of the last circle. {price} coins, and the door opens. For good.'),
  D('The boss of Treachery is working the counter. I know him well.'),
  P('What’s he like?'),
  D('Punctual.'),
]

const DEMON_RANKS: readonly DemonRank[] = [
  { name: 'Intern', label: `${DEMON_NAME}, intern`, afterCircle: 0, lines: [], portrait: 'stagiaire_0', faces: true },
  {
    name: 'Assistant',
    label: `${DEMON_NAME}, assistant`,
    // The first grade takes TWO circles: one proves nothing, and the infernal
    // administration does not promote on a lucky streak.
    afterCircle: 2,
    portrait: 'stagiaire_1_assistant',
    lines: [
      D('And… it gets better. Minos wound his tail twice around my file: I’m an assistant. An assistant! My first grade in three centuries of interning.', 'fier'),
      P('Congratulations. What does that change?'),
      D('For me, a chair with a back. For you, the right to put two souls on one ticket: the “Duel” at ×{duel}, “Two souls in the top 3” at ×{twoInTop3}, “Top 3 in any order” at ×{podiumAnyOrder}.'),
      D('Don’t just look at the odds. A winner, you guess. A duel, you read. It isn’t the same trade, and you’re going to need the second one.'),
    ],
  },
  {
    name: 'Tormentor',
    label: `${DEMON_NAME}, tormentor`,
    afterCircle: 3,
    portrait: 'stagiaire_2_souschef',
    lines: [
      D('Cerberus signed my review. With three heads, that counts triple: tormentor, second rung.'),
      D('I’m allowed to torment now. Officially. I’ll start with my old department head.'),
      P('Am I on the list?'),
      D('You? You earn me too much. As long as you’re winning, I only torment your rivals.'),
      D('And I’ve got one more stamp: the “Winner + last” bet is open to you, at ×{winnerAndLast}. Two bets in one, and it plays out at the bottom of the standings… *where nobody ever looks*.'),
    ],
  },
  {
    name: 'Foreman',
    label: `${DEMON_NAME}, foreman`,
    afterCircle: 5,
    portrait: 'stagiaire_3_chef',
    lines: [
      D('Phlegyas filed my review. Foreman. I have a team, an office, a window onto the lava.'),
      D('A foreman doesn’t coach in his corner any more: people watch me. So don’t embarrass me in the sixth.'),
      P('You’re the one talking about embarrassment?'),
      D('I’m talking about brand image. My name is on your file now. In large letters.'),
      D('In exchange, a foreman can open the “Exact podium” counter: three souls, in order, ×{podiumExact}. The kind of ticket that changes an escape.'),
    ],
  },
  {
    name: 'Deputy Director',
    label: `${DEMON_NAME}, deputy director`,
    afterCircle: 7,
    portrait: 'stagiaire_4_boss',
    lines: [
      D('Deputy director. The Minotaur insisted personally. Apparently I “raise the stakes”.'),
      D('Two rungs below the boss of the ninth. There has never been an intern this high. There has never been a bettor this far, either.'),
      P('So we’re tied together.'),
      D('By a pact, yes. Don’t forget it. I won’t.'),
      D('And the great ledger opens: the “Exact full standings”, ×{fullRankingExact}. Nobody has ever touched it. It would be amusing if it happened against me.'),
    ],
  },
  { name: 'Boss of the Ninth', label: `${DEMON_NAME}, boss of the ninth`, afterCircle: 8, lines: [], portrait: 'stagiaire_4_boss' },
]

/**
 * One block per circle: Dante’s nine, then the climb of demon mode (GDD §8.1). Past the
 * last one, `circleTexts` (demon.ts) replays this final block — the fifteenth is therefore
 * written to be said again on every lap of paradise, without promising a sequel.
 *
 * The “Bye.” that closes each `failure` stops at the ninth: it’s the intern’s sign-off for
 * as long as he’s at home. Above hell he is out of his depth and dismisses nobody — the
 * absence is deliberate, don’t “complete” circles 10 to 15.
 */
const CIRCLES: readonly CircleTexts[] = [
  {
    ordinal: '1st',
    success: [
      D('Congratulations, I didn’t think you had it in you.', 'fier'),
      D('If it suits you, I’ll coach you. We’ll test you in the other circles.'),
      D('I did try to send your name up. They told me a single circle happens to any dead man. Hold two and it becomes a file.', 'doute'),
      D('Next stop: Lust. Eternal winds toss the souls about, there’ll be {souls} at the start, one more than here. And the exit fee climbs to {price} coins.'),
    ],
    failure: [D('Right. The repairs are done, I got my clearances back this morning… *and your eternal punishment with them*. Shame, we were having fun. Bye.', 'degout')],
    bossIntro: [
      B('So it’s you. The dead man who plays dice instead of going down.'),
      D('Charon, sir. He paid his passage, technically…', 'normal'),
      B('Technically. I spent nine thousand years counting coins, lad. I know what technically means.'),
      B('One race, then. If you leave here with {price} coins, I’ll let you have the boat. Otherwise, you’re on the oar.'),
      P('And if I win, you row?'),
      B('You’re the first to ask that one. The others, mostly I hear them rowing.'),
    ],
  },
  {
    ordinal: '2nd',
    success: [
      D('Two circles! My department head has stopped talking down to me, that’s a good sign.'),
      D('Gluttony awaits: mud up to the knees and Cerberus gnawing anything that lags. Still {souls} souls at the start, but the way out costs {price} coins.'),
    ],
    failure: [D('Pity. The winds of Lust carry you off, and I go back to filing. Bye.')],
    bossIntro: [
      B('{boss}. I judge, I coil my tail, I send them down. It’s a simple trade.'),
      D('He hasn’t judged you yet. That’s a good sign. Well, it’s a sign.'),
      B('Two turns of the tail for you. Or three. I’ll count on the way, the winds can decide the rest.'),
      B('{price} coins at the exit. Place your bets, it’ll save me thinking.'),
    ],
  },
  {
    ordinal: '3rd',
    success: [
      D('You’ve got a nose for the right odds. They’ve given me an access badge for the fourth.'),
      D('Greed: souls shoving weights at each other, for eternity. {souls} souls at the start, one more, and {price} coins to pass.'),
    ],
    failure: [D('Cerberus is hungry, and you’ve nothing left to stake. You know the way out… well, no, that’s rather the point. Bye.')],
    bossIntro: [
      D('Right. {boss} doesn’t talk. He has three mouths and not one of them has ever been used for that.'),
      B('GRRRR.'),
      D('What he means is that the mud slows everyone down and he bites whatever lags.'),
      P('He said all that?'),
      D('Mostly he said {price} coins. The rest is context. Don’t offer him your hand.'),
    ],
  },
  {
    ordinal: '4th',
    success: [
      D('Four circles. The misers wept watching you leave with their money. Me, I got a bonus.'),
      D('Wrath now: the Styx, a marsh where the souls strike each other without end. Still {souls} souls, and {price} coins for the way out.'),
    ],
    failure: [D('The misers keep everything, you included. It ends oddly well for them. Bye.')],
    bossIntro: [
      B('Pape Satàn, pape Satàn aleppe!'),
      D('Nobody has ever worked out what that means. Me neither.'),
      B('It means: show me your purse.'),
      B('{price} coins at the exit. Down here, souls shove weights for eternity over a great deal less.'),
    ],
  },
  {
    ordinal: '5th',
    success: [
      D('You came out of the Styx without a splash. The boss asked for your name. Mine too, for once.'),
      D('Heresy next: burning tombs, and {souls} souls at the start, one more. The exit goes up to {price} coins.'),
    ],
    failure: [D('The Styx keeps you. No hard feelings: I’ll put you in the marsh, it’s right next to the office. Bye.')],
    bossIntro: [
      B('Get in. The Styx is calm today. Calm for the Styx.'),
      D('Don’t look into the water.'),
      B('Do look into the water, on the contrary. You’ll see everyone who bet before you.'),
      P('They lost?'),
      B('They argued. {price} coins, and you cross without getting wet.'),
    ],
  },
  {
    ordinal: '6th',
    success: [
      D('Six circles. They gave me a locker, a badge, and the right to say “we” in meetings. Tenured coach, nearly.'),
      D('Violence comes in three sub-circles: river of blood, thickets, burning sand. Still {souls} souls, but {price} coins to pass.'),
    ],
    failure: [D('There’s a free slot in the tombs of Heresy, as it happens. Bye.')],
    bossIntro: [
      B('Three voices, one opinion: you have no business here.'),
      D('They say that to everyone. They mean it too.'),
      B('The tombs are open, they’ve been heating since this morning. There’s one left in your size.'),
      B('{price} coins to close it without you inside.'),
    ],
  },
  {
    ordinal: '7th',
    success: [
      D('Seven circles. My boss is starting to look at me sideways. I think he’s worked out who coaches whom.'),
      D('Fraud: ten concentric ditches, the Malebolge, full of seducers and forgers. {souls} souls at the start, one more, and {price} coins to leave.'),
    ],
    failure: [D('The burning sand, the river of blood… take your pick, I’m feeling generous. Bye.')],
    bossIntro: [
      D('Don’t look him in the eye. Or anywhere else, for that matter.'),
      B('I AM CALM.'),
      D('He is not calm.'),
      B('{price} COINS AND YOU PASS. IT IS WRITTEN. I RESPECT WHAT IS WRITTEN.'),
      P('Does he always shout?'),
      D('No. Sometimes he charges.'),
    ],
  },
  {
    ordinal: '8th',
    success: [
      D('Eight circles. Only Treachery left. And… I’ve been promoted. I run the ninth.'),
      D('That’s not a problem, is it? A pact is a pact. There’ll be {souls} souls at the start, one more, frozen in the Cocytus, and it’ll take {price} coins to get out. For good.'),
    ],
    failure: [D('The forgers beat you at your own game. A ditch is waiting for you at the bottom of the Malebolge. Bye.')],
    bossIntro: [
      B('Welcome. Sit down, take whatever you like, it’s on the house.'),
      D('Take nothing.'),
      B('People often tell me I have an honest face. It’s the tail you want to watch.'),
      B('The race will be straight, you have my word. {price} coins at the exit.'),
      D('His word. There you are.'),
    ],
  },
  {
    ordinal: '9th',
    success: [
      D('You… you paid. Against me. Against the ninth circle.'),
      D('A pact is a pact. The door is there, open. Nobody has ever climbed back out of here, so don’t tell anyone how you did it.'),
      P('And you?'),
      D('Me? Running a circle, and still not much of anything. What I’m missing is a bettor who can read a race.'),
      D('Because there’s something else, above. I’ve seen the registers: the sea floor, a cliff, a city, a mountain, the sky. And right at the top, a counter nobody has ever worked.'),
      D('So: the door, or the climb. You keep the change either way.'),
    ],
    failure: [D('One coin short. This is the circle of Treachery, what were you expecting? Welcome to the ice. Bye.')],
    bossIntro: [
      B('There you are. Last circle, last counter… *and on my side of it, this time*.'),
      P('You gave me your word.'),
      B('And I kept it. Eight circles, not one trick. You never asked me what was in the ninth.'),
      P('Iscariot. I should have been suspicious of a name like that.'),
      B('Everyone says so afterwards. Nobody says it before: that’s the whole trade.'),
      B('{price} coins. I don’t cheat, I have never cheated. I win… *it isn’t the same thing*.'),
    ],
  },
  {
    ordinal: '10th',
    success: [
      D('First circle above hell, and you’re still breathing. Well, you stopped breathing a while ago, but the idea stands.'),
      D('The cliff next: black basalt, hanging chains and nothing to catch hold of. Still {souls} souls, and {price} coins to climb a notch.'),
    ],
    failure: [D('The water keeps you. It’s quiet, down at the bottom. You’ll have all the time you need to recount what you were short.')],
    bossIntro: [
      B('We don’t talk down here. We gurgle. You’ll get used to it.'),
      D('That’s {boss}. He’s worked the bottom counter since the cathedral went under.'),
      B('Bets sink slowly, like everything else. {price} coins and I’ll let you back up.'),
      P('And if I stay?'),
      B('Nobody stays. Everybody sinks.'),
    ],
  },
  {
    ordinal: '11th',
    success: [
      D('You climb faster than the chains fall. Noted.'),
      D('Above: a city. Streets, iron balconies, soot, and souls queuing at closed counters. {souls} souls racing and {price} coins in toll.'),
    ],
    failure: [D('The wall is long and you can’t pay for the rope any more. Enjoy the descent.')],
    bossIntro: [
      B('{boss}. I count the chains, and there is always one missing.'),
      D('Don’t ask where it went.'),
      B('It’s around someone. Climb, then, if you’ve got {price} coins at the end. Otherwise you’ll be the missing weight.'),
    ],
  },
  {
    ordinal: '12th',
    success: [
      D('A whole city waiting its turn, and you’re the one who walks past. That isn’t done. I love it.'),
      D('The mountain now: seracs, night snow, frozen ropes. {souls} souls at the start and {price} coins to carry on.'),
    ],
    failure: [D('And into the queue you go. It moves, apparently. Nobody has checked.')],
    bossIntro: [
      B('Good day. Take a ticket. Sit down. The counter opens shortly.'),
      D('He’s been saying that for four centuries.'),
      B('The counter opens shortly. For you, exceptionally: one race, {price} coins, and you go to the front of the queue.'),
      P('And them?'),
      B('Them? They wait. It’s their trade.'),
    ],
  },
  {
    ordinal: '13th',
    success: [
      D('It’s freezing and you’re still betting. I’m starting to think you enjoy this.'),
      D('Above the mountain there’s no ground left: the sky, walls of cloud and a broken bridge. {souls} souls, {price} coins.'),
    ],
    failure: [D('The rope froze, your hands with it, and your purse is empty. At least the mountain keeps you standing.')],
    bossIntro: [
      B('{boss}. I freeze nobody. I wait, and the souls freeze on their own. Same result, less effort.'),
      P('And the race?'),
      B('The race waits too. {price} coins, before your fingers drop off.'),
      D('…'),
      P('Nothing to say, for once?'),
      D('It’s too cold to be funny.'),
    ],
  },
  {
    ordinal: '14th',
    success: [
      D('A broken bridge, and you’re on the other side. I won’t ask how.'),
      D('One step left. Right at the top: cloud stands, rings of gold and a counter nobody has ever worked. {souls} souls and {price} coins.'),
    ],
    failure: [D('The wind took the rest. You fall for a long time. A very long time. I have time to wave.')],
    bossIntro: [
      B('I am the draught between two worlds. Nobody sees me, everybody feels me.'),
      D('He likes that line. He repeats it every storm.'),
      B('Nothing holds up in the air, bettor. Not souls, not tickets, not you. {price} coins if you hold anyway.'),
    ],
  },
  {
    ordinal: '15th',
    success: [
      D('Here we are. There’s nothing above… *so we start again here, and the rate goes up*.'),
      D('The stands fill once more, the rings turn, and the counter stays open. {souls} souls at the start, {price} coins for the next lap.'),
      P('Does it ever stop?'),
      D('You had a door. You didn’t take it.'),
    ],
    failure: [D('In paradise too, the counter closes when the purse is empty. Sit in the stands, you can watch the others.')],
    bossIntro: [
      B('Dice, tickets, souls running. They still play that, down there. It’s primitive.'),
      P('And you come down for it?'),
      B('I like these primitive games. Everyone passes through, and nobody looks up. It’s the best seat in the house.'),
      B('{price} coins. And this time, I’m the one reading the race before you.'),
    ],
  },
]

const ENDINGS = {
  gameOverTitle: 'Eternal punishment',
  gameOverBody: 'The circle’s price was {price} coins. You were {missing} short.',
  escapeTitle: 'Escape',
  escapeBody: 'Nine circles crossed, {money} coins in your pocket. The intern became a boss, and you got out.',
  /** With the ninth circle paid, the door is not the only way out (GDD §5.3, §8.1). */
  escapeStay: 'Or you stay, on the right side of the counter this time, and climb to see what lies above hell.',
  escapeContinue: 'Climb with him',
  backToMenu: 'Back to the menu',
} as const

const HUD = {
  steps: ['Bet', 'Shop', 'Race', 'Winnings'] as const,
  /** Folded handles: they summarise their contents (spec 02/C1). */
  tabBets: 'Bets ({n})',
  tabBetsStaked: 'Bets ({n}) · {staked} ¤ staked',
  tabShop: 'Shop · {n} item{s}',
  tabShopClosed: 'Shop',
  tabResults: 'Winnings: review the standings and the tally',
  tabShortcut: 'Keyboard shortcut: {key}',
  circle: '{ordinal} Circle',
  race: '{n} race of {total}',
  bossRace: 'Boss race ({n} of {total})',
  raceOrdinals: ['1st', '2nd', '3rd', '4th', '5th'] as const,
  coins: '{n} Coins',
  artefacts: '{n} artefact{s}',
  price: 'Circle price: {price} coins',
  demon: 'Coach: {rank}',
  terrain: 'Terrain: {name}',
  /** Boss race banner: his power only applies to this race (GDD §5.1). */
  bossPowerTitle: '{boss}’s power',
  bossPowerHint: 'Active on this race only',
  results: 'Winnings',
  raceResult: 'Race result',
  seeTable: 'See the table',
  bets: 'Bets',
  shop: 'Shop',
  close: 'Close',
  leaveShop: 'Off to the race',
  toRace: 'Start the race',
  nextRace: 'Continue',
  menu: 'Menu',
} as const

const MAP = {
  title: 'The circles',
  subtitle: 'Click the next race to start it.',
  current: 'You are here',
  done: 'race played',
  next: 'next race',
  locked: 'to come',
  boss: 'Boss',
  power: 'Power',
  track: 'Track',
  lanes: '{n} lane{s}',
  blocked: '{n} blocked space{s} (columns {columns})',
  noBlocked: 'no blocked spaces',
  terrain: 'Terrain',
  terrainDrawn: 'drawn at the start of each race',
  terrainOne: 'single terrain',
  price: 'Circle price',
  priceHidden: 'unknown until you get there',
  race: 'Race {n}',
  bossRace: 'Boss race',
  launch: 'Start the race',
  circleOf: 'Circle {n}: {name}',
} as const

const STATS = {
  title: 'Statistics',
  attempts: 'Attempts',
  escapes: 'Escapes',
  bestCircle: 'Circle reached',
  moneyWon: 'Money won',
  moneySpent: 'Money spent',
  races: 'Races played',
  bestBet: 'Best bet',
  none: '·',
} as const

/**
 * Collection: the shop items unlocked from one run to the next (core/shop/unlocks.ts).
 * Sealed ones are counted but not named — that’s the end-of-circle surprise.
 */
const COLLECTION = {
  title: 'Collection',
  count: '{n} items out of {total} in stock',
  hint: 'Every circle you pay unseals one item, for all your escapes to come.',
  locked: '{n} item{s} still sealed. The intern refuses to give their names.',
  complete: 'The catalogue is whole. The intern has nothing left to hide.',
  lockedCard: 'Sealed',
  lockedTitle: 'Item still sealed: clear a circle to unseal one.',
  empty: 'Nothing in stock. That isn’t normal: check shop.unlockedAtStart.',
} as const

/** End-of-circle reveal: the item the paid circle has just unsealed. */
const UNLOCK = {
  title: 'The stockroom opens a crack',
  intro: 'The intern vanishes under the counter, comes back up covered in dust, and puts this in front of you.',
  added: 'Unsealed for good: this item can now reach the shelves, in this escape and in the ones after.',
  next: 'Continue',
  remaining: '{n} item{s} still under seal.',
  last: 'That was the last one. The catalogue is whole.',
} as const

/**
 * Personality reveal: the screen played at the end of a circle’s first race, from the third
 * on. The soul is not drawn at random — it is the best placed one that had nothing to say
 * about itself yet, and the text says so, so the player can see the rule.
 */
const REVEAL = {
  title: 'A soul shows its hand',
  lead: 'From now on, and for whatever is left of your escape:',
  kept: 'This personality stays on {who} until the end of the run. A mask from the shop can replace it, or strip it.',
  next: 'Continue',
} as const

/** Infernal debt: the deal offered when the circle’s price is out of reach. */
const DEBT = {
  title: 'The intern produces a ledger',
  lead: 'The circle costs {price} coins. You have {money}. You are {missing} short.',
  offer: '“I can advance you {borrow} coins. Once only, and I’m not doing it out of kindness.”',
  cost: 'The next circle’s price will rise by {interest} coins.',
  accept: 'Borrow {borrow} coins',
  refuse: 'Refuse and stay here',
} as const

const OPTIONS = {
  title: 'Options',
  volume: 'Volume',
  volumeDisabled: 'no music yet',
  language: 'Language',
  speed: 'Animation speed',
} as const

/** Bets locked behind the intern’s grade; counter ticket (spec 03). */
const BETS = {
  emptySlot: 'Empty soul slot',
  locked: 'This bet opens when the intern makes {rank}.',
  lockedBadge: 'from {rank}',
  lockedItemBadge: 'with {name}',
  lockedItem: 'Counter opened by a shop item: {name}.',
  tierLocked: 'locked',
  gain: 'Potential return: +{net} ¤ (×{mult})',
  after: 'Balance after stake: {n} ¤',
  cancel: 'Take back',
  cancelTitle: 'Refunds the stake ({stake} ¤). Possible until the race starts.',
  overThreshold: 'Past the betting threshold',
  pickOnBoard: 'Click to name this soul',
  unpickOnBoard: 'Click to take it off the ticket',
  placed: 'Bet placed: {type} · {souls} · {stake} ¤ → +{net} if it lands',
  diceSeen: 'Dice rolled: {souls} · {dist}',
  trayLabel: 'Stake chips',
  chipHint: 'Drag this chip into the slot, or click it',
  chipChosen: 'Chip down: that’s the current stake',
  tooRich: 'Not enough in the balance ({n} ¤)',
} as const

/** Gauge of the three uses: balance, staked in the race, circle price (spec 01/C1). */
const GAUGE = {
  label: 'Balance and circle price',
  balance: 'balance',
  price: 'circle price',
  missing: '{missing} ¤ still to find',
  missingIn: '{missing} ¤ still to find in {n} race{s}',
  covered: 'circle price covered',
  margin: 'headroom: +{n} ¤',
  tooltip: 'Balance {money} · staked in the race {staked} · circle price {price}',
} as const

/** Shop: empty state, risk triad, confirmation (specs 02/C2 and 04). */
const SHOP = {
  emptyState: 'Place a bet first, the intern doesn’t open the till for the undecided.',
  goToBets: 'Go to the bets',
  emptyVitrine: 'Nothing in stock today. The intern shrugs.',
  risk: { safe: 'Safe', bold: 'Bold', danger: 'Danger ⚠' } as const,
  riskTitle: {
    safe: 'No catch, medium impact at most.',
    bold: 'High or extreme impact: changes how you play the circle.',
    danger: 'This item has a catch: read it before buying.',
  } as const,
  impact: 'Impact: {impact}',
  impactLabel: { faible: 'low', moyen: 'medium', fort: 'high', extreme: 'extreme' } as const,
  buy: 'Buy',
  confirm: 'Confirm {price} ¤',
  confirmTitle: 'Major purchase: a second click confirms.',
  compare: 'current faces → new faces',
  /** Slots full: buying an artefact destroys one (artefacts.md). */
  replaceArtefact: 'which artefact goes?',
  replaceArtefactWarning: 'The chosen artefact is destroyed, with no refund. To get coins back, sell it in the workshop first.',
  forgeLimit: 'A die carries no more than {n} forged faces. Strip one in the workshop to make room.',
  /** Workshop: undoing what you own (selling an artefact, stripping a face). */
  workshop: 'Workshop · {n}/{slots} artefacts, sell or strip',
  sell: 'Sell back {name} (+{back} ¤)',
  sellTitle: 'Sold back at 40 % of the circle price: {back} coins, and the slot frees up.',
  decapTitle: 'Strip this face: it goes back to its original value for {cost} coins.',
  replace: 'Replace this die',
  /** Masks (GDD §6.5): the purchase ends with the choice of the soul to mark. */
  pickSoul: 'which soul do you mark?',
  pickSoulStrip: 'which soul do you free?',
  markWarning: 'The mask holds until the end of the run and replaces whatever the soul already wore.',
  stripWarning: 'Only marked souls can be freed.',
  soulPlain: 'no personality',
  mark: 'Mark',
  strip: 'Strip',
} as const

/** Items the player triggers themselves from the race screen. */
const ITEMS = {
  tribuneHint: 'Infernal stand: pick a free space, outside the start and outside the finishing zone.',
  double: 'Two-headed coin: double {stake} ¤ of stakes',
  /** Intern's markers: the three kinds you can place, and the placing hint. */
  markerHint: 'Intern’s markers: pick a kind, then a free space. {n} left.',
  pit: 'Pit',
  springboard: 'Springboard',
  tar: 'Tar',
} as const

const RACE = {
  /** The key that rolls the dice: the biggest on the keyboard, for the most repeated gesture. */
  rollKey: 'Space',
  /** Items triggered on a specific die during pairing (Vial, Momentum, Lock). */
  fiole: '+1',
  fioleTitle: 'Vial of blood: +1 on this die, once per turn, paid in cash.',
  momentum: '»',
  momentumTitle: 'Momentum: reroll this die and add the result, whatever it is.',
  lock: '⚿',
  lockTitle: 'Minos’s lock: keep this die on its face for the next roll.',
  fuse: 'Melt here',
  fuseTitle: 'Fusion face: pour the face’s distance onto this soul, as a single move.',
  orb: 'Reroll all',
  orbTitle: 'Cocytus Orb: roll all five dice again, once per race.',
  orbPairedTitle: 'Unpair your dice first: the Orb is all or nothing.',
  hook: 'Hook:',
  styx: '⟲',
  styxTitle: 'Echo of the Styx: replay this combination exactly, right after it.',
  hookTitle: 'Charon’s Hook: pull this soul back below the betting threshold, once per race.',
  phases: ['prepare', 'roll', 'order', 'resolve', 'opponent'] as const,
  phasesLabel: 'Steps of the turn',
  queue: 'Queue of combinations',
  remove: 'Unpair',
  removeTitle: 'Unpair: both dice become available again',
  moveUp: 'Resolve earlier',
  moveDown: 'Resolve later',
  afterPrevious: 'Resolved after the ones before it: only the first is previewed.',
  previewTitle: 'Next move: {name} {dist} → space {to}',
  previewGhost: 'Preview',
  dragSoul: 'Drag onto a Distance die to pair (or click, then click a Distance die)',
  dropHere: 'Drop the Soul die here',
  dragCard: 'Drag to change the resolution order',
  cumul: '{total} ({parts})',
  cumulInto: 'added into card no. {n}',
  recap: '↺ last turn',
  recapTitle: 'Review the last turn',
  recapEmpty: 'Nothing to review: nobody has moved yet.',
  recapTurn: 'Turn {n}',
} as const

/** Live state of a bet during the race (provisional: the standings are only final at the end). */
const BET_LIVE = {
  onTrack: 'on track',
  atRisk: 'in trouble',
  provisional: 'provisional',
  title: 'Based on current positions; only the final standings count.',
  betted: 'Soul bet on',
} as const

/** Board. */
const BOARD = {
  /** Special terrain spaces: they only act on the soul that stops there (GDD §2.2). */
  specialMark: { gold: '¤', trap: '✷', boost: '▲', tar: '≈' } as const,
  special: {
    // `{s}` carries the plural (see `fill`): these sentences are now shown as they are in
    // the hover bubble, where “1 space(s)” would be visible.
    gold: 'Paying space: the soul that stops here earns you {n} coin{s}, provided you have a bet open on it.',
    trap: 'Trap: the soul that stops here moves back {n} space{s}.',
    boost: 'Springboard: the soul that stops here moves {n} extra space{s}.',
    tar: 'Tar: the soul that stops here loses its induced moves until the end of the turn.',
  } as const,
  blockedTitle: 'Blocked space (column {column}, lane {lane}): no soul can stop there.',
  tribune: 'Infernal stand',
  tribuneTitle: 'Infernal stand: the soul that stops here pays you and leaves with a shove.',
  tribunePlace: 'Place the stand on space {column}',
  markerPlace: 'Place a marker on space {column}',
  zoneClosed: 'betting closed',
  zoneClosedTitle: 'A soul has crossed the threshold: no more bets on this race.',
  tieColumn: 'Same column: the lowest lane goes first.',
  personality: 'Personality · {name}: {effect}',
} as const

/** End-of-race modal (spec 06). */
const RESULTS = {
  subtitle: 'Settled after turn {turn} resolved in full, opponent pair included.',
  net: 'Race net: {net} ¤',
  refund: 'Book of accounts: {n} ¤ refunded',
  tieBreak: 'tie-break: same column, the lowest lane goes first',
  arrivedEarlier: 'crossed the line {n} · overtaken during the end of the turn',
  arrivedLater: 'crossed the line {n} · went past after the line',
  skip: 'Click to reveal everything',
  hidden: '?',
} as const

/** Glossary: the canon terms get an explanation on hover (spec 01/C4). */
const GLOSSARY = {
  percuter: 'Ram: landing forwards on an occupied space → jump in front.',
  echanger: 'Swap: landing backwards on an occupied space → swap places.',
  detour: 'Detour: the target space is blocked or taken, the soul sidesteps into another lane.',
  departBloque: 'Start line: you can’t go back further, the soul stays put.',
  arrivee: 'Line crossed: the race stops at the end of the turn.',
  zoneDeFin: 'Finishing zone: spaces from the threshold on, where betting stops.',
  combinaison: 'Combination: a Soul die paired with a Distance die, resolved in the chosen order.',
  charge: 'Charge: uses left on a limited item.',
} as const

const HELP = {
  open: 'Help',
  title: 'Help · Sinner’s Bet',
  navLabel: 'Help sections',
  close: 'Close',
  intro: [
    'You are dead. Welcome. The demon intern handling your file is bored stiff, so he offers you a pact: bet on races of damned souls, win enough coins to pay your passage, and climb the nine circles of hell. **He coaches. You stake.** At the ninth, the door opens, and nothing obliges you to take it.',
    'This page answers three questions: *how is a race played?*, *how do you make money?*, *how do you get out of a circle?*',
    'Help can be read at any time: it **interrupts nothing** in the race under way.',
  ],
  sections: [
    {
      id: 'but',
      title: 'The goal',
      icon: '⛓️',
      blocks: [
        { kind: 'p', text: 'Escape from hell. Every circle has an **exit price** (150 coins for the first, dearer and dearer after). You have **three races** per circle to gather the sum; the third is played against the circle boss.' },
        { kind: 'p', text: 'If you can pay at the end, you climb. If not… the intern has already chosen your eternal punishment.' },
        { kind: 'p', text: 'Losing a race is never the end: it’s an empty till at the end of the circle that condemns you.' },
      ],
    },
    {
      id: 'course',
      title: 'A race, turn by turn',
      icon: '🎲',
      blocks: [
        { kind: 'p', text: 'The damned souls run along a track of spaces. **You don’t control them**: you nudge them, discreetly. Each turn:' },
        {
          kind: 'ol',
          items: [
            '**Roll the dice.** Two **Distance** dice (−1, +1, +2, +3) and three **Soul** dice (each names a runner).',
            '**Pair them.** Stick a Soul die onto a Distance die: that makes a combination, “Plato moves +2”. One Soul die will always be left out: you choose which.',
            '**Order them.** The resolution order is YOUR decision, and that’s where it’s all decided: moving Plato before or after Virgil doesn’t tell the same race.',
            '**Resolve, then take it.** Your combinations apply one by one… then the opponent rolls his own pair of dice. He doesn’t ask your opinion.',
          ],
        },
        { kind: 'p', text: 'Two dice on the same soul? The distances add up into a single leap.' },
      ],
    },
    {
      id: 'collisions',
      title: 'Collisions',
      icon: '💥',
      blocks: [
        { kind: 'p', text: 'The spaces are small and the damned have no manners:' },
        {
          kind: 'ul',
          items: [
            'A soul **moving forwards** onto an occupied space **rams** it and **jumps in front**: the rammer gains one extra space. Causing a collision is sometimes the best move of the turn.',
            'A soul **moving backwards** onto an occupied space **swaps places** with it.',
          ],
        },
      ],
    },
    {
      id: 'couloirs',
      title: 'Lanes',
      icon: '🛤️',
      blocks: [
        { kind: 'p', text: 'In the first circle the track has a single lane: every landing on a soul is a collision. After that, each soul added at the start earns the track another lane, up to six in the ninth circle. Three things to remember:' },
        {
          kind: 'ul',
          items: [
            '**Only the column counts.** Lanes are queues side by side; your position in the race is your column, not your lane. Changing lane moves you neither forwards nor backwards.',
            '**You pull over when it’s taken.** A soul lands in its own lane if the space is free. Taken or **blocked** (rockfall, chains)? It pulls over to a free space in the same column, the **lowest** first. And only if the whole column is full does it come to a collision: jump in front when moving forwards, swap when moving backwards.',
            '**The bottom is always right.** On equal columns at the end of the race, the soul in the lowest lane, the one nearest you, goes first. No dead heats in hell: the standings settle everything, lane included.',
          ],
        },
        { kind: 'p', text: 'Blocked spaces narrow the track and create jams: they are collision traps, spot them before you stake.' },
      ],
    },
    {
      id: 'arrivee',
      title: 'The finish',
      icon: '🏁',
      blocks: [
        { kind: 'p', text: 'The moment a soul crosses the line, **the turn still finishes**: your remaining combinations and the opponent’s pair are played. The standings are only settled afterwards.' },
        { kind: 'p', text: 'A race can therefore turn on the line: *crossing first does not guarantee finishing first.*' },
      ],
    },
    {
      id: 'paris',
      title: 'The bets',
      icon: '🎫',
      blocks: [
        { kind: 'p', text: 'Bets are your real weapon. Before the race, place at least one. During the race, you can add more… as long as the soul you are aiming at hasn’t passed the **betting threshold** (60 % of the track). Past it, the counter is closed for that one: too easy, even for a demon.' },
        { kind: 'h', text: 'Three families of ticket' },
        {
          kind: 'ul',
          items: [
            '**Simple**: one soul on the ticket, readable and open from the start: winner (×{winner}), top 3 (×{top3}), outside the top 3 (×{notTop3}), last place (×{last}).',
            '**Combined**, **two souls on the same ticket**: the duel “A finishes ahead of B” (×{duel}), two souls in the top 3 (×{twoInTop3}), the podium in any order (×{podiumAnyOrder}). The odds aren’t always bigger; what changes is that a duel is **read** where a winner is guessed.',
            '**Big tickets**: the exact podium (×{podiumExact}) and the full standings (×{fullRankingExact}): enough to pay for a whole circle in one go, if you read the race like an open book. Between the two, “winner AND last” (×{winnerAndLast}) only asks you to watch both ends, and almost nobody watches the bottom of the standings.',
          ],
        },
        { kind: 'p', text: 'Two things to know about the odds: they **melt** as the race goes on (betting late is betting safe, so betting small), and any ticket with **two souls or more** is **locked at the start**: the intern hasn’t the grade to settle them. Combined tickets open at his first grade, after two circles; the big ones much later.' },
      ],
    },
    {
      id: 'argent',
      title: 'Your money has three lives',
      icon: '💰',
      blocks: [
        { kind: 'p', text: 'Every coin can become **a stake**, **a purchase in the shop**, or **part of the circle price**. All three fight over the same pile.' },
        { kind: 'p', text: 'Spending arms you; keeping alive keeps you. The gauge at the top of the screen reminds you at all times where you stand against the exit price.' },
      ],
    },
    {
      id: 'boutique',
      title: 'The intern’s shop',
      icon: '🛒',
      blocks: [
        { kind: 'p', text: 'Between the bets and the race, the intern opens his little till (once your first bet is down; he doesn’t serve the undecided):' },
        {
          kind: 'ul',
          items: [
            '**special dice** that replace a Distance die: the cautious Limbo Die (1, 1, 2, 2), the Ice Die and its extremes (−1, −1, 2, 5)…;',
            'the **forge**, to alter one face of a die, only one, but forever;',
            '**artefacts**, permanent effects that bend the rules your way: the Bettor’s Eye to stake after seeing your dice, Charon’s Hourglass that pushes the betting threshold to 70 %…',
          ],
        },
        { kind: 'p', text: 'Every item states its colours: **SAFE**, **BOLD** or **DANGER**, and a dangerous item always says what it will cost you. In hell, at least, the contracts are clear.' },
      ],
    },
    {
      id: 'personnalites',
      title: 'The souls’ personalities',
      icon: '🎭',
      blocks: [
        { kind: 'p', text: 'From the **third circle** on, at the end of the first race, a soul shows its personality. It is not a draw: it is **the best placed of those that had none**. The personality itself is drawn at random, and it stays on that soul **until the end of your escape**.' },
        { kind: 'p', text: 'A marked soul carries a sign on its token. Hover it: the rule is spelled out. It is visible **before the bets**, and that is the whole point: a personality is not triggered, it is read.' },
        {
          kind: 'ul',
          items: [
            'some change the **reading of the die**: The Steady always moves one space, The Contrarian takes the opposite of what the die says;',
            'others change the **amplitude**: The Ambitious amplifies big swings, The Martyr drags then catches up at once, The Condemned starts slow and finishes fast;',
            'others still change the **board**: The Resolute walks through blocked spaces, The Ogre crushes what it passes, The Parasite follows the soul ahead of it;',
            'The Judge does not run any differently: it **changes your winnings** according to its own place. Watch it even when you have no bet on it.',
          ],
        },
        { kind: 'p', text: 'The shop sells one **mask** per personality: you pick the soul, and the mask replaces whatever it wore. The broken mask frees a marked soul instead.' },
      ],
    },
    {
      id: 'grades',
      title: 'The intern’s grades',
      icon: '👑',
      blocks: [
        { kind: 'p', text: 'The more your runner (you) impresses, the higher the intern climbs the hierarchy: Assistant, Tormentor, Foreman, Deputy Director… Every promotion **opens new bets** and stocks the shop.' },
        { kind: 'p', text: 'After the eighth circle he even lands a fine promotion. In the ninth (the circle of Treachery), guess who is working the counter opposite you.' },
      ],
    },
    {
      id: 'conseils',
      title: 'The three pieces of advice',
      icon: '😈',
      blocks: [
        {
          kind: 'ol',
          items: [
            '“Bet before you dream: one simple ticket paid beats one exact podium missed. Big tickets are for races you have prepared.”',
            '“Ordering your combinations is free and it’s the strongest move in the game. Look at the preview before resolving: hell is deterministic, make the most of it.”',
            '“Always keep enough to pay the circle. I like you well enough, but a pact is a pact.”',
          ],
        },
        { kind: 'p', text: '*Good luck. You’ll need it… well, no: you’ll need to read carefully.*' },
      ],
    },
  ] as const satisfies readonly HelpSection[],
} as const

/** Developer menu (discreet “dev” button, Ctrl+Shift+D). */
const DEV = {
  open: 'dev',
  title: 'Developer menu',
  hint: 'Sets the balance and the race to resume at. The inventory is kept, the current race is abandoned, the save is overwritten.',
  money: 'Coins',
  circle: 'Circle',
  race: 'Race of the circle',
  bossRace: 'boss',
  apply: 'Apply',
  cancel: 'Cancel',
} as const

// ---- Tables keyed by the engine’s ids ---------------------------------------

/** A boss power, as announced. `{n}` takes the effect’s value, `(s)` agrees with it. */
const BOSS_EFFECTS: Readonly<Record<BossEffectId, string>> = {
  extraPairs: 'The opponent rolls {n} more pair(s) a turn.',
  harshNegatives: 'Every negative distance goes back {n} more space(s), on both sides.',
  bite: 'A rammed soul is bitten: it moves back {n} space(s) after the jump.',
  costlyLateBets: 'A bet placed during the race costs {n} times its stake.',
  pushBack: 'Moving back onto a soul pushes it back instead of swapping.',
  betThreshold: 'The betting threshold drops to {n} % of the track.',
  opponentBoost: 'The opponent’s positive distances gain {n} space(s).',
  lyingSoulDice: 'One time in {n}, a Soul die names the neighbouring soul.',
  targetBettedSouls: 'The opponent’s pairs go for the souls you have bet on and push them back.',
  slowWater: 'Every positive distance loses {n} space(s), on both sides.',
  chained: 'A rammed soul is chained: it does not move for {n} turn(s).',
  closeWindow: '{n} type(s) of bet become unavailable, rotating every turn.',
  frozenLanes: 'A soul no longer pulls over into another lane: it rams.',
  backdraft: 'At the end of every turn, all the souls move back {n} space(s).',
  replayTurn: 'The finishing turn is resolved a second time, opponent included.',
}

const BET_TIERS: Readonly<Record<BetTier, string>> = { simple: 'Simple', intermediate: 'Combined', advanced: 'Advanced', exotic: 'Exotic' }

const BET_TYPE_TEXTS: Readonly<Record<BetTypeId, BetTypeText>> = {
  winner: { label: 'Outright winner', description: 'The soul finishes first.' },
  top3: { label: 'Top 3', description: 'The soul finishes in the first three.' },
  notTop3: { label: 'Outside the top 3', description: 'The soul does not finish in the first three.' },
  last: { label: 'Last place', description: 'The soul finishes last.' },
  podiumAnyOrder: { label: 'Top 3 in any order', description: 'The three souls take the first three places, in any order.' },
  twoInTop3: { label: 'Two souls in the top 3', description: 'Both souls finish in the top 3.' },
  duel: { label: 'Duel', description: 'The first soul finishes ahead of the second.', slots: ['ahead', 'behind'] },
  podiumExact: { label: 'Exact podium', description: 'The first three places, in that exact order.', slots: ['1st', '2nd', '3rd'] },
  fullRankingExact: { label: 'Exact full standings', description: 'Every final position, in that exact order.' },
  winnerAndLast: { label: 'Winner + last', description: 'The first and the last soul, exactly.', slots: ['winner', 'last'] },
  rammedTwice: { label: 'Rammed twice', description: 'This soul will be rammed at least twice during the race.', slots: ['the soul'] },
  noBackward: { label: 'No setback', description: 'Not one soul will move back a single space in the whole race.', slots: [] },
}

const BET_REFUSALS: Readonly<Record<BetRefusal['kind'], string>> = {
  raceFinished: 'The race is over.',
  bettingClosed: 'A soul has passed the threshold: no more bets on this race.',
  soulTwice: 'A soul can only be named once.',
  missingSouls: 'Name {needed} soul{s} ({given}/{needed}).',
  tooManySouls: 'Too many souls named.',
  soulBarred: 'The window is shut for this soul: it has already crossed the line once.',
  unknownSoul: 'Unknown soul.',
  alreadyPlaced: 'That bet is already placed.',
  noStake: 'Choose a stake.',
  tooExpensive: 'Not enough money for that stake.',
}

const CANCEL_REFUSALS: Readonly<Record<CancelRefusal, string>> = {
  raceStarted: 'The race has started: a bet placed cannot be taken back.',
  notFound: 'Bet not found.',
  alreadySettled: 'That bet is already settled.',
}

const ITEM_KINDS: Readonly<Record<ItemKind, string>> = { artefact: 'Artefact', die: 'Die', forge: 'Forge', personality: 'Mask' }
const RARITIES: Readonly<Record<Rarity, string>> = { common: 'common', rare: 'rare', legendary: 'legendary' }

/** A purchase’s log line. `{name}` is the item, `{die}` the die aimed at, `{n}` its number. */
const PURCHASE_LOG: Readonly<Record<PurchaseLog['kind'], string>> = {
  decap: 'Face stripped on {die} no. {n}: it is worth {value} again.',
  artefactSold: 'Artefact sold: {name}.',
  artefactReplaced: '{name} replaces {replaced}: the old one is destroyed.',
  artefactBought: 'Artefact acquired: {name}.',
  dieAdded: '{name} joins the roll: {count} Distance dice.',
  dieReplaced: '{name} replaces {die} no. {n}.',
  faceForged: '{name} engraved on {die} no. {n}, face {value}.',
  personalityGiven: '{who} now wears {personality}{replaced}.',
  personalityRemoved: '{who} loses {personality}: nothing sets it apart any more.',
}

/** What a mask laid on an already marked soul replaces: slipped into `personalityGiven`. */
const PURCHASE_REPLACED = ' (in place of {personality})'

/** A move, told in the log. The last four are appended to `move`. */
const MOVE = {
  blockedAtStart: '{who} {dist}{notes}: on the start line, does not move back.',
  move: '{who} {dist}{notes}: space {from} → {to}.',
  notes: ' ({notes})',
  notesSeparator: '; ',
  detourBlocked: ' Lane blocked, sidesteps to lane {lane}.',
  detourOccupied: ' Space taken, sidesteps to lane {lane}.',
  jump: ' Rams {souls} and jumps in front.',
  swap: ' Moves back onto {soul}: swaps places ({soul} goes to {to}).',
  crossedFinish: ' Crosses the line!',
} as const

/** What changed a move, quoted in brackets in the log. */
const MOVE_NOTES: Readonly<Record<MoveNoteId, string>> = {
  harshNegatives: 'Harsher setbacks: {value}',
  slowWater: 'Heavy water: +{value}',
  clepsydreFlip: 'Water Clock: {from} → +{to}',
  clepsydreBoost: 'Water Clock: +{from} → +{to}',
  seal: 'Bettor’s Seal: +{value}',
  compass: 'Limbo Compass',
  bite: 'Bite',
  riggedScales: 'Rigged Scales',
  camelPack: 'Camel Pack',
  cocytusChain: 'Chain of the Cocytus',
  magnet: 'Magnet',
  explosive: 'Explosive',
  explosiveSelf: 'Explosive: nobody rammed',
  stand: 'Infernal Stand',
  trap: 'Trap',
  boost: 'Springboard',
  personalityDie: '{who} reads {from} → {to}',
  personalityMove: '{who}: {from} → {to}',
  grudge: 'Martyr’s grudges: +{value}',
  ogre: 'The Ogre shoves: −{value}',
  parasite: 'The Parasite follows: +{value}',
  reverse: 'Backhand: stops behind',
  armWrestle: 'Arm Wrestle: +{value} by swap',
  echo: 'Echo: +{value}',
  hook: 'Charon’s Hook',
  styx: 'Echo of the Styx',
}

/**
 * The ten personalities (GDD §6.5). `name` is the name shown everywhere — token, shop mask,
 * log — and `effect` the rule in one sentence, the one read when hovering a marked token.
 * The symbol is engraved on the mask’s art, not written here.
 */
const PERSONALITIES: Readonly<Record<PersonalityId, { name: string; effect: string }>> = {
  martyr: {
    name: 'The Martyr',
    effect: 'Moves forward one space less (never below 1). Every time it is rammed or swapped it holds a grudge: the whole debt comes back at once as it enters the closing zone.',
  },
  ambitieux: {
    name: 'The Ambitious',
    effect: 'Advances of 3 or more gain a space, setbacks lose one. It rarely finishes mid-pack.',
  },
  tricheur: {
    name: 'The Cheat',
    effect: 'One time in four, the Soul die that names it is rerolled, yours as well as your opponent’s.',
  },
  condamne: {
    name: 'The Condemned',
    effect: 'First-turn advances lose a space; the ones it starts from the closing zone gain one.',
  },
  parasite: {
    name: 'The Parasite',
    effect: 'Whenever the soul right ahead of it moves forward 2 spaces or more, it moves forward 1 straight after.',
  },
  juge: {
    name: 'The Judge',
    effect: 'Does not run any differently, but keeps the books: in the top 3, your winnings for the race are multiplied by 1.5; last, they are halved. Your losses do not move.',
  },
  resolu: {
    name: 'The Resolute',
    effect: 'Blocked spaces do not exist for it: it stops there like on any other, and never swerves lane.',
  },
  opposant: {
    name: 'The Contrarian',
    effect: 'Reads the Distance die backwards: a +2 sends it back two spaces, a -1 moves it forward one.',
  },
  constant: {
    name: 'The Steady',
    effect: 'Whatever the Distance die says, it moves forward one space. Never more, never less, never backwards.',
  },
  ogre: {
    name: 'The Ogre',
    effect: 'The soul it rams on its way past moves back one extra space.',
  },
}

/** Race log, under the board. */
const LOG = {
  label: 'Race log',
  title: 'Log',
  raceHeader: 'Circle {circle}, race {n}/{total} · terrain “{terrain}”, {souls} souls, {columns} spaces, {lanes} lane{s}{blocked}, seed {seed}. Place your bets.',
  raceHeaderBlocked: ', {n} blocked space{s}',
  allowance: 'The intern advances you {n} coins for this race{bonus}.',
  allowanceBonus: ' ({n} of them thanks to the {item})',
  raceStart: 'The race begins.',
  betPlaced: 'Bet {type} on {souls}: stake {stake}{paid} at {mult}, returns {payout} if it lands.',
  betPaid: ' (paid {cost})',
  betCancelled: 'Bet {type} taken back: {refund} coins returned.',
  betWon: 'Bet {type} ({souls}) won: +{net} net (stake {stake} returned).',
  betLost: 'Bet {type} ({souls}) lost: −{stake}.',
  lateBetOpen: 'Bettor’s Eye: you can bet after seeing your dice, up until resolution.',
  shopOpen: 'The shop opens: {n} items in the window.',
  rerolled: 'Window restocked for {cost} coins.',
  ixion: 'Ixion’s Wheel: {who} crosses the line with no ticket on it: back to the start, the race carries on.',
  orb: 'Cocytus Orb: everything rerolled, {dist} on {souls}.',
  fusion: 'Fusion face: both distances go to {who}.',
  styxOn: 'Echo of the Styx armed on {who}.',
  styxOff: 'Echo of the Styx disarmed.',
  styxEcho: 'Echo of the Styx: {who}’s combination will be replayed.',
  markerPlaced: '{kind} placed on space {column}. {left} marker(s) left.',
  foremanAsleep: 'Foreman’s Slumber: roll #{n} of the run, the opponent skips its turn.',
  thresholdMoved: 'Betting threshold at {pct} % from this race on.',
  trackChanged: '{columns}-column track, betting threshold at {pct} %, from this race on.',
  sold: '{name} sold: +{back} coins.',
  purchase: '{text} ({cost} coins)',
  purchaseFreeForge: '{text} On the house, courtesy of Hephaestus’s Hammer.',
  holedPurse: 'Holed Purse: +{n} coins.',
  stand: 'Infernal Stand: +{n} coins.',
  standPlaced: 'Infernal Stand placed on space {column}.',
  mirrorFirst: 'Narcissus’s Mirror: the opponent plays first.',
  opponentRoll: 'The opponent rolls: {who} {dist}.',
  opponentReplay: 'The opponent rolls again: {who} {dist}.',
  foresight: '{source}: {names}.',
  foresightAll: 'Foreman’s Whip',
  foresightFirst: 'Charon’s Eye',
  roll: 'Roll: Distance {dist} · Souls {souls}.',
  gildedFace: 'Gilded Face: +{n} coins.',
  tip: 'Intern’s Tip: +{n} coins.',
  vial: 'Vial of Blood: die no. {n} at {face} for {cost} coins.',
  momentum: 'Momentum: {added} added, die no. {n} is worth {face}.',
  lockOff: 'Minos’s Lock released.',
  lockOn: 'Minos’s Lock: die no. {n} will keep {face}.',
  doubled: 'Two-Headed Coin: stakes doubled (−{cost} coins). The opponent rolls one more pair.',
  dieCost: '{name}: −{cost} coins for this pairing.',
  dieUnpaid: '{name}: not enough money, the face is worth 0.',
  angelReplay: 'The Angel replays the last turn.',
  raceEnd: 'A soul has crossed the line: the race ends on turn {turn}.',
  judgeTop: 'The Judge ({who}) finishes {rank}: your winnings for the race are multiplied by 1.5.',
  judgeLast: 'The Judge ({who}) finishes last: your winnings for the race are halved. Your losses stay whole.',
  bookRefund: 'Book of Accounts: {n} coins refunded.',
  balmRefund: 'Loser’s Balm: {n} coins returned on the losing stakes.',
  tally: 'Bet tally: {net}. Money: {money}.',
} as const

/**
 * Screen labels that belong to none of the groups above: panel titles, names read out by
 * screen readers, buttons. Filed by panel.
 */
const UI = {
  menu: { noRun: 'No escape under way', devTitle: 'Developer menu (Ctrl+Shift+D)' },
  bets: {
    panel: 'Bets',
    placed: 'Bets placed',
    open: 'Place a bet',
    submit: 'Place the bet',
    none: 'No bets on this race.',
    needOne: 'At least one bet to start the race.',
    lastCall: 'Last moment to bet this turn.',
    draft: '{type} · stake {stake} at {mult}.',
    raceOver: 'Race over: the bets are settled.',
    rolled: 'The dice are rolled: betting resumes next turn.',
    resolving: 'Betting suspended during resolution.',
    shopNeedsBet: 'The shop only opens its till after a first bet',
    raceNeedsBet: 'Start the race: place a bet first',
    noBetYet: 'At least one opening bet is needed',
    diceRolled: 'The dice are rolled: no more betting before the next turn.',
    waitResolution: 'Wait for the resolution to finish.',
    windowClosed: 'Counter closed this turn: {type} is unavailable.',
    counterCut: 'This counter takes its cut: staking {stake} costs {cost} coins.',
    thresholdPassed: 'A soul has passed the {pct} % threshold: no more bets.',
    pickMore: 'Name {n} more soul{s}: in the panel or by clicking the tokens on the board.',
    decayed: ' Odds have melted: race at {pct} %.',
  },
  ticket: {
    soul: 'Soul',
    souls: 'Souls',
    soulsOrdered: 'Souls, in order',
    ifWon: '+{net} if it lands',
    won: 'won +{net}',
    lost: 'lost −{stake}',
    turn: ' · turn {n}',
    coins: '{n} coins',
    bestBet: '+{n} coins',
  },
  board: { label: 'Race board', start: 'Start', finish: 'Finish', souls: 'Souls racing' },
  play: {
    player: 'Player',
    opponent: 'Opponent',
    soulDice: 'Soul dice',
    distanceDice: 'Distance dice',
    roll: 'Roll the dice',
    resolve: 'Resolve',
    reset: 'Reset',
    cumul: '{n} dice added up',
    betsDone: 'Bets placed. Stop by the shop if you like, then start the race.',
    rolling: 'The dice are rolling…',
    ordered: 'Order set. Resolve, or reorder the queue (drag, ← → ×) first.',
    pickDistance: 'Now choose a Distance die to pair it with.',
    resolving: 'Resolving your combinations…',
    finished: 'Race over.',
    prepNoBet: 'Place at least one opening bet to open the shop and start the race.',
    idle: 'Turn {n} · roll the dice.{lastCall}',
    idleLastCall: ' Last moment to bet this turn.',
    pairing: 'Drag (or click) a Soul die onto a Distance die. The order of the cards is the resolution order ({n}/{total}){unused}.',
    unusedOne: ' 1 Soul die will go unused.',
    unusedMany: ' {n} Soul dice will go unused.',
    opponentTurn: 'The opponent’s turn…',
    placedCount: 'Bets placed ({n})',
  },
  game: { steps: 'Steps', auto: 'auto', autoTitle: 'Test mode: plays the turns by itself', activeArtefacts: 'Active artefacts', noArtefact: 'No artefacts. The shop stocks them between the bets and the race.' },
  inventory: { label: 'Inventory', distanceDice: 'Distance dice', baseDie: 'Base die' },
  ranking: { final: 'Final standings', tally: 'Bet tally', none: 'No bets on this race.' },
  shop: { closed: 'The shop is closed.', notInWindow: 'Item not in the window.', notEnoughMoney: 'Not enough money.', alreadyOwned: 'Already owned.', noFaceLeft: 'No face left to forge.', nothingToStrip: 'No marked soul in this race.', exclusive: 'Cancels out {name}: the two cannot be owned together.', sellFailed: 'Sale failed.', decapCost: 'Stripping costs {cost} coins.', pickDie: 'which die to replace?', pickFace: 'which face to forge?', alreadyForged: 'Already forged', slotsFull: 'Slots full', afterBets: 'Bets placed: what’s left is to spend… or to keep.', till: 'The intern works the till.' },
  /** Refusals from an item the player triggers by hand, on the race screen. */
  artefacts: {
    notOwned: 'Artefact not owned.',
    decapFailed: 'Cannot strip that face.',
    noVial: 'You don’t own the Vial of Blood.',
    vialUsed: 'The Vial has already been used this turn.',
    diePaired: 'That die is already paired.',
    vialCash: 'It takes {cost} coins in cash: the Vial gives no credit.',
    noMomentumFace: 'That die has no momentum face.',
    momentumUsed: 'Momentum already taken on that die.',
    dieNotFound: 'Die not found.',
    noLock: 'You don’t own Minos’s Lock.',
    noCoin: 'You don’t own the Two-Headed Coin.',
    coinUsed: 'The coin has already been flipped this race.',
    nothingToDouble: 'No open bet to double.',
    doubleCost: 'It takes {cost} coins to double every stake.',
    noStand: 'You don’t own the Infernal Stand.',
    badCell: 'Impossible space: outside the start, outside the finishing zone, and free.',
    noOrb: 'You do not have the Cocytus Orb.',
    orbWhen: 'The full reroll is taken after the roll.',
    orbUsed: 'The Cocytus Orb has already been used this race.',
    orbPaired: 'Unpair your dice first: it is all or nothing.',
    noHook: 'You do not have Charon’s Hook.',
    hookWhen: 'The hook is thrown during your turn.',
    hookUsed: 'Charon’s Hook has already been used this race.',
    hookNotInZone: 'That soul is not in the finishing zone.',
    noFusionFace: 'No fusion face paired.',
    fusionWhen: 'Fusion is decided after the roll.',
    fusionTarget: 'Pick a Soul die already paired with another combination.',
    sleepTitle: 'Foreman’s Slumber: every 10 rolls of the run, the opponent skips its turn.',
    sleepIn: 'Slumber in {n} roll(s)',
    sleepNow: 'The opponent sleeps this turn',
    noMarker: 'You do not have the Intern’s Markers.',
    markerWhen: 'Markers are placed before the race.',
    markerAllPlaced: 'All your markers are placed.',
    noStyx: 'You do not have the Echo of the Styx.',
    styxWhen: 'The echo is marked after the roll, before resolving.',
    styxUsed: 'The Echo of the Styx has already been used this race.',
  },
  map: { crossed: 'Circle crossed.' },
  dialogue: { end: 'Finish' },
} as const

/**
 * English writing rules: “23rd”, plural for everything but one, decimal point.
 * Unlike French, zero takes the plural — “0 spaces”, not “0 space”.
 */
const fmt: Fmt = {
  ordinal: (n) => {
    const rest100 = n % 100
    if (rest100 >= 11 && rest100 <= 13) return `${n}th`
    const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
    return `${n}${suffix}`
  },
  plural: (n) => (n === 1 ? '' : 's'),
  odds: (m) => String(m),
}

export const EN = {
  GAME_NAME,
  SPEAKERS,
  MENU,
  INTRO,
  BOSS_ANNOUNCE,
  BOSS_ANNOUNCE_NEXT,
  BOSS_ANNOUNCE_SELF,
  DEMON_RANKS,
  CIRCLES,
  ENDINGS,
  HUD,
  MAP,
  STATS,
  COLLECTION,
  UNLOCK,
  REVEAL,
  DEBT,
  OPTIONS,
  BETS,
  GAUGE,
  SHOP,
  ITEMS,
  RACE,
  BET_LIVE,
  BOARD,
  RESULTS,
  GLOSSARY,
  HELP,
  DEV,
  BOSS_EFFECTS,
  BET_TIERS,
  BET_TYPE_TEXTS,
  BET_REFUSALS,
  CANCEL_REFUSALS,
  ITEM_KINDS,
  RARITIES,
  PURCHASE_LOG,
  PURCHASE_REPLACED,
  PERSONALITIES,
  MOVE,
  MOVE_NOTES,
  LOG,
  UI,
  fmt,
}
