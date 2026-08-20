import { useQuery } from '@tanstack/react-query';
import { getHomeContent } from '../api/content.js';
import { getContinueWatching } from '../api/progress.js';
import { Hero } from '../components/ui/Hero.js';
import { ContentRow } from '../components/ui/ContentRow.js';
import { Spinner } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/states/EmptyState.js';
import { ErrorState } from '../components/states/ErrorState.js';

export function Home() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: getHomeContent,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  const { data: continueWatching, isLoading: isLoadingProgress } = useQuery({ 
    queryKey: ['continue-watching'], 
    queryFn: getContinueWatching,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading || isLoadingProgress) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  }

  if (error) {
    return <div style={{ padding: '120px 4vw 4rem' }}><ErrorState title="Moonview is temporarily unavailable" error={error as Error} onRetry={() => refetch()} /></div>;
  }

  if (!data || (!data.hero && data.rows.length === 0)) {
    return (
      <div style={{ paddingTop: '100px' }}>
        <EmptyState 
          title="Welcome to Moonview" 
          description="Content pipeline is being prepared. Check back soon for premium cinematic releases." 
        />
      </div>
    );
  }

  let rowsToRender = data.rows || [];
  
  if (continueWatching && continueWatching.length > 0) {
    rowsToRender = [
      {
        title: 'Continue Watching',
        items: continueWatching
      },
      ...rowsToRender
    ];
  }

  return (
    <div>
      {data.hero && <Hero {...data.hero} />}
      <div style={{ marginTop: data.hero ? '-10vh' : '100px', position: 'relative', zIndex: 10, paddingBottom: '4rem' }}>
        {rowsToRender.map((row: any) => (
          <ContentRow key={row.title} title={row.title} items={row.items} />
        ))}
      </div>
    </div>
  );
}
