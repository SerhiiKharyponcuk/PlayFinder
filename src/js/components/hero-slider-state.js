export function createHeroSliderState({ count, onChange, onPlaybackChange = () => {}, autoplay = true,
  delay = 7000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('Потрібен хоча б один слайд.');
  let index = 0;
  let playing = autoplay && count > 1;
  let timer;
  let destroyed = false;
  const blockers = new Set();

  function schedule() {
    clearTimer(timer);
    timer = undefined;
    if (!destroyed && playing && !blockers.size) {
      timer = setTimer(() => go(index + 1, false), delay);
    }
  }

  function go(next, manual = true) {
    if (destroyed || !Number.isInteger(next)) return;
    const previous = index;
    index = ((next % count) + count) % count;
    if (index !== previous) onChange(index, previous, manual);
    schedule();
  }

  function setPlaying(value) {
    if (destroyed) return;
    playing = Boolean(value) && count > 1;
    onPlaybackChange(playing);
    schedule();
  }

  // Прихована вкладка та наведення призупиняють таймер, але не скидають вибір паузи.
  function block(reason, blocked) {
    if (blocked) blockers.add(reason);
    else blockers.delete(reason);
    schedule();
  }

  onPlaybackChange(playing);
  schedule();
  return {
    go,
    next: () => go(index + 1),
    previous: () => go(index - 1),
    setPlaying,
    block,
    get index() { return index; },
    get playing() { return playing; },
    destroy() { destroyed = true; clearTimer(timer); timer = undefined; },
  };
}

export function heroSwipeDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
