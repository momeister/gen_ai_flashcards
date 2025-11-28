// Base API configuration and utilities

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function request(endpoint, options = {}) {
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
    
    // Try to parse JSON, but handle empty responses
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const message = data?.detail || data?.message || `HTTP ${response.status}`;
      throw new APIError(message, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(error.message, 0, null);
  }
}
