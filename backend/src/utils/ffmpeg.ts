import { config } from '../config/index.js';
import path from 'node:path';
import { runMediaProcess } from './media-process.js';

export interface ResolutionConfig {
  name: string;
  width: number;
  height: number;
  bitrate: number;
}

// We only scale down; we never upscale.
export const STANDARD_RESOLUTIONS: ResolutionConfig[] = [
  { name: '1080p', width: 1920, height: 1080, bitrate: 4500000 },
  { name: '720p', width: 1280, height: 720, bitrate: 2500000 },
  { name: '480p', width: 854, height: 480, bitrate: 1000000 },
  { name: '360p', width: 640, height: 360, bitrate: 500000 },
];

/**
 * Returns resolutions that are less than or equal to the source resolution.
 */
export const getTargetResolutions = (sourceWidth: number, sourceHeight: number): ResolutionConfig[] => {
  const minDimension = Math.min(sourceWidth, sourceHeight);
  // Determine if it's landscape or portrait and pick the comparable dimension.
  // We'll use height for standard matching assuming landscape is standard.
  // If it's a vertical video (width < height), width is the limiting factor.
  const sourceLimit = Math.min(sourceWidth, sourceHeight);
  
  return STANDARD_RESOLUTIONS.filter(res => Math.min(res.width, res.height) <= sourceLimit);
};

export const generateHlsVariants = (
  sourcePath: string,
  targetDir: string,
  resolutions: ResolutionConfig[],
  hasAudio = true,
): Promise<void> => {
  return (async () => {
    if (resolutions.length === 0) {
      throw new Error('Source video is below the minimum supported HLS resolution');
    }
    // Basic arguments
    const args: string[] = [
      '-i', sourcePath,
      '-y', // Overwrite
      '-v', 'error', // Reduce log noise
      '-filter_threads', String(config.FFMPEG_THREADS),
      '-filter_complex_threads', String(config.FFMPEG_THREADS),
    ];

    let filterComplex = '';
    const mapArgs: string[] = [];
    const formatArgs: string[] = [];

    // Create a filter_complex to scale the video for each resolution
    resolutions.forEach((res, index) => {
      // Scale maintaining aspect ratio, force multiple of 2
      // Using scale=w=...:h=... (we define width max and height max)
      // -2 in one dimension tells FFmpeg to maintain aspect ratio and ensure divisible by 2.
      // Since we know target width/height, we scale to fit within the box.
      filterComplex += `[0:v]scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[v${index}];`;
      
      mapArgs.push('-map', `[v${index}]`);
      if (hasAudio) mapArgs.push('-map', '0:a:0?');
      
      // Setup encoding settings for each variant
      // Video
      formatArgs.push(`-c:v:${index}`, 'libx264');
      formatArgs.push(`-b:v:${index}`, `${res.bitrate}`);
      formatArgs.push(`-maxrate:${index}`, `${Math.round(res.bitrate * 1.05)}`);
      formatArgs.push(`-bufsize:${index}`, `${res.bitrate * 2}`);
      formatArgs.push(`-preset:v:${index}`, 'fast');
      formatArgs.push(`-threads:v:${index}`, String(config.FFMPEG_THREADS));
      formatArgs.push(`-g:v:${index}`, '120');
      formatArgs.push(`-sc_threshold:v:${index}`, '0');
      formatArgs.push(`-force_key_frames:v:${index}`, 'expr:gte(t,n_forced*4)');
      
      // Audio
      if (hasAudio) {
        formatArgs.push(`-c:a:${index}`, 'aac');
        formatArgs.push(`-b:a:${index}`, '128k');
        formatArgs.push(`-ac:${index}`, '2');
      }
    });

    args.push('-filter_complex', filterComplex.slice(0, -1)); // Remove trailing semicolon
    args.push(...mapArgs);
    args.push(...formatArgs);

    // HLS specific settings
    args.push(
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', path.join(targetDir, 'stream_%v_data%03d.ts'),
      '-master_pl_name', 'master.m3u8',
      '-var_stream_map', resolutions.map((_, i) => hasAudio ? `v:${i},a:${i}` : `v:${i}`).join(' ')
    );

    args.push(path.join(targetDir, 'stream_%v.m3u8'));

    await runMediaProcess({
      command: config.FFMPEG_PATH,
      args,
      label: 'FFmpeg HLS generation',
      timeoutMs: config.MEDIA_PROCESS_TIMEOUT_MS,
    });
  })();
};

export const generateThumbnail = (
  sourcePath: string,
  targetPath: string,
  timeOffset: number = 2
): Promise<void> => {
  return (async () => {
    const args = [
      '-ss', timeOffset.toString(),
      '-i', sourcePath,
      '-vframes', '1',
      '-q:v', '2', // High quality JPEG
      '-threads', String(config.FFMPEG_THREADS),
      '-y',
      targetPath
    ];
    await runMediaProcess({
      command: config.FFMPEG_PATH,
      args,
      label: 'FFmpeg thumbnail generation',
      timeoutMs: Math.min(config.MEDIA_PROCESS_TIMEOUT_MS, 5 * 60_000),
    });
  })();
};
