import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button.js';
import { ArrowLeft, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { apiFetch } from '../../api/client.js';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['MOVIE', 'SERIES']),
  releaseYear: z.number().int().min(1900).max(2100),
  duration: z.number().int().nullable().optional(),
  maturityRating: z.enum(['G', 'PG', 'PG_13', 'R', 'NC_17', 'TV_Y', 'TV_Y7', 'TV_G', 'TV_PG', 'TV_14', 'TV_MA']),
  featured: z.boolean().default(false),
  posterKey: z.string().nullable().optional(),
  backdropKey: z.string().nullable().optional(),
  trailerKey: z.string().nullable().optional(),
  tags: z.string().optional(),
  genres: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  mediaAssetId: z.string().nullable().optional(),
});

type ImageFieldName = 'posterKey' | 'backdropKey';
type UploadResponse = { storageKey: string; originalFilename: string; mimeType: string; size: number };

export function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const { data: content, isLoading: isContentLoading } = useQuery<any>({
    queryKey: ['adminContent', id],
    queryFn: () => adminApi.getContent(id!),
    enabled: !isNew,
  });

  const { data: taxonomy } = useQuery<any>({
    queryKey: ['adminTaxonomy'],
    queryFn: async () => {
      const [genres, categories] = await Promise.all([
        adminApi.listGenres(),
        adminApi.listCategories()
      ]);
      return { genres, categories };
    }
  });

  const { data: unassignedMedia } = useQuery<any>({
    queryKey: ['adminUnassignedMedia'],
    queryFn: async () => {
      const res = (await adminApi.listMedia(1)) as any;
      return res.data.filter((m: any) => !m.contentId && !m.episodeId);
    }
  });

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      type: 'MOVIE',
      releaseYear: new Date().getFullYear(),
      maturityRating: 'PG_13',
      featured: false,
      tags: '',
      genres: [],
      categories: [],
      posterKey: null,
      backdropKey: null,
    }
  });

  useEffect(() => {
    if (content && !isNew) {
      reset({
        ...content,
        tags: content.tags?.join(', ') || '',
        genres: content.genres?.map((g: any) => g.genreId) || [],
        categories: content.categories?.map((c: any) => c.categoryId) || [],
        posterKey: content.posterKey || null,
        backdropKey: content.backdropKey || null,
        mediaAssetId: content.mediaAsset?.id || null
      });
    }
  }, [content, isNew, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => isNew ? adminApi.createContent(data) : adminApi.updateContent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContent'] });
      navigate('/admin/content');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to save content');
    }
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const uploadImage = async (file: File, fieldName: ImageFieldName, onChange: (val: string | null) => void) => {
    if (!file.type.startsWith('image/')) {
      setUploadErrors(prev => ({ ...prev, [fieldName]: 'Please choose a JPG, PNG, or WebP image.' }));
      return;
    }

    const endpoint = fieldName === 'posterKey' ? '/uploads/poster' : '/uploads/backdrop';
    const formData = new FormData();
    formData.append('file', file);

    setUploading(prev => ({ ...prev, [fieldName]: true }));
    setUploadErrors(prev => ({ ...prev, [fieldName]: '' }));

    try {
      const result = await apiFetch<UploadResponse>(endpoint, {
        method: 'POST',
        body: formData,
        timeout: 60_000,
      });
      onChange(result.storageKey);
    } catch (error: any) {
      setUploadErrors(prev => ({ ...prev, [fieldName]: error.message || 'Upload failed. Please try again.' }));
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      posterKey: data.posterKey || null,
      backdropKey: data.backdropKey || null,
      tags: data.tags ? data.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    };
    saveMutation.mutate(payload);
  };

  const typeValue = watch('type');

  if (!isNew && isContentLoading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '3rem', maxWidth: '920px', margin: '0 auto' }}>
      <button onClick={() => navigate('/admin/content')} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Content
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 600 }}>{isNew ? 'New Content' : 'Edit Content'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Type</label>
            <select {...register('type')} style={inputStyle} disabled={!isNew}>
              <option value="MOVIE">Movie</option>
              <option value="SERIES">Series</option>
            </select>
            {errors.type && <span style={errorStyle}>{String(errors.type?.message)}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Title</label>
            <input {...register('title')} style={inputStyle} />
            {errors.title && <span style={errorStyle}>{String(errors.title?.message)}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Slug (URL-friendly)</label>
          <input {...register('slug')} style={inputStyle} />
          {errors.slug && <span style={errorStyle}>{String(errors.slug?.message)}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Description</label>
          <textarea {...register('description')} style={{ ...inputStyle, minHeight: '100px' }} />
          {errors.description && <span style={errorStyle}>{String(errors.description?.message)}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Release Year</label>
            <input type="number" {...register('releaseYear', { valueAsNumber: true })} style={inputStyle} />
            {errors.releaseYear && <span style={errorStyle}>{String(errors.releaseYear?.message)}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Maturity Rating</label>
            <select {...register('maturityRating')} style={inputStyle}>
              <option value="G">G</option><option value="PG">PG</option><option value="PG_13">PG-13</option>
              <option value="R">R</option><option value="NC_17">NC-17</option><option value="TV_Y">TV-Y</option>
              <option value="TV_Y7">TV-Y7</option><option value="TV_G">TV-G</option><option value="TV_PG">TV-PG</option>
              <option value="TV_14">TV-14</option><option value="TV_MA">TV-MA</option>
            </select>
            {errors.maturityRating && <span style={errorStyle}>{String(errors.maturityRating?.message)}</span>}
          </div>
        </div>

        {typeValue === 'MOVIE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Duration (minutes)</label>
            <input type="number" {...register('duration', { valueAsNumber: true })} style={inputStyle} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
          <input type="checkbox" id="featured" {...register('featured')} style={{ width: '1.2rem', height: '1.2rem' }} />
          <label htmlFor="featured" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Featured (Show on Homepage Hero)</label>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>Artwork</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Drag and drop images here. Moonview will save the correct media key automatically.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <Controller
              control={control}
              name="posterKey"
              render={({ field }) => (
                <ArtworkDropZone
                  label="Poster image"
                  helper="Vertical cover artwork"
                  value={field.value}
                  aspect="poster"
                  uploading={Boolean(uploading.posterKey)}
                  error={uploadErrors.posterKey}
                  onChange={field.onChange}
                  onUpload={(file) => uploadImage(file, 'posterKey', field.onChange)}
                />
              )}
            />

            <Controller
              control={control}
              name="backdropKey"
              render={({ field }) => (
                <ArtworkDropZone
                  label="Banner / backdrop image"
                  helper="Wide hero banner used on homepage/details"
                  value={field.value}
                  aspect="backdrop"
                  uploading={Boolean(uploading.backdropKey)}
                  error={uploadErrors.backdropKey}
                  onChange={field.onChange}
                  onUpload={(file) => uploadImage(file, 'backdropKey', field.onChange)}
                />
              )}
            />
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Tags (comma-separated)</label>
          <input {...register('tags')} style={inputStyle} placeholder="sci-fi, space, action" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Genres</label>
            <select multiple {...register('genres')} style={{ ...inputStyle, minHeight: '100px' }}>
              {taxonomy?.genres?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Categories</label>
            <select multiple {...register('categories')} style={{ ...inputStyle, minHeight: '100px' }}>
              {taxonomy?.categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {typeValue === 'MOVIE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg-elevated)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Assigned Video (Media Asset)</label>
            <select {...register('mediaAssetId')} style={inputStyle}>
              <option value="">None (Select an unassigned video)</option>
              {content?.mediaAsset && (
                <option value={content.mediaAsset.id}>{content.mediaAsset.originalFilename} (Current)</option>
              )}
              {unassignedMedia?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.originalFilename} ({m.processingStatus})</option>
              ))}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              To assign a new video, go to Media Library, upload it, wait for it to be READY, and then select it here.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/content')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>{isSubmitting || saveMutation.isPending ? 'Saving...' : 'Save Content'}</Button>
        </div>
      </form>
    </div>
  );
}

function ArtworkDropZone({
  label,
  helper,
  value,
  aspect,
  uploading,
  error,
  onChange,
  onUpload,
}: {
  label: string;
  helper: string;
  value?: string | null;
  aspect: 'poster' | 'backdrop';
  uploading: boolean;
  error?: string;
  onChange: (value: string | null) => void;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewUrl = value ? `/media/${value}` : null;

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</label>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>{helper}</div>
        </div>
        {value && (
          <button type="button" onClick={() => onChange(null)} style={clearButtonStyle} aria-label={`Remove ${label}`}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        disabled={uploading}
        style={{
          ...dropZoneStyle,
          minHeight: aspect === 'poster' ? '260px' : '180px',
          aspectRatio: aspect === 'poster' ? '2 / 3' : '16 / 9',
          borderColor: isDragging ? 'var(--color-brand-accent)' : value ? 'rgba(124, 108, 255, 0.48)' : 'var(--color-border-subtle)',
          background: isDragging ? 'rgba(124, 108, 255, 0.16)' : 'var(--color-bg-elevated)',
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.82 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={(event) => handleFiles(event.target.files)}
          disabled={uploading}
          style={{ display: 'none' }}
        />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label} style={previewImageStyle} />
            <span style={imageKeyBadgeStyle}>{value}</span>
          </>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: '0.65rem', padding: '1.2rem', textAlign: 'center' }}>
            <div style={uploadIconStyle}>
              {uploading ? <Loader2 size={28} style={spinnerIconStyle} /> : <UploadCloud size={30} />}
            </div>
            <div style={{ fontWeight: 700 }}>{uploading ? 'Uploading image...' : 'Drop image here'}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>or click to choose JPG, PNG, or WebP</div>
          </div>
        )}

        {uploading && previewUrl && (
          <div style={uploadOverlayStyle}>
            <Loader2 size={28} style={spinnerIconStyle} />
            Uploading...
          </div>
        )}
      </button>

      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', fontSize: '0.78rem', wordBreak: 'break-all' }}>
          <ImageIcon size={13} /> {value}
        </div>
      )}
      {error && <span style={errorStyle}>{error}</span>}
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

const dropZoneStyle = {
  position: 'relative' as const,
  width: '100%',
  overflow: 'hidden',
  border: '1px dashed var(--color-border-subtle)',
  borderRadius: '14px',
  color: 'var(--color-text-primary)',
  transition: 'border-color 160ms ease, background 160ms ease, transform 160ms ease',
};

const previewImageStyle = {
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
};

const imageKeyBadgeStyle = {
  position: 'absolute' as const,
  left: '0.75rem',
  right: '0.75rem',
  bottom: '0.75rem',
  padding: '0.45rem 0.55rem',
  borderRadius: '8px',
  background: 'rgba(7, 10, 18, 0.72)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: 'var(--color-text-secondary)',
  fontSize: '0.72rem',
  textAlign: 'left' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  backdropFilter: 'blur(12px)',
};

const uploadIconStyle = {
  width: '58px',
  height: '58px',
  display: 'grid',
  placeItems: 'center',
  color: 'white',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-accent))',
  boxShadow: '0 16px 42px rgba(124, 108, 255, 0.28)',
};

const spinnerIconStyle = {
  animation: 'spin 1s linear infinite',
};

const uploadOverlayStyle = {
  position: 'absolute' as const,
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  gap: '0.5rem',
  background: 'rgba(7, 10, 18, 0.72)',
  color: 'white',
  fontWeight: 700,
  backdropFilter: 'blur(8px)',
};

const clearButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.35rem 0.55rem',
  borderRadius: '999px',
  border: '1px solid var(--color-border-subtle)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  fontSize: '0.78rem',
};

const errorStyle = {
  color: 'var(--color-error)',
  fontSize: '0.8rem'
};