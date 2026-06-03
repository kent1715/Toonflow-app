# Worklog — Toonflow-app

---

## Task 8: Create output sanitizer module
**Date:** 2025-03-04
**Status:** ✅ Completed

### Summary
Created `/home/z/toonflow-work/src/utils/outputSanitizer.ts` — a module that cleans agent responses before they are sent to the user.

### What was done
1. **Reviewed existing `stripThink.ts`** — confirmed it exports `stripThink` and `createThinkStreamFilter`.
2. **Created `outputSanitizer.ts`** with the following features:
   - Builds on top of `stripThink` (imports both `stripThink` and `createThinkStreamFilter` from `./stripThink`).
   - **Import fix applied**: moved `createThinkStreamFilter` import to the top of the file alongside `stripThink`, instead of at the bottom as in the provided template.
   - `sanitizeOutput(text)` — non-streaming sanitizer that:
     - Removes `<think...>...</think*>` blocks via `stripThink`
     - Removes English reasoning lines (e.g., "Okay, the user wants...", "Let me think...")
     - Removes Mandarin-only lines (not mixed, and preserving structured data like tables, XML, code blocks, lists)
     - Preserves: user input text, Bahasa Indonesia responses, structured data, code blocks
     - Collapses excessive blank lines
   - `createOutputSanitizerStream()` — streaming sanitizer that:
     - Buffers chunks and processes complete lines
     - Applies think-block filtering, English reasoning removal, and Mandarin line removal
     - Provides `push(chunk)` and `flush()` methods
3. **TypeScript compilation verified** — `npx tsc --noEmit` passed with no errors.

### Files changed
- **Created:** `src/utils/outputSanitizer.ts` (158 lines)

### Next actions
- Integrate `sanitizeOutput` or `createOutputSanitizerStream` into the agent response pipeline where agent outputs are sent to users.
- Add unit tests for the sanitizer covering edge cases (partial think tags, mixed-language lines, code blocks with Mandarin comments, etc.).

---

## Task 7: Create skill synchronization script
**Date:** 2025-03-04
**Status:** ✅ Completed

### Summary
Created `/home/z/toonflow-work/scripts/sync-skills-db.ts` — a skill synchronization script that reads `data/skills/*.md` files and updates the corresponding skill/agent work data in the SQLite database `data/db2.sqlite`.

### What was done
1. **Analyzed existing codebase** — reviewed `src/utils/db.ts` (Knex with better-sqlite3), `src/lib/initDB.ts` (initial prompt data), `src/lib/fixDB.ts` (prompt updates), and existing `scripts/syncSkillsToDb.ts` (sql.js-based approach).
2. **Created `sync-skills-db.ts`** with the following features:
   - Uses project's existing Knex DB connection (`import db from "@/utils/db"`)
   - Reads **top-level only** `.md` files from `data/skills/` (NOT subdirectories like art_skills/story_skills/production_skills/)
   - Maps 13 skill files to `o_prompt.type` values via `SKILL_TYPE_MAP` (e.g., `production_agent_supervision.md` → `productionAgent:supervisionAgent`)
   - Parses YAML frontmatter `name` field from each .md file
   - Updates existing `o_prompt` records or inserts new ones (never deletes)
   - Preserves user customizations in `useData` field — only updates `data` (seed) field
   - Syncs 3 built-in prompt types from initDB.ts data: `eventExtraction`, `scriptAssetExtraction`, `audioBindPrompt`
   - Syncs `videoPromptGeneration` from `data/modelPrompt/video/universalMulti-parameterMode.md`
   - Shows detailed summary with update/insert/skip/error counts
   - Properly destroys DB connection on completion
3. **Updated `package.json`** — changed `sync-skills` npm script from pointing to old `syncSkillsToDb.ts` to new `sync-skills-db.ts`

### Files changed
- **Created:** `scripts/sync-skills-db.ts` (250+ lines)
- **Modified:** `package.json` (updated `sync-skills` script path)

