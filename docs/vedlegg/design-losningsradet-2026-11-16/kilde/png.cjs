const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  for (const navn of process.argv.slice(3)) {
    const svg = fs.readFileSync(`${process.argv[2]}/${navn}.svg`, 'utf8');
    const m = svg.match(/width="(\d+)" height="(\d+)"/);
    const p = await b.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: 2 });
    await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await p.screenshot({ path: `${process.argv[2]}/${navn}.png`, clip: { x: 0, y: 0, width: +m[1], height: +m[2] } });
  }
  await b.close();
})();
