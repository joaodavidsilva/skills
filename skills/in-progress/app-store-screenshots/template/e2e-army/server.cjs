// Starts the editor against a disposable copy of itself: API writes, uploads and
// font imports resolve from the copy's root, so they never touch a real project.
const { cpSync, mkdtempSync, symlinkSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { startFakeGemini } = require('./fake-gemini.cjs');
const source = path.resolve(__dirname, '..');
const workspace = mkdtempSync(path.join(tmpdir(), 'screenshots-e2e-'));
cpSync(source, workspace, { recursive: true, filter: p => {
  const first = path.relative(source, p).split(path.sep)[0];
  return !['node_modules', 'dist', '.e2e', '.git', 'tests', 'e2e-army'].includes(first);
}});
symlinkSync(path.join(source, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
const production = process.env.SCREENSHOTS_E2E_PRODUCTION === '1';
if (production) cpSync(path.join(source, 'dist'), path.join(workspace, 'dist'), { recursive: true });
console.log(`Disposable editor workspace: ${workspace}`);
const vite = path.join(source, 'node_modules/vite/bin/vite.js');
const port = Number(process.argv[2] || 4312);
const args = [vite, ...(production ? ['preview'] : []), '--host', '0.0.0.0', '--port', String(port), '--strictPort'];
// The backdrop route talks to a local fake one port up, never to Google, whatever
// key the developer has exported. SCREENSHOTS_E2E_PORT + 1 is where tests read it.
const fakeGemini = startFakeGemini(port + 1);
const env = { ...process.env, GEMINI_API_KEY: 'e2e-key', GEMINI_API_BASE_URL: `http://127.0.0.1:${port + 1}` };
const child = spawn(process.execPath, args, { cwd: workspace, stdio: 'inherit', env });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopping = true; child.kill(signal); });
child.on('exit', (code, signal) => { fakeGemini.close(); rmSync(workspace, { recursive: true, force: true }); process.exit(stopping ? 0 : code ?? (signal ? 1 : 0)); });
