import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '../components/ui/PageContainer.js';
import { Input } from '../components/ui/Input.js';
import { EmptyState } from '../components/states/EmptyState.js';
import { searchContent } from '../api/search.js';
import { Image } from '../components/ui/Image.js';
import { Button } from '../components/ui/Button.js';
import styles from './Search.module.css';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query !== debouncedQuery) {
        // When query changes, sync to URL and reset to page 1
        if (query.trim()) {
          setSearchParams({ q: query, page: '1' }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery, setSearchParams]);

  // Sync local input state if URL changes externally (e.g., back/forward nav)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== debouncedQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
  }, [searchParams, debouncedQuery]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: () => searchContent(debouncedQuery, page, limit),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 60 * 1000,
  });

  const handleNextPage = () => {
    if (data?.meta.hasNext) {
      setSearchParams({ q: debouncedQuery, page: String(page + 1) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setSearchParams({ q: debouncedQuery, page: String(page - 1) });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <PageContainer style={{ paddingTop: '100px' }}>
      <Input 
        placeholder="Search for movies, series, or genres..." 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        style={{ marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 4rem auto' }}
        autoFocus
        aria-label="Search"
      />
      
      {!debouncedQuery.trim() ? (
        <EmptyState title="Explore Moonview" description="Search for your next favorite cinematic experience." />
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }} aria-live="polite">
          Searching for "{debouncedQuery}"...
        </div>
      ) : isError ? (
        <EmptyState title="Search Failed" description="There was an error processing your search. Please try again." />
      ) : data?.data.length === 0 ? (
        <EmptyState title={`No results for "${debouncedQuery}"`} description="Try searching for a different title or genre." />
      ) : (
        <>
          <div aria-live="polite" style={{ marginBottom: '2rem', padding: '0 4vw', color: 'var(--color-text-muted)' }}>
            Found {data?.meta.total} results for "{debouncedQuery}"
          </div>
          
          <div className={styles.searchGrid}>
            {data?.data.map((item) => (
              <Link 
                key={item.id} 
                to={`/${item.type.toLowerCase()}/${item.slug}`} 
                className={styles.searchCard}
                aria-label={`View details for ${item.title}`}
              >
                {item.posterUrl ? (
                  <Image src={item.posterUrl} alt={item.title} className={styles.poster} loading="lazy" width={400} height={600} />
                ) : (
                  <div className={styles.emptyPoster}>{item.title}</div>
                )}
              </Link>
            ))}
          </div>

          {(data?.meta.hasNext || page > 1) && (
            <div className={styles.pagination}>
              <Button 
                variant="secondary" 
                onClick={handlePrevPage} 
                disabled={page === 1}
              >
                Previous
              </Button>
              <span>Page {page}</span>
              <Button 
                variant="secondary" 
                onClick={handleNextPage} 
                disabled={!data?.meta.hasNext}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
