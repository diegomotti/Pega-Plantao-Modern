const sharp = require("sharp");

const file = process.argv[2];
const scale = +process.argv[3];
const regions = process.argv[4].split(";").map((r) => r.split(",").map(Number));

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const C = info.channels;
  for (const [x0, y0, x1, y1, thrRaw] of regions) {
    const thr = thrRaw || 200;
    let a = 1e9, b = 1e9, c = -1, d = -1;
    for (let y = Math.round(y0 * scale); y < Math.round(y1 * scale); y++) {
      for (let x = Math.round(x0 * scale); x < Math.round(x1 * scale); x++) {
        const i = (y * W + x) * C;
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (l < thr) {
          if (x < a) a = x;
          if (x > c) c = x;
          if (y < b) b = y;
          if (y > d) d = y;
        }
      }
    }
    const f = (v) => (v / scale).toFixed(1);
    console.log(`${x0},${y0}: x ${f(a)}..${f(c)} (w ${f(c - a + 1)}) y ${f(b)}..${f(d)} (h ${f(d - b + 1)})`);
  }
})();
