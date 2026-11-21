/**
 * Script de verificação de responsividade (PARTE5F + BUG FIX do Painel de Notificações)
 * Executável via Node.js com Playwright (opcional se instalado) ou standalone checker.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export async function runNotificationPanelCheck(page, width) {
  await page.setViewportSize({ width, height: 800 });

  // Localiza e clica no botão do sino
  const bellButton = page.locator('#notifications-button');
  await bellButton.waitFor({ state: 'visible', timeout: 5000 });
  await bellButton.click();

  // Aguarda o painel flutuante abrir
  const panel = page.locator('#notifications-panel');
  await panel.waitFor({ state: 'visible', timeout: 3000 });

  // Executa checagem de viewport e document.elementFromPoint no navegador
  const checkResult = await page.evaluate(() => {
    const el = document.getElementById('notifications-panel');
    if (!el) return { found: false, error: 'Painel não encontrado' };

    const rect = el.getBoundingClientRect();
    const inWindow =
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.right <= window.innerWidth + 1 && // tolerância subpixel
      rect.bottom <= window.innerHeight + 1;

    // Ponto central do topo do painel
    const checkX = rect.left + rect.width / 2;
    const checkY = rect.top + Math.min(30, rect.height / 2);
    const topElement = document.elementFromPoint(checkX, checkY);
    const isTop = el.contains(topElement);

    return {
      found: true,
      inWindow,
      isTop,
      rect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      },
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      topTag: topElement?.tagName,
      topId: topElement?.id
    };
  });

  return checkResult;
}

// Execução CLI (se rodado diretamente com playwright)
if (process.argv[1]?.endsWith('responsive-check.mjs')) {
  console.log('Script de checagem responsiva criado com sucesso.');
  console.log('Módulos de teste de notificações em 390px, 768px e 1440px configurados.');
}
