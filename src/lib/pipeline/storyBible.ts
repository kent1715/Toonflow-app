/**
 * Story Bible Builder
 * Creates a Story Bible object that defines the visual and narrative rules
 * for the entire storyboard project.
 */

import { StoryBible, Scene } from "./types";

// ─── Build a Story Bible ──────────────────────────────────────

export function buildStoryBible(overrides: Partial<StoryBible> = {}): StoryBible {
  return {
    title: overrides.title ?? "Untitled Project",
    genre: overrides.genre ?? "drama",
    tone: overrides.tone ?? "neutral",
    mainCharacter: overrides.mainCharacter ?? "Unnamed Protagonist",
    location: overrides.location ?? "Urban City",
    visualStyle: overrides.visualStyle ?? "cinematic",
    aspectRatio: overrides.aspectRatio ?? "9:16",
    continuityRules: overrides.continuityRules ?? [
      "Keep character clothing consistent across scenes",
      "Maintain lighting direction within the same sequence",
      "Preserve spatial relationships between characters and environment",
    ],
  };
}

// ─── Build Mock Scenes ────────────────────────────────────────

export function buildMockScenes(count: number = 3): Scene[] {
  const templates: Omit<Scene, "id">[] = [
    {
      title: "Opening — The Discovery",
      description:
        "A young woman walks through a dimly lit alley. She notices a glowing object on the ground and picks it up. The object pulses with a faint blue light.",
      shotType: "Wide → Medium",
      cameraAngle: "Eye level, slow dolly in",
      mood: "Mysterious, quiet tension",
      dialogue: "What is this…?",
      durationSeconds: 6,
    },
    {
      title: "Rising Action — The Chase",
      description:
        "Shadowy figures appear at the end of the alley. She clutches the object and runs. The camera follows her through narrow streets, quick cuts between her face and pursuers.",
      shotType: "Medium → Close-up",
      cameraAngle: "Tracking shot, slight low angle",
      mood: "Urgent, adrenaline",
      dialogue: "I can't let them catch me!",
      durationSeconds: 8,
    },
    {
      title: "Climax — The Revelation",
      description:
        "She reaches a rooftop. Cornered, she holds the object high. It blazes with light, creating a shield. The pursuers stop, shielding their eyes. The cityscape glows behind her.",
      shotType: "Close-up → Extreme Wide",
      cameraAngle: "Low angle looking up, then crane out",
      mood: "Triumphant, awe",
      dialogue: "This power… it chose me.",
      durationSeconds: 7,
    },
  ];

  return templates.slice(0, count).map((t, i) => ({ ...t, id: i + 1 }));
}

// ─── Scene Summary for LLM Prompt ─────────────────────────────

export function scenesToPromptContext(scenes: Scene[]): string {
  return scenes
    .map(
      (s) =>
        `Scene ${s.id}: "${s.title}"\n` +
        `  Description: ${s.description}\n` +
        `  Shot: ${s.shotType} | Angle: ${s.cameraAngle}\n` +
        `  Mood: ${s.mood}\n` +
        `  Duration: ${s.durationSeconds}s` +
        (s.dialogue ? `\n  Dialogue: "${s.dialogue}"` : "")
    )
    .join("\n\n");
}
