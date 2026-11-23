const sharp = require('sharp');

const file = process.argv[2];
const points = (process.argv[3] || '').split(';').filter(Boolean).map((s) => {
  const [x, y, label] = s.split(',');
  return [Number(x), Number(y), label || ''];
});

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  console.log(`size ${info.width}x${info.height}`);
  for (const [x, y, label] of points) {
    const i = (y * info.width + x) * info.channels;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    console.log(`${label} (${x},${y}) #${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
  }
})();
