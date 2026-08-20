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
      const percent = (bufferedEnd / video.duration) * 100;
      if (bufferRef.current) bufferRef.current.style.width = `${percent}%`;
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('progress', updateBuffer);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('progress', updateBuffer);
    };
  }, [videoRef]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | MouseEvent, forceUpdate = false) => {
    if (!videoRef.current || !trackRef.current) return;
    if (!isDragging.current && !forceUpdate) return;

    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = pos / rect.width;
    
    if (fillRef.current) fillRef.current.style.width = `${percent * 100}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${percent * 100}%`;

    // Only update video time if we are done dragging or it's a click
    if (forceUpdate) {
      videoRef.current.currentTime = percent * videoRef.current.duration;
    }
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging.current) {
        handleSeek(e, true);
        isDragging.current = false;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleSeek(e, false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      className={styles.progressContainer}
      onMouseDown={(e) => {
        isDragging.current = true;
        handleSeek(e, false); // visual update immediately
      }}
      ref={trackRef}
    >
      <div className={styles.progressTrack}>
        <div ref={bufferRef} className={styles.progressBuffered} style={{ width: '0%' }} />
        <div ref={fillRef} className={styles.progressFill} style={{ width: '0%' }} />
      </div>
      <div ref={thumbRef} className={styles.progressThumb} style={{ left: '0%' }} />
    </div>
  );
}
