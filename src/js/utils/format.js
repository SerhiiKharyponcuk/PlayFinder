import { config } from '../config.js';
import { formatMoney } from '../i18n/core.js';
export function formatPrice(value, currency = config.currency) {
  return formatMoney(value, currency);
}
