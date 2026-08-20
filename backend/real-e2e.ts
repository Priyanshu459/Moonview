import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  console.log('Starting E2E Processing Test...');
  
  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin_proc_test@example.com', password: 'admin12345' })
  });
  
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  
  const cookies = loginRes.headers.raw()['set-cookie'] || [];
  const jwtCookie = cookies.find((c: string) => c.startsWith('token='));
  const csrfCookie = cookies.find((c: string) => c.startsWith('csrfToken='));
  const jwt = jwtCookie?.split(';')[0];
  let csrfToken = csrfCookie?.split(';')[0].split('=')[1];
  
  if (!jwt || !csrfToken) throw new Error('Missing cookies');

  console.log('Logged in successfully.');

  // 2. Upload Video
  const videoPath = path.resolve(process.cwd(), '../test-video.mp4');
  const formData = new FormData();
  formData.append('file', fs.createReadStream(videoPath));
  
  const uploadRes = await fetch(`${BASE_URL}/uploads/video`, {
    method: 'POST',
    headers: {
      'cookie': `${jwt}; csrfToken=${csrfToken}`,
      'X-CSRF-Token': csrfToken,
      ...formData.getHeaders()
    },
    body: formData
  });

  const uploadJson = await uploadRes.json();
  if (!uploadJson.success) throw new Error(`Upload failed: ${JSON.stringify(uploadJson)}`);
  const mediaId = uploadJson.data.mediaAssetId;
  console.log(`Video uploaded successfully. MediaAsset ID: ${mediaId}`);

  // 3. Wait for READY status
  let status = 'PENDING';
  let hlsUrl = null;
  for (let i = 0; i < 60; i++) {
    const checkRes = await fetch(`${BASE_URL}/admin/media`, {
      headers: { 'cookie': jwt }
    });
    const checkJson = await checkRes.json();
    if (!checkJson.data) {
      console.error('Check failed:', checkJson);
      throw new Error('Check failed');
    }
    const media = checkJson.data.find(m => m.id === mediaId);
    
    if (media) {
      status = media.processingStatus;
      console.log(`Status: ${status}`);
      if (status === 'READY') break;
      if (status === 'FAILED') throw new Error('Processing failed');
    }
    await delay(2000);
  }

  if (status !== 'READY') throw new Error('Timed out waiting for READY status');

  console.log('Processing completed successfully!');

  // 4. Create and Publish Content
  const contentTitle = `Test Movie ${Date.now()}`;
  const contentRes = await fetch(`${BASE_URL}/admin/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cookie': `${jwt}; csrfToken=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      title: contentTitle,
      slug: `test-movie-${Date.now()}`,
      type: 'MOVIE',
      description: 'E2E Testing',
      releaseYear: 2026,
      maturityRating: 'PG'
    })
  });
  
  const contentJson = await contentRes.json();
  if (contentJson.error) throw new Error(`Content creation failed: ${JSON.stringify(contentJson)}`);
  const contentId = contentJson.id;
  console.log(`Created content ID: ${contentId}`);

  // 5. Link Media to Content
  const updateRes = await fetch(`${BASE_URL}/admin/content/${contentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'cookie': `${jwt}; csrfToken=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      title: contentTitle,
      slug: `test-movie-${Date.now()}`,
      type: 'MOVIE',
      description: 'E2E Testing',
      releaseYear: 2026,
      maturityRating: 'PG',
      mediaAssetId: mediaId
    })
  });
  
  const updateJson = await updateRes.json();
  if (updateJson.error) throw new Error(`Link failed: ${JSON.stringify(updateJson.error)}`);

  console.log('Linked media successfully.');

  // 5.5 Publish Content
  const publishRes = await fetch(`${BASE_URL}/admin/content/${contentId}/publish`, {
    method: 'POST',
    headers: {
      'cookie': `${jwt}; csrfToken=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    }
  });
  
  const publishJson = await publishRes.json();
  if (publishJson.error) throw new Error(`Publish failed: ${JSON.stringify(publishJson.error)}`);
  console.log('Published content successfully.');

  // 6. Test Public Playback Endpoint
  const pubRes = await fetch(`${BASE_URL}/stream/${mediaId}`);
  const pubJson = await pubRes.json();
  
  if (pubJson.error) throw new Error(`Public playback check failed: ${JSON.stringify(pubJson)}`);
  
  console.log(`Public Playback URL retrieved: ${pubJson.data.hlsUrl}`);
  console.log('E2E TEST PASSED!');
}

run().catch(console.error);
