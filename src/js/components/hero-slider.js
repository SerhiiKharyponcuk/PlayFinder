import { gsap } from 'gsap';
import { createHeroSliderState, heroSwipeDirection } from './hero-slider-state.js';

const controllers = new WeakMap();

export function initHeroSlider(root = document.querySelector('[data-hero-slider]')) {
  if (!root || controllers.has(root)) return controllers.get(root);
  const slides = [...root.querySelectorAll('[data-hero-slide]')];
  if (slides.length < 2) return;
  const controls = root.querySelector('[data-hero-controls]');
  const dots = [...root.querySelectorAll('[data-hero-dot]')];
  const toggle = root.querySelector('[data-hero-toggle]');
  const status = root.querySelector('[data-hero-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const { signal } = events;
  const animations = new Set();
  let touchStart;

  function show(index, previous, manual) {
    animations.forEach(animation => animation.kill());
    animations.clear();
    // При швидких кліках прибираю стару анімацію, щоб слайди не накладалися.
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
      slide.inert = i !== index;
      slide.classList.toggle('hero__slide--active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('hero__dot--active', i === index);
      dot.setAttribute('aria-current', String(i === index));
      dot.tabIndex = i === index ? 0 : -1;
    });
    root.querySelector('[data-hero-current]').textContent = String(index + 1).padStart(2, '0');
    if (manual) status.textContent = `Слайд ${index + 1} із ${slides.length}`;
    slides[index].querySelector('img').loading = 'eager';
    // Наступний фон готується, поки людина читає поточний слайд.
    slides[(index + 1) % slides.length].querySelector('img').loading = 'eager';
    if (!motion.matches) {
      animations.add(gsap.fromTo(slides[index], { opacity: 0 }, {
        opacity: 1, duration: .45, ease: 'power2.out', clearProps: 'opacity',
      }));
      animations.add(gsap.fromTo(slides[index].querySelector('.hero__content'), { y: 12 }, {
        y: 0, duration: .5, ease: 'power2.out', clearProps: 'transform',
      }));
    }
  }

  const slider = createHeroSliderState({ count: slides.length, onChange: show, autoplay: !motion.matches,
    onPlaybackChange(playing) {
      toggle.setAttribute('aria-label', playing ? 'Призупинити слайдер' : 'Відновити слайдер');
      toggle.querySelector('i').className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    },
  });
  controllers.set(root, slider);
  controls.hidden = false;

  root.querySelector('[data-hero-prev]').addEventListener('click', slider.previous, { signal });
  root.querySelector('[data-hero-next]').addEventListener('click', slider.next, { signal });
  toggle.addEventListener('click', () => slider.setPlaying(!slider.playing), { signal });
  dots.forEach((dot, i) => dot.addEventListener('click', () => slider.go(i), { signal }));

  root.addEventListener('keydown', event => {
    if (event.target.closest('a, input, select, textarea') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') slider.go(0);
    else if (event.key === 'End') slider.go(slides.length - 1);
    else if (event.key === 'ArrowLeft') slider.previous();
    else slider.next();
    if (event.target.matches('[data-hero-dot]')) dots[slider.index].focus();
  }, { signal });

  root.addEventListener('focusin', event => {
    // Під час роботи з клавіатурою слайд не має зникати сам.
    if (!event.target.closest('[data-hero-toggle]')) slider.setPlaying(false);
  }, { signal });
  root.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') slider.block('hover', true);
  }, { signal });
  root.addEventListener('pointerleave', () => slider.block('hover', false), { signal });
  root.addEventListener('pointerdown', event => {
    touchStart = event.pointerType === 'touch' && !event.target.closest('a, button')
      ? { x: event.clientX, y: event.clientY } : null;
  }, { signal });
  root.addEventListener('pointercancel', () => { touchStart = null; }, { signal });
  root.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const direction = heroSwipeDirection(touchStart, { x: event.clientX, y: event.clientY });
    touchStart = null;
    if (!direction) return;
    slider.setPlaying(false);
    if (direction > 0) slider.next();
    else slider.previous();
  }, { signal });

  const visibility = () => slider.block('hidden', document.hidden);
  document.addEventListener('visibilitychange', visibility, { signal });
  visibility();
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    slider.block('offscreen', !entries[0].isIntersecting);
  }) : null;
  observer?.observe(root);

  motion.addEventListener('change', () => {
    if (motion.matches) {
      slider.setPlaying(false);
      animations.forEach(animation => animation.kill());
      gsap.set(slides, { clearProps: 'opacity' });
      gsap.set(root.querySelectorAll('.hero__content'), { clearProps: 'transform' });
    }
  }, { signal });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    slider.destroy();
    events.abort();
    observer?.disconnect();
    animations.forEach(animation => animation.kill());
    controllers.delete(root);
  }, { signal });
  return slider;
}
