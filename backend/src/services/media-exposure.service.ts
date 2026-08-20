import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { ValidationError } from '../utils/errors.js';
import { resolveContainedPath } from './storage/local.provider.js';
import { storageService } from './storage.service.js';

type PublicFolder = 'hls' | 'posters' | 'backdrops';

function resolvePublicPath(key: string): string {
  return resolveContainedPath(config.PUBLIC_MEDIA_ROOT, key);
}

function publicKeyForPrivateKey(privateKey: string): string {
  if (privateKey.startsWith('hls-private/')) {
    return `hls/${privateKey.slice('hls-private/'.length)}`;
  }
  if (privateKey.startsWith('posters/') || privateKey.startsWith('backdrops/')) {
    return privateKey;
  }
  throw new ValidationError('Media key is not publishable');
}

export function publicMediaUrlForPrivateKey(privateKey: string): string {
  return `/media/${publicKeyForPrivateKey(privateKey).replaceAll(path.sep, '/')}`;
}

export class MediaExposureService {
  async initialize(): Promise<void> {
    for (const folder of ['hls', 'posters', 'backdrops'] satisfies PublicFolder[]) {
      await fs.mkdir(resolvePublicPath(folder), { recursive: true });
    }
  }

  async exposeKey(privateKey: string): Promise<void> {
    const publicKey = publicKeyForPrivateKey(privateKey);
    const source = storageService.getUri(privateKey);
    const target = resolvePublicPath(publicKey);

    await fs.rm(target, { recursive: true, force: true });
    await fs.mkdir(path.dirname(target), { recursive: true });

    const stat = await fs.stat(source);
    if (stat.isDirectory()) {
      await fs.cp(source, target, { recursive: true, force: false });
    } else if (stat.isFile()) {
      await fs.copyFile(source, target);
    } else {
      throw new ValidationError('Media key must resolve to a file or directory');
    }
  }

  async revokeKey(privateKey: string): Promise<void> {
    await fs.rm(resolvePublicPath(publicKeyForPrivateKey(privateKey)), { recursive: true, force: true });
  }

  async exposeAsset(asset: { hlsMasterKey?: string | null; thumbnailKey?: string | null }): Promise<void> {
    if (asset.hlsMasterKey) {
      await this.exposeKey(path.dirname(asset.hlsMasterKey));
    }
    if (asset.thumbnailKey) {
      await this.exposeKey(asset.thumbnailKey);
    }
  }

  async revokeAsset(asset: { hlsMasterKey?: string | null; thumbnailKey?: string | null }): Promise<void> {
    if (asset.hlsMasterKey) {
      await this.revokeKey(path.dirname(asset.hlsMasterKey));
    }
    if (asset.thumbnailKey) {
      await this.revokeKey(asset.thumbnailKey);
    }
  }
}

export const mediaExposureService = new MediaExposureService();
