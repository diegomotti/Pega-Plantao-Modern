const sharp = require('sharp');

const file = process.argv[2];
const lines = process.argv[3].split(';').filter(Boolean).map((s) => {
  const [axis, fixed, from, to, min] = s.split(',');
  return { axis, fixed: +fixed, from: +from, to: +to, min: +(min || 4) };
});

(async () => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

  for (const line of lines) {
    console.log(`-- ${line.axis} @${line.fixed} [${line.from}..${line.to}]`);
    let start = line.from;
    let prev = hex(line.axis === "y" ? px(line.fixed, start) : px(start, line.fixed));
    for (let v = line.from + 1; v < line.to; v++) {
      const c = hex(line.axis === "y" ? px(line.fixed, v) : px(v, line.fixed));
      if (c !== prev) {
        if (v - start >= line.min) {
          console.log(`${line.axis}=${start}..${v - 1} (${v - start}) ${prev}`);
        }
        start = v;
        prev = c;
      }
    }
    console.log(`${line.axis}=${start}..${line.to} (${line.to - start}) ${prev}`);
  }
})();
