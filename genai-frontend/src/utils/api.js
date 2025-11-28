// API Service Layer – Theoretical backend integration
// Replace BASE_URL with your actual API endpoint

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';



class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.message || 'API Error', response.status, data);
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(error.message, 0, null);
  }
}

// Projects
export const projectsAPI = {
  getAll: () => request('/projects'),
  getById: (id) => request(`/projects/${id}`),
  create: (project) => request('/projects', { method: 'POST', body: JSON.stringify(project) }),
  update: (id, updates) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};

// Flashcards
export const flashcardsAPI = {
  getByProject: (projectId) => request(`/projects/${projectId}/flashcards`),
  create: (projectId, card) => request(`/projects/${projectId}/flashcards`, { method: 'POST', body: JSON.stringify(card) }),
  update: (projectId, cardId, updates) => request(`/projects/${projectId}/flashcards/${cardId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  delete: (projectId, cardId) => request(`/projects/${projectId}/flashcards/${cardId}`, { method: 'DELETE' }),
  updateLevel: (projectId, cardId, level) => request(`/projects/${projectId}/flashcards/${cardId}/level`, { method: 'POST', body: JSON.stringify({ level }) }),
};

// File Uploads
export const uploadsAPI = {
  upload: async (projectId, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${BASE_URL}/projects/${projectId}/files`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData – browser sets it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.message || 'Upload failed', response.status, error);
    }

    return response.json();
  },
  
  getFiles: (projectId) => request(`/projects/${projectId}/files`),
  deleteFile: (projectId, fileId) => request(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' }),
};

// Sync helper – merges local storage with server
export async function syncProjects(localProjects) {
  try {
    const serverProjects = await projectsAPI.getAll();
    // Merge logic: server wins for conflicts, local-only projects get uploaded
    const merged = [...serverProjects];
    
    for (const local of localProjects) {
      const exists = serverProjects.find(s => s.id === local.id);
      if (!exists) {
        // Upload local-only project
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

// Mock mode toggle (for development without backend)
export const MOCK_MODE = false; // Set to false when backend is ready

export function mockAPI(fn, mockData, delay = 300) {
  if (!MOCK_MODE) return fn();
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockData), delay);
  });
}
