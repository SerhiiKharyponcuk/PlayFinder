import { showSetupState } from '../components/page-state.js';
export function init() {
  showSetupState('popularGames', ['popularLoading']);
  showSetupState('newReleaseGames', ['newReleasesLoading']);
  showSetupState('bestDeals', ['dealsLoading']);
  // TODO: gamesService.getGames → клонувати #gameCardTemplate / #dealTemplate.
  // Заповнюй текст через textContent, зображення через src, посилання через href.
}
