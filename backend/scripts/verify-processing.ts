import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { prisma } from '../src/config/database.js';
import { storageService } from '../src/services/storage.service.js';
import { config } from '../src/config/index.js';

// Setup testing configurations
const TEST_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const TEST_ADMIN_EMAIL = 'admin_proc_test@example.com';
const TEST_ADMIN_PASS = 'TestProcSecurePass123!';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function getAdminSession() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASS }),
  });
  await loginRes.json();
  const cookies = loginRes.headers.getSetCookie().map((value) => value.split(';', 1)[0]);
  const csrfCookie = cookies.find((value) => value.startsWith('csrfToken='));
  return {
    cookie: cookies.join('; '),
    csrfToken: csrfCookie ? decodeURIComponent(csrfCookie.split('=', 2)[1] ?? '') : '',
  };
}

async function setupAdmin() {
  const { hash } = await import('argon2');
  const passwordHash = await hash(TEST_ADMIN_PASS);
  await prisma.admin.upsert({
    where: { email: TEST_ADMIN_EMAIL },
    update: { passwordHash, name: 'Processing Test Admin' },
    create: { email: TEST_ADMIN_EMAIL, name: 'Processing Test Admin', passwordHash },
  });
}

function createTestVideo(filename: string, resolution = '640x360') {
  const outPath = path.resolve(filename);
  console.log(`Generating test video: ${outPath}...`);
  const result = spawnSync(config.FFMPEG_PATH, [
    '-f', 'lavfi',
    '-i', `testsrc=duration=2:size=${resolution}:rate=24`,
    '-f', 'lavfi',
    '-i', 'sine=frequency=1000:duration=2',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-y',
    outPath,
  ]);
  if (result.status !== 0) {
    throw new Error(`Failed to generate test video: ${result.error?.message ?? result.stderr?.toString() ?? 'unknown error'}`);
  }
  return outPath;
}

async function uploadVideoFile(filePath: string, session: { cookie: string; csrfToken: string }) {
  const fileContent = fsSync.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileContent], { type: 'video/mp4' }), path.basename(filePath));

  const response = await fetch(`http://localhost:${TEST_PORT}/api/uploads/video`, {
    method: 'POST',
    headers: { Cookie: session.cookie, 'X-CSRF-Token': session.csrfToken },
    body: formData,
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(`Upload failed: ${response.status} ${JSON.stringify(payload)}`);
  return payload.data as { mediaAssetId: string; uploadId: string };
}

async function pollJobStatus(jobId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await prisma.uploadJob.findUnique({ where: { id: jobId }, include: { mediaAsset: true } });
    if (!job) throw new Error('Job not found');
    
    if (job.status === 'READY' || job.status === 'FAILED') {
      return job;
    }
    await delay(1000);
  }
  throw new Error('Timeout waiting for job completion');
}

async function runTests() {
  console.log('🧪 Starting Phase 6 Processing Verification Suite...');
  
  await setupAdmin();
  const session = await getAdminSession();
  if (!session.cookie || !session.csrfToken) throw new Error('Failed to get authenticated CSRF session');

  const testVideoPath = createTestVideo('test_proc_video.mp4');
  const corruptVideoPath = path.resolve('test_proc_bad.mp4');
  await fs.writeFile(corruptVideoPath, Buffer.from('this is not a valid video file at all'));

  const createdMediaIds: string[] = [];
  const createdUploadIds: string[] = [];

  try {
    // ----------------------------------------------------
    console.log('\n--- Test: Valid processing pipeline ---');
    const uploadData = await uploadVideoFile(testVideoPath, session);
    createdMediaIds.push(uploadData.mediaAssetId);
    createdUploadIds.push(uploadData.uploadId);
    
    const completedJob = await pollJobStatus(uploadData.uploadId);
    assert.strictEqual(completedJob.status, 'READY', `Expected READY, got ${completedJob.status}. Error: ${completedJob.errorMessage}`);
    
    const media = completedJob.mediaAsset;
    assert.ok(media, 'MediaAsset must exist');
    assert.strictEqual(media.processingStatus, 'READY');
    assert.strictEqual(media.width, 640);
    assert.strictEqual(media.height, 360);
    
    // Check HLS files in storage
    const hasMaster = await storageService.exists(media.hlsMasterKey!);
    assert.ok(hasMaster, 'HLS master playlist missing');
    
    // Check thumbnail in storage
    const hasThumb = await storageService.exists(media.thumbnailKey!);
    assert.ok(hasThumb, 'Thumbnail missing');

    // Check VideoVariants
    const variants = await prisma.videoVariant.findMany({ where: { mediaAssetId: media.id } });
    // Since source is 360p, only 360p should be generated (unless 360p is exact match, which generates exactly 360p)
    assert.strictEqual(variants.length, 1, 'Expected exactly 1 variant (360p)');
    assert.strictEqual(variants[0].resolution, 'RES_360P');
    
    console.log('✅ [PASS] Valid processing generates HLS, thumbnail, and variants safely');

    // ----------------------------------------------------
    console.log('\n--- Test: Corrupt video failure handling ---');
    const corruptPath = path.resolve('./corrupt_video.mp4');
    // Write MP4 magic bytes (ftyp) followed by junk, so MagicByteValidator passes it to FFprobe
    const magic = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
    const junk = Buffer.from('This is completely invalid MP4 data! It has no valid container.', 'utf8');
    await fs.writeFile(corruptPath, Buffer.concat([magic, junk]));
    
    const badUploadData = await uploadVideoFile(corruptPath, session);
    createdMediaIds.push(badUploadData.mediaAssetId);
    createdUploadIds.push(badUploadData.uploadId);

    const failedJob = await pollJobStatus(badUploadData.uploadId);
    assert.strictEqual(failedJob.status, 'FAILED');
    assert.strictEqual(failedJob.mediaAsset?.processingStatus, 'FAILED');
    assert.ok(failedJob.errorMessage, 'Expected error message for corrupt file');

    console.log('✅ [PASS] Corrupt video is rejected and marked FAILED gracefully');

  } finally {
    console.log('\n--- Cleanup ---');
    for (const uId of createdUploadIds) {
      await prisma.uploadJob.delete({ where: { id: uId } }).catch(() => {});
    }
    for (const mId of createdMediaIds) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: mId } });
      if (asset) {
        // delete variants
        await prisma.videoVariant.deleteMany({ where: { mediaAssetId: mId } }).catch(() => {});
        // delete from storage
        await storageService.delete(asset.storageKey).catch(() => {});
        await fs.rm(storageService.getUri(`hls-private/${mId}`), { recursive: true, force: true }).catch(() => {});
        await fs.rm(storageService.getUri(`posters/${mId}`), { recursive: true, force: true }).catch(() => {});
        await prisma.mediaAsset.delete({ where: { id: mId } }).catch(() => {});
      }
    }
    await fs.rm(testVideoPath, { force: true }).catch(() => {});
    await fs.rm(path.resolve('./corrupt_video.mp4'), { force: true }).catch(() => {});
    await fs.rm(corruptVideoPath, { force: true }).catch(() => {});
    await prisma.$disconnect();
  }
}

runTests().catch(err => {
  console.error('\n❌ Verification script failed:', err);
  process.exit(1);
});
