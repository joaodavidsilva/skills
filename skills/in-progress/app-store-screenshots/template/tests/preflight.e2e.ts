import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import { readFile, readdir, stat } from 'node:fs/promises';
import JSZip from 'jszip';

// Store-readiness advice on export: copy rules and locale fallbacks (preflight),
// and text cut off or hard to read (measured on the render). Advice never blocks
// or changes the export.

type State = Record<string, any>;
const slide = (id: string, extra: State = {}) => ({
  id, layout: 'no-device', screenshot: '', label: { en: 'FEATURE' }, headline: { en: 'Plan your week' }, ...extra,
});
const project = (slides: State[], extra: State = {}): State => ({
  schemaVersion: 3, appName: 'Advice Army', themeId: 'clean-light', connectedCanvas: false, locales: ['en'], locale: 'en',
  device: 'iphone', orientation: 'portrait', slidesByDevice: { iphone: slides }, ...extra,
});

async function mock(browser: Browser, initial: State) {
  const store = { state: initial };
  await browser.route('**/api/project', async route => {
    if (route.request.method === 'POST') store.state = JSON.parse(route.request.postData!);
    await route.fulfill({ json: { ok: true, state: store.state }, headers: { etag: '"mock"' } });
  });
  return store;
}

async function zipFrom(path: string) {
  const matches = (await readdir('.e2e/artifacts', { recursive: true })).filter(file => file.endsWith(path));
  await expect(matches.length).toBeGreaterThan(0);
  const dated = await Promise.all(matches.map(async file => ({ file, at: (await stat(`.e2e/artifacts/${file}`)).mtimeMs })));
  dated.sort((a, b) => b.at - a.at);
  return JSZip.loadAsync(await readFile(`.e2e/artifacts/${dated[0].file}`));
}

test('export warns about English fallback and store-rejected copy, and still exports', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  await mock(browser, project(
    [slide('One', { headline: { en: 'The best planner. Download now' } })],
    { locales: ['en', 'de'] },
  ));
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('The best planner. Download now');
  const download = await browser.waitForDownload(() => screen.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 200_000 });
  await expect(screen.getByText('Check before uploading', { exact: true })).toBeVisible();
  await expect(screen.getByText(/de: screen 1 would export English copy/)).toBeVisible();
  await expect(screen.getByText(/screen 1 may read as an unverifiable superlative/)).toBeVisible();
  await expect(screen.getByText(/screen 1 carries a call to action/)).toBeVisible();
  const zip = await zipFrom(download.path);
  const pngs = Object.values(zip.files).filter(file => file.name.endsWith('.png'));
  await expect(pngs.some(file => file.name.includes('/de/'))).toBe(true);
});

test('a finished deck exports without advice', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  await mock(browser, project(
    [slide('One', { headline: { en: 'Plan your week', de: 'Plane deine Woche' }, label: { en: 'PLAN', de: 'PLANEN' } })],
    { locales: ['en', 'de'] },
  ));
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Plan your week');
  await browser.waitForDownload(() => screen.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 200_000 });
  await expect(screen.getByText(/Exported 8 PNGs/)).toBeVisible();
  await expect(screen.getByText('Check before uploading', { exact: true })).toBeHidden();
  await expect(screen.getByText('Check text readability', { exact: true })).toBeHidden();
});

test('export reports text cut off at the slide edge and text too pale for its backdrop', { timeout: 240_000 }, async ({ app, browser, screen }) => {
  const pale = {
    id: 'pale', text: { en: 'Pale on light' }, color: '#fdfcfb', fontSize: 120,
    transform: { x: 100, y: 1200, width: 1100, height: 300, rotation: 0, zIndex: 6 },
  };
  await mock(browser, project(
    [slide('One', { label: { en: 'A VERY LONG LABEL '.repeat(8) } }), slide('Two', { textElements: [pale] })],
    { scene: { backdrop: 'aurora', span: false, decoration: 'none', shadow: 0, glow: 0, tilt: 0, headlineWeight: 700, headlineScale: 1, headlineCase: 'as-typed', captionAlign: 'auto' } },
  ));
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Plan your week');
  const download = await browser.waitForDownload(() => screen.getByRole('button', 'Export bundle', { exact: true }).tap(), { timeout: 200_000 });
  await expect(screen.getByText('Check text readability', { exact: true })).toBeVisible();
  await expect(screen.getByText(/Text cut off at an edge: en screen 1/)).toBeVisible();
  await expect(screen.getByText(/Low contrast against the backdrop:.*en screen 2 "Pale on light"/)).toBeVisible();
  const zip = await zipFrom(download.path);
  await expect(Object.values(zip.files).filter(file => file.name.endsWith('.png'))).toHaveLength(8);
});
