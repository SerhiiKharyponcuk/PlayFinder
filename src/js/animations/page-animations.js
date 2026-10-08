import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPageAnimations(root = document) {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const hero = root.querySelector('.hero__content, .about-hero__content, .games-hero__content, .placeholder-page, .game-detail__content');
    if (hero) {
      gsap.from(hero.children, {
        y: 18,
        opacity: 0,
        duration: 0.65,
        stagger: 0.09,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    }

    const sections = root.querySelectorAll('.games-section, .sidebar-card, .newsletter, .games-toolbar, .games-catalog, .about-features, .about-story, .about-values, .about-cta, .game-detail__media');
    sections.forEach(section => {
      gsap.from(section, {
        y: 20,
        opacity: 0.35,
        duration: 0.55,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: section,
          start: 'top 94%',
          once: true,
        },
      });
    });
  });

  return () => media.revert();
}
