// Compatibility bridge: re-export the modular API from ./api
// This avoids duplicate implementations and ensures helpers like rawFileUrl exist.
export * from './api/index.js';
