/**
 * POST /api/storygen/test
 *
 * Test endpoint for the Storyboard Transition Pipeline.
 *
 * When called:
 * - Creates a mock Story Bible
 * - Creates 3 mock scenes
 * - Generates transitions 1→2 and 2→3 using the Ollama provider
 * - Saves project.json to OSS
 * - Returns result JSON
 *
 * Success response:
 *   { code: 200, data: { ok: true, projectId: "...", projectPath: "...", transitionCount: 2 }, message: "Berhasil" }
 *
 * Failure response:
 *   { code: 200, data: { ok: false, error: "..." }, message: "Berhasil" }
 *
 * Optional body parameters:
 *   - modelKey: string — Override model key, e.g. "ollama:qwen3:8b"
 */

import express from "express";
import { success, error } from "@/lib/responseFormat";
import u from "@/utils";
import { runTestPipeline } from "@/lib/pipeline/testStorygenPipeline";
const router = express.Router();

export default router.post("/", async (req, res) => {
  try {
    const { modelKey } = req.body || {};

    console.log(`[API /api/storygen/test] Starting test pipeline${modelKey ? ` with model: ${modelKey}` : ""}`);

    const result = await runTestPipeline(modelKey);

    res.status(200).send(success(result));
  } catch (err) {
    console.error("[API /api/storygen/test] Unhandled error:", err);
    const msg = u.error(err).message;
    res.status(500).send(error(msg));
  }
});