### Key design decisions
- Used Knex (`@/utils/db`) instead of raw sql.js for consistency with project's DB approach
- For `videoPromptGeneration`, reads from modelPrompt file rather than embedding the extremely long initDB.ts string (~10KB+)
- For the other 3 built-in prompts, embedded data directly from initDB.ts since they are shorter
- Only updates `data` field on existing records, preserving `useData` (user customizations) — this matches the pattern used by the existing `syncSkillsToDb.ts`

### Next actions
- Run `yarn sync-skills` or `npx tsx scripts/sync-skills-db.ts` to test the script against the actual database
- Consider adding the script to CI/CD or deployment process to keep DB in sync with skill files

---

## Task 10: Fix Stage 1 — Create Storyboard Transition Pipeline in real Toonflow repo
**Date:** 2025-06-03
**Status:** ✅ Completed

### Summary
Previous session incorrectly created pipeline files in the Next.js sandbox (/home/z/my-project/) instead of the actual Toonflow-app repo. This task fixes that by creating all files in the correct Express.js-based Toonflow-app repository and registering the API route properly.

### What was done
1. **Cloned Toonflow-app** from GitHub (kent1715/Toonflow-app, branch indonesian-ui-patch) to /home/z/toonflow-app/
2. **Found real API router** — "API 404 Not Found" catch-all at src/app.ts:125; routes registered via auto-generated src/router.ts from src/core.ts
3. **Discovered auth system** — Global JWT middleware in src/app.ts (Authorization header or ?token= query param); only /api/login/login is whitelisted
4. **Discovered AI provider pattern** — u.Ai.Text("vendorId:modelName").invoke() from src/utils/ai.ts; uses existing vendor abstraction (Ollama, OpenAI, etc.)
5. **Discovered file storage** — u.oss.writeFile() saves to data/oss/ directory, accessible via /oss/ static route
6. **Created 5 pipeline files** in src/lib/pipeline/ using Toonflow's u.Ai.Text() pattern (not direct AI SDK)
7. **Created 1 route file** in src/routes/storygen/test.ts using Express Router pattern with success/error response format
8. **Updated src/router.ts** — added route168 import + registration for /api/storygen/test
9. **Committed** as 3394e19 and **pushed** to indonesian-ui-patch branch

### Files created (6 new)
| Path | Purpose |
|---|---|
| `src/lib/pipeline/types.ts` | Pipeline type definitions (StoryBible, Scene, TransitionPlan, StoryProject, PipelineResult) |
| `src/lib/pipeline/storyBible.ts` | Story Bible builder + 3 mock scenes + scenes-to-prompt context converter |
| `src/lib/pipeline/transitionDirector.ts` | Transition Director Agent using u.Ai.Text(); 3-level JSON extraction (direct → strip fences → regex); field validation |
| `src/lib/pipeline/storyProjectStore.ts` | Project JSON storage via u.oss.writeFile(); saves to data/oss/story_projects/{projectId}/project.json |
| `src/lib/pipeline/testStorygenPipeline.ts` | End-to-end test runner; resolves Ollama model from vendor DB; builds Bible + scenes + transitions + saves |
| `src/routes/storygen/test.ts` | POST /api/storygen/test Express route with JWT auth (global middleware); uses success/error response format |

### Files modified (1)
| Path | Change |
|---|---|
| `src/router.ts` | Added route168 import from "./routes/storygen/test" + app.use("/api/storygen/test", route168) |

### Key design decisions
- Uses `u.Ai.Text("ollama:modelName")` — existing Toonflow provider abstraction, no new SDK imports needed
- Uses `u.oss.writeFile()` — consistent with existing file storage patterns, accessible via /oss/ HTTP route
- Auth: global JWT middleware applies automatically to /api/storygen/test (no whitelist bypass needed)
- Model resolution: auto-discovers Ollama vendor from o_vendorConfig DB; falls back to "ollama:qwen3:8b"
- No changes to existing pipeline, vendor, bridge, zimage, comfyui, video, or database enum code
