#!/usr/bin/env node
/*
 * Génération d'images du proto 4 avec Gemini.
 *
 * La source de vérité est le document de prompts de chaque famille : le script en
 * extrait le squelette et les phrases, plutôt que d'en garder une copie qui dériverait.
 * Éditer le document suffit donc à changer ce qui est généré.
 *
 * Idempotence : une image déjà présente dans le dossier de sortie n'est jamais
 * regénérée. Pour refaire celle qui ne convient pas, il suffit de supprimer son
 * fichier et de relancer. Le manifeste garde la clé (empreinte du modèle, de la taille
 * et du prompt) de chaque image : si le document change, l'image existante est signalée
 * « périmée » mais reste en place — c'est --force, ou la suppression, qui la refait.
 *
 *   node scripts/gen-images.mjs objets                 # les objets manquants
 *   node scripts/gen-images.mjs objets sablier colere  # seulement ceux-là
 *   node scripts/gen-images.mjs boss --list            # l'état, sans appel réseau
 *   node scripts/gen-images.mjs boss --dry-run         # les prompts complets
 *   node scripts/gen-images.mjs boss --force 12_villes # refait malgré le fichier
 *   node scripts/gen-images.mjs objets --model=gemini-3.1-flash-image --size=4K
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
/*
 * Une famille = un document de prompts, un dossier de sortie, un cadrage.
 * `docs/proto4/raw/demons/png/` n'apparaît volontairement nulle part : il contient les
 * détourages faits à la main, le script n'y écrit jamais.
 */
const FAMILLES = {
  objets: {
    doc: 'docs/proto4/prompts-objets.md',
    out: 'docs/proto4/raw/objects',
    ratio: '1:1',
    quoi: 'les seize objets de la boutique',
  },
  boss: {
    doc: 'docs/proto4/prompts-boss.md',
    out: 'docs/proto4/raw/demons',
    ratio: '4:5',
    quoi: 'les quinze boss de cercle',
  },
}

const DEFAULT_MODEL = 'gemini-3-pro-image'
// 2K plutôt que 1K : l'API ne rend que du JPEG, et détourer à 2048 puis réduire à 256
// fait disparaître les artefacts de compression le long des bords.
const DEFAULT_SIZE = '2K'
const API = 'https://generativelanguage.googleapis.com/v1beta/models'

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const positionnels = argv.filter((a) => !a.startsWith('-'))
const FAMILLE = positionnels[0]
const ids = positionnels.slice(1)

if (!FAMILLE || !(FAMILLE in FAMILLES)) {
  console.error(`Usage : node scripts/gen-images.mjs <famille> [ids…] [options]\n`)
  for (const [nom, f] of Object.entries(FAMILLES)) console.error(`  ${nom.padEnd(8)} ${f.quoi} → ${f.out}`)
  process.exit(1)
}
const FAM = FAMILLES[FAMILLE]
const DOC = join(REPO, FAM.doc)
const OUT_DIR = resolve(REPO, opt('out', FAM.out))
const MANIFEST = join(OUT_DIR, 'manifest.json')
const FORCE = flag('force')
const DRY = flag('dry-run')
const LIST = flag('list')
const MODEL = opt('model', process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL)
const SIZE = opt('size', DEFAULT_SIZE) // 1K | 2K | 4K

// ------------------------------------------------------------------- .env

/** Lit ./.env à la racine du dépôt sans dépendance : KEY=value, # en commentaire. */
function loadEnv() {
  const file = join(REPO, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m || line.trimStart().startsWith('#')) continue
    const value = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(m[1] in process.env)) process.env[m[1]] = value
  }
}

// ------------------------------------------------- lecture du document

/**
 * Le squelette est l'unique bloc de citation qui suit « ## Le squelette de prompt ».
 * Les phrases d'objet sont les lignes de tableau dont la première cellule est un
 * nom de fichier `<id>.webp`.
 */
function readDoc() {
  const md = readFileSync(DOC, 'utf8')

  const start = md.indexOf('## Le squelette de prompt')
  if (start < 0) throw new Error(`Section « ## Le squelette de prompt » absente de ${DOC}.`)
  const after = md.slice(start)
  const lines = []
  let seen = false
  for (const line of after.split('\n')) {
    if (line.startsWith('>')) { seen = true; lines.push(line.replace(/^>\s?/, '')) }
    else if (seen) break
  }
  const skeleton = lines.join(' ').replace(/\s+/g, ' ').trim()
  if (!MARQUEUR.test(skeleton)) {
    throw new Error(`Marqueur **\\<phrase …\\>** introuvable dans le squelette de ${DOC}.`)
  }

  const items = []
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 3) continue
    const m = /^`([A-Za-z0-9_-]+)\.(?:webp|png|jpe?g)`$/.exec(cells[0])
    if (!m) continue
    // Le libellé est la dernière cellule non vide avant la phrase : « Objet » pour la
    // boutique, « Cercle | Boss » pour les portraits. On garde l'avant-dernière.
    items.push({ id: m[1], name: cells.slice(1, -1).filter(Boolean).pop() ?? m[1], phrase: cells.at(-1) })
  }
  if (items.length === 0) throw new Error(`Aucune phrase trouvée dans les tableaux de ${DOC}.`)

  return { skeleton, items }
}

/** Le marqueur substitué dans le squelette : **\<phrase d'objet\>**, **\<phrase de boss\>**… */
const MARQUEUR = /\*\*\\?<phrase[^>]*?\\?>\*\*/

/** Le prompt final : le squelette avec la phrase substituée au marqueur. */
function buildPrompt(skeleton, phrase) {
  return skeleton.replace(MARQUEUR, phrase).replace(/\\([<>])/g, '$1').replace(/\*\*/g, '')
}

