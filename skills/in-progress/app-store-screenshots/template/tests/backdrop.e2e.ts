import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import sharp from 'sharp';

// The optional AI backdrop: a local route that calls an image API and stores the
// result, and the inspector section that drives it. The API is faked
// (e2e-army/fake-gemini.cjs), so nothing here spends money or needs a key.

type ImageElementState = { id: string; src: string; fit?: string; transform: { x: number; y: number; width: number; height: number; zIndex?: number } };
type SlideState = { id: string; layout: string; screenshot: string; inverted?: boolean; label: Record<string, string>; headline: Record<string, string>; imageElements?: ImageElementState[] };
type ProjectState = { slidesByDevice: { iphone: SlideState[] } } & Record<string, unknown>;
type FakeState = { calls: number; last: { key: string; body: { model: string; response_format: unknown; input: { type: string; text: string }[] } } | null };

const slide = (id: string, extra: Partial<SlideState> = {}): SlideState => ({ id, layout: 'device-bottom', screenshot: '', label: { en: 'FEATURE' }, headline: { en: id }, ...extra });
const project = (screenshot = ''): ProjectState => ({
  schemaVersion: 3, appName: 'Backdrop Army', themeId: 'dark-bold', connectedCanvas: false, locales: ['en'], locale: 'en',
  device: 'iphone', orientation: 'portrait',
  slidesByDevice: { iphone: [slide('One', { screenshot }), slide('Two'), slide('Three', { inverted: true })] },
});

/** A dark screenshot with an amber block, stored through the real upload route. */
async function uploadScreenshot() {
  const png = await sharp({ create: { width: 200, height: 400, channels: 3, background: '#101820' } })
    .composite([{ input: await sharp({ create: { width: 200, height: 120, channels: 3, background: '#E8A33D' } }).png().toBuffer(), top: 140, left: 0 }])
    .png().toBuffer();
  const response = await fetch(api('/api/upload'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl: `data:image/png;base64,${png.toString('base64')}` }) });
  const result: { path: string } = await response.json();
  return result.path;
}

async function mock(browser: Browser, initial: ProjectState) {
  const store = { state: initial };
  await browser.route('**/api/project', async route => {
    if (route.request.method === 'POST') store.state = JSON.parse(route.request.postData!) as ProjectState;
    await route.fulfill({ json: { ok: true, state: store.state }, headers: { etag: '"mock"' } });
  });
  return store;
}

async function pause(ms: number) {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  await promise;
}

async function eventually(check: () => unknown | Promise<unknown>, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try { await check(); return; } catch (error) {
      if (Date.now() > deadline) throw error;
      await pause(200);
    }
  }
}

