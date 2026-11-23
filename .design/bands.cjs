const sharp = require("sharp");

const file = process.argv[2];
const x0 = +process.argv[3];
const x1 = +process.argv[4];
const y0 = +process.argv[5];
const y1 = +process.argv[6];
const dark = +(process.argv[7] || 170);
const minCount = +(process.argv[8] || 6);

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const bands = [];
  let start = null;
  for (let y = y0; y <= y1; y++) {
    let count = 0;
    for (let x = x0; x <= x1; x++) {
      const i = (y * info.width + x) * info.channels;
      if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] < dark) count++;
    }
    const on = count >= minCount;
    if (on && start === null) start = y;
    if (!on && start !== null) {
      bands.push(`${start}..${y - 1} (${y - start})`);
      start = null;
    }
  }
  if (start !== null) bands.push(`${start}..${y1}`);
  console.log(bands.join("\n"));
})();
