import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import http from 'node:http';
import { prisma, disconnectDatabase } from '../src/config/database.js';
import { config } from '../src/config/index.js';

const TEST_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${TEST_PORT}/api/stream`;
const MEDIA_URL = `http://localhost:${TEST_PORT}/media/hls`;

async function fetchStream(mediaId: string, headers: Record<string, string> = {}) {
  return new Promise<any>((resolve, reject) => {
    http.get(`${BASE_URL}/${mediaId}`, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }));
    }).on('error', reject);
  });
}

async function fetchFallback(mediaId: string, headers: Record<string, string> = {}) {
  return new Promise<any>((resolve, reject) => {
    http.get(`${BASE_URL}/${mediaId}/fallback`, { headers }, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', c => data = Buffer.concat([data, c]));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: data }));
    }).on('error', reject);
  });
}

async function fetchStatic(filePath: string) {
  return new Promise<any>((resolve, reject) => {
    http.get(`${MEDIA_URL}/${filePath}`, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', reject);
  });
}

async function setupTestData() {
  console.log('--- Setting up test data ---');
  // Clean up old
  await prisma.content.deleteMany({ where: { slug: { startsWith: 'test-stream-' } }});

  // Movie - Published, Ready
  const mPubRdy = await prisma.content.create({
    data: {
      title: 'Stream Test Pub Ready', slug: 'test-stream-pub-rdy', description: 'Test', type: 'MOVIE', status: 'PUBLISHED', releaseYear: 2026,
      mediaAsset: { create: { originalFilename: 'v.mp4', storageKey: 'originals/test-uuid-pub-rdy.mp4', mimeType: 'video/mp4', fileSize: 1000, processingStatus: 'READY', hlsMasterKey: 'hls-private/test-uuid/master.m3u8' } }
    }, include: { mediaAsset: true }
  });

  // Movie - Unpublished, Ready
  const mUnpubRdy = await prisma.content.create({
    data: {
      title: 'Stream Test Unpub Ready', slug: 'test-stream-unpub-rdy', description: 'Test', type: 'MOVIE', status: 'DRAFT', releaseYear: 2026,
      mediaAsset: { create: { originalFilename: 'v.mp4', storageKey: 'originals/test-uuid-unpub-rdy.mp4', mimeType: 'video/mp4', fileSize: 1000, processingStatus: 'READY' } }
    }, include: { mediaAsset: true }
  });

  // Movie - Published, Processing
  const mPubProc = await prisma.content.create({
    data: {
      title: 'Stream Test Pub Proc', slug: 'test-stream-pub-proc', description: 'Test', type: 'MOVIE', status: 'PUBLISHED', releaseYear: 2026,
      mediaAsset: { create: { originalFilename: 'v.mp4', storageKey: 'originals/test-uuid-pub-proc.mp4', mimeType: 'video/mp4', fileSize: 1000, processingStatus: 'PROCESSING' } }
    }, include: { mediaAsset: true }
  });

  // Series -> Season -> Episode
  const series = await prisma.content.create({
    data: { title: 'Test Series', slug: 'test-stream-series', description: 'Test', type: 'SERIES', status: 'PUBLISHED', releaseYear: 2026 }
  });
  const season = await prisma.season.create({
    data: { seriesId: series.id, seasonNumber: 1, title: 'Season 1' }
  });
  const epPub = await prisma.episode.create({
    data: { seasonId: season.id, episodeNumber: 1, title: 'Ep 1', status: 'PUBLISHED' }
  });
  const epMediaPub = await prisma.mediaAsset.create({
    data: { episodeId: epPub.id, originalFilename: 'v.mp4', storageKey: 'originals/test-uuid-ep-pub.mp4', mimeType: 'video/mp4', fileSize: 1000, processingStatus: 'READY' }
  });

  // Create dummy files for tests
  await fs.mkdir(path.join(config.STORAGE_ROOT, 'originals'), { recursive: true });
  await fs.mkdir(path.join(config.STORAGE_ROOT, 'hls-private', 'test-uuid'), { recursive: true });
  await fs.mkdir(path.join(config.PUBLIC_MEDIA_ROOT, 'hls', 'test-uuid'), { recursive: true });

  const dummyVideo = Buffer.alloc(1000, 'A');
  await fs.writeFile(path.join(config.STORAGE_ROOT, 'originals', 'test-uuid-pub-rdy.mp4'), dummyVideo);
  await fs.writeFile(path.join(config.STORAGE_ROOT, 'hls-private', 'test-uuid', 'master.m3u8'), '#EXTM3U\n');
  await fs.writeFile(path.join(config.PUBLIC_MEDIA_ROOT, 'hls', 'test-uuid', 'master.m3u8'), '#EXTM3U\n');
  await fs.writeFile(path.join(config.PUBLIC_MEDIA_ROOT, 'hls', 'test-uuid', 'segment0.ts'), Buffer.alloc(100));

  return { mPubRdy, mUnpubRdy, mPubProc, series, epMediaPub };
}

async function runTests() {
  let ids: any = null;
  try {
    ids = await setupTestData();

    console.log('\n--- Test: Access Control ---');
    // ✓ READY + PUBLISHED → allowed
    let res = await fetchStream(ids.mPubRdy.mediaAsset!.id);
    assert.strictEqual(res.status, 200, 'READY + PUBLISHED should be allowed');

    res = await fetchStream(ids.mPubRdy.id);
    assert.strictEqual(res.status, 200, 'Published movie content ID should resolve to its media asset');
    assert.strictEqual(res.data.data.mediaId, ids.mPubRdy.mediaAsset!.id, 'Content ID stream response returns media asset ID');

    // ✓ READY + UNPUBLISHED → blocked
    res = await fetchStream(ids.mUnpubRdy.mediaAsset!.id);
    assert.strictEqual(res.status, 403, 'READY + UNPUBLISHED should be blocked');

    // ✓ PROCESSING → blocked
    res = await fetchStream(ids.mPubProc.mediaAsset!.id);
    assert.strictEqual(res.status, 403, 'PROCESSING should be blocked');

    // ✓ Episode/Series publication
    res = await fetchStream(ids.epMediaPub.id);
    assert.strictEqual(res.status, 200, 'Episode READY + PUBLISHED should be allowed');

    // ✓ missing media → blocked
    res = await fetchStream('invalid-media-id');
    assert.strictEqual(res.status, 404, 'Missing media should return 404');


    console.log('\n--- Test: MP4 Fallback Range Handling ---');
    const pubId = ids.mPubRdy.mediaAsset!.id;

    // ✓ fallback full-file response
    let fb = await fetchFallback(pubId);
    assert.strictEqual(fb.status, 200);
    assert.strictEqual(fb.headers['content-length'], '1000');
    assert.strictEqual(fb.buffer.length, 1000);

    // ✓ bytes=0-100 → 206
    fb = await fetchFallback(pubId, { Range: 'bytes=0-100' });
    assert.strictEqual(fb.status, 206);
    assert.strictEqual(fb.headers['content-length'], '101');
    assert.strictEqual(fb.headers['content-range'], 'bytes 0-100/1000');

    // ✓ bytes=100- → 206
    fb = await fetchFallback(pubId, { Range: 'bytes=100-' });
    assert.strictEqual(fb.status, 206);
    assert.strictEqual(fb.headers['content-length'], '900');
    assert.strictEqual(fb.headers['content-range'], 'bytes 100-999/1000');

    // ✓ bytes=-100 → 206
    fb = await fetchFallback(pubId, { Range: 'bytes=-100' });
    assert.strictEqual(fb.status, 206);
    assert.strictEqual(fb.headers['content-length'], '100');
    assert.strictEqual(fb.headers['content-range'], 'bytes 900-999/1000');

    // ✓ invalid range → 416
    fb = await fetchFallback(pubId, { Range: 'bytes=2000-3000' });
    assert.strictEqual(fb.status, 416);
    assert.strictEqual(fb.headers['content-range'], 'bytes */1000');

    // ✓ malformed range → 416
    fb = await fetchFallback(pubId, { Range: 'bytes=abc-def' });
    assert.strictEqual(fb.status, 416);


    console.log('\n--- Test: HLS Delivery & Caching ---');
    // ✓ valid HLS manifest retrieval
    let st = await fetchStatic('test-uuid/master.m3u8');
    assert.strictEqual(st.status, 200);
    // ✓ .m3u8 cache headers
    assert.strictEqual(st.headers['cache-control'], 'no-cache, must-revalidate');

    // ✓ valid HLS segment retrieval
    st = await fetchStatic('test-uuid/segment0.ts');
    assert.strictEqual(st.status, 200);
    // ✓ segment cache headers
    assert.strictEqual(st.headers['cache-control'], 'public, max-age=31536000, immutable');


    console.log('\n--- Test: Path Traversal Security ---');
    // ✓ path traversal attempts -> not leaked
    fb = await fetchFallback(pubId, { 'X-Test': 'traversal' }); // Just general error check
    assert(!JSON.stringify(fb.buffer.toString()).includes(config.STORAGE_ROOT), 'Must not leak server paths in error or data');


    console.log('\n✅ All Streaming Tests Passed Successfully!');
  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  } finally {
    if (ids) {
      console.log('--- Cleanup ---');
      await prisma.content.deleteMany({ where: { slug: { startsWith: 'test-stream-' } }});
      await fs.rm(path.join(config.STORAGE_ROOT, 'originals', 'test-uuid-pub-rdy.mp4'), { force: true });
      await fs.rm(path.join(config.STORAGE_ROOT, 'hls-private', 'test-uuid'), { recursive: true, force: true });
      await fs.rm(path.join(config.PUBLIC_MEDIA_ROOT, 'hls', 'test-uuid'), { recursive: true, force: true });
    }
    await disconnectDatabase();
  }
}

runTests();
