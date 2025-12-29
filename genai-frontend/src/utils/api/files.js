// Files & Upload API - File upload, retrieval, and extraction

import { BASE_URL, APIError } from './base.js';

export const uploadsAPI = {
  /**
   * Upload files to a project
   * @param {string} projectId - Project ID
   * @param {Array<File>} files - Array of File objects
   * @param {Object} options - Upload options { provider, openaiApiKey, category }
   * @returns {Promise<Array>} Array of upload results with file metadata and processed data
   */
  upload: async (projectId, files, options = {}) => {
    const { provider = 'lmstudio', openaiApiKey = '', category = 'lecture_notes' } = options;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('provider', provider);
    queryParams.append('category', category);
    if (provider === 'openai' && openaiApiKey) {
      queryParams.append('openai_api_key', openaiApiKey);
    }
    
    const response = await fetch(`${BASE_URL}/projects/${projectId}/files?${queryParams.toString()}`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData – browser sets it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.detail || error.message || 'Upload failed', response.status, error);
    }

    return response.json();
  },
  
  /**
   * Get all files for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} List of files with metadata
   */
  getFiles: (projectId) => {
    const url = `${BASE_URL}/projects/${projectId}/files`;
    return fetch(url).then(r => r.ok ? r.json() : Promise.reject(new APIError('Failed to fetch files', r.status, null)));
  },

  /**
   * Delete a file from a project
   * @param {string} projectId - Project ID
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} Delete confirmation
   */
  deleteFile: (projectId, fileId) => {
    const url = `${BASE_URL}/projects/${projectId}/files/${fileId}`;
    return fetch(url, { method: 'DELETE' }).then(r => r.ok ? r.json() : Promise.reject(new APIError('Failed to delete file', r.status, null)));
  },

  /**
   * Get raw file URL (for viewing/downloading)
   * @param {string} fileId - File ID
   * @returns {string} URL to raw file
   */
  rawFileUrl: (fileId) => `${BASE_URL}/files/${fileId}`,

  /**
   * Get extracted content (JSON or Markdown)
   * @param {string} fileId - File ID
   * @param {string} format - 'json' or 'md' (default: 'json')
   * @returns {Promise<Object|string>} Extracted content
   */
  getExtracted: async (fileId, format = 'json') => {
    const res = await fetch(`${BASE_URL}/files/${fileId}/extracted?format=${format}`);
    if (!res.ok) throw new APIError('Extraktion nicht gefunden', res.status, null);
    if (format === 'md') return res.text();
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return txt; }
  }
};
