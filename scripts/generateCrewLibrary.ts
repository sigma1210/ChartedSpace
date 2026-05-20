#!/usr/bin/env tsx
/**
 * Generates a static crew library for the crew hiring system.
 *
 * Usage:
 *   npx tsx scripts/generateCrewLibrary.ts [count]
 *
 * Outputs to: src/data/crewLibrary.json
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { generateCharacter, CharacterDeathError } from "../src/lib/characters/engine";
import { RandomDecisionProvider } from "../src/lib/characters/providers/random";
import type { CrewLibraryEntry } from "../src/types/index";

// ─── Config ──────────────────────────────────────────────────────────────────

const TARGET_COUNT = parseInt(process.argv[2] ?? "100", 10);
const OUT_PATH     = join(__dirname, "../src/data/crewLibrary.json");

// ─── Generate ────────────────────────────────────────────────────────────────

const generate = async (): Promise<void> => {
  const library: CrewLibraryEntry[] = [];
  let   attempts = 0;

  process.stdout.write(`Generating ${TARGET_COUNT} crew templates`);

  while (library.length < TARGET_COUNT) {
    attempts++;
    try {
      const sheet = await generateCharacter(
        "Template",
        new RandomDecisionProvider(),
        { mode: "random" },
      );

      library.push({
        age:     sheet.age,
        upp:     sheet.upp,
        skills:  sheet.skills,
        careers: sheet.careers.map(c => ({
          career:      c.career,
          terms:       c.terms,
          rank:        c.rank,
          commissioned: c.commissioned,
        })),
      });

      if (library.length % 10 === 0) process.stdout.write(".");
    } catch (err) {
      if (err instanceof CharacterDeathError) {
        // Character died during generation — silently retry
        continue;
      }
      throw err;
    }
  }

  process.stdout.write("\n");

  const json     = JSON.stringify(library, null, 2);
  const sizeKb   = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);
  const deathRate = (((attempts - TARGET_COUNT) / attempts) * 100).toFixed(1);

  writeFileSync(OUT_PATH, json, "utf8");

  console.log(`\nDone.`);
  console.log(`  Entries  : ${library.length}`);
  console.log(`  Attempts : ${attempts} (${deathRate}% death rate)`);
  console.log(`  File     : ${OUT_PATH}`);
  console.log(`  Size     : ${sizeKb} KB`);
};

generate().catch(err => {
  console.error("Generation failed:", err);
  process.exit(1);
});
