import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { logger } from './logger.js';

const activeChildren = new Set<ChildProcessWithoutNullStreams>();
const MAX_STDERR_BYTES = 64 * 1024;
const MAX_STDOUT_BYTES = 2 * 1024 * 1024;

export class MediaProcessError extends Error {
  constructor(
    public readonly reason: 'SPAWN_FAILED' | 'EXITED' | 'TIMED_OUT' | 'OUTPUT_TOO_LARGE',
    message: string,
    public readonly stderr = '',
  ) {
    super(message);
    this.name = 'MediaProcessError';
  }
}

export interface RunMediaProcessOptions {
  command: string;
  args: string[];
  label: string;
  timeoutMs: number;
  onProgress?: (outputLine: string) => void;
  jobId?: string;
  mediaAssetId?: string;
}

function appendBounded(current: string, chunk: Buffer, limit: number): string {
  const next = current + chunk.toString();
  return next.length <= limit ? next : next.slice(next.length - limit);
}

export function runMediaProcess({ command, args, label, timeoutMs, onProgress, jobId, mediaAssetId }: RunMediaProcessOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    activeChildren.add(child);

    const startTime = Date.now();
    logger.info({ pid: child.pid, label, jobId, mediaAssetId }, 'Media process started');

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let timedOut = false;
    let settled = false;

    // Periodically log elapsed time every 30s
    const logInterval = setInterval(() => {
      logger.info({ pid: child.pid, label, jobId, mediaAssetId, elapsedSeconds: Math.floor((Date.now() - startTime) / 1000) }, 'Media process running...');
    }, 30000);

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    timeout.unref();

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(logInterval);
      clearTimeout(timeout);
      activeChildren.delete(child);
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    };

    child.stdout.on('data', (chunk: Buffer) => {
      if (onProgress) {
        // We do not bound stdout size if onProgress is set, because we assume it's progress data and we parse it line by line
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) onProgress(line.trim());
        }
      } else {
        stdoutBytes += chunk.length;
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          child.kill('SIGTERM');
          finish(new MediaProcessError('OUTPUT_TOO_LARGE', `${label} returned too much output`));
          return;
        }
        stdout += chunk.toString();
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk, MAX_STDERR_BYTES);
    });

    child.once('error', (err) => {
      logger.error({ pid: child.pid, label, jobId, mediaAssetId, err }, 'Media process spawn failed');
      finish(new MediaProcessError('SPAWN_FAILED', `${label} could not be started`));
    });

    child.once('close', (code) => {
      const elapsedMs = Date.now() - startTime;
      if (timedOut) {
        logger.error({ pid: child.pid, label, jobId, mediaAssetId, elapsedMs }, 'Media process timed out');
        finish(new MediaProcessError('TIMED_OUT', `${label} timed out`));
      } else if (code !== 0) {
        logger.error({ pid: child.pid, label, jobId, mediaAssetId, exitCode: code, elapsedMs, stderr }, 'Media process failed');
        finish(new MediaProcessError('EXITED', `${label} failed with exit code ${code}`, stderr));
      } else {
        logger.info({ pid: child.pid, label, jobId, mediaAssetId, exitCode: code, elapsedMs }, 'Media process completed successfully');
        finish();
      }
    });
  });
}

export function terminateActiveMediaProcesses(): number {
  const count = activeChildren.size;
  for (const child of activeChildren) {
    child.kill('SIGTERM');
  }
  return count;
}
