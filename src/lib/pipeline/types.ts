/**
 * Storyboard Transition Pipeline — Type Definitions
 * Toonflow Stage 1: Story Bible + Scene Model + Transition Director
 */

// ─── Story Bible ───────────────────────────────────────────────

export interface StoryBible {
  title: string;
  genre: string;
  tone: string;
  mainCharacter: string;
  location: string;
  visualStyle: string;
  aspectRatio: `${number}:${number}`;
  continuityRules: string[];
}

// ─── Scene ─────────────────────────────────────────────────────

export interface Scene {
  id: number;
  title: string;
  description: string;
  shotType: string;
  cameraAngle: string;
  mood: string;
  dialogue?: string;
  durationSeconds: number;
}

// ─── Transition Plan ───────────────────────────────────────────

export interface TransitionPlan {
  fromSceneId: number;
  toSceneId: number;
  transitionPrompt: string;
  duration: number;
  cameraMotion: string;
  subjectMotion: string;
  environmentMotion: string;
  continuityNotes: string;
  negativePrompt: string;
}

// ─── Story Project ─────────────────────────────────────────────

export type ProjectStatus =
  | "bible_created"
  | "scenes_created"
  | "transitions_done"
  | "error";

export interface StoryProject {
  id: string;
  title: string;
  bible: StoryBible;
  scenes: Scene[];
  transitions: TransitionPlan[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Pipeline Result ───────────────────────────────────────────

export interface PipelineResult {
  ok: boolean;
  projectId?: string;
  projectPath?: string;
  transitionCount?: number;
  error?: string;
}
