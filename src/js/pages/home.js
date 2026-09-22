import { showSetupState } from '../components/page-state.js';
import Handlebars from 'handlebars';
export function init() {
  showSetupState('popularGames', ['popularLoading']);
  showSetupState('newReleaseGames', ['newReleasesLoading']);
  showSetupState('bestDeals', ['dealsLoading']);
  // TODO: gamesService.getGames → клонувати #gameCardTemplate / #dealTemplate.
  // Заповнюй текст через textContent, зображення через src, посилання через href.
}

const gameCardTemplate = document.querySelector('#gameCardTemplate');
const dealTemplate = document.querySelector('#dealTemplate');
const template = Handlebars.compile(gameCardTemplate.innerHTML);
const murkup = template({
  title: 'Game Title',
  id: '009088',
  image: 'https://via.placeholder.com/300x400',
  patforms: ['PC', 'PS5', 'XBOX'],
  providerIds: {
    catalog: '009088',
    pricesPrimary: '009088',
    pricesSecondary: '009088',
  },
 

});
document.querySelector('#popularGames').innerHTML = murkup;
document.querySelector('#newReleaseGames').innerHTML = murkup;
document.querySelector('#bestDeals').innerHTML = murkup;