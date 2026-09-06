#!/usr/bin/env node
/**
 * Hook commit-msg : vérifie le format `<type>(<scope>): <description>`
 * défini dans CONTRIBUTING.md. Voir la constante TYPES ci-dessous.
 */
import { readFileSync } from "node:fs";

const TYPES = [
  "feat",
  "fix",
  "docs",
  "design",
  "art",
  "lexique",
  "refactor",
  "chore",
  "test",
  "build",
  "ci",
];

const filePath = process.argv[2];
if (!filePath) {
  // Pas de fichier fourni : on ne bloque pas.
  process.exit(0);
}

const raw = readFileSync(filePath, "utf8");
const firstLine = raw
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.length > 0 && !l.startsWith("#"));

if (!firstLine) {
  process.exit(0);
}

if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) {
  process.exit(0);
}

const pattern = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9._-]+\\))?: .+`);

if (!pattern.test(firstLine)) {
  console.error("\n❌ Commit bloqué : message non conforme.\n");
  console.error(`   Reçu : "${firstLine}"`);
  console.error(`   Attendu : <type>(<scope>): <description>`);
  console.error(`   Types valides : ${TYPES.join(", ")}\n`);
  console.error("   Exemple : feat(combat): ajoute la résolution des tuiles hexagonales\n");
  process.exit(1);
}

process.exit(0);
