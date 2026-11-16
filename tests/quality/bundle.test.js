import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { buildBrowserBundle } from '../../scripts/build.js';

test('builds an inert standalone browser API with a matching integrity digest', async () => {
  const result = await buildBrowserBundle();
  const bundleUrl = new URL('../../dist/pixel-snake-autoplay.js', import.meta.url);
  const code = await readFile(bundleUrl, 'utf8');
  const sha256 = createHash('sha256').update(code).digest('hex');
  assert.equal(result.sha256, sha256);
  const digest = await readFile(new URL(`${bundleUrl.href}.sha256`), 'utf8');
  assert.equal(digest, `${sha256}  pixel-snake-autoplay.js\n`);

  const forbidden = new Proxy(
    {},
    {
      get() {
        throw new Error('Bundle touched the browser before install().');
      },
    },
  );
  const sandbox = vm.createContext({ window: forbidden, document: forbidden });
  vm.runInContext(code, sandbox, { filename: fileURLToPath(bundleUrl), timeout: 1000 });
  assert.equal(typeof sandbox.PixelSnakeAutoplay.install, 'function');
  assert.equal(result.bytes, Buffer.byteLength(code));
  assert.ok(!code.includes('sourceMappingURL='));
});
