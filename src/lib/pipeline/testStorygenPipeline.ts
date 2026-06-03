/**
 * Test Storygen Pipeline
 *
 * End-to-end test runner that:
 * 1. Resolves an available Ollama text model from the vendor config
 * 2. Creates a mock Story Bible
 * 3. Creates 3 mock scenes
 * 4. Generates transitions 1→2 and 2→3 via the Ollama provider
 * 5. Saves project.json to OSS
 * 6. Returns result summary
 */

import u from "@/utils";
import { StoryProject, PipelineResult } from "./types";
import { buildStoryBible, buildMockScenes } from "./storyBible";
import { generateAllTransitions } from "./transitionDirector";
import { saveProject } from "./storyProjectStore";

// ─── Resolve Ollama Model Key ─────────────────────────────────

/**
 * Finds the first available Ollama text model in the vendor config DB.
 * Returns a model key like "ollama:qwen3:8b" for use with u.Ai.Text().
 * Falls back to "ollama:qwen3:8b" if no Ollama vendor is configured.
 */
async function resolveOllamaModelKey(): Promise<string> {
  try {
    const vendorRow = await u.db("o_vendorConfig").where("id", "ollama").first();
    if (!vendorRow) {
      console.warn("[TestPipeline] No Ollama vendor found in DB, using default: ollama:qwen3:8b");
      return "ollama:qwen3:8b";
    }

    const modelList = await u.vendor.getModelList("ollama");
    const textModel = modelList.find((m: any) => m.type === "text");
    if (!textModel) {
      console.warn("[TestPipeline] No text model found for Ollama, using default: ollama:qwen3:8b");
      return "ollama:qwen3:8b";
    }

    const key = `ollama:${textModel.modelName}`;
    console.log(`[TestPipeline] Resolved Ollama model: ${key}`);
    return key;
  } catch (err) {
    console.warn("[TestPipeline] Failed to resolve Ollama model from DB, using default:", err);
    return "ollama:qwen3:8b";
  }
}

// ─── Run Test Pipeline ─────────────────────────────────────────

export async function runTestPipeline(modelKey?: string): Promise<PipelineResult> {
  const projectId = `test_${Date.now()}`;
  const now = new Date().toISOString();

  console.log(`[TestPipeline] Starting test pipeline — project: ${projectId}`);

  try {
    // Step 0: Resolve model key
    const resolvedModelKey = modelKey || (await resolveOllamaModelKey());
    console.log(`[TestPipeline] Using model key: ${resolvedModelKey}`);

    // Step 1: Build mock Story Bible
    const bible = buildStoryBible({
      title: "The Glowing Artifact",
      genre: "sci-fi thriller",
      tone: "mysterious, suspenseful",
      mainCharacter: "Maya — a resourceful courier",
      location: "Neo-Jakarta, 2045",
      visualStyle: "neon-noir cyberpunk",
      aspectRatio: "9:16",
      continuityRules: [
        "Artifact glow color must stay consistent (blue-white)",
        "Maya wears the same jacket across all scenes",
        "Time of day: night throughout",
        "Rain present in all outdoor scenes",
      ],
    });
    console.log(`[TestPipeline] ✓ Story Bible created: "${bible.title}"`);

    // Step 2: Build 3 mock scenes
    const scenes = buildMockScenes(3);
    console.log(`[TestPipeline] ✓ ${scenes.length} mock scenes created`);

    // Step 3: Generate transitions via Ollama
    console.log("[TestPipeline] Generating transitions via Ollama...");
    const transitions = await generateAllTransitions(bible, scenes, resolvedModelKey);
    console.log(`[TestPipeline] ✓ ${transitions.length} transitions generated`);

    // Step 4: Assemble project
    const project: StoryProject = {
      id: projectId,
      title: bible.title,
      bible,
      scenes,
      transitions,
      status: "transitions_done",
      createdAt: now,
      updatedAt: now,
    };

    // Step 5: Save to OSS
    const projectPath = await saveProject(project);
    console.log(`[TestPipeline] ✓ Project saved to: ${projectPath}`);

    return {
      ok: true,
      projectId: project.id,
      projectPath,
      transitionCount: transitions.length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[TestPipeline] ✗ Pipeline failed: ${message}`);

    return {
      ok: false,
      error: message,
    };
  }
}
