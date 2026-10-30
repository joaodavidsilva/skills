import { test } from '@e2e-dev/web';
import type { Browser } from '@e2e-dev/web';
import { expect } from 'e2e';
import sharp from 'sharp';

// The optional AI backdrop: a local route that calls an image API and stores the
// result, and the inspector section that drives it. The API is faked
// (e2e-army/fake-gemini.cjs), so nothing here spends money or needs a key.

type ImageElementState = { id: string; src: string; fit?: string; transform: { x: number; y: number; width: number; height: number; zIndex?: number } };
type SlideState = { id: string; layout: string; screenshot: string; label: Record<string, string>; headline: Record<string, string>; imageElements?: ImageElementState[] };
type ProjectState = { slidesByDevice: { iphone: SlideState[] } } & Record<string, unknown>;
type FakeState = { calls: number; last: { key: string; body: { model: string; response_format: unknown; input: { type: string; text: string }[] } } | null };

const slide = (id: string): SlideState => ({ id, layout: 'device-bottom', screenshot: '', label: { en: 'FEATURE' }, headline: { en: id } });
const project = (): ProjectState => ({
  schemaVersion: 3, appName: 'Backdrop Army', themeId: 'dark-bold', connectedCanvas: false, locales: ['en'], locale: 'en',
  device: 'iphone', orientation: 'portrait', slidesByDevice: { iphone: [slide('One'), slide('Two')] },
});

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

test('the inspector paints a backdrop for one screen, then all, then removes it', { timeout: 120_000 }, async ({ app, browser, screen }) => {
  await setMode('ok');
  const store = await mock(browser, project());
  await app.open('/');
  await expect(screen.getByRole('textbox', 'Headline')).toHaveValue('One');
  await screen.getByText(/^AI backdrop/).tap();
  await screen.getByRole('textbox', 'Backdrop description').fill('Warm amber light on charcoal');
  const before = (await fakeState()).calls;
  await screen.getByRole('button', 'Generate backdrop').tap();
  await expect(screen.getByText('Generate a backdrop?', { exact: true })).toBeVisible();
  await expect((await fakeState()).calls).toBe(before); // nothing is sent until confirmed
  await screen.getByRole('button', 'Generate', { exact: true }).tap();
  await expect(screen.getByRole('button', 'Generate another')).toBeVisible();

  await eventually(() => expect(backdropOf(store.state, 0)).toBeTruthy());
  await expect(backdropOf(store.state, 0)).toMatchObject({ fit: 'cover', transform: { x: 0, y: 0, width: 1320, height: 2868, zIndex: 1 } });
  await expect(backdropOf(store.state, 1)).toBeUndefined();
  const sent = (await fakeState()).last?.body;
  await expect(sent?.response_format).toMatchObject({ aspect_ratio: '9:16' });
  await expect(sent?.input[0].text).toContain('Warm amber light on charcoal');
  await expect(sent?.input[0].text).toContain('wordless');

  await screen.getByRole('button', 'Use on all screens').tap();
  await eventually(() => expect(backdropOf(store.state, 1)).toBeTruthy());
  await expect(backdropOf(store.state, 1)?.src).toBe(backdropOf(store.state, 0)?.src);

  await screen.getByRole('button', 'Remove').tap();
  await eventually(() => expect(backdropOf(store.state, 0)).toBeUndefined());
  await expect(backdropOf(store.state, 1)).toBeTruthy();
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
