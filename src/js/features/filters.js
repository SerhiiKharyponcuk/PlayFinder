// TODO: синхронізація sidebar, mobile drawer та URL; повертай єдиний набір фільтрів.
export function readFilters(search = window.location.search) {
  const params = new URLSearchParams(search);
  return { query: params.get('q') || '', sort: params.get('sort') || 'popular' };
}
