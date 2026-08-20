import { Link } from 'react-router';
import styles from './ContentRow.module.css';
import { useRef } from 'react';
import { Image } from './Image.js';

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  posterUrl?: string | null;
  poster?: string | null; // From ContinueWatchingItem
  type: 'MOVIE' | 'SERIES';
  mediaId?: string;
  percentage?: number;
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
}

export function ContentRow({ title, items }: ContentRowProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className={styles.rowContainer}>
      <h2 className={styles.rowTitle}>{title}</h2>
      <div className={`${styles.slider} no-scrollbar`} ref={sliderRef} role="region" aria-label={title}>
        {items.map((item) => {
          const destination = item.mediaId ? `/watch/${item.mediaId}` : `/${item.type.toLowerCase()}/${item.slug}`;
          return (
            <Link 
              key={item.id} 
              to={destination} 
              className={styles.card}
              aria-label={`View details for ${item.title}`}
            >
              <div className={styles.posterWrapper}>
                {item.posterUrl || item.poster ? (
                  <Image src={item.posterUrl || item.poster || ''} alt={item.title} className={styles.poster} width={400} height={600} />
                ) : (
                  <div className={styles.emptyPoster}>{item.title}</div>
                )}
                
                {item.percentage !== undefined && (
                  <div className={styles.progressContainer}>
                    <div 
                      className={styles.progressBar} 
                      style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} 
                    />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
