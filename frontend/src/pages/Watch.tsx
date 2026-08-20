import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getStreamInfo } from '../api/streaming.js';
import { Spinner } from '../components/ui/Spinner.js';
import { ErrorState } from '../components/states/ErrorState.js';
import { ArrowLeft } from 'lucide-react';
import { VideoPlayer } from '../components/player/VideoPlayer.js';
import { AppErrorBoundary } from '../components/states/AppErrorBoundary.js';

export function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['stream', id],
    queryFn: () => getStreamInfo(id as string),
    enabled: !!id,
    retry: false,
  });

  return (
    <div style={{ background: '#000', minHeight: '100dvh', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      
      <button 
        onClick={() => navigate(-1)} 
        style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 100, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', padding: '1rem', cursor: 'pointer', background: 'rgba(0,0,0,0.5)', borderRadius: '0.5rem' }}
        aria-label="Go back"
      >
        <ArrowLeft size={24} />
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isLoading && <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
        {error && <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}><ErrorState title="Cannot play media" error={error as Error} /></div>}
        {data && (
          <div style={{ flex: 1, height: '100dvh' }}>
            <AppErrorBoundary area="Player">
              <VideoPlayer mediaId={data.mediaId} hlsUrl={data.hlsUrl} fallbackUrl={data.fallbackUrl} resumePosition={data.resumePosition} />
            </AppErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
