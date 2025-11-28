// API Entry Point - Re-exports all API modules

export { BASE_URL, APIError, request } from './base.js';
export { projectsAPI } from './projects.js';
export { flashcardsAPI } from './flashcards.js';
export { uploadsAPI } from './files.js';

// Legacy compatibility - keep MOCK_MODE exports
export const MOCK_MODE = false;
export function mockAPI(fn, mockData, delay = 300) {
  if (!MOCK_MODE) return fn();
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockData), delay);
  });
}

// Sync helper (legacy)
export async function syncProjects(localProjects) {
  try {
    const { projectsAPI } = await import('./projects.js');
    const serverProjects = await projectsAPI.getAll();
    const merged = [...serverProjects];
    
    for (const local of localProjects) {
      const exists = serverProjects.find(s => s.id === local.id);
      if (!exists) {
        const uploaded = await projectsAPI.create(local);
        merged.push(uploaded);
      }
    }
    
    return merged;
  } catch (error) {
    console.warn('Sync failed, using local data:', error);
    return localProjects;
  }
}
