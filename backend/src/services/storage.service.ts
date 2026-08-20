import crypto from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { IStorageProvider } from './storage/types.js';
import { LocalStorageProvider } from './storage/local.provider.js';

class StorageService {
  private provider: IStorageProvider;

  constructor() {
    // In the future, this can be swapped out based on config (e.g. config.STORAGE_DRIVER === 's3' ? new S3Provider() : new LocalStorageProvider())
    this.provider = new LocalStorageProvider();
  }

  /**
   * Initializes the active storage provider (ensures directories or buckets exist).
   */
  public async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  /**
   * Generates a safe, cryptographically random key for storage within a designated folder.
   * e.g., 'originals/550e8400-e29b-41d4-a716-446655440000.mp4'
   */
  public generateKey(folder: 'originals' | 'posters' | 'backdrops' | 'processed' | 'hls-private', originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    // Use a UUIDv4 for unguessable and collision-resistant keys
    const randomId = crypto.randomUUID();
    
    return `${folder}/${randomId}${ext}`;
  }

  /**
   * Saves data to the storage provider.
   */
  public async save(key: string, data: Buffer | Readable): Promise<void> {
    await this.provider.save(key, data);
  }

  /**
   * Reads a file from the storage provider as a stream.
   */
  public async read(key: string): Promise<Readable> {
    return this.provider.read(key);
  }

  /**
   * Deletes a file.
   */
  public async delete(key: string): Promise<void> {
    await this.provider.delete(key);
  }

  /**
   * Checks if a file exists.
   */
  public async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Gets file metadata (size).
   */
  public async getMetadata(key: string): Promise<{ size: number }> {
    return this.provider.getMetadata(key);
  }

  /**
   * Returns a safely resolved absolute URI/path for tools that require local processing workspaces.
   */
  public getUri(key: string): string {
    return this.provider.getUri(key);
  }

  /**
   * Imports a directory of files efficiently (e.g. rename/move) into the storage provider.
   */
  public async importDirectory(sourceDir: string, targetKeyPrefix: string): Promise<void> {
    return this.provider.importDirectory(sourceDir, targetKeyPrefix);
  }
}

// Export a singleton instance
export const storageService = new StorageService();
