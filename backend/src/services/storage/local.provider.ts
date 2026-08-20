import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { IStorageProvider } from './types.js';
import { config } from '../../config/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export function resolveContainedPath(rootPath: string, key: string): string {
  if (path.isAbsolute(key)) {
    throw new ValidationError('Security Error: Absolute paths are not allowed');
  }

  const canonicalRoot = path.resolve(rootPath);
  const candidate = path.resolve(canonicalRoot, key);
  const relative = path.relative(canonicalRoot, candidate);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new ValidationError('Security Error: Path traversal attempt detected');
  }

  return candidate;
}

export class LocalStorageProvider implements IStorageProvider {
  private rootPath: string;

  constructor(storageRoot: string = config.STORAGE_ROOT) {
    this.rootPath = path.resolve(storageRoot);
  }

  /**
   * Safely resolves a requested storage key against the absolute STORAGE_ROOT.
   * Defends against path traversal, absolute paths, and UNC paths.
   */
  private getSecurePath(key: string): string {
    return resolveContainedPath(this.rootPath, key);
  }

  public async initialize(): Promise<void> {
    const dirs = ['originals', 'posters', 'backdrops', 'processed', 'hls-private'];
    
    // Ensure root exists first
    await fs.mkdir(this.rootPath, { recursive: true });

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.rootPath, dir), { recursive: true });
    }
  }

  public async save(key: string, data: Buffer | Readable): Promise<void> {
    const securePath = this.getSecurePath(key);

    // Ensure the parent directory of the specific file exists
    await fs.mkdir(path.dirname(securePath), { recursive: true });

    if (Buffer.isBuffer(data)) {
      // wx flag prevents silent overwrite
      await fs.writeFile(securePath, data, { flag: 'wx' });
    } else {
      // It's a stream
      // We must explicitly use wx flag on the WriteStream
      const writeStream = createWriteStream(securePath, { flags: 'wx' });
      try {
        await pipeline(data, writeStream);
      } catch (error: any) {
        // If pipeline fails, ensure stream closes and clean up partial file
        if (!writeStream.closed) {
          writeStream.destroy();
        }
        await fs.rm(securePath, { force: true }).catch(() => {});
        throw error;
      }
    }
  }

  public async read(key: string): Promise<Readable> {
    const securePath = this.getSecurePath(key);
    
    try {
      await fs.access(securePath, fs.constants.R_OK);
    } catch {
      throw new NotFoundError('File');
    }

    return createReadStream(securePath);
  }

  public async delete(key: string): Promise<void> {
    const securePath = this.getSecurePath(key);
    try {
      await fs.unlink(securePath);
    } catch (error: any) {
      // Ignore if file already doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  public async exists(key: string): Promise<boolean> {
    const securePath = this.getSecurePath(key);
    try {
      await fs.access(securePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(key: string): Promise<{ size: number }> {
    const securePath = this.getSecurePath(key);
    try {
      const stats = await fs.stat(securePath);
      if (!stats.isFile()) {
         throw new Error();
      }
      return { size: stats.size };
    } catch {
      throw new NotFoundError('File');
    }
  }
  public getUri(key: string): string {
    return this.getSecurePath(key);
  }

  public async importDirectory(sourceDir: string, targetKeyPrefix: string): Promise<void> {
    const secureTargetDir = this.getSecurePath(targetKeyPrefix);

    try {
      // Ensure the parent exists
      await fs.mkdir(path.dirname(secureTargetDir), { recursive: true });
      
      // We can use fs.rename for atomic/efficient moving if on the same volume.
      // If it fails (EXDEV), fallback to recursive copy + delete.
      await fs.rename(sourceDir, secureTargetDir);
    } catch (error: any) {
      if (error.code === 'EXDEV') {
        // Cross-device link not permitted, use cp instead
        await fs.cp(sourceDir, secureTargetDir, { recursive: true });
        await fs.rm(sourceDir, { recursive: true, force: true });
      } else {
        throw error;
      }
    }
  }
}
