const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const shots = [
    { url: "http://localhost:5173/",        name: "1_landing"   },
    { url: "http://localhost:5173/galeria", name: "2_galeria"   },
    { url: "http://localhost:5173/login",   name: "3_login"     },
  ];
  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `D:/tmp/${s.name}.png`, fullPage: false });
    console.log("ok " + s.name);
  }
  await browser.close();
})();
