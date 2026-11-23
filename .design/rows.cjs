const sharp = require("sharp");

const file = process.argv[2];
const x0 = +process.argv[3];
const x1 = +process.argv[4];
const y0 = +process.argv[5];
const y1 = +process.argv[6];
const thresh = +(process.argv[7] || 235);

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (let y = y0; y <= y1; y++) {
    let sum = 0;
    let count = 0;
    for (let x = x0; x <= x1; x += 2) {
      const i = (y * info.width + x) * info.channels;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      count++;
    }
    const mean = sum / count;
    if (mean < thresh) out.push(`${y}\t${mean.toFixed(1)}`);
  }
  console.log(out.join("\n"));
})();