/** La clé d'idempotence : ce qui, en changeant, rend une image périmée. */
const cleFor = (model, size, ratio, prompt) => createHash('sha256').update(`${model}\n${size}\n${ratio}\n${prompt}`).digest('hex').slice(0, 16)

// ---------------------------------------------------------------- manifeste

const readManifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {})
const writeManifest = (m) => writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`)

/** L'image existante d'un objet, quelle que soit son extension, ou null. */
function existingFile(id) {
  if (!existsSync(OUT_DIR)) return null
  const hit = readdirSync(OUT_DIR).find((f) => new RegExp(`^${id}\\.(png|jpe?g|webp)$`).test(f))
  return hit ? join(OUT_DIR, hit) : null
}

// --------------------------------------------------------------------- API

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

async function generate(prompt, apiKey) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: FAM.ratio, imageSize: SIZE } },
  }

  let lastError
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${API}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    })

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`)
      const wait = 2 ** attempt * 1000
      process.stdout.write(`    quota/serveur (${res.status}), nouvelle tentative dans ${wait / 1000} s\n`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 400)}`)

    const json = await res.json()
    const candidate = json.candidates?.[0]
    const part = candidate?.content?.parts?.find((p) => p.inlineData?.data)
    if (!part) {
      const reason = candidate?.finishReason ?? json.promptFeedback?.blockReason ?? 'aucune image dans la réponse'
      const said = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join(' ')
      throw new Error(`${reason}${said ? ` — le modèle a répondu : « ${said.slice(0, 200)} »` : ''}`)
    }
    const mime = part.inlineData.mimeType || 'image/png'
    return { buffer: Buffer.from(part.inlineData.data, 'base64'), ext: EXT[mime] ?? 'png', mime }
  }
  throw lastError
}

// ------------------------------------------------------------------- main

async function main() {
  loadEnv()
  const { skeleton, items } = readDoc()
  const manifest = readManifest()

  const selected = ids.length ? items.filter((i) => ids.includes(i.id)) : items
  const unknown = ids.filter((id) => !items.some((i) => i.id === id))
  if (unknown.length) {
    console.error(`Inconnus dans la famille « ${FAMILLE} » : ${unknown.join(', ')}`)
    console.error(`Connus : ${items.map((i) => i.id).join(', ')}`)
    process.exit(1)
  }

  // État de chaque objet, avant tout appel réseau.
  const plan = selected.map((item) => {
    const prompt = buildPrompt(skeleton, item.phrase)
    const cle = cleFor(MODEL, SIZE, FAM.ratio, prompt)
    const file = existingFile(item.id)
    const known = manifest[item.id]
    let state = 'à générer'
    if (file && !FORCE) state = known?.cle === cle ? 'à jour' : 'périmé'
    else if (file && FORCE) state = 'à refaire'
    return { ...item, prompt, cle, file, state }
  })

  console.log(`Famille : ${FAMILLE} — ${FAM.quoi}`)
  console.log(`Modèle : ${MODEL} (${SIZE}, ${FAM.ratio})`)
  console.log(`Sortie : ${OUT_DIR.replace(`${REPO}/`, '')}\n`)
  for (const p of plan) console.log(`  ${p.state.padEnd(10)} ${p.id.padEnd(18)} ${p.name}`)
  console.log('')

  if (LIST) return
  if (DRY) {
    for (const p of plan.filter((x) => x.state !== 'à jour')) {
      console.log(`\n── ${p.id} (clé ${p.cle}) ──\n${p.prompt}`)
    }
    return
  }

  const todo = plan.filter((p) => p.state === 'à générer' || p.state === 'à refaire')
  const perimes = plan.filter((p) => p.state === 'périmé')
  if (perimes.length) {
    console.log(`Périmés (le document a changé depuis) : ${perimes.map((p) => p.id).join(', ')}`)
    console.log('Les supprimer ou relancer avec --force pour les refaire.\n')
  }
  if (!todo.length) { console.log('Rien à générer.'); return }

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) { console.error('GOOGLE_API_KEY absente (./.env à la racine du dépôt).'); process.exit(1) }

  mkdirSync(OUT_DIR, { recursive: true })
  let ok = 0
  const echecs = []

  for (const [i, p] of todo.entries()) {
    process.stdout.write(`[${i + 1}/${todo.length}] ${p.id}… `)
    const started = Date.now()
    try {
      const { buffer, ext, mime } = await generate(p.prompt, apiKey)
      // Écriture atomique : pas de demi-fichier si le processus est interrompu, ce qui
      // ferait passer l'objet pour « à jour » au prochain lancement.
      const target = join(OUT_DIR, `${p.id}.${ext}`)
      const tmp = `${target}.part`
      writeFileSync(tmp, buffer)
      if (p.file && p.file !== target) unlinkSync(p.file)
      renameSync(tmp, target)

      manifest[p.id] = {
        cle: p.cle,
        modele: MODEL,
        taille: SIZE,
        ratio: FAM.ratio,
        fichier: `${p.id}.${ext}`,
        mime,
        octets: buffer.length,
        genereLe: new Date().toISOString(),
        prompt: p.prompt,
      }
      writeManifest(manifest)
      ok++
      console.log(`ok — ${(buffer.length / 1024).toFixed(0)} Ko en ${((Date.now() - started) / 1000).toFixed(1)} s`)
    } catch (err) {
      echecs.push(p.id)
      console.log(`échec — ${err.message}`)
    }
  }

  console.log(`\n${ok}/${todo.length} générés.${echecs.length ? ` Échecs : ${echecs.join(', ')}` : ''}`)
  if (echecs.length) process.exitCode = 1
}

main().catch((err) => { console.error(err.message); process.exit(1) })
