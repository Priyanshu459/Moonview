import { useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';

interface ProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function ProgressBar({ videoRef }: ProgressBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (isDragging.current || !video.duration) return;
      const percent = (video.currentTime / video.duration) * 100;
      if (fillRef.current) fillRef.current.style.width = `${percent}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${percent}%`;
    };

    const updateBuffer = () => {
      if (!video.duration || video.buffered.length === 0) return;
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const percent = Math.min(100, (bufferedEnd / video.duration) * 100);
      if (bufferRef.current) bufferRef.current.style.width = `${percent}%`;
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('progress', updateBuffer);
    video.addEventListener('loadedmetadata', updateProgress);
    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('progress', updateBuffer);
      video.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [videoRef]);

  const seekFromClientX = (clientX: number, commit: boolean) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = pos / rect.width;
    if (fillRef.current) fillRef.current.style.width = `${percent * 100}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${percent * 100}%`;
    if (commit) video.currentTime = percent * video.duration;
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging.current) return;
      seekFromClientX(event.clientX, false);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isDragging.current) return;
      seekFromClientX(event.clientX, true);
      isDragging.current = false;
      trackRef.current?.releasePointerCapture?.(event.pointerId);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className={styles.progressContainer}
      onPointerDown={(event) => {
        isDragging.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        seekFromClientX(event.clientX, true);
      }}
      role="slider"
      aria-label="Playback progress"
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={styles.progressTrack}>
        <div ref={bufferRef} className={styles.progressBuffered} style={{ width: '0%' }} />
        <div ref={fillRef} className={styles.progressFill} style={{ width: '0%' }} />
      </div>
      <div ref={thumbRef} className={styles.progressThumb} style={{ left: '0%' }} />
    </div>
  );
}