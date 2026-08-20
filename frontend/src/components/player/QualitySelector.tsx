import { Settings } from 'lucide-react';
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
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!levels || levels.length === 0) return null;

  // Deduplicate and sort levels by height
  const uniqueHeights = new Set<number>();
  const filteredLevels = levels.filter(l => {
    if (uniqueHeights.has(l.height)) return false;
    uniqueHeights.add(l.height);
    return true;
  }).sort((a, b) => b.height - a.height);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button 
        className={styles.iconBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quality settings"
        title="Quality"
      >
        <Settings size={24} />
      </button>

      {isOpen && (
        <div className={styles.qualityMenu}>
          <button 
            className={`${styles.qualityBtn} ${currentLevel === -1 ? styles.active : ''}`}
            onClick={() => { onSelectLevel(-1); setIsOpen(false); }}
          >
            Auto
          </button>
          {filteredLevels.map((level) => (
            <button 
              key={level.id}
              className={`${styles.qualityBtn} ${currentLevel === level.id ? styles.active : ''}`}
              onClick={() => { onSelectLevel(level.id); setIsOpen(false); }}
            >
              {level.height}p
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
