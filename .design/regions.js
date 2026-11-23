const sharp = require('sharp');

const rects = [
  ['nav-plantões', 80, 143, 340, 168],
  ['nav-alertas', 80, 194, 340, 219],
  ['nav-credenciamento', 120, 271, 340, 298],
  ['nav-financeiro-amber', 120, 315, 320, 340],
  ['card1-title', 450, 168, 700, 195],
  ['card1-desc', 450, 197, 1200, 245],
  ['subbar-title', 80, 56, 200, 90],
  ['logo', 90, 8, 290, 38],
  ['header-small', 1120, 10, 1280, 36],
  ['card-border', 355, 200, 360, 300],
  ['btn-text', 770, 745, 935, 775],
];

(async () => {
  const file = process.argv[2];
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  for (const [label, x0, y0, x1, y1] of rects) {
    const counts = new Map();
    let darkest = { l: 999, hex: '' };
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * info.width + x) * info.channels;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
        counts.set(hex, (counts.get(hex) || 0) + 1);
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        if (l < darkest.l) darkest = { l, hex };
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`${label}: darkest ${darkest.hex} | top ${top.map(([h, c]) => `${h}(${c})`).join(' ')}`);
  }
})();
