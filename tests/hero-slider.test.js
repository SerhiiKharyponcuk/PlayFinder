import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeroSliderState, heroSwipeDirection } from '../src/js/components/hero-slider-state.js';

function setup(options = {}) {
  const timers = new Map(), changes = [], playback = [];
  let now = 0, id = 0;
  const slider = createHeroSliderState({ count: 4, onChange: (...args) => changes.push(args),
    onPlaybackChange: playing => playback.push(playing),
    setTimer: (run, delay) => { timers.set(++id, { run, at: now + delay }); return id; },
    clearTimer: key => timers.delete(key), ...options });
  function tick(ms) {
    const end = now + ms;
    let next;
    while ((next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0])) {
      now = next[1].at;
      timers.delete(next[0]);
      next[1].run();
    }
    now = end;
  }
  return { slider, changes, playback, tick, timers };
}

test('стрілки й крапки переходять по колу, некоректний індекс не змінює слайд', () => {
  const { slider, changes, timers } = setup();
  slider.previous();
  assert.equal(slider.index, 3);
  slider.next();
  assert.equal(slider.index, 0);
  slider.go(2);
  assert.deepEqual(changes.at(-1), [2, 0, true]);
  slider.go(NaN); slider.go('1'); slider.go(1.5);
  assert.equal(slider.index, 2);
  assert.equal(timers.size, 1);
});

test('автоперехід відбувається через 7 секунд і не оголошується як ручне перемикання', () => {
  const { slider, changes, tick } = setup();
  tick(6999);
  assert.equal(slider.index, 0);
  tick(1);
  assert.deepEqual(changes, [[1, 0, false]]);
  tick(21000);
  assert.equal(slider.index, 0);
});

test('швидкі кліки залишають один таймер і дають повні 7 секунд після останнього вибору', () => {
  const { slider, tick, timers } = setup();
  tick(6000);
  for (let i = 0; i < 25; i++) slider.next();
  assert.equal(timers.size, 1);
  assert.equal(slider.index, 1);
  tick(6999);
  assert.equal(slider.index, 1);
  tick(1);
  assert.equal(slider.index, 2);
});

test('наведення, прихована вкладка й вихід з екрана призупиняють таймер незалежно', () => {
  const { slider, tick, timers } = setup();
  slider.block('hover', true);
  slider.block('hidden', true);
  slider.block('offscreen', true);
  tick(30000);
  slider.block('hover', false);
  slider.block('hidden', false);
  assert.equal(timers.size, 0);
  slider.block('offscreen', false);
  tick(7000);
  assert.equal(slider.index, 1);
});

test('ручна пауза не скидається після наведення або ручного переходу', () => {
  const { slider, tick, playback } = setup();
  slider.setPlaying(false);
  slider.block('hover', true); slider.block('hover', false);
  slider.next();
  tick(20000);
  assert.equal(slider.index, 1);
  assert.equal(slider.playing, false);
  slider.setPlaying(true);
  tick(7000);
  assert.equal(slider.index, 2);
  assert.deepEqual(playback, [true, false, true]);
});

test('зменшення руху вимикає автозапуск, один слайд не запускає зайвих таймерів', () => {
  const reduced = setup({ autoplay: false });
  reduced.tick(30000);
  assert.equal(reduced.slider.index, 0);
  reduced.slider.next();
  assert.equal(reduced.slider.index, 1);
  assert.equal(reduced.timers.size, 0);
  const single = setup({ count: 1 });
  single.slider.setPlaying(true); single.slider.next();
  assert.equal(single.slider.index, 0);
  assert.equal(single.timers.size, 0);
});

test('після закриття сторінки таймери та старі команди не відновлюють слайдер', () => {
  const { slider, tick, timers, changes } = setup();
  slider.destroy();
  slider.next(); slider.setPlaying(true); slider.block('hidden', false);
  tick(30000);
  assert.equal(timers.size, 0);
  assert.deepEqual(changes, []);
});

test('свайп відрізняється від вертикального прокручування й випадкового дотику', () => {
  const start = { x: 200, y: 200 };
  assert.equal(heroSwipeDirection(start, { x: 100, y: 210 }), 1);
  assert.equal(heroSwipeDirection(start, { x: 300, y: 180 }), -1);
  assert.equal(heroSwipeDirection(start, { x: 180, y: 205 }), 0);
  assert.equal(heroSwipeDirection(start, { x: 150, y: 300 }), 0);
});
