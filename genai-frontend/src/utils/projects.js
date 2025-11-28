// Simple localStorage-backed projects store
// Project shape: { id: string, name: string, createdAt: number, updatedAt: number, accentHue?: number, pinned?: boolean, order?: number,
//   files?: Array<{id:string,name:string,type:string,size:number, previewUrl?: string, highlights?: any[]}>, flashcards: Flashcard[] }

const KEY = 'projects';

export function getProjects() {
  const raw = localStorage.getItem(KEY);
  let projects = [];
  try { projects = raw ? JSON.parse(raw) : []; } catch { projects = []; }
  // migration: move old single 'flashcards' into a default project
  if (projects.length === 0) {
    const old = localStorage.getItem('flashcards');
    if (old) {
      const fc = JSON.parse(old);
      // Avoid recursion by creating and saving the default project directly here
      const now = Date.now();
      const p = {
        id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${now}-${Math.random().toString(16).slice(2)}`,
        name: 'Mein erstes Projekt',
        createdAt: now,
        updatedAt: now,
        accentHue: 200,
        files: [],
        flashcards: fc,
      };
      projects = [p];
      saveProjects(projects);
      localStorage.removeItem('flashcards');
    }
  }
  return projects;
}

export function saveProjects(projects) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function createProject(name, accentHue = 200) {
  const all = getProjects();
  const p = { id: crypto.randomUUID(), name, createdAt: Date.now(), updatedAt: Date.now(), accentHue, pinned: false, order: all.length, files: [], flashcards: [] };
  all.push(p);
  saveProjects(all);
  return p;
}

export function getProjectById(id) {
  return getProjects().find(p => p.id === id) || null;
}

export function saveProject(project) {
  const all = getProjects().map(p => p.id === project.id ? { ...project, updatedAt: Date.now() } : p);
  saveProjects(all);
}

export function addFilesToProject(projectId, files) {
  const p = getProjectById(projectId);
  if (!p) return;
  const mapped = files.map(f => ({ id: crypto.randomUUID(), name: f.name, type: f.type, size: f.size, previewUrl: URL.createObjectURL(f), highlights: [] }));
  p.files = [...(p.files||[]), ...mapped];
  saveProject(p);
}

export function upsertFlashcards(projectId, updater) {
  const p = getProjectById(projectId);
  if (!p) return;
  p.flashcards = updater(p.flashcards || []);
  saveProject(p);
}

// New helpers: delete, reorder, pin, update highlights
export function deleteProject(id) {
  const remaining = getProjects().filter(p => p.id !== id);
  // reassign order
  remaining.forEach((p, i) => p.order = i);
  saveProjects(remaining);
}

export function setProjectPinned(id, pinned) {
  const all = getProjects().map(p => p.id === id ? { ...p, pinned, updatedAt: Date.now() } : p);
  saveProjects(all);
}

export function moveProject(id, direction) {
  const all = getProjects();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;
  const tmp = all[idx];
  all[idx] = all[swapIdx];
  all[swapIdx] = tmp;
  // update order
  all.forEach((p, i) => p.order = i);
  saveProjects(all);
}

export function updateFileHighlights(projectId, fileId, highlights) {
  const p = getProjectById(projectId);
  if (!p) return;
  p.files = (p.files||[]).map(f => f.id === fileId ? { ...f, highlights } : f);
  saveProject(p);
}
