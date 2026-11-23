const sharp = require("sharp");

const regions = [
  ["logo-text", 300, 50, 700, 140],
  ["breadcrumb-contas", 740, 60, 900, 115],
  ["breadcrumb-pref", 960, 60, 1230, 115],
  ["nav-plantoes", 350, 310, 620, 380],
  ["nav-sub-anuncios", 470, 400, 650, 460],
  ["nav-item-bloqueio", 470, 470, 700, 530],
  ["card1-title", 1424, 370, 3200, 440],
  ["card1-desc", 1424, 450, 3400, 530],
  ["card2-title", 1190, 690, 2600, 770],
  ["save-btn", 2300, 2140, 2800, 2250],
];

(async () => {
  const file = process.argv[2];
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  for (const [label, x0, y0, x1, y1] of regions) {
    let minX = 99999, minY = 99999, maxX = -1, maxY = -1;
    const counts = new Map();
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const [r, g, b] = px(x, y);
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        if (l < 150) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
          counts.set(hex, (counts.get(hex) || 0) + 1);
        }
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    console.log(`${label}: bbox x ${minX}..${maxX} (${maxX - minX + 1}) y ${minY}..${maxY} (${maxY - minY + 1}) ink ${top.map(([h, c]) => `${h}(${c})`).join(' ')}`);
  }
})();
