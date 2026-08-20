import { config } from '../config/index.js';
import { runMediaProcess } from './media-process.js';

export interface FFprobeData {
  width: number;
  height: number;
  duration: number; // in seconds
  videoCodec: string;
  audioCodec?: string;
  bitrate?: number;
}

export const runFFprobe = async (filePath: string): Promise<FFprobeData> => {
    const args = [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const { stdout } = await runMediaProcess({
      command: config.FFPROBE_PATH,
      args,
      label: 'FFprobe',
      timeoutMs: Math.min(config.MEDIA_PROCESS_TIMEOUT_MS, 60_000),
    });

    try {
        const parsed = JSON.parse(stdout) as { streams?: any[]; format?: Record<string, string> };
        
        const videoStream = parsed.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = parsed.streams?.find((s: any) => s.codec_type === 'audio');

        if (!videoStream) {
          throw new Error('No video stream found in file');
        }

        const width = videoStream.width;
        const height = videoStream.height;
        const duration = parseFloat(parsed.format?.duration || videoStream.duration || '0');
        const bitrate = parseInt(parsed.format?.bit_rate || videoStream.bit_rate || '0', 10);
        
        return {
          width,
          height,
          duration,
          videoCodec: videoStream.codec_name,
          audioCodec: audioStream?.codec_name,
          bitrate: bitrate > 0 ? bitrate : undefined,
        };
      } catch (err) {
        if (err instanceof Error && err.message === 'No video stream found in file') throw err;
        throw new Error('Failed to parse FFprobe output');
      }
};
