#!/usr/bin/env node
// Production migration tool for offloading public/images/rentals/ (632 MB, 6,657 files)
// from Git / Cloudflare Worker assets into a Cloudflare R2 bucket.
//
// Prerequisites (once in Cloudflare Dashboard):
//   1. Enable R2 in Cloudflare Dashboard -> R2 Object Storage.
//   2. Create public bucket (default: miami-elio-media) and attach custom domain
//      (e.g., https://media.gorgona-one.com).
//
// Usage:
//   Dry run (verifies file count, sizes & Sunset SHA-256 manifest):
//     node scripts/media/migrate-rentals-to-r2.mjs --dry-run
//
//   Live upload to Cloudflare R2 (uses Wrangler authenticated session):
//     node scripts/media/migrate-rentals-to-r2.mjs --bucket=miami-elio-media --concurrency=8
//
//   After verifying 100% upload + live CDN 200 OK, set build variable:
//     NEXT_PUBLIC_RENTALS_MEDIA_BASE_URL=https://media.gorgona-one.com

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const PUBLIC_DIR = path.join(REPO, 'public');
const RENTALS_DIR = path.join(PUBLIC_DIR, 'images', 'rentals');
const MANIFEST_PATH = path.join(REPO, 'docs', 'sunset-import', 'assets.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const dryRun = Boolean(args['dry-run']);
const bucket = String(args.bucket || 'miami-elio-media');
const concurrency = Math.max(1, Math.min(16, Number(args.concurrency || 6)));
const limit = args.limit ? Number(args.limit) : Infinity;

const MIME = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif'
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function uploadObject(key, filePath, contentType) {
  return new Promise((resolve, reject) => {
    const wranglerBin = path.join(REPO, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    const useDirect = fs.existsSync(wranglerBin);
    const cmd = useDirect ? process.execPath : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const cmdArgs = useDirect
      ? [
          wranglerBin, 'r2', 'object', 'put',
          `${bucket}/${key}`,
          '--file', filePath,
          '--content-type', contentType,
          '--cache-control', 'public, max-age=31536000, immutable',
          '--remote'
        ]
      : [
          'wrangler', 'r2', 'object', 'put',
          `${bucket}/${key}`,
          '--file', filePath,
          '--content-type', contentType,
          '--cache-control', 'public, max-age=31536000, immutable',
          '--remote'
        ];
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler exit ${code} for ${key}: ${stderr.trim()}`));
    });
  });
}

async function main() {
  if (!fs.existsSync(RENTALS_DIR)) {
    throw new Error(`Rentals media directory not found: ${RENTALS_DIR}`);
  }
  const files = walk(RENTALS_DIR).sort().slice(0, limit);
  let totalBytes = 0;
  for (const file of files) totalBytes += fs.statSync(file).size;

  // Verify Sunset SHA-256 manifest integrity before any upload
  let verifiedSha = 0;
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    for (const asset of manifest.assets || []) {
      const disk = path.join(PUBLIC_DIR, asset.path);
      if (!fs.existsSync(disk)) throw new Error(`Missing manifest asset: ${asset.path}`);
      if (dryRun && asset.publishedSha256) {
        const digest = createHash('sha256').update(fs.readFileSync(disk)).digest('hex');
        if (digest !== asset.publishedSha256) {
          throw new Error(`SHA-256 mismatch for ${asset.path}`);
        }
        verifiedSha += 1;
      }
    }
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'upload',
    bucket,
    concurrency,
    fileCount: files.length,
    totalMB: +(totalBytes / 1048576).toFixed(2),
    manifestShaVerified: verifiedSha
  }, null, 2));

  if (dryRun) return;

  let index = 0;
  let uploaded = 0;
  const failed = [];

  async function worker() {
    while (index < files.length) {
      const file = files[index++];
      const key = path.relative(PUBLIC_DIR, file).replace(/\\/g, '/');
      const ext = path.extname(file).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      try {
        await uploadObject(key, file, contentType);
        uploaded += 1;
        if (uploaded % 100 === 0 || uploaded === files.length) {
          console.log(`Uploaded ${uploaded}/${files.length} (${key})`);
        }
      } catch (err) {
        failed.push({ key, error: err.message });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(JSON.stringify({ uploaded, failedCount: failed.length, failed: failed.slice(0, 20) }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
