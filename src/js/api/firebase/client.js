import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';
import { config } from '../../config.js';

// Немає конфігу → не ініціалізуємо Firebase й не ламаємо каталог.
export function isFirebaseConfigured() {
  return Object.values(config.firebase).every(Boolean);
}
export function getFirebase() {
  if (!isFirebaseConfigured()) throw new Error('Заповни чотири VITE_FIREBASE_* поля з .env.example.');
  const app = getApps().length ? getApp() : initializeApp(config.firebase);
  return { auth: getAuth(app), db: getFirestore(app) };
}
