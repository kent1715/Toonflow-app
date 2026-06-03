/**
 * Transition Director Agent
 *
 * Generates TransitionPlan objects between consecutive scenes using
 * the Toonflow AI provider (u.Ai.Text).
 *
 * Key behaviour:
 * - Sends a structured prompt asking for JSON-only output
 * - If the LLM returns pure JSON → parse directly
 * - If the LLM wraps JSON in markdown fences or adds chatter →
 *   extract the first JSON block with regex, then parse
 * - If parsing still fails → throw a clear error
 */

import u from "@/utils";
import { StoryBible, Scene, TransitionPlan } from "./types";
import { scenesToPromptContext } from "./storyBible";

// ─── JSON Extraction ───────────────────────────────────────────

/**
 * Try to extract a valid JSON object from raw LLM output.
 * 1. Attempt direct JSON.parse
 * 2. Strip markdown code fences and try again
 * 3. Regex-search for the first {...} block
 */
export function extractJSON(raw: string): unknown {
  // 1. Direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2. Strip markdown fences (```json ... ``` or ``` ... ```)
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // continue
  }

  // 3. Regex: find the first balanced {…} block
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // continue
    }
  }

  return null;
}

// ─── Prompt Builder ────────────────────────────────────────────

function buildTransitionPrompt(
  bible: StoryBible,
  fromScene: Scene,
  toScene: Scene
): string {
  return [
    `You are a Storyboard Transition Director for a micro-drama production studio.`,
    ``,
    `PROJECT BIBLE:`,
    `  Title: ${bible.title}`,
    `  Genre: ${bible.genre}`,
    `  Tone: ${bible.tone}`,
    `  Main Character: ${bible.mainCharacter}`,
    `  Location: ${bible.location}`,
    `  Visual Style: ${bible.visualStyle}`,
    `  Aspect Ratio: ${bible.aspectRatio}`,
    `  Continuity Rules: ${bible.continuityRules.join("; ")}`,
    ``,
    `SCENE CONTEXT:`,
    scenesToPromptContext([fromScene, toScene]),
    ``,
    `TASK:`,
    `Generate a SINGLE transition plan between Scene ${fromScene.id} → Scene ${toScene.id}.`,
    `The transition must visually bridge the two scenes while maintaining narrative continuity.`,
    ``,
    `OUTPUT FORMAT:`,
    `Return ONLY a raw JSON object (no markdown, no explanation, no code fences).`,
    `The JSON must follow this exact schema:`,
    ``,
    `{`,
    `  "fromSceneId": ${fromScene.id},`,
    `  "toSceneId": ${toScene.id},`,
    `  "transitionPrompt": "A vivid visual description of the transition effect (2-3 sentences)",`,
    `  "duration": 4,`,
    `  "cameraMotion": "Description of how the camera moves during transition",`,
    `  "subjectMotion": "Description of how the main subject moves",`,
    `  "environmentMotion": "Description of background/environment changes",`,
    `  "continuityNotes": "How visual continuity is preserved",`,
    `  "negativePrompt": "What to avoid in the transition"`,
    `}`,
    ``,
    `RULES:`,
    `- Output MUST be valid JSON only. No extra text before or after.`,
    `- duration must be a number (seconds, typically 2-6).`,
    `- All string fields must be descriptive and production-ready.`,
    `- Respect the project's continuity rules.`,
    `- Keep the tone consistent with "${bible.tone}".`,
  ].join("\n");
}

// ─── Generate Single Transition ────────────────────────────────

/**
 * Generate a transition plan between two scenes.
 *
 * @param modelKey - Toonflow AI model key, e.g. "ollama:qwen3:8b"
 */
export async function generateTransition(
  bible: StoryBible,
  fromScene: Scene,
  toScene: Scene,
  modelKey: string
): Promise<TransitionPlan> {
  const prompt = buildTransitionPrompt(bible, fromScene, toScene);

  console.log(
    `[TransitionDirector] Generating transition: Scene ${fromScene.id} → Scene ${toScene.id} (model: ${modelKey})`
  );

  const startTime = Date.now();

  const result = await u.Ai.Text(modelKey).invoke({
    prompt,
    maxOutputTokens: 1024,
    temperature: 0.7,
  });

  const text: string = result.text ?? "";
  const elapsed = Date.now() - startTime;
  console.log(`[TransitionDirector] LLM responded in ${elapsed}ms (${text.length} chars)`);

  // ── Parse response ──
  const parsed = extractJSON(text);

  if (!parsed || typeof parsed !== "object") {
    console.error("[TransitionDirector] Failed to extract JSON from LLM output:");
    console.error(text.slice(0, 500));
    throw new Error(
      `Transition Director: LLM output is not valid JSON. ` +
        `Raw output (first 300 chars): ${text.slice(0, 300)}`
    );
  }

  const obj = parsed as Record<string, unknown>;

  // ── Validate required fields ──
  const requiredFields: (keyof TransitionPlan)[] = [
    "fromSceneId",
    "toSceneId",
    "transitionPrompt",
    "duration",
    "cameraMotion",
    "subjectMotion",
    "environmentMotion",
    "continuityNotes",
    "negativePrompt",
  ];

  const missing = requiredFields.filter((f) => obj[f] === undefined || obj[f] === null);
  if (missing.length > 0) {
    throw new Error(
      `Transition Director: Missing fields in LLM output: ${missing.join(", ")}. ` +
        `Received keys: ${Object.keys(obj).join(", ")}`
    );
  }

  const plan: TransitionPlan = {
    fromSceneId: Number(obj.fromSceneId),
    toSceneId: Number(obj.toSceneId),
    transitionPrompt: String(obj.transitionPrompt),
    duration: Number(obj.duration),
    cameraMotion: String(obj.cameraMotion),
    subjectMotion: String(obj.subjectMotion),
    environmentMotion: String(obj.environmentMotion),
    continuityNotes: String(obj.continuityNotes),
    negativePrompt: String(obj.negativePrompt),
  };

  console.log(
    `[TransitionDirector] ✓ Transition plan generated: Scene ${plan.fromSceneId} → Scene ${plan.toSceneId} (${plan.duration}s)`
  );

  return plan;
}

// ─── Generate All Transitions ──────────────────────────────────

export async function generateAllTransitions(
  bible: StoryBible,
  scenes: Scene[],
  modelKey: string
): Promise<TransitionPlan[]> {
  if (scenes.length < 2) {
    throw new Error("Need at least 2 scenes to generate transitions");
  }

  const transitions: TransitionPlan[] = [];

  for (let i = 0; i < scenes.length - 1; i++) {
    const plan = await generateTransition(bible, scenes[i], scenes[i + 1], modelKey);
    transitions.push(plan);
  }

  console.log(
    `[TransitionDirector] ✓ All ${transitions.length} transitions generated successfully`
  );

  return transitions;
}
