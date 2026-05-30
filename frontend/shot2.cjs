const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox","--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Preview — sem autenticação
  await page.goto("http://localhost:5173/preview", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "D:/tmp/4_dashboard.png" });
  console.log("ok preview-dashboard");

  // Clicar em Financeiro no preview
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await b.textContent();
    if (t && t.trim() === "Financeiro") { await b.click(); break; }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "D:/tmp/5_financeiro.png" });
  console.log("ok preview-financeiro");

  // Sidebar
  for (const b of await page.$$("button")) {
    const t = await b.textContent();
    if (t && t.trim() === "Comunicados") { await b.click(); break; }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "D:/tmp/6_comunicados.png" });
  console.log("ok preview-comunicados");

  // Documentos
  for (const b of await page.$$("button")) {
    const t = await b.textContent();
    if (t && t.trim() === "Documentos") { await b.click(); break; }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "D:/tmp/7_documentos.png" });
  console.log("ok preview-documentos");

  await browser.close();
})();
