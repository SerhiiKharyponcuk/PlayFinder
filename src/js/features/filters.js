/**
 * ЧИТАННЯ ФІЛЬТРІВ із адресного рядка. Повертає звичайний об'єкт.
 * Назви query / sort — внутрішні назви проєкту; адаптер має перекласти їх
 * на параметри, які підтримує конкретний API. Не кожен API розуміє query або popular.
 */

// TODO: синхронізація sidebar, mobile drawer та URL; повертай єдиний набір фільтрів.
export function readFilters(search = window.location.search) {
  const params = new URLSearchParams(search);
  return { query: params.get('q') || '', sort: params.get('sort') || 'popular' };
}
