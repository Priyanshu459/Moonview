import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.js';
import { Button } from '../../components/ui/Button.js';
import { Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const genreSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/)
});

const categorySchema = genreSchema.extend({
  description: z.string().optional(),
  sortOrder: z.number().int().default(0)
});

export function TaxonomyManager() {
  const queryClient = useQueryClient();

  const { data: genres, isLoading: genresLoading } = useQuery<any>({
    queryKey: ['adminGenres'],
    queryFn: adminApi.listGenres,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<any>({
    queryKey: ['adminCategories'],
    queryFn: adminApi.listCategories,
  });

  // Genre Form
  const { register: registerGenre, handleSubmit: handleSubmitGenre, reset: resetGenre, formState: { errors: genreErrors } } = useForm({
    resolver: zodResolver(genreSchema),
    defaultValues: { name: '', slug: '' }
  });

  const createGenreMutation = useMutation({
    mutationFn: adminApi.createGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminGenres'] });
      resetGenre();
    },
    onError: (err: any) => alert(err.message || 'Failed to create genre'),
  });

  const deleteGenreMutation = useMutation({
    mutationFn: adminApi.deleteGenre,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminGenres'] }),
    onError: (err: any) => alert(err.message || 'Failed to delete genre'),
  });

  // Category Form
  const { register: registerCategory, handleSubmit: handleSubmitCategory, reset: resetCategory, formState: { errors: categoryErrors } } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', description: '', sortOrder: 0 }
  });

  const createCategoryMutation = useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      resetCategory();
    },
    onError: (err: any) => alert(err.message || 'Failed to create category'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminCategories'] }),
    onError: (err: any) => alert(err.message || 'Failed to delete category'),
  });

  return (
    <div style={{ padding: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: 600 }}>Taxonomy Management</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* GENRES */}
        <div style={{ background: 'var(--color-bg-elevated)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>Genres</h2>
          
          <form onSubmit={handleSubmitGenre(data => createGenreMutation.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500 }}>Add New Genre</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <input {...registerGenre('name')} placeholder="Name" style={inputStyle} />
                {genreErrors.name && <span style={errorStyle}>{String(genreErrors.name.message)}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <input {...registerGenre('slug')} placeholder="Slug" style={inputStyle} />
                {genreErrors.slug && <span style={errorStyle}>{String(genreErrors.slug.message)}</span>}
              </div>
            </div>
            <Button type="submit" disabled={createGenreMutation.isPending}>Add Genre</Button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {genresLoading ? <div>Loading...</div> : genres?.map((g: any) => (
              <li key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{g.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{g.slug}</div>
                </div>
                <Button variant="danger"  onClick={() => { if (window.confirm('Delete genre?')) deleteGenreMutation.mutate(g.id); }} disabled={deleteGenreMutation.isPending}>
                  <Trash size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {/* CATEGORIES */}
        <div style={{ background: 'var(--color-bg-elevated)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>Categories</h2>
          
          <form onSubmit={handleSubmitCategory(data => createCategoryMutation.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500 }}>Add New Category</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <input {...registerCategory('name')} placeholder="Name" style={inputStyle} />
                {categoryErrors.name && <span style={errorStyle}>{String(categoryErrors.name.message)}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <input {...registerCategory('slug')} placeholder="Slug" style={inputStyle} />
                {categoryErrors.slug && <span style={errorStyle}>{String(categoryErrors.slug.message)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 2 }}>
                <input {...registerCategory('description')} placeholder="Description" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <input type="number" {...registerCategory('sortOrder', { valueAsNumber: true })} placeholder="Order" style={inputStyle} />
              </div>
            </div>
            <Button type="submit" disabled={createCategoryMutation.isPending}>Add Category</Button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categoriesLoading ? <div>Loading...</div> : categories?.map((c: any) => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.name} (Order: {c.sortOrder})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.slug}</div>
                </div>
                <Button variant="danger"  onClick={() => { if (window.confirm('Delete category?')) deleteCategoryMutation.mutate(c.id); }} disabled={deleteCategoryMutation.isPending}>
                  <Trash size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid var(--color-border-subtle)',
  background: 'var(--color-bg-base)',
  color: 'white',
  fontSize: '0.9rem'
};

const errorStyle = {
  color: 'var(--color-error)',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
  display: 'block'
};
