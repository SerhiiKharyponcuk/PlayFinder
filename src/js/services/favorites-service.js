import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore/lite';
import { getFirebase } from '../api/firebase/client.js';
import { authService } from './auth-service.js';

/** Шлях users/{uid}/favorites/{rawgId}. Доступ власника забезпечують firestore.rules.
 * Зберігаємо лише RAWG ID, а не копію каталогу чи паролі.
 */
async function favoritesCollection() {
  const user = await authService.requireUser();
  return collection(getFirebase().db, 'users', user.uid, 'favorites');
}
export const favoritesService = {
  async listIds() {
    const snapshot = await getDocs(await favoritesCollection());
    return snapshot.docs.map(item => item.id);
  },
  async add(id) {
    if (!/^\d+$/.test(String(id))) throw new Error('Потрібен числовий RAWG ID.');
    await setDoc(doc(await favoritesCollection(), String(id)), { rawgId: String(id), savedAt: serverTimestamp() });
  },
  async remove(id) { await deleteDoc(doc(await favoritesCollection(), String(id))); },
};
