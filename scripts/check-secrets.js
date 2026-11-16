import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  '.cache',
]);

const rules = [
  ['private-key', /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['api-token', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['credential-url', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/gi],
  [
    'credential-assignment',
    /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|secret[_-]?key)\s*[=:]\s*["']([^"'\r\n]{8,})["']/gi,
  ],
  ['room-or-session-url', /[?&](?:s|room|space|invite|token)=([A-Za-z0-9_-]{4,})/gi],
  ['personal-filesystem-path', /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g],
  ['temporary-desktop-path', /\/private\/var\/folders\/[A-Za-z0-9/_-]+/g],
];

const placeholder =
  /^(?:EXAMPLE|PLACEHOLDER|YOUR_[A-Z_]+|REPLACE_[A-Z_]+|REDACTED|<[^>]+>|\$\{[^}]+\}|process\.[\w.]+)$/;
const confidentialArtifact = /\.(?:har|png|jpe?g|gif|webp|pdf|mp4|webm|zip|p12|pfx|pem|key)$/i;

/**
 * Find likely credentials and private context without returning matched values.
 * This is a focused pre-publication check, not a comprehensive secret detector.
 * @param {string} text
 * @param {string} [filePath]
 * @returns {{path: string, line: number, rule: string}[]}
 */
export function scanText(text, filePath = 'input') {
  const findings = [];
  for (const [rule, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match[1] && placeholder.test(match[1])) continue;
      findings.push({
        path: filePath,
        line: text.slice(0, match.index).split('\n').length,
        rule,
      });
    }
  }
  return findings;
}

/** @param {string} filePath */
export function scanFileName(filePath) {
  const name = basename(filePath);
  let rule;
  if (/^\.env(?:\.|$)/.test(name) && name !== '.env.example') rule = 'environment-file';
  else if (/^(?:id_(?:rsa|ed25519|ecdsa)|credentials|service-account(?:\.json)?)$/.test(name))
    rule = 'credential-file';
  else if (confidentialArtifact.test(name)) rule = 'private-artifact';
  else if (/^(?:main|ui)-[A-Za-z0-9_-]{6,}\.(?:js|css)$/.test(name))
    rule = 'downloaded-site-bundle';
  return rule ? [{ path: filePath, line: 1, rule }] : [];
}

/**
 * Scan the working tree, including untracked files; do not follow symbolic links.
 * @param {string} root
 */
export async function scanDirectory(root) {
  const findings = [];
  let filesScanned = 0;
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = join(directory, entry.name);
      const filePath = relative(root, absolutePath).split('\\').join('/');
      if (entry.isSymbolicLink()) {
        findings.push({ path: filePath, line: 1, rule: 'symbolic-link' });
      } else if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await visit(absolutePath);
      } else if (entry.isFile()) {
        findings.push(...scanFileName(filePath));
        const buffer = await readFile(absolutePath);
        filesScanned++;
        if (buffer.includes(0)) {
          if (!confidentialArtifact.test(extname(entry.name)))
            findings.push({ path: filePath, line: 1, rule: 'unreviewed-binary' });
          continue;
        }
        findings.push(...scanText(buffer.toString('utf8'), filePath));
      }
    }
  }
  await visit(resolve(root));
  return { filesScanned, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await scanDirectory(process.cwd());
  if (result.findings.length) {
    for (const finding of result.findings)
      console.error(`${finding.path}:${finding.line}: ${finding.rule}`);
    console.error(
      `Privacy check failed: ${result.findings.length} finding(s). Values are redacted.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Privacy check passed: ${result.filesScanned} files scanned.`);
  }
}
