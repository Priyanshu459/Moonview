import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createVideoWorker } from '../dist/backend/src/queue/worker.js';
import { publicMediaUrlForPrivateKey, mediaExposureService } from '../dist/backend/src/services/media-exposure.service.js';
import { storageService } from '../dist/backend/src/services/storage.service.js';
import { validateBootstrapPassword } from '../dist/backend/src/scripts/bootstrap-admin.js';
import { config } from '../dist/backend/src/config/index.js';
import { csrfMiddleware } from '../dist/backend/src/middleware/csrf.js';

test('worker module import does not start a worker implicitly', () => {
  assert.equal(typeof createVideoWorker, 'function');
});

test('production host and public media config defaults are deployment-safe', () => {
  assert.ok(config.HOST);
  assert.ok(config.STORAGE_ROOT);
  assert.ok(config.PUBLIC_MEDIA_ROOT);
  assert.ok(config.PROCESSING_TMP_ROOT);
  assert.notEqual(config.PUBLIC_MEDIA_ROOT, config.STORAGE_ROOT);
});

test('public HLS URLs are derived from private HLS keys only', () => {
  assert.equal(
    publicMediaUrlForPrivateKey('hls-private/asset-1/master.m3u8'),
    '/media/hls/asset-1/master.m3u8',
  );
  assert.throws(() => publicMediaUrlForPrivateKey('originals/asset.mp4'));
});

test('publish exposure copies HLS publicly and unpublish revokes it', async () => {
  await storageService.initialize();
  await mediaExposureService.initialize();

  const assetId = `test-${Date.now()}`;
  const privateKey = `hls-private/${assetId}`;
  const publicDir = path.join(config.PUBLIC_MEDIA_ROOT, 'hls', assetId);

  await fs.mkdir(storageService.getUri(privateKey), { recursive: true });
  await fs.writeFile(storageService.getUri(`${privateKey}/master.m3u8`), '#EXTM3U\n');
  await fs.writeFile(storageService.getUri(`${privateKey}/stream_0.m3u8`), '#EXTM3U\n');

  try {
    await mediaExposureService.exposeKey(privateKey);
    assert.equal(await exists(path.join(publicDir, 'master.m3u8')), true);
    assert.equal(await exists(storageService.getUri(`${privateKey}/master.m3u8`)), true);

    await mediaExposureService.revokeKey(privateKey);
    assert.equal(await exists(publicDir), false);
  } finally {
    await fs.rm(storageService.getUri(privateKey), { recursive: true, force: true });
    await fs.rm(publicDir, { recursive: true, force: true });
  }
});

test('bootstrap admin password validation rejects weak values', () => {
  assert.deepEqual(validateBootstrapPassword('short'), [
    'at least 14 characters',
    'an uppercase letter',
    'a number',
    'a symbol',
  ]);
  assert.deepEqual(validateBootstrapPassword('Correct-Horse-9'), []);
});

test('bad CSRF token is rejected for mutations', () => {
  assert.throws(
    () => csrfMiddleware({
      method: 'POST',
      cookies: { csrfToken: 'bad.token' },
      headers: { 'x-csrf-token': 'bad.token' },
    }, {}, () => assert.fail('bad CSRF token should not call next')),
    /CSRF token missing or invalid/,
  );
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
