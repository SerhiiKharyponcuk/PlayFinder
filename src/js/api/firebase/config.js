import { config } from '../../config.js';

export function isFirebaseConfigured() {
  return Object.values(config.firebase).every(Boolean);
}
