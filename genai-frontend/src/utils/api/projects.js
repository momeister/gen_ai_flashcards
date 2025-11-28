// Projects API - CRUD operations for projects

import { request } from './base.js';

export const projectsAPI = {
  /**
   * Get all projects
   * @returns {Promise<Array>} List of projects
   */
  getAll: () => request('/projects'),

  /**
   * Get a single project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object>} Project details
   */
  getById: (id) => request(`/projects/${id}`),

  /**
   * Create a new project
   * @param {Object} project - { title: string, description?: string }
   * @returns {Promise<Object>} Created project
   */
  create: (project) => request('/projects', { 
    method: 'POST', 
    body: JSON.stringify(project) 
  }),

  /**
   * Update project details
   * @param {string} id - Project ID
   * @param {Object} updates - { title?: string, description?: string }
   * @returns {Promise<Object>} Updated project
   */
  update: (id, updates) => request(`/projects/${id}`, { 
    method: 'PATCH', 
    body: JSON.stringify(updates) 
  }),

  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {Promise<Object>} Delete confirmation
   */
  delete: (id) => request(`/projects/${id}`, { 
    method: 'DELETE' 
  }),
};
