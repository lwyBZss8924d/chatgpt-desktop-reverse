import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { pageMeta } from '../scripts/research/content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  SITE = join(ROOT, '.cache/browser-test-site');
await rm(SITE, { recursive: true, force: true });
await cp(join(ROOT, 'site'), SITE, { recursive: true });
const testedBuildHash = createHash('sha256')
  .update(await readFile(join(SITE, 'assets/data/build-manifest.json')))
  .digest('hex');
const output = join(ROOT, 'test-results');
await mkdir(output, { recursive: true });
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(
      /^\/preview\//,
      '/'
    );
    if (p.endsWith('/')) p += 'index.html';
    const file = resolve(SITE, '.' + p);
    if (!file.startsWith(SITE + '/')) throw new Error('invalid path');
    const body = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.ATLAS_CHROME || (existsSync(macChrome) ? macChrome : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [],
  external = [],
  failures = [],
  checks = [];
const track = (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(base) && /^https?:/.test(r.url())) external.push(r.url());
  });
};
try {
  if (!process.argv.includes('--interactions-only'))
    for (const locale of ['en', 'zh'])
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          locale: locale === 'zh' ? 'zh-CN' : 'en-US',
          colorScheme: theme,
        });
        await context.addInitScript(
          ({ locale, theme }) => {
            localStorage.setItem('atlas-locale', locale);
            localStorage.setItem('atlas-theme', theme);
          },
          { locale, theme }
        );
        const page = await context.newPage();
        track(page);
        for (const width of [1440, 1024, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const p of pageMeta) {
            await page.goto(`${base}/${p.id}.html`);
            await page.waitForFunction(
              () => document.documentElement.dataset.atlasReady === 'true'
            );
            await page.locator('h1').waitFor();
            await page.evaluate(() => document.fonts.ready);
            assert.equal(await page.locator('html').getAttribute('data-locale'), locale);
            assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
            if (width >= 768) {
              await page.locator('.react-flow__edge-path').first().waitFor({ state: 'attached' });
              await page.mouse.move(0, 0);
              const edgeChecks = await page
                .locator('.react-flow__edge-path')
                .evaluateAll((edges) =>
                  edges.map((e) => ({
                    viewport: e.ownerSVGElement.getBoundingClientRect().width,
                    stroke: getComputedStyle(e).stroke,
                    width: parseFloat(getComputedStyle(e).strokeWidth),
                    marker: !!document.getElementById(
                      e.getAttribute('marker-end').replace(/^url\(#|\)$/g, '')
                    ),
                  }))
                );
              for (const e of edgeChecks) {
                assert.ok(e.viewport > 0, `${p.id}: zero-width edge SVG`);
                assert.ok(e.width >= 2, `${p.id}: edge too thin`);
                assert.notEqual(e.stroke, 'none');
                assert.ok(e.marker, `${p.id}: missing arrowhead`);
              }
            }
            const geometry = await page.evaluate(() => ({
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              header: document.querySelector('.topbar').getBoundingClientRect().height,
              images: [...document.images].filter(
                (i) => i.loading !== 'lazy' && (!i.complete || !i.naturalWidth)
              ).length,
            }));
            assert.ok(
              geometry.scroll <= width + 1,
              `${p.id} ${width}: document overflow ${geometry.scroll}`
            );
            assert.ok(geometry.header <= 65, `${p.id}: header occupies too much space`);
            checks.push({ page: p.id, locale, theme, width, status: 'passed' });
            if (
              width === 1440 &&
              locale === 'en' &&
              theme === 'dark' &&
              ['index', 'features', 'core-api', 'bundle'].includes(p.id)
            )
              await page.screenshot({ path: join(output, `${p.id}-${theme}.png`) });
            if (
              width === 390 &&
              locale === 'zh' &&
              theme === 'light' &&
              ['features', 'gui-map'].includes(p.id)
            )
              await page.screenshot({ path: join(output, `${p.id}-mobile-zh.png`) });
          }
        }
        await context.close();
        console.log(`  visual matrix ${locale}/${theme}: 36 page/viewport checks`);
      }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ['clipboard-read', 'clipboard-write'],
    colorScheme: 'light',
    locale: 'en-US',
  });
  const page = await context.newPage();
  track(page);
  const go = async (path) => {
    await page.goto(base + '/' + path);
    await page.waitForFunction(() => document.documentElement.dataset.atlasReady === 'true');
  };
  await go('core-api.html');
  await page.getByRole('searchbox', { name: 'Search this page' }).fill('thread/start');
  assert.equal(await page.locator('[data-node-id="core:thread/start"]').count(), 1);
  await page.locator('[data-node-id="core:thread/start"]').click();
  await page.locator('.inspector .code-block').first().waitFor();
  assert.ok((await page.locator('.inspector').innerText()).includes('ThreadStartParams'));
  assert.ok(
    (
      await page
        .locator('.inspector a[href*="github.com/openai/codex/blob/"]')
        .first()
        .getAttribute('href')
    ).includes('ddea03ad049142943bdbf13e937b1d67e8c1ba0c')
  );
  await page
    .locator('.inspector')
    .getByRole('button', { name: 'Copy code', exact: true })
    .first()
    .click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(copied.includes('thread/start'));
  assert.ok(!copied.includes('Copied'));
  await page.setViewportSize({ width: 2400, height: 1300 });
  assert.ok(
    await page
      .locator('.inspector')
      .evaluate((el) => Math.abs(el.getBoundingClientRect().right - innerWidth) < 2),
    'Inspector must meet the right edge'
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  const firstUrl = page.url();
  await page.locator('.inspector').getByRole('button', { name: 'Close details' }).click();
  await page.goBack();
  await page.locator('.inspector').waitFor();
  assert.equal(page.url(), firstUrl);
  await go('method.html');
  const block = page.locator('[data-testid="code-block"]').first();
  const expected = await page.evaluate(
    () => JSON.parse(document.getElementById('atlas-data').textContent).code.build.text
  );
  await block.locator('.code-body').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
  assert.ok(!(await page.locator('#claims').innerText()).includes('<code>'));
  assert.ok(!(await page.locator('#claims').innerText()).includes('<b>'));
  await go('features.html');
  assert.ok(
    await page.locator('.graph-canvas').evaluate((el) => el.getBoundingClientRect().height >= 420)
  );
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.ok(
    await page
      .locator('.graph-canvas')
      .evaluate((el) => el.getBoundingClientRect().height > innerHeight * 0.8),
    'Fullscreen canvas must use the viewport'
  );
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  // Native fullscreen exit is asynchronous. Outside inputs cannot receive text until it ends.
  await page.waitForFunction(
    () => !document.fullscreenElement && !document.querySelector('.graph-shell.is-fullscreen')
  );
  const featureSearch = page.getByRole('searchbox', { name: 'Search this page' });
  await featureSearch.fill('thread/start');
  assert.equal(await featureSearch.inputValue(), 'thread/start');
  await page.locator('[data-node-id="cap:thread-lifecycle"]').waitFor();
  await featureSearch.fill('no_such_feature_827342');
  assert.equal(await featureSearch.inputValue(), 'no_such_feature_827342');
  await page.locator('.catalog .empty-state').waitFor();
  assert.equal(await page.locator('.catalog-row').count(), 0);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.locator('.catalog-row').first().waitFor();
  await page.locator('.react-flow__node').first().waitFor();
  await page.getByRole('button', { name: 'Read at 100%', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle minimap', exact: true }).click();
  await page.locator('.react-flow__minimap').waitFor();
  assert.ok((await page.locator('.react-flow__node').count()) >= 5);
  await go('cloud-api.html');
  await page.getByRole('combobox', { name: 'Service filter' }).selectOption('wham');
  assert.ok(page.url().includes('service=wham'));
  assert.ok((await page.locator('.catalog-row').first().innerText()).includes('/wham/'));
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.atlasReady === 'true');
  assert.equal(await page.getByRole('combobox', { name: 'Service filter' }).inputValue(), 'wham');
  await go('gui-map.html?current=settings%2F18-hooks');
  await page
    .getByRole('navigation', { name: 'Surface tree' })
    .getByRole('button', { name: 'Hooks', exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document.querySelector('.capture-image img')?.getAttribute('src')?.includes('18-hooks')
  );
  await page
    .getByRole('navigation', { name: 'Surface tree' })
    .getByRole('button', { name: 'Active conversation', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review surface', exact: true }).click();
  await page.locator('.inspector').waitFor();
  await go('bundle.html');
  await page.waitForFunction(
    () =>
      document.querySelector('.catalog-caption')?.textContent?.includes('8,967') ||
      document.querySelector('.catalog-caption')?.textContent?.includes('8967')
  );
  await page.getByRole('searchbox', { name: 'Search this page' }).fill('early-bootstrap.js');
  await page.locator('.catalog-row').first().click();
  await page.locator('.inspector').waitFor();
  assert.ok((await page.locator('.inspector').innerText()).includes('Imports / requires'));
  await go('index.html');
  await page.getByRole('button', { name: 'Open global search' }).click();
  await page.getByRole('searchbox', { name: 'Global search' }).fill('early-bootstrap.js');
  await page.locator('.global-results a').first().waitFor();
  assert.ok(
    (await page.locator('.global-results a').first().getAttribute('href')).startsWith(
      'bundle.html#'
    )
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '切换到中文' }).click();
  assert.equal(await page.locator('html').getAttribute('data-locale'), 'zh');
  await page.getByRole('button', { name: '切换主题' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await go('preview/core-api.html#core%3Athread%2Fstart');
  await page.locator('.inspector .code-block').first().waitFor();
  assert.ok((await page.locator('.inspector').innerText()).includes('thread/start'));
  await context.close();
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  const staticPage = await noJs.newPage();
  track(staticPage);
  for (const p of pageMeta) {
    await staticPage.goto(`${base}/${p.id}.html`);
    assert.ok((await staticPage.locator('main').innerText()).length > 400);
    assert.equal(await staticPage.locator('.static-graph').count(), 1);
  }
  await noJs.close();
  assert.deepEqual(errors, [], 'browser runtime errors');
  assert.deepEqual(failures, [], 'failed local resources');
  assert.deepEqual(external, [], 'unexpected external runtime requests');
  const receipt = {
    status: 'passed',
    browserVersion: browser.version(),
    testedBuildHash,
    matrixChecks: checks.length,
    checks,
    interactionScenarios: [
      'source inspector',
      'exact code copying',
      'browser history',
      'nested search',
      'empty search',
      'React Flow',
      'persistent service filters',
      'GUI selection and hotspots',
      'complete file index',
      'global search',
      'locale and theme',
      'subpath deployment',
      'no JavaScript',
    ],
    errors,
    failures,
    external,
  };
  await writeFile(join(output, 'browser-validation.json'), JSON.stringify(receipt, null, 2));
  console.log(`browser: ${checks.length} visual checks and 13 interaction scenarios passed`);
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
