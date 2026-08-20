import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/states/EmptyState.js';

export function Movie() {
  const { slug } = useParams();

  // Placeholder for future fetch
  const { data, isLoading } = useQuery({
    queryKey: ['movie', slug],
    queryFn: async () => null // simulate empty data for now
  });

  if (isLoading) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  }

  if (!data) {
    return (
      <div style={{ paddingTop: '100px' }}>
        <EmptyState 
          title="Movie Unavailable" 
          description={`The movie "${slug}" is not available or does not exist.`} 
        />
      </div>
    );
  }

  return (
    <div>
      <h1>{slug}</h1>
    </div>
  );
}
