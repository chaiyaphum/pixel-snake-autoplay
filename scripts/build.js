import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { scanText } from './check-secrets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const name = 'pixel-snake-autoplay.js';

/** Build a reviewable browser artifact with no automatic game start. */
export async function buildBrowserBundle() {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'iife',
    globalName: 'PixelSnakeAutoplay',
    platform: 'browser',
    target: ['es2022'],
    minify: false,
    sourcemap: false,
    legalComments: 'none',
    charset: 'utf8',
    write: false,
    outfile: `dist/${name}`,
    banner: { js: '/* Pixel Snake Autoplay | MIT | Run install() and start() explicitly. */' },
  });
  const code = result.outputFiles[0].text;
  const findings = scanText(code, `dist/${name}`);
  if (findings.length)
    throw new Error(`Generated bundle failed the privacy check (${findings.length} finding(s)).`);
  const directory = resolve(root, 'dist');
  const hash = createHash('sha256').update(code).digest('hex');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, name), code);
  await writeFile(resolve(directory, `${name}.sha256`), `${hash}  ${name}\n`);
  return { path: `dist/${name}`, bytes: Buffer.byteLength(code), sha256: hash };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildBrowserBundle();
  console.log(`Built ${result.path} (${result.bytes} bytes).`);
  console.log(`SHA-256: ${result.sha256}`);
}
