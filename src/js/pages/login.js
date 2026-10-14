import { authService } from '../services/auth-service.js';
import { isFirebaseConfigured } from '../api/firebase/client.js';

const authErrors = {
  'auth/invalid-credential': 'Невірний email або пароль. Перевір дані та спробуй ще раз.',
  'auth/wrong-password': 'Невірний email або пароль. Перевір дані та спробуй ще раз.',
  'auth/user-not-found': 'Невірний email або пароль. Перевір дані та спробуй ще раз.',
  'auth/invalid-email': 'Перевір адресу email.',
  'auth/email-already-in-use': 'Цей email уже зареєстрований. Перейди на вкладку «Вхід».',
  'auth/weak-password': 'Пароль має містити щонайменше 6 символів.',
  'auth/password-does-not-meet-requirements': 'Цей пароль не відповідає вимогам. Спробуй довший пароль із великими й малими літерами, цифрами та символами.',
  'auth/too-many-requests': 'Забагато спроб. Зачекай трохи та спробуй знову.',
  'auth/network-request-failed': 'Немає зв’язку із сервером. Перевір інтернет і спробуй ще раз.',
  'auth/user-disabled': 'Цей акаунт тимчасово недоступний.',
  'auth/operation-not-allowed': 'Вхід тимчасово недоступний. Спробуй пізніше.',
};

export function init({ root = document, auth = authService, configured = isFirebaseConfigured() } = {}) {
  const form = root.getElementById('authForm');
  const fields = form.querySelector('fieldset');
  const status = root.getElementById('authStatus');
  const tabs = root.getElementById('authTabs');
  const tabButtons = [...tabs.querySelectorAll('[role="tab"]')];
  const panel = root.getElementById('authPanel');
  const summary = root.getElementById('accountSummary');
  const logout = root.getElementById('logoutButton');
  const submit = root.getElementById('authSubmitButton');
  const submitLabel = root.getElementById('authSubmitLabel');
  const password = form.elements.password;
  const visibility = root.getElementById('togglePassword');
  let mode = 'login';
  let ready = false;
  let busy = false;
  let user = null;

  function message(text, state = 'info') {
    status.textContent = text;
    status.dataset.state = state;
  }

  function controls() {
    fields.disabled = !ready || busy || Boolean(user);
    form.setAttribute('aria-busy', String(busy));
    tabButtons.forEach(button => { button.disabled = busy; });
    logout.disabled = busy;
    submitLabel.textContent = busy ? (mode === 'register' ? 'Створюємо акаунт…' : 'Входимо…') :
      mode === 'register' ? 'Створити акаунт' : 'Увійти';
  }

  function setMode(nextMode) {
    mode = nextMode;
    const registering = mode === 'register';
    root.getElementById('authTitle').textContent = registering ? 'Створи свій акаунт' : 'Раді бачити знову';
    root.getElementById('authDescription').textContent = registering ?
      'Зареєструйся, щоб зберігати ігри у своєму списку.' : 'Увійди, щоб повернутися до свого обраного.';
    root.getElementById('authLegend').textContent = registering ? 'Реєстрація акаунта' : 'Вхід в акаунт';
    root.getElementById('passwordHint').textContent = registering ? 'Щонайменше 6 символів. Використай унікальний пароль.' : 'Використай пароль свого акаунта.';
    password.autocomplete = registering ? 'new-password' : 'current-password';
    submit.value = mode;
    tabButtons.forEach((button, index) => {
      const selected = index === (registering ? 1 : 0);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', button.id);
    });
    if (ready) message(registering ? 'Вкажи email та придумай пароль.' : 'Введи email і пароль свого акаунта.');
    controls();
  }

  function hidePassword() {
    password.type = 'password';
    visibility.setAttribute('aria-pressed', 'false');
    visibility.setAttribute('aria-label', 'Показати пароль');
    visibility.querySelector('i').className = 'fa-regular fa-eye';
  }

  tabs.addEventListener('click', event => {
    const button = event.target.closest('[role="tab"]');
    if (!button || busy) return;
    setMode(button === tabButtons[1] ? 'register' : 'login');
  });
  tabs.addEventListener('keydown', event => {
    if (busy || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : mode === 'login' ? 1 : 0;
    setMode(index ? 'register' : 'login');
    tabButtons[index].focus();
  });
  visibility.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    visibility.setAttribute('aria-pressed', String(visible));
    visibility.setAttribute('aria-label', visible ? 'Приховати пароль' : 'Показати пароль');
    visibility.querySelector('i').className = visible ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  });

  controls();
  if (!configured) {
    message('Вхід тимчасово недоступний. Переглядати ігри можна без акаунта.', 'error');
    return;
  }

  function onUser(nextUser) {
    ready = true;
    user = nextUser;
    tabs.hidden = panel.hidden = Boolean(user);
    summary.hidden = logout.hidden = !user;
    root.getElementById('accountEmail').textContent = user?.email || '';
    if (user) {
      root.getElementById('authTitle').textContent = 'Твій акаунт';
      root.getElementById('authDescription').textContent = 'Усе готово. Переходь до своїх збережених ігор.';
      message('Вхід виконано. Обране зберігається у твоєму акаунті.', 'success');
      form.reset();
      hidePassword();
    } else {
      setMode(mode);
    }
    controls();
  }

  const onAuthError = () => {
    ready = false;
    message('Не вдалося перевірити вхід. Онови сторінку та спробуй ще раз.', 'error');
    controls();
  };
  try {
    const unsubscribe = auth.subscribe(onUser, onAuthError);
    root.defaultView?.addEventListener('pagehide', event => {
      if (!event.persisted) unsubscribe?.();
    }, { once: true });
  } catch {
    onAuthError();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || busy || user || !form.reportValidity()) return;
    busy = true;
    controls();
    message(mode === 'register' ? 'Створюємо твій акаунт…' : 'Входимо у твій акаунт…', 'loading');
    try {
      await auth[mode](form.elements.email.value.trim(), password.value);
      form.reset();
      hidePassword();
    } catch (error) {
      message(authErrors[error.code] || 'Не вдалося виконати запит. Спробуй ще раз трохи пізніше.', 'error');
    } finally {
      busy = false;
      controls();
    }
  });
  logout.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    controls();
    message('Виходимо з акаунта…', 'loading');
    try {
      await auth.logout();
    } catch {
      message('Не вдалося вийти. Перевір інтернет і спробуй ще раз.', 'error');
    } finally {
      busy = false;
      controls();
    }
  });
}
