import { gsap } from 'gsap';

export function createMenuAnimation(menu) {
  const media = gsap.matchMedia();
  let play = () => {};
  let tween;

  const stop = () => {
    tween?.revert();
    tween = undefined;
  };

  media.add('(prefers-reduced-motion: no-preference)', context => {
    context.add('reveal', () => {
      stop();
      tween = gsap.fromTo(menu, { y: -8, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    });
    play = () => context.reveal();
    return () => { play = () => {}; };
  });

  return { play: () => play(), stop, destroy: () => { stop(); media.revert(); } };
}
