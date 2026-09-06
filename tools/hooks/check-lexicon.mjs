#!/usr/bin/env node
/**
 * Hook pre-commit : vérifie que tout nouveau type gameplay (class/struct/
 * enum/interface/record C#) introduit dans un commit est bien répertorié
 * dans docs/LEXIQUE.md.
 *
 * Objectif : empêcher qu'un concept du jeu de société (ex. "Cercle",
 * "Tuile hexagonale") gagne un nom de code (ex. Circle, HexTile) sans que
 * ce mapping soit noté quelque part de commun entre le concepteur et le
 * code — y compris quand le code est écrit par une IA sans mémoire de la
 * session précédente.
 *
 * Contournement volontaire : `git commit --no-verify`, ou
 * `SKIP_LEXICON_CHECK=1 git commit ...` pour un commit ponctuel
 * (ex. refactor pur, renommage déjà couvert par le lexique).
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

if (process.env.SKIP_LEXICON_CHECK === "1") {
  console.log("ℹ️  SKIP_LEXICON_CHECK=1 : vérification du lexique ignorée.");
  process.exit(0);
}

const SCRIPTS_GLOB_PREFIX = "UnityProject/Assets/_Project/Scripts/";
const LEXICON_PATH = "docs/LEXIQUE.md";
const TYPE_DECL_RE =
  /\b(?:public|internal|private|protected|static|sealed|abstract|partial|readonly|\s)*\b(class|struct|enum|interface|record)\s+([A-Za-z_][A-Za-z0-9_]*)/g;

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" });
}

function stagedFiles() {
  return sh("git diff --cached --name-only --diff-filter=ACM")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function stagedContent(path) {
  try {
    return sh(`git show :"${path}"`);
  } catch {
    return "";
  }
}

function headContent(path) {
  try {
    return sh(`git show HEAD:"${path}"`);
  } catch {
    // Fichier nouveau ou dépôt sans commit encore : pas de version HEAD.
    return "";
  }
}

function extractTypeNames(source) {
  const names = new Set();
  let m;
  TYPE_DECL_RE.lastIndex = 0;
  while ((m = TYPE_DECL_RE.exec(source)) !== null) {
    names.add(m[2]);
  }
  return names;
}

const csFiles = stagedFiles().filter(
  (f) => f.startsWith(SCRIPTS_GLOB_PREFIX) && f.endsWith(".cs")
);

if (csFiles.length === 0) {
  process.exit(0);
}

const newlyIntroduced = new Set();

for (const file of csFiles) {
  const before = extractTypeNames(headContent(file));
  const after = extractTypeNames(stagedContent(file));
  for (const name of after) {
    if (!before.has(name)) newlyIntroduced.add(name);
  }
}

if (newlyIntroduced.size === 0) {
  process.exit(0);
}

// Le lexique peut lui-même être mis à jour dans ce même commit : on lit la
// version stagée si elle existe, sinon celle du disque.
let lexiconText = "";
const staged = stagedFiles().includes(LEXICON_PATH);
if (staged) {
  lexiconText = stagedContent(LEXICON_PATH);
} else if (existsSync(LEXICON_PATH)) {
  lexiconText = readFileSync(LEXICON_PATH, "utf8");
}

const missing = [...newlyIntroduced].filter((name) => {
  const wordBoundary = new RegExp(`\\b${name}\\b`);
  return !wordBoundary.test(lexiconText);
});

if (missing.length > 0) {
  console.error("\n❌ Commit bloqué : nouveaux types absents de docs/LEXIQUE.md\n");
  console.error("   Types détectés dans le code, sans entrée dans le lexique :");
  for (const name of missing) console.error(`     - ${name}`);
  console.error(
    "\n   → Ajoute une ligne pour chacun dans docs/LEXIQUE.md, puis " +
      "`git add docs/LEXIQUE.md`."
  );
  console.error(
    "   → Si ce n'est pas un concept de jeu (type purement technique), " +
      "utilise `git commit --no-verify` ou SKIP_LEXICON_CHECK=1.\n"
  );
  process.exit(1);
}

process.exit(0);
