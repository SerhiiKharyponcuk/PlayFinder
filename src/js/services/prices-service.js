// Єдине джерело цін зараз CheapShark. Firebase не є другим магазином.
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { config } from '../config.js';

/** Відмова одного джерела не прибирає пропозиції іншого. errors не приховуються. */
export async function getOffers(game, options = {}, providers = [cheapsharkProvider]) {
  const { currency = config.currency, region, edition, signal } = options;
  const active = providers.filter(provider => provider.enabled);
  const results = await Promise.allSettled(active.map(provider =>
    Promise.resolve().then(() => provider.getOffers(game, { currency, region, edition, signal }))
      .then(offers => {
        if (!Array.isArray(offers)) throw new TypeError('Адаптер має повертати Offer[]');
        return offers;
      }),
  ));
  signal?.throwIfAborted();
  const offers = [];
  const errors = [];
  results.forEach((result, index) => {
    const provider = active[index].id;
    if (result.status === 'rejected') { errors.push({ provider, error: result.reason }); return; }
    for (const offer of result.value) {
      if (!offer || offer.gameId !== game.id || !Number.isFinite(offer.price) || offer.price < 0) continue;
      if (offer.currency !== currency || (region && region !== 'all' && offer.region !== region) || (edition && offer.edition !== edition)) continue;
      offers.push({ ...offer, provider });
    }
  });
  offers.sort((a, b) => a.price - b.price);
  return { offers, errors, configured: active.length > 0 };
}
