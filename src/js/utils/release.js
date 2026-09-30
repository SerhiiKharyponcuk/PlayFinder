/** СТАТУС РЕЛІЗУ: RAWG released + tba, без додаткового HTTP-запиту.
 * Відсутня дата сама по собі НЕ означає, що гра ще не вийшла.
 * Обчислюємо при показі: збережена вчора картка не лишиться «майбутньою» назавжди.
 */
export function calendarToday(now = new Date()) {
  // День браузера, а не UTC: опівночі у нас уже може бути наступна дата.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validReleaseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
export function releaseInfo(game, today = calendarToday()) {
  const date = validReleaseDate(game.releaseDate);
  const tba = game.releaseTba === true;
  const status = tba || (date && date > today) ? 'upcoming'
    : date === today ? 'today' : date ? 'released' : 'unknown';
  return {
    status, isUpcoming: status === 'upcoming',
    label: { upcoming: 'Ще не вийшла', today: 'Реліз сьогодні', released: 'Вже вийшла', unknown: 'Статус релізу невідомий' }[status],
    // tba=true: навіть заповнена дата може бути приблизним placeholder, її не обіцяємо.
    dateTime: tba ? null : date,
    dateLabel: tba ? 'Дату ще не оголошено' : date
      ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))
      : 'Дату виходу не вказано',
    dateHeading: status === 'upcoming' ? 'Очікуваний вихід' : 'Дата виходу',
  };
}
