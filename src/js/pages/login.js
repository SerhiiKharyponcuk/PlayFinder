import { authService } from '../services/auth-service.js';
import { isFirebaseConfigured } from '../api/firebase/client.js';

export function init() {
  const form = document.getElementById('authForm');
  const status = document.getElementById('authStatus');
  const logout = document.getElementById('logoutButton');
  if (!isFirebaseConfigured()) {
    status.textContent = 'Вхід стане доступним після заповнення VITE_FIREBASE_*.';
    form.querySelector('fieldset').disabled = true; return;
  }
  authService.subscribe(user => {
    status.textContent = user ? 'Ви увійшли: ' + user.email : 'Введи email і пароль.';
    form.hidden = Boolean(user); logout.hidden = !user;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const action = event.submitter?.value === 'register' ? 'register' : 'login';
    const fieldset = form.querySelector('fieldset'); fieldset.disabled = true;
    try { await authService[action](email, password); form.reset(); }
    catch (error) { status.textContent = 'Не вдалося виконати вхід/реєстрацію: ' + error.code; }
    finally { fieldset.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await authService.logout(); }
    catch { status.textContent = 'Не вдалося вийти. Спробуй ще раз.'; }
    finally { logout.disabled = false; }
  });
}
