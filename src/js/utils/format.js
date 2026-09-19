import { config } from '../config.js';
export function formatPrice(value, currency = config.currency) {
  return new Intl.NumberFormat(config.locale, { style: 'currency', currency }).format(value);
}
