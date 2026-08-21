import { PageContainer } from '../components/ui/PageContainer.js';
import { EmptyState } from '../components/states/EmptyState.js';
import { ErrorState } from '../components/states/ErrorState.js';
import { useQuery } from '@tanstack/react-query';
import { getBrowseContent } from '../api/content.js';
import { Spinner } from '../components/ui/Spinner.js';
import { ContentRow } from '../components/ui/ContentRow.js';

export function Browse() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['browse'],
    queryFn: getBrowseContent,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageContainer style={{ paddingTop: '100px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner /></div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer style={{ paddingTop: '100px' }}>
        <ErrorState title="Browse is temporarily unavailable" error={error as Error} onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const rows = data?.rows || [];

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      {rows.length > 0 ? (
        rows.map((row: any) => <ContentRow key={row.title} title={row.title} items={row.items} />)
      ) : (
        <PageContainer>
          <EmptyState
            title="Nothing to browse yet"
            description="Publish a movie or series from the admin area and it will appear here automatically."
          />
        </PageContainer>
      )}
    </div>
  );
}