const appPort = Number(process.env.SCREENSHOTS_E2E_PORT ?? 4312);
const api = (route: string) => `http://localhost:${appPort}${route}`;
const fake = (route: string, init?: RequestInit) => fetch(`http://127.0.0.1:${appPort + 1}${route}`, init);
const fakeState = async () => (await (await fake('/__state')).json()) as FakeState;
const setMode = (mode: string) => fake('/__mode', { method: 'POST', body: JSON.stringify({ mode }) });
const request = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(api('/api/backdrop'), { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const valid = { prompt: 'Warm amber light on charcoal', aspectRatio: '9:16', size: '1K', model: 'nano-banana-2.1' };
const backdropOf = (state: ProjectState, index: number) => state.slidesByDevice.iphone[index].imageElements?.find(element => element.id === 'backdrop');

test('backdrop status says a key exists without ever returning it', async () => {
  const response = await fetch(api('/api/backdrop'));
  const text = await response.text();
  await expect(response.status).toBe(200);
  const status: { available: boolean } = JSON.parse(text);
  await expect(status.available).toBe(true);
  await expect(text.includes('e2e-key')).toBe(false);
});

test('backdrop requests are refused before they can spend anything', async () => {
  const before = (await fakeState()).calls;
  await expect((await request(valid, { 'content-type': 'text/plain' })).status).toBe(415);
  await expect((await request(valid, { origin: 'https://evil.example' })).status).toBe(403);
  await expect((await request(valid, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  for (const bad of [
    { ...valid, prompt: '   ' },
    { ...valid, prompt: 'x'.repeat(2001) },
    { ...valid, aspectRatio: '5:7' },
    { ...valid, size: '8K' },
    { ...valid, model: 'gemini-anything' },
  ]) await expect((await request(bad)).status).toBe(400);
  await expect((await fakeState()).calls).toBe(before);
});

test('a generated backdrop is stored, served, and only the text prompt is sent', async () => {
  await setMode('ok');
  const response = await request(valid);
  await expect(response.status).toBe(200);
  const result = (await response.json()) as { path: string; width: number; height: number };
  await expect(result.path).toMatch(/^\/screenshots\/uploaded\/[0-9a-f]{16}\.(png|jpg)$/);
  const file = await fetch(api(result.path));
  await expect(file.status).toBe(200);
  const meta = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
  await expect([meta.width, meta.height]).toEqual([result.width, result.height]);
  const { last } = await fakeState();
  await expect(last?.key).toBe('e2e-key');
  await expect(last?.body.model).toBe('gemini-nano-banana-2.1');
  await expect(last?.body.response_format).toEqual({ type: 'image', aspect_ratio: '9:16', image_size: '1K' });
  await expect(last?.body.input).toEqual([{ type: 'text', text: valid.prompt }]);
});

test('a draft is returned for review and nothing is stored until it is kept', async () => {
  await setMode('ok');
  const before = (await fakeState()).calls;
  const response = await request({ ...valid, draft: true });
  await expect(response.status).toBe(200);
  const result: { path?: string; dataUrl: string; width: number; height: number } = await response.json();
  await expect(result.path).toBeUndefined();
  await expect(result.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
  const decoded = Buffer.from(result.dataUrl.split(',')[1], 'base64');
  const meta = await sharp(decoded).metadata();
  await expect([meta.width, meta.height]).toEqual([result.width, result.height]);
  await expect((await fakeState()).calls).toBe(before + 1);
});

test('a failing image API is reported and leaves the next request working', async () => {
  await setMode('quota');
  const quota = await request(valid);
  await expect(quota.status).toBe(502);
  const quotaBody: { error: string } = await quota.json();
  await expect(quotaBody.error).toMatch(/429.*Quota exceeded/);
  await setMode('noimage');
  const none = await request(valid);
  await expect(none.status).toBe(502);
  const noneBody: { error: string } = await none.json();
  await expect(noneBody.error).toMatch(/no image.*cannot paint/);
  await setMode('ok');
  await expect((await request(valid)).status).toBe(200);
});

test('the inspector paints a backdrop in the screenshot colours, then all screens but inverted ones, then removes it', { timeout: 120_000 }, async ({ app, browser, screen }) => {
  await setMode('ok');
  const store = await mock(browser, project(await uploadScreenshot()));
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('One');
  await screen.getByText(/^AI backdrop/).tap();
  await screen.getByRole('textbox', 'Backdrop description').fill('a touch of cream');
  const before = (await fakeState()).calls;
  await screen.getByRole('button', 'Generate backdrop').tap();
  await expect(screen.getByText('Generate a backdrop?', { exact: true })).toBeVisible();
  await expect((await fakeState()).calls).toBe(before); // nothing is sent until confirmed
  await screen.getByRole('button', 'Generate', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Generate again')).toBeVisible();

  await eventually(() => expect(backdropOf(store.state, 0)).toBeTruthy());
  await expect(backdropOf(store.state, 0)).toMatchObject({ fit: 'cover', transform: { x: 0, y: 0, width: 1320, height: 2868, zIndex: 1 } });
  await expect(backdropOf(store.state, 1)).toBeUndefined();
  const sent = (await fakeState()).last?.body;
  await expect(sent?.response_format).toMatchObject({ aspect_ratio: '9:16' });
  const prompt = sent?.input[0].text ?? '';
  await expect(prompt).toContain('topographic'); // the default style
  await expect(prompt).toContain('Also: a touch of cream.');
  await expect(prompt).toContain('#101820'); // the screenshot's own base colour
  await expect(prompt).toContain('#E8A33D'); // and its accent, not the theme's purple
  await expect(prompt).not.toContain('#8B5CF6');

  await screen.getByRole('button', 'Use on all screens').tap();
  await eventually(() => expect(backdropOf(store.state, 1)).toBeTruthy());
  await expect(backdropOf(store.state, 1)?.src).toBe(backdropOf(store.state, 0)?.src);
  await expect(backdropOf(store.state, 2)).toBeUndefined(); // inverted: expects a light backdrop

  await screen.getByRole('button', 'Remove').tap();
  await eventually(() => expect(backdropOf(store.state, 0)).toBeUndefined());
  await expect(backdropOf(store.state, 1)).toBeTruthy();
});

test('three options are painted for review and only the picked one is stored', { timeout: 120_000 }, async ({ app, browser, screen }) => {
  await setMode('ok');
  const store = await mock(browser, project());
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('One');
  await screen.getByText(/^AI backdrop/).tap();
  await screen.getByRole('combobox', 'Backdrop style').tap();
  await screen.getByRole('option', 'Frosted glass').tap();
  await screen.getByRole('combobox', 'Options to paint').tap();
  await screen.getByRole('option', '3 options').tap();
  const before = (await fakeState()).calls;
  await screen.getByRole('button', 'Generate 3 options').tap();
  await expect(screen.getByText('Generate 3 backdrops?', { exact: true })).toBeVisible();
  await screen.getByRole('button', 'Generate', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Use option 3')).toBeVisible();
  await expect((await fakeState()).calls).toBe(before + 3);
  await expect((await fakeState()).last?.body.input[0].text).toContain('glass');
  await expect(backdropOf(store.state, 0)).toBeUndefined(); // reviewing stores nothing

  await screen.getByRole('button', 'Use option 2').tap();
  await eventually(() => expect(backdropOf(store.state, 0)).toBeTruthy());
  await expect(screen.getByRole('button', 'Use option 1')).toHaveCount(0);
});

test('an inverted screen is painted on the theme\'s light base, not the dark screen in front of it', { timeout: 120_000 }, async ({ app, browser, screen }) => {
  await setMode('ok');
  await mock(browser, project(await uploadScreenshot()));
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('One');
  await screen.getByText(/^Screen 3 ·/).tap();
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('Three');
  await screen.getByText(/^AI backdrop/).tap();
  await screen.getByRole('button', 'Generate backdrop').tap();
  await screen.getByRole('button', 'Generate', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Generate again')).toBeVisible();
  const prompt = (await fakeState()).last?.body.input[0].text ?? '';
  await expect(prompt).toContain('#F8FAFC'); // Dark Bold's light alternate
});

test('without a key the section explains how to enable it instead of offering to spend', async ({ app, browser, screen }) => {
  await mock(browser, project());
  await browser.route('**/api/backdrop', async route => {
    await route.fulfill({ json: { ok: true, available: false, models: [], sizes: [] } });
  });
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('One');
  await screen.getByText(/^AI backdrop/).tap();
  await expect(screen.getByText(/Export GEMINI_API_KEY/)).toBeVisible();
  await expect(screen.getByRole('button', 'Generate backdrop')).toHaveCount(0);
});
