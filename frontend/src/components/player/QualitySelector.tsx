import { Settings, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import styles from './VideoPlayer.module.css';

interface QualityLevel {
  height: number;
  id: number;
}

interface QualitySelectorProps {
  levels: QualityLevel[];
  currentLevel: number;
  onSelectLevel: (levelId: number) => void;
}

export function QualitySelector({ levels, currentLevel, onSelectLevel }: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const uniqueHeights = new Set<number>();
  const filteredLevels = levels
    .filter((level) => {
      if (!level.height || uniqueHeights.has(level.height)) return false;
      uniqueHeights.add(level.height);
      return true;
    })
    .sort((a, b) => b.height - a.height);

  const selectedLevel = filteredLevels.find((level) => level.id === currentLevel);
  const label = currentLevel === -1
    ? selectedLevel ? `Auto (${selectedLevel.height}p)` : 'Auto'
    : selectedLevel ? `${selectedLevel.height}p` : 'Quality';
  const hasManualLevels = filteredLevels.length > 0;

  return (
    <div ref={containerRef} className={styles.qualityRoot}>
      <button
        className={styles.iconBtn}
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Playback settings"
        aria-expanded={isOpen}
        title="Playback settings"
        type="button"
      >
        <Settings size={24} />
      </button>

      {isOpen && (
        <div className={styles.qualityMenu} role="menu" aria-label="Playback quality">
          <div className={styles.qualityHeader}>Quality</div>
          <button
            className={`${styles.qualityBtn} ${currentLevel === -1 ? styles.active : ''}`}
            onClick={() => { onSelectLevel(-1); setIsOpen(false); }}
            type="button"
            role="menuitemradio"
            aria-checked={currentLevel === -1}
          >
            <span>Auto</span>
            <span className={styles.qualityMeta}>{label}</span>
            {currentLevel === -1 && <Check size={16} />}
          </button>

          {hasManualLevels ? filteredLevels.map((level) => (
            <button
              key={level.id}
              className={`${styles.qualityBtn} ${currentLevel === level.id ? styles.active : ''}`}
              onClick={() => { onSelectLevel(level.id); setIsOpen(false); }}
              type="button"
              role="menuitemradio"
              aria-checked={currentLevel === level.id}
            >
              <span>{level.height}p</span>
              <span className={styles.qualityMeta}>{level.height >= 720 ? 'HD' : 'SD'}</span>
              {currentLevel === level.id && <Check size={16} />}
            </button>
          )) : (
            <div className={styles.qualityEmpty}>Manual quality is not available for this source yet.</div>
          )}
        </div>
      )}
    </div>
  );
}