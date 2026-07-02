// LocalStorage utilities for Tom's SlideCraft
// All keys prefixed with "slidecraft:"

export interface Project {
  id: string;
  name: string;
  markdown: string;
  updatedAt: string; // ISO 8601
  parentProjectId?: string; // set for (EN) projects
}

export interface JpScriptCache {
  projectId: string;
  sourceUpdatedAt: string; // project updatedAt at generation time
  jpScriptUpdatedAt: string; // last manual edit time
  script: string;
}

export interface EnScriptCache {
  projectId: string;
  sourceJpScriptUpdatedAt: string; // jpScriptUpdatedAt from JpScriptCache
  script: string;
}

const KEYS = {
  projects: "slidecraft:projects",
  project: (id: string) => `slidecraft:project:${id}`,
  scriptJp: (id: string) => `slidecraft:script:jp:${id}`,
  scriptEn: (id: string) => `slidecraft:script:en:${id}`,
  governanceAccepted: "slidecraft:governance_accepted",
} as const;

// Storage size helpers
export function getStorageUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? "";
    const value = localStorage.getItem(key) ?? "";
    total += key.length + value.length;
  }
  return total * 2; // UTF-16 = 2 bytes per char
}

const WARN_BYTES = 4 * 1024 * 1024; // 4MB
const LIMIT_BYTES = 5 * 1024 * 1024; // 5MB

export function checkStorageCapacity(): "ok" | "warn" | "full" {
  const used = getStorageUsageBytes();
  if (used >= LIMIT_BYTES) return "full";
  if (used >= WARN_BYTES) return "warn";
  return "ok";
}

// Projects
export function getProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.projects);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | null {
  try {
    const raw = localStorage.getItem(KEYS.project(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllProjects(): Project[] {
  const ids = getProjectIds();
  return ids
    .map((id) => getProject(id))
    .filter((p): p is Project => p !== null)
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

export function saveProject(project: Project): void {
  const ids = getProjectIds();
  if (!ids.includes(project.id)) {
    ids.push(project.id);
    localStorage.setItem(KEYS.projects, JSON.stringify(ids));
  }
  localStorage.setItem(KEYS.project(project.id), JSON.stringify(project));
}

export function deleteProject(id: string): void {
  const ids = getProjectIds().filter((i) => i !== id);
  localStorage.setItem(KEYS.projects, JSON.stringify(ids));
  localStorage.removeItem(KEYS.project(id));
  localStorage.removeItem(KEYS.scriptJp(id));
  localStorage.removeItem(KEYS.scriptEn(id));
}

export function renameProject(id: string, name: string): void {
  const project = getProject(id);
  if (project) {
    saveProject({ ...project, name, updatedAt: new Date().toISOString() });
  }
}

// Script caches
export function getJpScriptCache(id: string): JpScriptCache | null {
  try {
    const raw = localStorage.getItem(KEYS.scriptJp(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveJpScriptCache(cache: JpScriptCache): void {
  localStorage.setItem(KEYS.scriptJp(cache.projectId), JSON.stringify(cache));
}

export function getEnScriptCache(id: string): EnScriptCache | null {
  try {
    const raw = localStorage.getItem(KEYS.scriptEn(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveEnScriptCache(cache: EnScriptCache): void {
  localStorage.setItem(KEYS.scriptEn(cache.projectId), JSON.stringify(cache));
}

// Governance banner
export function isGovernanceAccepted(): boolean {
  return localStorage.getItem(KEYS.governanceAccepted) === "true";
}

export function acceptGovernance(): void {
  localStorage.setItem(KEYS.governanceAccepted, "true");
}

// Extract project name from markdown (first # heading)
export function extractProjectName(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "新規プレゼン";
}

// Default Marp frontmatter
export const DEFAULT_FRONTMATTER = `---
marp: true
theme: toms-slidecraft
style: |
  section {
    font-family: 'Yu Gothic', 'YuGothic', 'Hiragino Sans', sans-serif;
  }
---

`;
