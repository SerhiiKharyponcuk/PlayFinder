import { createMenuAnimation } from '../animations/menu-animation.js';

export function initNavigation() {
  const button = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!button || !menu) return;
  const animation = createMenuAnimation(menu);
  const setOpen = open => {
    animation.stop();
    menu.hidden = !open;
    menu.classList.toggle('mobile-menu--open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open) animation.play();
  };
  button.addEventListener('click', () => setOpen(menu.hidden));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { setOpen(false); button.focus(); }
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
}
