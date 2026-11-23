const sharp = require('sharp');

(async () => {
  const file = process.argv[2];
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const scan = (label, fixed, from, to, axis) => {
    console.log(`-- ${label}`);
    let prev = '';
    for (let v = from; v <= to; v++) {
      const c = hex(axis === 'y' ? px(fixed, v) : px(v, fixed));
      if (c !== prev) {
        console.log(`${axis === 'y' ? 'y' : 'x'}=${v} ${c}`);
        prev = c;
      }
    }
  };
  scan('vertical @x=700 (header->bar->content)', 700, 0, 200, 'y');
  scan('vertical @x=200 (nav area)', 200, 90, 140, 'y');
  scan('horizontal @y=500 (rail/nav/content)', 500, 0, 420, 'x');
  scan('horizontal @y=200 (card left edge)', 200, 320, 400, 'x');
  scan('vertical @y? card edges @x=700', 700, 120, 220, 'y');
  scan('horizontal @y=220 card left', 220, 330, 380, 'x');
  scan('horizontal @y=220 card right', 220, 1320, 1383, 'x');
  scan('vertical @x=700 cards bottom area', 700, 680, 800, 'y');
  scan('horizontal @y=759 button', 759, 740, 960, 'x');
})();
