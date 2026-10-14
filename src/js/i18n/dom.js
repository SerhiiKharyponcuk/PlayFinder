import { LANGUAGE_KEY, getLanguage, getLocale, setLanguage, onLanguageChange,
  translateText, translationRecord, formatMoney, formatDate } from './core.js';

const controllers = new WeakMap();
const selector = '[data-i18n], [data-i18n-attrs], [data-i18n-price], [data-i18n-date], [data-i18n-number], [data-i18n-checked]';

export function initI18n(root = document) {
  if (controllers.has(root)) return controllers.get(root);
  const textRecords = new WeakMap(), attributeRecords = new WeakMap();

  function translate(element) {
    // Міняємо тільки текст. Іконки, посилання й обробники кнопок залишаються.
    if (element.hasAttribute('data-i18n')) {
      const nodes = [...element.childNodes].filter(node => node.nodeType === 3);
      const words = nodes.filter(node => node.data.trim());
      for (const node of nodes) {
        const single = words.length === 1 && node === words[0];
        const record = translationRecord(node.data, textRecords.get(node), single ? element.dataset.i18n : '');
        record.translated = translateText(record.source);
        textRecords.set(node, record);
        if (node.data !== record.translated) node.data = record.translated;
        if (single && element.dataset.i18n !== record.source.trim()) element.dataset.i18n = record.source.trim();
      }
    }

    const records = attributeRecords.get(element) || new Map();
    for (const name of (element.dataset.i18nAttrs || '').split(',').filter(Boolean)) {
      const value = element.getAttribute(name);
      if (value === null) continue;
      const original = 'data-i18n-original-' + name;
      const record = translationRecord(value, records.get(name), element.getAttribute(original) || '');
      record.translated = translateText(record.source);
      records.set(name, record);
      if (element.getAttribute(original) !== record.source) element.setAttribute(original, record.source);
      if (value !== record.translated) element.setAttribute(name, record.translated);
    }
    attributeRecords.set(element, records);

    // Для цін і дат є початкове число або дата, а не готовий рядок перекладу.
    let formatted;
    if (element.dataset.i18nPrice?.trim()) {
      const price = Number(element.dataset.i18nPrice);
      if (Number.isFinite(price)) formatted = formatMoney(price, element.dataset.currency || 'USD');
    } else if (element.dataset.i18nNumber?.trim()) {
      const number = Number(element.dataset.i18nNumber);
      if (Number.isFinite(number)) formatted = new Intl.NumberFormat(getLocale()).format(number);
    } else if (element.dataset.i18nDate?.trim()) {
      formatted = formatDate(element.dataset.i18nDate);
    }
    if (formatted && element.textContent !== formatted) element.textContent = formatted;
    if (element.dataset.i18nChecked?.trim()) {
      const checked = Number(element.dataset.i18nChecked);
      if (Number.isFinite(checked)) {
        const label = translateText('Перевірено:') + ' ' + formatDate(checked, { time: true });
        if (element.title !== label) element.title = label;
      }
    }
  }

  function scan(scope) {
    if (scope.matches?.(selector)) translate(scope);
    scope.querySelectorAll?.(selector).forEach(translate);
  }
  function refresh() {
    root.documentElement.lang = getLanguage();
    root.querySelectorAll('[data-language-switch]').forEach(select => { select.value = getLanguage(); });
    scan(root);
  }
  refresh();
  onLanguageChange(refresh);
  root.addEventListener('change', event => {
    if (event.target.matches('[data-language-switch]')) setLanguage(event.target.value);
  });
  root.defaultView?.addEventListener('storage', event => {
    if (event.key === LANGUAGE_KEY) setLanguage(event.newValue, { persist: false });
  });

  // Нові картки та повідомлення теж треба перекладати після їх завантаження.
  // Спостерігач обробляє тільки позначені елементи, а не весь сайт щоразу.
  const observer = new MutationObserver(changes => {
    const elements = new Set();
    for (const change of changes) {
      const element = change.target.nodeType === 3 ? change.target.parentElement : change.target;
      if (element.matches?.(selector)) elements.add(element);
      if (change.type === 'childList') change.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
    }
    elements.forEach(translate);
  });
  observer.observe(root.documentElement, { subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['data-i18n', 'data-i18n-attrs', 'aria-label', 'title', 'placeholder', 'alt', 'content',
      'data-i18n-price', 'data-i18n-date', 'data-i18n-number', 'data-i18n-checked'] });
  controllers.set(root, refresh);
  return refresh;
}
