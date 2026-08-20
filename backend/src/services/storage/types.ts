// =============================================================================
// Moonview — Storage Interfaces
// =============================================================================

import { Readable } from 'stream';

export interface IStorageProvider {
  /**
   * Ensures all required storage directories and structures exist.
   */
  initialize(): Promise<void>;

  /**
   * Saves data to the specified key.
   * By default, it should fail if the file already exists (exclusive write).
   * @param key Relative storage key (e.g., 'originals/my-file.mp4')
   * @param data Buffer or Readable stream
   */
  save(key: string, data: Buffer | Readable): Promise<void>;

  /**
   * Reads data from the specified key.
   * @param key Relative storage key
   * @returns A Readable stream of the file content
   */
  read(key: string): Promise<Readable>;

  /**
   * Deletes the file at the specified key.
   * @param key Relative storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Checks if a file exists at the specified key.
   * @param key Relative storage key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Retrieves basic metadata (size) for the specified key.
   * @param key Relative storage key
   */
  getMetadata(key: string): Promise<{ size: number }>;

  /**
   * Returns a safely resolved absolute URI/path for tools that require local processing workspaces (like FFmpeg).
   * @param key Relative storage key
   */
  getUri(key: string): string;

  /**
   * Imports a directory of files efficiently (e.g. rename/move) into the storage provider.
   * @param sourceDir Absolute path to the source directory
   * @param targetKeyPrefix The relative storage key prefix to place the directory under
   */
  importDirectory(sourceDir: string, targetKeyPrefix: string): Promise<void>;
}
