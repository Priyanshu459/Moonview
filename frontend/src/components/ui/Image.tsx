import { ImgHTMLAttributes, useState } from 'react';
import { Skeleton } from './Skeleton.js';

export function Image({ src, alt, style, className, loading = 'lazy', decoding = 'async', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {!loaded && <Skeleton style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
        {...props}
      />
    </div>
  );
}
