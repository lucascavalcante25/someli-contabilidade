/**
 * Smoke visual mobile/desktop do Dashboard (requer front em :4200 e API em :8080).
 * Uso: node scripts/smoke-dashboard-viewports.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'tmp-smoke');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.SMOKE_BASE || 'http://localhost:4200';

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const cpf = page.locator('input').first();
  await cpf.fill('111.111.111-11');
  const senha = page.locator('input[type="password"]');
  await senha.fill('adm@Someli');
  await page.getByRole('button', { name: /entrar|acessar|login/i }).first().click();
  await page.waitForURL(/dashboard|clientes/, { timeout: 20000 }).catch(() => {});
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    // Desktop
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await login(page);
      await page.screenshot({ path: join(outDir, 'dashboard-desktop.png'), fullPage: true });
      const tabs = await page.getByRole('tablist', { name: /Filtro de obrigações/i }).count();
      if (tabs < 1) throw new Error('Abas Urgentes/Próximas não encontradas no desktop');
      console.log('OK desktop — abas presentes');
      await context.close();
    }

    // Mobile iPhone
    {
      const context = await browser.newContext({ ...devices['iPhone 12'] });
      const page = await context.newPage();
      await login(page);
      await page.screenshot({ path: join(outDir, 'dashboard-mobile.png'), fullPage: true });
      const tablist = page.getByRole('tablist', { name: /Filtro de obrigações/i });
      await tablist.waitFor({ timeout: 10000 });
      const box = await tablist.boundingBox();
      if (!box || box.width < 200) throw new Error('Tablist mobile muito estreita/ausente');
      // abas em 3 colunas devem caber na tela sem overflow horizontal do card principal
      const overflow = await page.evaluate(() => {
        const el = document.querySelector('[role="tablist"]');
        if (!el) return true;
        return el.scrollWidth > el.clientWidth + 2;
      });
      if (overflow) console.warn('AVISO: tablist com scroll horizontal (aceitável se leve)');
      console.log('OK mobile — tablist visível', box);
      await context.close();
    }

    console.log('Screenshots em', outDir);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
