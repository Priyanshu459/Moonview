import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getStreamInfo } from '../api/streaming.js';
import { Spinner } from '../components/ui/Spinner.js';
import { ErrorState } from '../components/states/ErrorState.js';
import { ArrowLeft } from 'lucide-react';
import { VideoPlayer } from '../components/player/VideoPlayer.js';
import { AppErrorBoundary } from '../components/states/AppErrorBoundary.js';
import styles from './Watch.module.css';

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
    <main className={styles.watchShell}>
      <button
        onClick={() => navigate(-1)}
        className={styles.backButton}
        aria-label="Go back"
        type="button"
      >
        <ArrowLeft size={24} />
      </button>

      <section className={styles.playerStage}>
        {isLoading && (
          <div className={styles.stateLayer}>
            <Spinner />
          </div>
        )}

        {error && (
          <div className={styles.stateLayer}>
            <ErrorState title="Cannot play media" error={error as Error} />
          </div>
        )}

        {data && (
          <AppErrorBoundary area="Player">
            <VideoPlayer mediaId={data.mediaId} hlsUrl={data.hlsUrl} fallbackUrl={data.fallbackUrl} resumePosition={data.resumePosition} />
          </AppErrorBoundary>
        )}
      </section>
    </main>
  );
}