/**
 * Story Project Store
 *
 * Handles saving and loading StoryProject JSON files to/from the
 * Toonflow OSS directory.
 * Projects are stored at: data/oss/story_projects/{projectId}/project.json
 * Accessible via: /oss/story_projects/{projectId}/project.json
 */

import u from "@/utils";
import { StoryProject } from "./types";

// ─── Save Project ──────────────────────────────────────────────

export async function saveProject(project: StoryProject): Promise<string> {
  const relPath = `story_projects/${project.id}/project.json`;
  const data = Buffer.from(JSON.stringify(project, null, 2), "utf-8");

  await u.oss.writeFile(relPath, data);

  const url = await u.oss.getFileUrl(relPath);
  console.log(`[ProjectStore] Saved project: ${project.id} → ${relPath} (url: ${url})`);
  return relPath;
}

// ─── Load Project ──────────────────────────────────────────────

export async function loadProject(projectId: string): Promise<StoryProject | null> {
  const relPath = `story_projects/${projectId}/project.json`;

  try {
    const buffer = await u.oss.getFile(relPath);
    return JSON.parse(buffer.toString("utf-8")) as StoryProject;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ProjectStore] Failed to load project ${projectId}: ${msg}`);
    return null;
  }
}

// ─── Get Project URL ──────────────────────────────────────────

export async function getProjectUrl(projectId: string): Promise<string> {
  return u.oss.getFileUrl(`story_projects/${projectId}/project.json`);
}
