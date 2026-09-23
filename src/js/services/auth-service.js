import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirebase } from '../api/firebase/client.js';

// У Firebase Console увімкни Authentication → Email/Password.
// Паролі передаємо тільки Firebase Auth; ніколи не записуємо у Firestore/localStorage.
export const authService = {
  register: (email, password) => createUserWithEmailAndPassword(getFirebase().auth, email, password),
  login: (email, password) => signInWithEmailAndPassword(getFirebase().auth, email, password),
  logout: () => signOut(getFirebase().auth),
  subscribe: callback => onAuthStateChanged(getFirebase().auth, callback),
  async requireUser() {
    const { auth } = getFirebase();
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Спочатку увійди на сторінці «Увійти».');
    return auth.currentUser;
  },
};
