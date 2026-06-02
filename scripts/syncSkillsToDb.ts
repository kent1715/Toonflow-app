/**
 * syncSkillsToDb.ts
 *
 * Synchronizes skill markdown files from the filesystem into the SQLite database.
 *
 * Problem: When skill .md files on disk are updated (e.g. translated from Mandarin
 * to Bahasa Indonesia), the database doesn't auto-reload. Old Mandarin data persists
 * in the o_prompt table's `data` field (especially after fixDB.ts overwrites it).
 *
 * This script:
 *   1. Reads all .md files from data/skills/ (recursively)
 *   2. Reads all .md files from data/modelPrompt/ (recursively)
 *   3. Maps each file to the correct o_prompt record by `type` field
 *   4. Updates o_prompt.data with the latest file content
 *   5. Creates new o_prompt records for skill files that don't have one yet
 *   6. Does NOT overwrite o_prompt.useData (user customizations are preserved)
 *   7. Does NOT delete any project/user data or reset the database
 *
 * Usage:
 *   npx tsx scripts/syncSkillsToDb.ts
 *   bun run scripts/syncSkillsToDb.ts
 *   yarn sync-skills
 */

import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import path from "path";
import fs from "fs";
import fg from "fast-glob";

// ─── Configuration ───────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(process.cwd());
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db2.sqlite");
const SKILLS_DIR = path.join(DATA_DIR, "skills");
const MODEL_PROMPT_DIR = path.join(DATA_DIR, "modelPrompt");

/**
 * Mapping from modelPrompt subdirectory names to the o_prompt.type they update.
 * The videoPromptGeneration type is the catch-all fallback in the app runtime.
 */
