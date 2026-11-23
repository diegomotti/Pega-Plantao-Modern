const sharp = require("sharp");

const [file, ys, x0, x1, darkRaw, minCountRaw, scaleRaw] = process.argv.slice(2);
const rows = ys.split(",").map(Number);
const dark = +(darkRaw || 170);
const minCount = +(minCountRaw || 1);
const scale = +(scaleRaw || 1);

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const C = info.channels;
  for (const yScaled of rows) {
    const y = Math.round(yScaled * scale);
    let out = [];
    let start = null;
    for (let x = +x0; x <= +x1; x++) {
      const i = (y * W + x) * C;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const on = l < dark;
      if (on && start === null) start = x;
      if (!on && start !== null) {
        if (x - start >= minCount) out.push(`${(start / scale).toFixed(0)}-${((x - 1) / scale).toFixed(0)}`);
        start = null;
      }
    }
    if (start !== null) out.push(`${(start / scale).toFixed(0)}-${x1}`);
    console.log(`y=${yScaled}: ${out.join(" ")}`);
  }
})();
