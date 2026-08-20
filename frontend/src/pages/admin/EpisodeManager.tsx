import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { Button } from '../../components/ui/Button.js';
import { Trash, Edit, Plus, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function EpisodeManager() {
  const { seriesId, seasonId } = useParams<{ seriesId: string, seasonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: episodes, isLoading } = useQuery<any>({
    queryKey: ['adminEpisodes', seasonId],
    queryFn: () => adminApi.listEpisodes(seasonId!),
  });

  const { data: unassignedMedia } = useQuery<any>({
    queryKey: ['adminUnassignedMedia'],
    queryFn: async () => {
      const res = (await adminApi.listMedia(1)) as any;
      return res.data.filter((m: any) => !m.contentId && !m.episodeId);
    }
  });

  const [isEditing, setIsEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ episodeNumber: 1, title: '', description: '', duration: 0, thumbnailKey: '', mediaAssetId: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createEpisode(seasonId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminEpisodes'] });
      setIsEditing(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to create episode'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateEpisode(seasonId!, isEditing.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminEpisodes'] });
      setIsEditing(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update episode'),
  });

  const deleteMutation = useMutation({
    mutationFn: (episodeId: string) => adminApi.deleteEpisode(seasonId!, episodeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEpisodes'] }),
    onError: (err: any) => alert(err.message || 'Failed to delete episode'),
  });

  const publishMutation = useMutation({
    mutationFn: (episodeId: string) => adminApi.publishEpisode(episodeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEpisodes'] }),
    onError: (err: any) => alert(err.message || 'Failed to publish episode'),
  });

  const unpublishMutation = useMutation({
    mutationFn: (episodeId: string) => adminApi.unpublishEpisode(episodeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEpisodes'] }),
    onError: (err: any) => alert(err.message || 'Failed to unpublish episode'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      mediaAssetId: formData.mediaAssetId || null,
      duration: formData.duration || null
    };
    if (isEditing && isEditing.id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const startNew = () => {
    const nextNumber = episodes ? episodes.length + 1 : 1;
    setFormData({ episodeNumber: nextNumber, title: `Episode ${nextNumber}`, description: '', duration: 0, thumbnailKey: '', mediaAssetId: '' });
    setIsEditing({ isNew: true });
  };

  const startEdit = (ep: any) => {
    setFormData({
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      description: ep.description || '',
      duration: ep.duration || 0,
      thumbnailKey: ep.thumbnailKey || '',
      mediaAssetId: ep.mediaAsset?.id || ''
    });
    setIsEditing(ep);
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(`/admin/series/${seriesId}/seasons`)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Seasons
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600 }}>Manage Episodes</h1>

      {!isEditing ? (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <Button onClick={startNew}><Plus size={16} /> Add Episode</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isLoading ? <div>Loading...</div> : episodes?.length === 0 ? <div>No episodes found.</div> : episodes?.map((ep: any) => (
              <div key={ep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ep.episodeNumber}. {ep.title}</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    Status: <span style={{ color: ep.status === 'PUBLISHED' ? 'var(--color-success)' : 'inherit' }}>{ep.status}</span> • 
                    Media: <span style={{ color: ep.mediaAsset?.processingStatus === 'READY' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{ep.mediaAsset?.processingStatus || 'None'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="secondary"  onClick={() => startEdit(ep)}><Edit size={14} /></Button>
                  
                  {ep.status === 'PUBLISHED' ? (
                    <Button variant="secondary"  onClick={() => unpublishMutation.mutate(ep.id)} disabled={unpublishMutation.isPending}><EyeOff size={14} /></Button>
                  ) : (
                    <Button variant="secondary"  onClick={() => publishMutation.mutate(ep.id)} disabled={publishMutation.isPending}><Eye size={14} /></Button>
                  )}

                  <Button variant="danger"  onClick={() => { if (window.confirm('Delete episode?')) deleteMutation.mutate(ep.id); }} disabled={deleteMutation.isPending || ep.status === 'PUBLISHED'}>
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--color-bg-elevated)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing.isNew ? 'Add Episode' : 'Edit Episode'}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Episode Number</label>
              <input type="number" required value={formData.episodeNumber} onChange={e => setFormData({...formData, episodeNumber: parseInt(e.target.value)})} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ ...inputStyle, minHeight: '80px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Duration (minutes)</label>
              <input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Thumbnail Key</label>
              <input value={formData.thumbnailKey} onChange={e => setFormData({...formData, thumbnailKey: e.target.value})} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Assigned Video (Media Asset)</label>
            <select value={formData.mediaAssetId} onChange={e => setFormData({...formData, mediaAssetId: e.target.value})} style={inputStyle}>
              <option value="">None (Select an unassigned video)</option>
              {!isEditing.isNew && isEditing.mediaAsset && (
                <option value={isEditing.mediaAsset.id}>{isEditing.mediaAsset.originalFilename} (Current)</option>
              )}
              {unassignedMedia?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.originalFilename} ({m.processingStatus})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save Episode</Button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border-subtle)',
  background: 'var(--color-bg-base)',
  color: 'white',
  fontSize: '0.95rem'
};
