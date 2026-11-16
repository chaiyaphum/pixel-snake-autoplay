import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanDirectory, scanFileName, scanText } from '../../scripts/check-secrets.js';

test('reports credential categories and line numbers without revealing matched values', () => {
  const secret = ['ghp_', 'A'.repeat(36)].join('');
  const text = `normal code\nconst credential = '${secret}';\n`;
  const findings = scanText(text, 'fixture.js');
  assert.deepEqual(findings, [{ path: 'fixture.js', line: 2, rule: 'github-token' }]);
  assert.ok(!JSON.stringify(findings).includes(secret));
});

test('recognizes private keys, API keys, access keys, and password-bearing URLs', () => {
  const samples = [
    [['-----BEGIN ', 'PRIVATE KEY-----'].join(''), 'private-key'],
    [['AK', 'IA', 'A'.repeat(16)].join(''), 'aws-access-key'],
    [['sk-', 'z'.repeat(32)].join(''), 'api-token'],
    [['xoxb-', 'z'.repeat(24)].join(''), 'slack-token'],
    [['https://user:', 'confidential-value', '@example.invalid'].join(''), 'credential-url'],
    [`password = '${'sensitive'.repeat(3)}'`, 'credential-assignment'],
  ];
  for (const [value, rule] of samples) {
    assert.ok(
      scanText(value).some((finding) => finding.rule === rule),
      rule,
    );
  }
});

test('rejects private room context and personal filesystem paths', () => {
  const samples = [
    [['https://example.invalid/?', 's=', 'private-room'].join(''), 'room-or-session-url'],
    [['/', 'Users', '/private-person/project/'].join(''), 'personal-filesystem-path'],
    [['/', 'home', '/private-person/project/'].join(''), 'personal-filesystem-path'],
    [['/private/', 'var/folders/ab/cdef/'].join(''), 'temporary-desktop-path'],
  ];
  for (const [value, rule] of samples) assert.equal(scanText(value)[0].rule, rule);
});

test('accepts explicit placeholders and ordinary application configuration', () => {
  assert.deepEqual(scanText("const targetScore = 3010; const password = 'YOUR_PASSWORD';"), []);
  assert.deepEqual(scanText(['https://example.invalid/?', 's=PLACEHOLDER'].join('')), []);
  assert.deepEqual(scanText('const token = process.env.TOKEN;'), []);
});

test('does not treat ordinary secret-like values as placeholders based on a prefix', () => {
  for (const value of ['test_private_value', 'example-private-value', 'your-secret-value']) {
    const findings = scanText(`password = '${value}'`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'credential-assignment');
  }
});

test('classifies sensitive filenames but permits an example environment file', () => {
  for (const name of ['.env', '.env.production', 'id_rsa', 'credentials', 'service-account.json'])
    assert.equal(scanFileName(name).length, 1, name);
  for (const name of ['screen.png', 'capture.har', 'archive.zip', 'main-abcdef12.js'])
    assert.equal(scanFileName(name).length, 1, name);
  assert.deepEqual(scanFileName('.env.example'), []);
  assert.deepEqual(scanFileName('src/core/cycle-planner.js'), []);
});

test('scans untracked files and skips dependency/build directories without following links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'snake-privacy-'));
  try {
    await mkdir(join(root, 'node_modules'));
    await mkdir(join(root, 'src'));
    const secret = ['ghp_', 'B'.repeat(36)].join('');
    await writeFile(join(root, 'node_modules', 'dependency.js'), secret);
    await writeFile(join(root, 'src', 'untracked.js'), secret);
    await writeFile(join(root, '.env'), 'NOT_A_SECRET=example\n');
    await writeFile(join(root, 'unknown.bin'), Buffer.from([0, 1, 2]));
    await symlink(join(root, 'src'), join(root, 'linked-source'));
    const result = await scanDirectory(root);
    assert.equal(result.filesScanned, 3);
    assert.deepEqual(
      result.findings.map((finding) => finding.rule).sort(),
      ['environment-file', 'github-token', 'symbolic-link', 'unreviewed-binary'].sort(),
    );
    assert.ok(result.findings.every((finding) => !finding.path.includes('node_modules')));
    assert.ok(!JSON.stringify(result).includes(secret));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
