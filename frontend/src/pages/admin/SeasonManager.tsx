import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { Button } from '../../components/ui/Button.js';
import { Trash, Edit, Plus, ArrowLeft } from 'lucide-react';

export function SeasonManager() {
  const { id: seriesId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: series } = useQuery<any>({
    queryKey: ['adminContent', seriesId],
    queryFn: () => adminApi.getContent(seriesId!),
  });

  const { data: seasons, isLoading } = useQuery<any>({
    queryKey: ['adminSeasons', seriesId],
    queryFn: () => adminApi.listSeasons(seriesId!),
  });

  const [isEditing, setIsEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ seasonNumber: 1, title: '', description: '', releaseYear: 0, posterKey: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createSeason(seriesId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSeasons'] });
      setIsEditing(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to create season'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateSeason(seriesId!, isEditing.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSeasons'] });
      setIsEditing(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update season'),
  });

  const deleteMutation = useMutation({
    mutationFn: (seasonId: string) => adminApi.deleteSeason(seriesId!, seasonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSeasons'] }),
    onError: (err: any) => alert(err.message || 'Failed to delete season'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && isEditing.id) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const startNew = () => {
    const nextNumber = seasons ? seasons.length + 1 : 1;
    setFormData({ seasonNumber: nextNumber, title: `Season ${nextNumber}`, description: '', releaseYear: new Date().getFullYear(), posterKey: '' });
    setIsEditing({ isNew: true });
  };

  const startEdit = (season: any) => {
    setFormData({
      seasonNumber: season.seasonNumber,
      title: season.title,
      description: season.description || '',
      releaseYear: season.releaseYear || new Date().getFullYear(),
      posterKey: season.posterKey || ''
    });
    setIsEditing(season);
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/admin/content')} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Content
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 600 }}>Seasons for {series?.title || 'Series'}</h1>

      {!isEditing ? (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <Button onClick={startNew}><Plus size={16} /> Add Season</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isLoading ? <div>Loading...</div> : seasons?.length === 0 ? <div>No seasons found.</div> : seasons?.map((season: any) => (
              <div key={season.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.25rem' }}>{season.title} (Season {season.seasonNumber})</h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{season._count?.episodes || 0} Episodes</div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button variant="secondary"  onClick={() => startEdit(season)}><Edit size={14} /></Button>
                  <Button variant="secondary"  onClick={() => navigate(`/admin/series/${seriesId}/seasons/${season.id}/episodes`)}>Manage Episodes</Button>
                  <Button variant="danger"  onClick={() => { if (window.confirm('Delete season?')) deleteMutation.mutate(season.id); }} disabled={deleteMutation.isPending || season._count?.episodes > 0}>
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--color-bg-elevated)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing.isNew ? 'Add Season' : 'Edit Season'}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Season Number</label>
              <input type="number" required value={formData.seasonNumber} onChange={e => setFormData({...formData, seasonNumber: parseInt(e.target.value)})} style={inputStyle} />
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
              <label>Release Year</label>
              <input type="number" value={formData.releaseYear} onChange={e => setFormData({...formData, releaseYear: parseInt(e.target.value)})} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Poster Key</label>
              <input value={formData.posterKey} onChange={e => setFormData({...formData, posterKey: e.target.value})} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Save Season</Button>
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
