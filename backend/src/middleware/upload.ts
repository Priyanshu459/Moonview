import { Request } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service.js';
import { AppError, InvalidMimeTypeError, FileTooLargeError, ValidationError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { Transform } from 'node:stream';

// Basic Magic Byte Signatures
const MAGIC_BYTES = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF...WEBP is checked dynamically
  MKV_WEBM: [0x1A, 0x45, 0xDF, 0xA3],
  // MP4 has 'ftyp' at offset 4, which we check dynamically
};

class MagicByteValidator extends Transform {
  private checked = false;
  private chunks: Buffer[] = [];
  private accumulatedLength = 0;
  
  constructor(private allowedMimes: string[]) {
    super();
  }

  override _transform(chunk: any, encoding: string, callback: Function) {
    if (this.checked) {
      this.push(chunk);
      return callback();
    }

    this.chunks.push(chunk);
    this.accumulatedLength += chunk.length;

    // We only need the first 16 bytes for these checks
    if (this.accumulatedLength >= 16) {
      this.checkAndPush(callback);
    } else {
      callback();
    }
  }

  override _flush(callback: Function) {
    if (!this.checked && this.accumulatedLength > 0) {
      this.checkAndPush(callback);
    } else {
      callback();
    }
  }

  private checkAndPush(callback: Function) {
    const buffer = Buffer.concat(this.chunks);
    this.checked = true;

    if (!this.isValidMagic(buffer)) {
      return callback(new InvalidMimeTypeError('Invalid file signature (magic bytes)'));
    }

    this.push(buffer);
    this.chunks = []; // free memory
    callback();
  }

  private isValidMagic(buf: Buffer): boolean {
    if (buf.length < 4) return false;
    
    // Check JPEG
    if (buf[0] === MAGIC_BYTES.JPEG[0] && buf[1] === MAGIC_BYTES.JPEG[1] && buf[2] === MAGIC_BYTES.JPEG[2]) {
      return this.allowedMimes.includes('image/jpeg');
    }
    
    // Check PNG
    if (buf[0] === MAGIC_BYTES.PNG[0] && buf[1] === MAGIC_BYTES.PNG[1] && buf[2] === MAGIC_BYTES.PNG[2] && buf[3] === MAGIC_BYTES.PNG[3]) {
      return this.allowedMimes.includes('image/png');
    }

    // Check WEBP (RIFF...WEBP)
    if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
      return this.allowedMimes.includes('image/webp');
    }

    // Check MKV/WebM
    if (buf[0] === MAGIC_BYTES.MKV_WEBM[0] && buf[1] === MAGIC_BYTES.MKV_WEBM[1] && buf[2] === MAGIC_BYTES.MKV_WEBM[2] && buf[3] === MAGIC_BYTES.MKV_WEBM[3]) {
      return this.allowedMimes.includes('video/x-matroska') || this.allowedMimes.includes('video/webm');
    }

    // Check MP4 (ftyp at offset 4)
    if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      return this.allowedMimes.includes('video/mp4');
    }

    return false;
  }
}

class MoonviewStorageEngine implements multer.StorageEngine {
  constructor(private folder: 'originals' | 'posters' | 'backdrops', private allowedMimes: string[]) {}

  _handleFile(req: Request, file: Express.Multer.File, cb: (error?: any, info?: Partial<Express.Multer.File>) => void) {
    const key = storageService.generateKey(this.folder, file.originalname);
    
    // We attach an abort listener to handle cleanup
    let aborted = false;
    let pipedStream: any = null;
    const onAbort = () => {
      if (req.aborted) {
        aborted = true;
        if (pipedStream) {
          pipedStream.destroy(new Error('Request aborted by client'));
        } else {
          file.stream.destroy(new Error('Request aborted by client'));
        }
      }
    };
    req.on('aborted', onAbort);
    req.on('close', onAbort);

    // Apply Magic Byte Validator
    const validator = new MagicByteValidator(this.allowedMimes);
    
    // Prevent uncaught exceptions if validation fails synchronously before pipeline attaches
    validator.on('error', () => {
      // Intentionally empty. Error is caught and propagated via the pipeline rejection below.
    });

    pipedStream = file.stream.pipe(validator);

    storageService.save(key, pipedStream)
      .then(async () => {
        req.off('aborted', onAbort);
        req.off('close', onAbort);
        
        if (aborted) {
           return storageService.delete(key).finally(() => cb(new Error('Upload aborted by client')));
        }
        
        // Get actual size from disk
        let fileSize = 0;
        try {
          const fsPromises = await import('node:fs/promises');
          const nodePath = await import('node:path');
          const securePath = nodePath.resolve(config.STORAGE_ROOT, key);
          const stat = await fsPromises.stat(securePath);
          fileSize = stat.size;
        } catch (e) {
          // ignore
        }

        cb(null, {
          size: fileSize,
          path: key,
          destination: this.folder,
          filename: key.split('/').pop() || key
        });
      })
      .catch((error) => {
        req.off('aborted', onAbort);
        req.off('close', onAbort);
        
        // Cleanup partial file automatically by calling delete
        storageService.delete(key).finally(() => cb(error));
      });
  }

  _removeFile(req: Request, file: Express.Multer.File, cb: (error: Error | null) => void) {
    if (file.path) {
      storageService.delete(file.path).then(() => cb(null)).catch(err => cb(err));
    } else {
      cb(null);
    }
  }
}

const VIDEO_MIMES = ['video/mp4', 'video/x-matroska', 'video/webm'];
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (allowedMimes: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new InvalidMimeTypeError(`MIME type '${file.mimetype}' is not supported`));
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const validVideoExts = ['mp4', 'mkv', 'webm'];
    const validImageExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (allowedMimes === VIDEO_MIMES && !validVideoExts.includes(ext || '')) {
       return cb(new InvalidMimeTypeError(`Extension '${ext}' is not supported`));
    }

    if (allowedMimes === IMAGE_MIMES && !validImageExts.includes(ext || '')) {
      return cb(new InvalidMimeTypeError(`Extension '${ext}' is not supported`));
    }

    cb(null, true);
  };
};

export const uploadVideo = multer({
  storage: new MoonviewStorageEngine('originals', VIDEO_MIMES),
  fileFilter: fileFilter(VIDEO_MIMES),
  limits: {
    fileSize: config.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

export const uploadPoster = multer({
  storage: new MoonviewStorageEngine('posters', IMAGE_MIMES),
  fileFilter: fileFilter(IMAGE_MIMES),
  limits: {
    fileSize: config.STORAGE_MAX_IMAGE_SIZE_MB * 1024 * 1024,
  },
});

export const uploadBackdrop = multer({
  storage: new MoonviewStorageEngine('backdrops', IMAGE_MIMES),
  fileFilter: fileFilter(IMAGE_MIMES),
  limits: {
    fileSize: config.STORAGE_MAX_IMAGE_SIZE_MB * 1024 * 1024,
  },
});

export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new FileTooLargeError(0)); // We will format the real limit based on route if needed, or rely on AppError default
    }
    return next(new ValidationError('Malformed multipart request: ' + err.message));
  }
  next(err);
};
