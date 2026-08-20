import { Play, Info } from 'lucide-react';
import { Link } from 'react-router';
import styles from './Hero.module.css';

interface HeroProps {
  id: string;
  title: string;
  description: string;
  backdropUrl?: string | null;
  matchScore?: number;
  year?: number;
  maturityRating?: string;
  duration?: string;
  slug: string;
  type: 'MOVIE' | 'SERIES';
}

export function Hero({
  id, title, description, backdropUrl, matchScore, year, maturityRating, duration, slug, type
}: HeroProps) {
  return (
    <div className={styles.hero}>
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt=""
          className={styles.backdrop}
          aria-hidden="true"
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      )}
      <div className={styles.overlay} />
      
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        
        <div className={styles.metadata}>
          {matchScore && <span className={styles.match}>{matchScore}% Match</span>}
          {year && <span>{year}</span>}
          {maturityRating && <span className={styles.maturity}>{maturityRating}</span>}
          {duration && <span>{duration}</span>}
        </div>
        
        <p className={styles.description}>{description}</p>
        
        <div className={styles.actions}>
          <Link to={`/watch/${id}`} className={styles.btnPrimary}>
            <Play fill="currentColor" size={24} />
            Play
          </Link>
          <Link to={`/${type.toLowerCase()}/${slug}`} className={styles.btnSecondary}>
            <Info size={24} />
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}
