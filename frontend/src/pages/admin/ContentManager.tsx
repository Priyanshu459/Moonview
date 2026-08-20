import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button.js';
import { Plus, Edit, Trash, Eye, EyeOff } from 'lucide-react';

export function ContentManager() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['adminContent', page, type],
    queryFn: () => adminApi.listContent({ page, limit: 10, type }),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminContent'] }),
  });

  const publishMutation = useMutation({
    mutationFn: adminApi.publishContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminContent'] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: adminApi.unpublishContent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminContent'] }),
  });

  return (
    <div style={{ padding: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Content Management</h1>
        <Button onClick={() => navigate('/admin/content/new')}><Plus size={16} /> Add Content</Button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <select 
          value={type} 
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--color-bg-elevated)', color: 'white', border: '1px solid var(--color-border-subtle)' }}
        >
          <option value="">All Types</option>
          <option value="MOVIE">Movie</option>
          <option value="SERIES">Series</option>
        </select>
      </div>

      <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <th style={{ padding: '1rem' }}>Title</th>
              <th style={{ padding: '1rem' }}>Type</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Media Status</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No content found.</td></tr>
            ) : (
              data?.data?.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.slug}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', background: '#333', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{item.type}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: item.status === 'PUBLISHED' ? 'rgba(53, 208, 127, 0.1)' : 'rgba(255,255,255,0.1)',
                      color: item.status === 'PUBLISHED' ? 'var(--color-success)' : 'white'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {item.type === 'MOVIE' ? (item.mediaAsset ? item.mediaAsset.processingStatus : 'No Media') : 'N/A (Series)'}
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary"  onClick={() => navigate(`/admin/content/${item.id}`)}><Edit size={14} /></Button>
                    
                    {item.type === 'SERIES' && (
                      <Button variant="secondary"  onClick={() => navigate(`/admin/series/${item.id}/seasons`)}>Seasons</Button>
                    )}

                    {item.status === 'PUBLISHED' ? (
                      <Button variant="secondary"  onClick={() => unpublishMutation.mutate(item.id)} disabled={unpublishMutation.isPending}><EyeOff size={14} /></Button>
                    ) : (
                      <Button variant="secondary"  onClick={() => publishMutation.mutate(item.id)} disabled={publishMutation.isPending}><Eye size={14} /></Button>
                    )}
                    
                    <Button variant="danger"  onClick={() => { if (window.confirm('Delete this content?')) deleteMutation.mutate(item.id); }} disabled={deleteMutation.isPending || item.status === 'PUBLISHED'}>
                      <Trash size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>
          Showing page {data?.meta?.page} of {data?.meta?.total && data?.meta?.limit ? Math.ceil(data.meta.total / data.meta.limit) : 1}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="secondary" disabled={!data?.meta?.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
