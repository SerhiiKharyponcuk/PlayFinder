const env = import.meta.env ?? {};
export const config = Object.freeze({
  locale: 'uk-UA',
  currency: 'EUR',
  pageSize: 12,
  requestTimeout: 10000,
  api: {
    catalog: env.VITE_CATALOG_API_URL || '/api/catalog',
    pricesPrimary: env.VITE_PRICES_PRIMARY_API_URL || '/api/prices-primary',
    pricesSecondary: env.VITE_PRICES_SECONDARY_API_URL || '/api/prices-secondary',
  },
});
