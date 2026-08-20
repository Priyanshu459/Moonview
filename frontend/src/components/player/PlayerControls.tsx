import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
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
  videoRef, isPlaying, onPlayPause, isFullscreen, onToggleFullscreen, levels, currentLevel, onSelectLevel
}: PlayerControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const timeDisplayRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateTime);
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateTime);
    };
  }, [videoRef]);

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newVolume = pos / rect.width;
    video.volume = newVolume;
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className={styles.bottomControls}>
      <ProgressBar videoRef={videoRef} />
      <div className={styles.controlsRow}>
        <div className={styles.controlsGroup}>
          <button className={styles.iconBtn} onClick={onPlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
          
          <div className={styles.volumeGroup}>
            <button className={styles.iconBtn} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </button>
            <div className={styles.volumeSlider}>
              <div className={styles.volumeTrack} onClick={handleVolumeChange}>
                <div className={styles.volumeFill} style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
              </div>
            </div>
          </div>

          <div ref={timeDisplayRef} className={styles.timeDisplay}>0:00 / 0:00</div>
        </div>

        <div className={styles.controlsGroup}>
          <QualitySelector levels={levels} currentLevel={currentLevel} onSelectLevel={onSelectLevel} />
          
          <button className={styles.iconBtn} onClick={onToggleFullscreen} aria-label="Toggle Fullscreen">
            {isFullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
    </div>
  );
}
