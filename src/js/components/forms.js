export function initForms() {
  for (const id of ['newsletterForm', 'priceAlertForm']) {
    const form = document.getElementById(id);
    form?.addEventListener('submit', event => {
      event.preventDefault();
      let message = form.querySelector('[role="status"]');
      if (!message) {
        message = document.createElement('p');
        message.setAttribute('role', 'status');
        form.append(message);
      }
      message.textContent = 'Функція стане доступною після підключення сервісу сповіщень.';
    });
  }
}