const MODEL_PROMPT_TYPE_MAP: Record<string, string> = {
  video: "videoPromptGeneration",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncResult {
  file: string;
  type: string;
  action: "created" | "updated" | "skipped";
  reason?: string;
}

interface PromptRow {
  id: number;
  name: string | null;
  type: string | null;
  data: string | null;
  useData: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toUnixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * Derive a human-readable name from a file path.
 * e.g. "art_skills/2D_90s_japanese_anime/art_prompt/art_prop" → "Art Prop"
 * e.g. "production_agent_decision" → "Production Agent Decision"
 */
function deriveNameFromPath(relPath: string): string {
  const parts = relPath.split("/");
  const fileName = parts[parts.length - 1];
  // Convert snake_case to Title Case
  return fileName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Try to parse YAML frontmatter from markdown content.
 * Returns { name, description } if found, null otherwise.
 */
function parseFrontmatter(content: string): { name: string; description: string } | null {
  const match = content.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match?.[1]) return null;

  const result: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1].trim();
    const rawValue = (keyMatch[2] ?? "").trim();
    const unquoted = rawValue.replace(/^(['"])([\s\S]*)\1$/, "$2");
    if (key) result[key] = unquoted;
  }

  if (result.name && result.description) {
    return { name: result.name, description: result.description };
  }
  return null;
}

/**
 * Run a SELECT query and return all rows.
 */
function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Run a SELECT query and return the first row, or undefined.
 */
function queryFirst(db: SqlJsDatabase, sql: string, params: any[] = []): any | undefined {
  const rows = queryAll(db, sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

/**
 * Run an INSERT/UPDATE/DELETE and return the number of affected rows.
 */
function runExec(db: SqlJsDatabase, sql: string, params: any[] = []): void {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Skill Sync Script — Filesystem → Database");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Check skills directory exists
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`❌ Skills directory not found at: ${SKILLS_DIR}`);
    process.exit(1);
  }

  // Initialize sql.js
  const SQL = await initSqlJs();

  let db: SqlJsDatabase;

  if (!fs.existsSync(DB_PATH)) {
    // Database doesn't exist yet — create it with minimal schema
    console.log("📦 Database not found. Creating new database with o_prompt table...\n");
    db = new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS o_prompt (
        id INTEGER NOT NULL,
        name TEXT,
        type TEXT,
        data TEXT,
        useData TEXT,
        PRIMARY KEY (id),
        UNIQUE (id)
      );
    `);
    // Save the new database file
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const initData = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(initData));
    console.log("✅ Database created successfully.\n");
  } else {
    // Load the existing database
    const dbBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(dbBuffer);

    // Ensure o_prompt table exists
    const tableRows = queryAll(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='o_prompt'");
    if (tableRows.length === 0) {
      console.log("📦 o_prompt table not found. Creating it...\n");
      db.run(`
        CREATE TABLE IF NOT EXISTS o_prompt (
          id INTEGER NOT NULL,
          name TEXT,
          type TEXT,
          data TEXT,
          useData TEXT,
          PRIMARY KEY (id),
          UNIQUE (id)
        );
      `);
    }
  }

  const results: SyncResult[] = [];

  // ── Step 1: Collect all skill .md files ──────────────────────────────────

  console.log("📂 Scanning data/skills/ for .md files...");
  const skillFiles = fg.sync("**/*.md", {
    cwd: toUnixPath(SKILLS_DIR),
    onlyFiles: true,
    absolute: false,
  });
  console.log(`   Found ${skillFiles.length} skill .md files\n`);

  // ── Step 2: Collect modelPrompt .md files ────────────────────────────────

  let modelPromptFiles: string[] = [];
  if (fs.existsSync(MODEL_PROMPT_DIR)) {
    console.log("📂 Scanning data/modelPrompt/ for .md files...");
    modelPromptFiles = fg.sync("**/*.md", {
      cwd: toUnixPath(MODEL_PROMPT_DIR),
      onlyFiles: true,
      absolute: false,
    });
    console.log(`   Found ${modelPromptFiles.length} modelPrompt .md files\n`);
  }

  // ── Step 3: Process skill files ──────────────────────────────────────────

  console.log("🔄 Processing skill files...\n");

  // Helper: get next available ID
  function getNextId(): number {
    const row = queryFirst(db, "SELECT MAX(id) as maxId FROM o_prompt");
    return (row?.maxId ?? 0) + 1;
  }

  // Process each skill file
  for (const relFile of skillFiles) {
    const fullPath = path.join(SKILLS_DIR, relFile);
    const relPathNoExt = relFile.replace(/\.md$/, "");
    const typeKey = `skill:${relPathNoExt}`; // Prefix to distinguish from existing o_prompt types

    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (err: any) {
      results.push({ file: relFile, type: typeKey, action: "skipped", reason: `Read error: ${err.message}` });
      continue;
    }

    // Try to extract name from frontmatter
    const parsed = parseFrontmatter(content);
    const name = parsed?.name ?? deriveNameFromPath(relPathNoExt);

    // Check if record exists
    const existing = queryFirst(db, "SELECT * FROM o_prompt WHERE type = ?", [typeKey]) as PromptRow | undefined;

    if (existing) {
      // Update only the `data` field; preserve `useData` (user customizations)
      if (existing.data === content) {
        results.push({ file: relFile, type: typeKey, action: "skipped", reason: "Content unchanged" });
      } else {
        runExec(db, "UPDATE o_prompt SET data = ?, name = ? WHERE type = ?", [content, name, typeKey]);
        results.push({ file: relFile, type: typeKey, action: "updated" });
      }
    } else {
      // Create new record
      const newId = getNextId();
      runExec(db, "INSERT INTO o_prompt (id, name, type, data) VALUES (?, ?, ?, ?)", [newId, name, typeKey, content]);
      results.push({ file: relFile, type: typeKey, action: "created" });
    }
  }

  // ── Step 4: Process modelPrompt files ─────────────────────────────────

  for (const relFile of modelPromptFiles) {
    const fullPath = path.join(MODEL_PROMPT_DIR, relFile);
    const dirName = relFile.split("/")[0]; // e.g., "video"
    const mappedType = MODEL_PROMPT_TYPE_MAP[dirName];

    if (!mappedType) {
      // No mapping for this directory; store as modelPrompt entry
      const relPathNoExt = relFile.replace(/\.md$/, "");
      const typeKey = `modelPrompt:${relPathNoExt}`;
      const name = deriveNameFromPath(relPathNoExt);

      let content: string;
      try {
        content = fs.readFileSync(fullPath, "utf-8");
      } catch (err: any) {
        results.push({ file: relFile, type: typeKey, action: "skipped", reason: `Read error: ${err.message}` });
        continue;
      }

      const existing = queryFirst(db, "SELECT * FROM o_prompt WHERE type = ?", [typeKey]) as PromptRow | undefined;
      if (existing) {
        if (existing.data !== content) {
          runExec(db, "UPDATE o_prompt SET data = ?, name = ? WHERE type = ?", [content, name, typeKey]);
          results.push({ file: relFile, type: typeKey, action: "updated" });
        } else {
          results.push({ file: relFile, type: typeKey, action: "skipped", reason: "Content unchanged" });
        }
      } else {
        const newId = getNextId();
        runExec(db, "INSERT INTO o_prompt (id, name, type, data) VALUES (?, ?, ?, ?)", [newId, name, typeKey, content]);
        results.push({ file: relFile, type: typeKey, action: "created" });
      }
      continue;
    }

    // For mapped types (like videoPromptGeneration), we need special handling.
    // Multiple files map to the same type. We store each separately AND
    // update the main entry with the universal multi-parameter mode file.
    const relPathNoExt = relFile.replace(/\.md$/, "");
    const specificTypeKey = `modelPrompt:${relPathNoExt}`;
    const name = deriveNameFromPath(path.basename(relFile, ".md"));

    let content: string;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (err: any) {
      results.push({ file: relFile, type: specificTypeKey, action: "skipped", reason: `Read error: ${err.message}` });
      continue;
    }

    // Store under specific type key
    const existingSpecific = queryFirst(db, "SELECT * FROM o_prompt WHERE type = ?", [specificTypeKey]) as PromptRow | undefined;
    if (existingSpecific) {
      if (existingSpecific.data !== content) {
        runExec(db, "UPDATE o_prompt SET data = ?, name = ? WHERE type = ?", [content, name, specificTypeKey]);
        results.push({ file: relFile, type: specificTypeKey, action: "updated" });
      } else {
        results.push({ file: relFile, type: specificTypeKey, action: "skipped", reason: "Content unchanged" });
      }
    } else {
      const newId = getNextId();
      runExec(db, "INSERT INTO o_prompt (id, name, type, data) VALUES (?, ?, ?, ?)", [newId, name, specificTypeKey, content]);
      results.push({ file: relFile, type: specificTypeKey, action: "created" });
    }

    // Also update the main videoPromptGeneration entry with the universal
    // multi-parameter mode file content (the default fallback).
    if (relFile.includes("universalMulti-parameterMode")) {
      const existingMain = queryFirst(db, "SELECT * FROM o_prompt WHERE type = ?", [mappedType]) as PromptRow | undefined;
      if (existingMain) {
        // Only update `data` (seed), not `useData` (user customization)
        if (existingMain.data !== content) {
          runExec(db, "UPDATE o_prompt SET data = ?, name = ? WHERE type = ?", [
            content,
            existingMain.name ?? "Generasi Prompt Video",
            mappedType,
          ]);
          results.push({ file: relFile, type: mappedType, action: "updated" });
        } else {
          results.push({ file: relFile, type: mappedType, action: "skipped", reason: "Content unchanged" });
        }
      } else {
        const newId = getNextId();
        runExec(db, "INSERT INTO o_prompt (id, name, type, data) VALUES (?, ?, ?, ?)", [
          newId,
          "Generasi Prompt Video",
          mappedType,
          content,
        ]);
        results.push({ file: relFile, type: mappedType, action: "created" });
      }
    }
  }

  // ── Save database back to file ────────────────────────────────────────────

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  // ── Summary ───────────────────────────────────────────────────────────────

  const created = results.filter((r) => r.action === "created");
  const updated = results.filter((r) => r.action === "updated");
  const skipped = results.filter((r) => r.action === "skipped");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Sync Summary");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log(`  Total files scanned: ${results.length}`);
  console.log(`  ✅ Created: ${created.length}`);
  console.log(`  🔄 Updated: ${updated.length}`);
  console.log(`  ⏭️  Skipped: ${skipped.length}\n`);

  if (created.length > 0) {
    console.log("  ── Created ──────────────────────────────────────────");
    for (const r of created) {
      console.log(`    + ${r.type}`);
      console.log(`      File: ${r.file}`);
    }
    console.log();
  }

  if (updated.length > 0) {
    console.log("  ── Updated ──────────────────────────────────────────");
    for (const r of updated) {
      console.log(`    ~ ${r.type}`);
      console.log(`      File: ${r.file}`);
    }
    console.log();
  }

  if (skipped.length > 0) {
    console.log("  ── Skipped ──────────────────────────────────────────");
    for (const r of skipped.slice(0, 20)) {
      console.log(`    = ${r.type} (${r.reason})`);
    }
    if (skipped.length > 20) {
      console.log(`    ... and ${skipped.length - 20} more skipped`);
    }
    console.log();
  }

  // Show current o_prompt record count
  const countRow = queryFirst(db, "SELECT COUNT(*) as count FROM o_prompt");
  console.log(`  📊 Total o_prompt records in database: ${countRow?.count ?? 0}`);

  // Show the known prompt types
  const allTypes = queryAll(db, "SELECT type, name FROM o_prompt ORDER BY type");
  console.log("\n  ── Current o_prompt types ──────────────────────────");
  for (const row of allTypes) {
    console.log(`    ${row.type} → ${row.name || "(unnamed)"}`);
  }

  db.close();
  console.log("\n✅ Sync complete. Database connection closed.");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
