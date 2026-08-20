import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { Button } from '../../components/ui/Button.js';
import { Trash, Upload } from 'lucide-react';
import { apiFetch } from '../../api/client.js';

export function MediaLibrary() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['adminMedia', page],
    queryFn: () => adminApi.listMedia(page),
    staleTime: 15_000,
    refetchInterval: (query) => {
      const result = query.state.data as { data?: Array<{ processingStatus: string }> } | undefined;
      return result?.data?.some((item) => item.processingStatus === 'PENDING' || item.processingStatus === 'PROCESSING')
        ? 5_000
        : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteMedia,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminMedia'] }),
    onError: (err: any) => alert(err.message || 'Failed to delete media'),
  });

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiFetch('/uploads/video', {
        method: 'POST',
        body: formData,
        timeout: 30 * 60 * 1000,
      });
      alert('Upload started successfully. The media will be processed.');
      refetch();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{ padding: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Media Library</h1>
        
        <div>
          <input 
            type="file" 
            id="video-upload" 
            style={{ display: 'none' }} 
            accept="video/mp4,video/webm,video/x-matroska,.mp4,.webm,.mkv"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button onClick={() => document.getElementById('video-upload')?.click()} style={{ opacity: uploading ? 0.7 : 1 }}>
            <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </div>
      </div>

      <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border-subtle)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <th style={{ padding: '1rem' }}>Filename</th>
              <th style={{ padding: '1rem' }}>Size</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Linked To</th>
              <th style={{ padding: '1rem' }}>Uploaded At</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>No media found.</td></tr>
            ) : (
              data?.data?.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '1rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 500 }} title={item.originalFilename}>{item.originalFilename}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: item.processingStatus === 'READY' ? 'rgba(53, 208, 127, 0.1)' : 
                                  item.processingStatus === 'FAILED' ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255,255,255,0.1)',
                      color: item.processingStatus === 'READY' ? 'var(--color-success)' : 
                             item.processingStatus === 'FAILED' ? 'var(--color-error)' : 'white'
                    }}>
                      {item.processingStatus}
                    </span>
                    {item.processingError && <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>{item.processingError}</div>}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {item.content ? (
                      <div><span style={{ color: 'var(--color-brand-primary)' }}>Movie:</span> {item.content.title}</div>
                    ) : item.episode ? (
                      <div><span style={{ color: 'var(--color-brand-secondary)' }}>Episode:</span> {item.episode.season.series.title} - {item.episode.title}</div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Button 
                      variant="danger" 
                       
                      onClick={() => { if (window.confirm('Delete this media asset?')) deleteMutation.mutate(item.id); }} 
                      disabled={deleteMutation.isPending || item.content || item.episode}
                      title={(item.content || item.episode) ? "Cannot delete assigned media" : ""}
                    >
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
          Showing page {data?.meta?.page} of {data?.meta?.total && data?.meta?.limit ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="secondary" disabled={!data?.meta?.hasNext} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
