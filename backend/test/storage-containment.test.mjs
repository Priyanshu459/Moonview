import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { resolveContainedPath } from '../dist/backend/src/services/storage/local.provider.js';

const root = path.resolve('test-storage-root');

test('resolves ordinary nested keys inside the storage root', () => {
  assert.equal(
    resolveContainedPath(root, path.join('hls', 'asset-1', 'master.m3u8')),
    path.join(root, 'hls', 'asset-1', 'master.m3u8'),
  );
});

test('rejects parent traversal and sibling prefix confusion', () => {
  assert.throws(() => resolveContainedPath(root, path.join('..', 'test-storage-root-evil', 'file.mp4')));
  assert.throws(() => resolveContainedPath(root, path.join('nested', '..', '..', 'secret.txt')));
});

test('rejects absolute paths but permits safe names beginning with two dots', () => {
  assert.throws(() => resolveContainedPath(root, path.resolve('outside.mp4')));
  assert.equal(resolveContainedPath(root, '..poster.jpg'), path.join(root, '..poster.jpg'));
});
