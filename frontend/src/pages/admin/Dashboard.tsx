import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';

export function Dashboard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['adminStats'],
    queryFn: adminApi.getStats,
  });

  if (isLoading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '3rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 600 }}>Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <StatCard title="Total Movies" value={data?.totalMovies} />
        <StatCard title="Total Series" value={data?.totalSeries} />
        <StatCard title="Total Episodes" value={data?.totalEpisodes} />
        <StatCard title="Published Content" value={data?.publishedCount} />
        <StatCard title="Processing Media" value={data?.processingCount} />
        <StatCard title="Failed Jobs" value={data?.failedJobs} color="var(--color-error)" />
        <StatCard title="Storage Used" value={formatBytes(data?.storageUsage || 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--color-bg-elevated)', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Recent Uploads</h2>
          {data?.recentUploads?.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }}>No recent uploads.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.recentUploads?.map((u: any) => (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{u.originalFilename}</span>
                  <span style={{ 
                    fontSize: '0.8rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                    background: u.processingStatus === 'READY' ? 'rgba(53, 208, 127, 0.1)' : u.processingStatus === 'FAILED' ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    color: u.processingStatus === 'READY' ? 'var(--color-success)' : u.processingStatus === 'FAILED' ? 'var(--color-error)' : 'var(--color-text-secondary)'
                  }}>
                    {u.processingStatus}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: 'var(--color-bg-elevated)', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Recent Actions</h2>
          {data?.recentActions?.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }}>No recent actions.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.recentActions?.map((a: any) => (
                <li key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-brand-primary)' }}>{a.action}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem' }}>{a.resource} {a.resourceId ? `(${a.resourceId})` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = 'white' }: { title: string, value: string | number | undefined, color?: string }) {
  return (
    <div style={{ 
      background: 'var(--color-bg-elevated)', 
      padding: '1.5rem', 
      borderRadius: '8px',
      border: '1px solid var(--color-border-subtle)'
    }}>
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 600, color }}>{value !== undefined ? value : '-'}</div>
    </div>
  );
}
