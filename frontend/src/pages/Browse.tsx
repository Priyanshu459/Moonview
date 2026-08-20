import { PageContainer } from '../components/ui/PageContainer.js';
import { EmptyState } from '../components/states/EmptyState.js';
import { useQuery } from '@tanstack/react-query';
import { getBrowseContent } from '../api/content.js';
import { Spinner } from '../components/ui/Spinner.js';

export function Browse() {
  const { data, isLoading } = useQuery({ queryKey: ['browse'], queryFn: getBrowseContent });

  return (
    <PageContainer style={{ paddingTop: '100px' }}>
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}><Spinner /></div>
      ) : (
        <EmptyState title="Browse Content" description="Categories and genres will appear here." />
      )}
    </PageContainer>
  );
}
