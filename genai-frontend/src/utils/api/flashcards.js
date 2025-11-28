// Flashcards API - CRUD and level management for flashcards

import { request } from './base.js';

export const flashcardsAPI = {
  /**
   * Get all flashcards for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} List of flashcards
   */
  getByProject: (projectId) => request(`/projects/${projectId}/flashcards`),

  /**
   * Create a new flashcard
   * @param {string} projectId - Project ID
   * @param {Object} card - { question: string, answer: string, level?: number }
   * @returns {Promise<Object>} Created flashcard
   */
  create: (projectId, card) => request(`/projects/${projectId}/flashcards`, { 
    method: 'POST', 
    body: JSON.stringify(card) 
  }),

  /**
   * Update flashcard fields (question, answer, level, important, review_count)
   * @param {string} projectId - Project ID
   * @param {string} cardId - Flashcard ID
   * @param {Object} updates - Partial update object
   * @returns {Promise<Object>} Updated flashcard
   */
  update: (projectId, cardId, updates) => {
    console.log('[API] PATCH flashcard:', { projectId, cardId, updates });
    return request(`/projects/${projectId}/flashcards/${cardId}`, { 
      method: 'PATCH', 
      body: JSON.stringify(updates) 
    });
  },

  /**
   * Delete a flashcard
   * @param {string} projectId - Project ID
   * @param {string} cardId - Flashcard ID
   * @returns {Promise<Object>} Delete confirmation
   */
  delete: (projectId, cardId) => request(`/projects/${projectId}/flashcards/${cardId}`, { 
    method: 'DELETE' 
  }),

  /**
   * Update flashcard level (shortcut endpoint, auto-increments review_count)
   * @param {string} projectId - Project ID
   * @param {string} cardId - Flashcard ID
   * @param {number} level - New level (0=neu, 1=nicht_sicher, 2=kann_ich)
   * @returns {Promise<Object>} Updated flashcard
   */
  updateLevel: (projectId, cardId, level) => request(`/projects/${projectId}/flashcards/${cardId}/level`, { 
    method: 'POST', 
    body: JSON.stringify({ level }) 
  }),
};
