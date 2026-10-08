export function platformIcons(platforms = []) {
  const groups = [
    ['Windows', /^(PC|Windows)$/i, 'fa-brands fa-windows'],
    ['PlayStation', /playstation/i, 'fa-brands fa-playstation'],
    ['Xbox', /xbox/i, 'fa-brands fa-xbox'],
    ['Nintendo', /nintendo|wii|gamecube/i, 'fa-solid fa-gamepad'],
    ['macOS', /mac|os x/i, 'fa-brands fa-apple'],
    ['Linux', /linux/i, 'fa-brands fa-linux'],
    ['Android', /android/i, 'fa-brands fa-android'],
    ['iOS', /ios/i, 'fa-solid fa-mobile-screen'],
  ];
  return groups.filter(([, pattern]) => platforms.some(name => pattern.test(name)))
    .map(([label, , icon]) => ({ label, icon }));
}
