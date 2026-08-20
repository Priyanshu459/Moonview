import cookieParser from 'cookie-parser';
import { prisma, disconnectDatabase } from '../src/config/database.js';
import { config } from '../src/config/index.js';

const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? `http://127.0.0.1:${config.PORT}`).replace(/\/$/, '');
const levels = (process.env.LOAD_TEST_CONCURRENCY ?? '10,25,50').split(',').map(Number).filter((value) => value > 0);
const requestsPerWorker = Math.max(1, Number(process.env.LOAD_TEST_REQUESTS_PER_WORKER ?? 1));

interface Target { name: string; path: string; init?: RequestInit }
interface Sample { latencyMs: number; ok: boolean }

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

async function request(target: Target): Promise<Sample> {
  const start = performance.now();
  try {
    const response = await fetch(`${baseUrl}${target.path}`, target.init);
    await response.arrayBuffer();
    return { latencyMs: performance.now() - start, ok: response.ok };
  } catch {
    return { latencyMs: performance.now() - start, ok: false };
  }
}

async function main() {
  const bootstrap = await fetch(`${baseUrl}/api/health`);
  const setCookies = bootstrap.headers.getSetCookie();
  const cookieHeader = setCookies.map((value) => value.split(';', 1)[0]).join('; ');
  const parsedCookies = Object.fromEntries(cookieHeader.split('; ').map((value) => value.split('=').map(decodeURIComponent)));
  const csrfToken = parsedCookies.csrfToken;
  const signedSession = parsedCookies.sessionId;
  const sessionId = signedSession ? cookieParser.signedCookie(signedSession, config.COOKIE_SECRET) : false;

  const media = await prisma.mediaAsset.findFirst({
    where: {
      processingStatus: 'READY',
      OR: [
        { content: { status: 'PUBLISHED' } },
        { episode: { status: 'PUBLISHED', season: { series: { status: 'PUBLISHED' } } } },
      ],
    },
    select: { id: true, durationSeconds: true },
  });

  const targets: Target[] = [
    { name: 'health', path: '/api/health' },
    { name: 'home', path: '/api/content/home' },
    { name: 'search', path: '/api/search?q=phase&page=1&limit=20' },
  ];
  if (media) {
    targets.push({ name: 'stream-info', path: `/api/stream/${media.id}`, init: { headers: { Cookie: cookieHeader } } });
    if (csrfToken) {
      targets.push({
        name: 'progress',
        path: '/api/progress',
        init: {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: cookieHeader },
          body: JSON.stringify({ mediaId: media.id, position: 1, duration: Math.max(2, media.durationSeconds ?? 60) }),
        },
      });
    }
  }

  if (media && csrfToken) {
    const progressResponse = await fetch(`${baseUrl}/api/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: cookieHeader },
      body: JSON.stringify({ mediaId: media.id, position: 1, duration: Math.max(2, media.durationSeconds ?? 60) }),
    });
    const ownContinue = await fetch(`${baseUrl}/api/progress/continue-watching`, { headers: { Cookie: cookieHeader } });

    const otherBootstrap = await fetch(`${baseUrl}/api/health`);
    const otherCookieHeader = otherBootstrap.headers.getSetCookie().map((value) => value.split(';', 1)[0]).join('; ');
    const otherContinue = await fetch(`${baseUrl}/api/progress/continue-watching`, { headers: { Cookie: otherCookieHeader } });
    const ownPayload = await ownContinue.json() as { data?: Array<{ mediaId: string }> };
    const otherPayload = await otherContinue.json() as { data?: Array<{ mediaId: string }> };

    if (
      !progressResponse.ok ||
      !ownContinue.ok ||
      !otherContinue.ok ||
      !ownPayload.data?.some((item) => item.mediaId === media.id) ||
      otherPayload.data?.some((item) => item.mediaId === media.id)
    ) {
      throw new Error('Anonymous watch-progress session isolation preflight failed');
    }
    console.log('Anonymous watch-progress session isolation preflight: PASS');
  }

  console.log(`Target: ${baseUrl}; endpoints: ${targets.map((target) => target.name).join(', ')}`);
  for (const concurrency of levels) {
    const heapBefore = process.memoryUsage().heapUsed;
    const samples = await Promise.all(
      Array.from({ length: concurrency }, async (_, worker) => {
        const own: Array<Sample & { target: string }> = [];
        for (let index = 0; index < requestsPerWorker; index += 1) {
          const target = targets[(worker + index) % targets.length]!;
          own.push({ ...(await request(target)), target: target.name });
        }
        return own;
      }),
    ).then((groups) => groups.flat());
    const latencies = samples.map((sample) => sample.latencyMs);
    const failures = samples.filter((sample) => !sample.ok).length;
    const heapDeltaMb = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
    console.log(JSON.stringify({
      concurrency,
      requests: samples.length,
      errorRate: failures / samples.length,
      p50Ms: Number(percentile(latencies, 0.50).toFixed(1)),
      p95Ms: Number(percentile(latencies, 0.95).toFixed(1)),
      p99Ms: Number(percentile(latencies, 0.99).toFixed(1)),
      loadGeneratorHeapDeltaMb: Number(heapDeltaMb.toFixed(2)),
    }));
  }

  if (sessionId) {
    await prisma.watchProgress.deleteMany({ where: { sessionId } });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
