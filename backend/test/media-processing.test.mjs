import assert from 'node:assert/strict';
import test from 'node:test';
import { getTargetResolutions } from '../dist/backend/src/utils/ffmpeg.js';
import { safeProcessingFailure } from '../dist/backend/src/jobs/process-video.job.js';
import { MediaProcessError } from '../dist/backend/src/utils/media-process.js';

test('HLS ladder never selects a resolution larger than the source', () => {
  assert.deepEqual(getTargetResolutions(640, 360).map((item) => item.name), ['360p']);
  assert.deepEqual(getTargetResolutions(1280, 720).map((item) => item.name), ['720p', '480p', '360p']);
  assert.deepEqual(getTargetResolutions(1920, 1080).map((item) => item.name), ['1080p', '720p', '480p', '360p']);
  assert.deepEqual(getTargetResolutions(640, 352), []);
});

test('stored processing failures are useful but never expose internal paths', () => {
  const failure = new MediaProcessError(
    'EXITED',
    'FFprobe failed',
    'C:\\private\\moonview\\originals\\movie.mp4: No such file or directory',
  );
  const safe = safeProcessingFailure(failure);
  assert.equal(safe, 'Source media is missing or unavailable');
  assert.doesNotMatch(safe, /private|originals|movie\.mp4/i);
});

test('disk-full and timeout failures map to terminal-safe reasons', () => {
  assert.equal(safeProcessingFailure(new Error('ENOSPC')), 'Media processing failed because storage is full');
  assert.equal(safeProcessingFailure(new Error('operation timed out')), 'Media processing timed out');
});
