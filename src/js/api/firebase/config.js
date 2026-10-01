import { config } from '../../config.js';

// Легка перевірка без завантаження Firebase SDK (Auth + Firestore).
export function isFirebaseConfigured() {
  return Object.values(config.firebase).every(Boolean);
}
