import assert from 'node:assert';
import { Readable } from 'node:stream';
import { storageService } from '../src/services/storage.service.js';
import { LocalStorageProvider } from '../src/services/storage/local.provider.js';

async function streamToString(stream: Readable): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function verifyStorage() {
  console.log('🧪 Starting Phase 4 Storage Verification Suite...\n');

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Initialization
    // -----------------------------------------------------------------------
    console.log('--- Test: Directory Initialization ---');
    await storageService.initialize();
    console.log('✅ [PASS] Directories initialized successfully');

    // -----------------------------------------------------------------------
    // TEST 2: Normal save/read/delete/exists
    // -----------------------------------------------------------------------
    console.log('\n--- Test: Basic Storage Operations ---');
    const testKey = storageService.generateKey('originals', 'test-file.txt');
    assert(testKey.startsWith('originals/'), 'Key generated in correct folder');
    assert(testKey.endsWith('.txt'), 'Key preserves extension');
    
    const testContent = 'Hello, Moonview Storage!';
    await storageService.save(testKey, Buffer.from(testContent));
    console.log('✅ [PASS] File saved successfully');

    assert(await storageService.exists(testKey), 'File exists check returns true');
    console.log('✅ [PASS] Existence check works');

    const meta = await storageService.getMetadata(testKey);
    assert(meta.size === Buffer.byteLength(testContent), 'Metadata returns correct size');
    console.log('✅ [PASS] Metadata returns correct size');

    const readStream = await storageService.read(testKey);
    const readContent = await streamToString(readStream);
    assert(readContent === testContent, 'Read content matches saved content');
    console.log('✅ [PASS] Stream reading works');

    await storageService.delete(testKey);
    assert(!(await storageService.exists(testKey)), 'File exists check returns false after deletion');
    console.log('✅ [PASS] File deletion works');

    // -----------------------------------------------------------------------
    // TEST 3: Missing File
    // -----------------------------------------------------------------------
    console.log('\n--- Test: Missing File Handling ---');
    try {
      await storageService.read('originals/does-not-exist.mp4');
      assert.fail('Should have thrown error on missing file');
    } catch (err: any) {
      assert(err.message === 'File not found', 'Throws "File not found" error on read');
      console.log('✅ [PASS] Read throws on missing file');
    }

    // -----------------------------------------------------------------------
    // TEST 4: Path Traversal Defenses
    // -----------------------------------------------------------------------
    console.log('\n--- Test: Path Traversal & Security ---');
    
    // We instantiate a direct provider to bypass generateKey for raw testing
    const provider = new LocalStorageProvider();
    await provider.initialize();

    const traversalKeys = [
      '../secret.txt',
      '..\\secret.txt',
      'originals/../../secret.txt',
      '/etc/passwd',
      'C:\\Windows\\System32\\cmd.exe',
      '\\\\server\\share\\file.txt'
    ];

    for (const badKey of traversalKeys) {
      try {
        await provider.save(badKey, Buffer.from('malicious'));
        assert.fail(`Should have blocked traversal attempt: ${badKey}`);
      } catch (err: any) {
        assert(err.message.includes('Security Error'), `Properly blocked ${badKey}`);
      }
    }
    console.log('✅ [PASS] Path traversal and absolute paths blocked');

    // -----------------------------------------------------------------------
    // TEST 5: Duplicate Storage Key (Overwrite Protection)
    // -----------------------------------------------------------------------
    console.log('\n--- Test: Overwrite Protection ---');
    const dupKey = 'originals/duplicate.txt';
    await provider.save(dupKey, Buffer.from('initial'));
    try {
      await provider.save(dupKey, Buffer.from('overwrite'));
      assert.fail('Should have blocked overwrite');
    } catch (err: any) {
      // EEXIST is expected from wx flag
      assert(err.code === 'EEXIST' || err.message.includes('EEXIST'), 'Throws EEXIST on overwrite');
      console.log('✅ [PASS] Silent overwrites prevented');
    }
    await provider.delete(dupKey); // cleanup

    // -----------------------------------------------------------------------
    // TEST 6: Concurrent Saves
    // -----------------------------------------------------------------------
    console.log('\n--- Test: Concurrent Operations ---');
    const concurrentCount = 10;
    const concurrentKeys = Array.from({ length: concurrentCount }, (_, i) => `processed/concurrent-${i}.tmp`);
    
    await Promise.all(
      concurrentKeys.map((k, i) => provider.save(k, Buffer.from(`data-${i}`)))
    );
    
    const existResults = await Promise.all(concurrentKeys.map(k => provider.exists(k)));
    assert(existResults.every(e => e === true), 'All concurrent saves succeeded');
    console.log('✅ [PASS] Concurrent saves successful');
    
    // Cleanup concurrent
    await Promise.all(concurrentKeys.map(k => provider.delete(k)));

    console.log('\n🎉 Storage Verification Complete: All tests passed.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Verification script failed with an unexpected error:', error);
    process.exit(1);
  }
}

verifyStorage();
