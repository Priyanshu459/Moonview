import { useEffect, useRef, useState, useCallback } from 'react';
import type HlsType from 'hls.js';
import { PlayerControls } from './PlayerControls.js';
import { Spinner } from '../ui/Spinner.js';
import { AlertCircle, Play } from 'lucide-react';
import { updateProgress } from '../../api/progress.js';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  mediaId?: string;
  hlsUrl?: string | null;
  fallbackUrl?: string | null;
  resumePosition?: number;
  onEnded?: () => void;
}

export function VideoPlayer({ mediaId, hlsUrl, fallbackUrl, resumePosition = 0, onEnded }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsType | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const inactivityTimerRef = useRef<number | null>(null);

  const [levels, setLevels] = useState<{ id: number; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  // Progress tracking refs
  const lastProgressTimeRef = useRef<number>(0);
  const hasAppliedResumePosition = useRef<boolean>(false);

  // Ref to hold the latest playback position to safely save on unmount
  const latestPlaybackStateRef = useRef<{ position: number; duration: number }>({ position: 0, duration: 0 });

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let recoveryAttempts = 0;

    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    setIsLoading(true);
    setIsReady(false);
    setErrorMsg(null);
    setLevels([]);
    setCurrentLevel(-1);
    hasAppliedResumePosition.current = false;

    const handleLoadedMetadata = () => {
      if (!disposed) {
        setIsReady(true);
        setIsLoading(false);
      }
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    const useFallback = () => {
      cleanupHls();
      if (fallbackUrl) {
        video.src = fallbackUrl;
        video.load();
      } else {
        setIsLoading(false);
        setErrorMsg('This video format is not supported in your browser.');
      }
    };

    const initialize = async () => {
      // Native HLS avoids downloading hls.js on browsers that support it.
      if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        video.load();
        return;
      }

      if (!hlsUrl) {
        useFallback();
        return;
      }

      try {
        const { default: Hls } = await import('hls.js');
        if (disposed) return;
        if (!Hls.isSupported()) {
          useFallback();
          return;
        }

        const hls = new Hls({ maxMaxBufferLength: 30, backBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setIsReady(true);
          setIsLoading(false);
          setLevels(data.levels.map((level, index) => ({ id: index, height: level.height })));
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          recoveryAttempts += 1;
          if (recoveryAttempts <= 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (recoveryAttempts <= 2 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            useFallback();
          }
        });
      } catch {
        if (!disposed) useFallback();
      }
    };

    void initialize();

    return () => {
      disposed = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      cleanupHls();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [hlsUrl, fallbackUrl]);

  // Video Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveProgress = (position: number, duration: number) => {
      if (!mediaId || duration <= 0) return;
      updateProgress(mediaId, position, duration).catch(console.error);
    };

    const handlePlay = () => setIsPlaying(true);
    
    const handlePause = () => {
      setIsPlaying(false);
      saveProgress(video.currentTime, video.duration);
    };
    
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    
    const handleError = () => {
      if (!hlsRef.current) setErrorMsg('Media playback failed.');
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(video.duration, video.duration);
      if (onEnded) onEnded();
    };

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        latestPlaybackStateRef.current = { position: video.currentTime, duration: video.duration };
        
        const now = Date.now();
        // Send progress at most once every 10 seconds
        if (now - lastProgressTimeRef.current >= 10000) {
          lastProgressTimeRef.current = now;
          saveProgress(video.currentTime, video.duration);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (resumePosition > 0 && !hasAppliedResumePosition.current) {
        if (resumePosition < video.duration) {
          video.currentTime = resumePosition;
        }
        hasAppliedResumePosition.current = true;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Save on unmount
      const { position, duration } = latestPlaybackStateRef.current;
      if (position > 0 && duration > 0) {
        saveProgress(position, duration);
      }
    };
  }, [onEnded, mediaId, resumePosition]);

  // Inactivity Timer
  const resetInactivityTimer = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          break;
        case 'm':
        case 'M':
          video.muted = !video.muted;
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
      resetInactivityTimer();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [resetInactivityTimer]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.warn('Autoplay prevented:', err));
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleSelectLevel = (levelId: number) => {
    if (hlsRef.current) {
      if (levelId === -1) {
        hlsRef.current.currentLevel = -1; // Auto
      } else {
        hlsRef.current.currentLevel = levelId;
      }
      setCurrentLevel(levelId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={styles.playerContainer}
      onMouseMove={resetInactivityTimer}
      onClick={resetInactivityTimer}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className={styles.video}
        onClick={togglePlay}
        playsInline
      />

      {errorMsg && (
        <div className={styles.errorState}>
          <AlertCircle size={48} color="var(--color-error)" style={{ marginBottom: '1rem' }} />
          <div className={styles.errorTitle}>Playback Error</div>
          <div className={styles.errorMessage}>{errorMsg}</div>
        </div>
      )}

      {isLoading && !errorMsg && (
        <div className={styles.centerState}>
          <Spinner />
        </div>
      )}

      {!isLoading && !isPlaying && isReady && !errorMsg && (
        <div className={styles.centerState} onClick={togglePlay} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
          <div className={styles.centerIcon}>
            <Play fill="currentColor" size={48} />
          </div>
        </div>
      )}

      <div className={`${styles.overlay} ${!controlsVisible ? styles.hidden : ''}`}>
        <div className={styles.topGradient} />
        <PlayerControls 
          videoRef={videoRef}
          isPlaying={isPlaying}
          onPlayPause={togglePlay}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          levels={levels}
          currentLevel={currentLevel}
          onSelectLevel={handleSelectLevel}
        />
      </div>
    </div>
  );
}
