import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

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

interface RunMediaProcessOptions {
  command: string;
  args: string[];
  label: string;
  timeoutMs: number;
}

function appendBounded(current: string, chunk: Buffer, limit: number): string {
  const next = current + chunk.toString();
  return next.length <= limit ? next : next.slice(next.length - limit);
}

export function runMediaProcess({ command, args, label, timeoutMs }: RunMediaProcessOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    activeChildren.add(child);

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let timedOut = false;
    let settled = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    timeout.unref();

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      activeChildren.delete(child);
      if (error) reject(error);
      else resolve({ stdout, stderr });
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        child.kill('SIGTERM');
        finish(new MediaProcessError('OUTPUT_TOO_LARGE', `${label} returned too much output`));
        return;
      }
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk, MAX_STDERR_BYTES);
    });

    child.once('error', () => {
      finish(new MediaProcessError('SPAWN_FAILED', `${label} could not be started`));
    });

    child.once('close', (code) => {
      if (timedOut) {
        finish(new MediaProcessError('TIMED_OUT', `${label} timed out`));
      } else if (code !== 0) {
        finish(new MediaProcessError('EXITED', `${label} failed with exit code ${code}`, stderr));
      } else {
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
