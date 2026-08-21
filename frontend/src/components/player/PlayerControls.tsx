import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw } from 'lucide-react';
import { ProgressBar } from './ProgressBar.js';
import { QualitySelector } from './QualitySelector.js';
import styles from './VideoPlayer.module.css';

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onPlayPause: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  levels: { id: number; height: number }[];
  currentLevel: number;
  onSelectLevel: (levelId: number) => void;
}

export function PlayerControls({
  videoRef,
  isPlaying,
  onPlayPause,
  isFullscreen,
  onToggleFullscreen,
  levels,
  currentLevel,
  onSelectLevel,
}: PlayerControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const timeDisplayRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
    };

    const updateVolume = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };

    updateTime();
    updateVolume();
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateTime);
    video.addEventListener('volumechange', updateVolume);
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateTime);
      video.removeEventListener('volumechange', updateVolume);
    };
  }, [videoRef]);

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newVolume = pos / rect.width;
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setVolume(newVolume);
    setIsMuted(video.muted);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const skipBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  return (
    <div className={styles.bottomControls}>
      <ProgressBar videoRef={videoRef} />
      <div className={styles.controlsRow}>
        <div className={styles.controlsGroup}>
          <button className={`${styles.iconBtn} ${styles.skipBtn}`} onClick={() => skipBy(-10)} aria-label="Rewind 10 seconds" title="Rewind 10 seconds" type="button">
            <RotateCcw className={styles.skipIcon} size={29} strokeWidth={2.2} />
            <span className={styles.skipAmount}>10</span>
          </button>

          <button className={`${styles.iconBtn} ${styles.primaryPlayBtn}`} onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'} type="button">
            {isPlaying ? <Pause fill="currentColor" size={30} /> : <Play fill="currentColor" size={30} />}
          </button>

          <button className={`${styles.iconBtn} ${styles.skipBtn}`} onClick={() => skipBy(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds" type="button">
            <RotateCw className={styles.skipIcon} size={29} strokeWidth={2.2} />
            <span className={styles.skipAmount}>10</span>
          </button>

          <div className={styles.volumeGroup}>
            <button className={styles.iconBtn} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} type="button">
              {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <div className={styles.volumeSlider} aria-hidden="true">
              <div className={styles.volumeTrack} onClick={handleVolumeChange}>
                <div className={styles.volumeFill} style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
              </div>
            </div>
          </div>

          <div ref={timeDisplayRef} className={styles.timeDisplay}>0:00 / 0:00</div>
        </div>

        <div className={styles.controlsGroup}>
          <QualitySelector levels={levels} currentLevel={currentLevel} onSelectLevel={onSelectLevel} />

          <button className={styles.iconBtn} onClick={onToggleFullscreen} aria-label="Toggle fullscreen" title="Toggle fullscreen" type="button">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}