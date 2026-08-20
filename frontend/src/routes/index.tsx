import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { PublicLayout } from '../layouts/PublicLayout.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { RequireAuth } from '../components/auth/RequireAuth.js';
import { RequireAdmin } from '../components/auth/RequireAdmin.js';
import { ErrorState } from '../components/states/ErrorState.js';
import { AppErrorBoundary } from '../components/states/AppErrorBoundary.js';
import { Spinner } from '../components/ui/Spinner.js';

const Home = lazy(() => import('../pages/Home.js').then((module) => ({ default: module.Home })));
const Browse = lazy(() => import('../pages/Browse.js').then((module) => ({ default: module.Browse })));
const Search = lazy(() => import('../pages/Search.js').then((module) => ({ default: module.Search })));
const Movie = lazy(() => import('../pages/Movie.js').then((module) => ({ default: module.Movie })));
const Series = lazy(() => import('../pages/Series.js').then((module) => ({ default: module.Series })));
const Watch = lazy(() => import('../pages/Watch.js').then((module) => ({ default: module.Watch })));
const Login = lazy(() => import('../pages/Login.js').then((module) => ({ default: module.Login })));
const AdminLayout = lazy(() => import('../layouts/AdminLayout.js').then((module) => ({ default: module.AdminLayout })));
const Dashboard = lazy(() => import('../pages/admin/Dashboard.js').then((module) => ({ default: module.Dashboard })));
const ContentManager = lazy(() => import('../pages/admin/ContentManager.js').then((module) => ({ default: module.ContentManager })));
const ContentEditor = lazy(() => import('../pages/admin/ContentEditor.js').then((module) => ({ default: module.ContentEditor })));
const SeasonManager = lazy(() => import('../pages/admin/SeasonManager.js').then((module) => ({ default: module.SeasonManager })));
const EpisodeManager = lazy(() => import('../pages/admin/EpisodeManager.js').then((module) => ({ default: module.EpisodeManager })));
const MediaLibrary = lazy(() => import('../pages/admin/MediaLibrary.js').then((module) => ({ default: module.MediaLibrary })));
const TaxonomyManager = lazy(() => import('../pages/admin/TaxonomyManager.js').then((module) => ({ default: module.TaxonomyManager })));

const routeFallback = (
  <div style={{ minHeight: '50dvh', display: 'grid', placeItems: 'center' }}>
    <Spinner />
  </div>
);
function NotFound() {
  return (
    <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
      <ErrorState title="Page Not Found" error={new Error("The page you're looking for doesn't exist.")} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={routeFallback}>
    <Routes>
      <Route element={<AppErrorBoundary area="Public experience"><PublicLayout /></AppErrorBoundary>}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movie/:slug" element={<Movie />} />
        <Route path="/series/:slug" element={<Series />} />
        <Route path="/watch/:id" element={<Watch />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<AppErrorBoundary area="Admin CMS"><AdminLayout /></AppErrorBoundary>}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/content" element={<ContentManager />} />
            <Route path="/admin/content/new" element={<ContentEditor />} />
            <Route path="/admin/content/:id" element={<ContentEditor />} />
            <Route path="/admin/series/:id/seasons" element={<SeasonManager />} />
            <Route path="/admin/series/:seriesId/seasons/:seasonId/episodes" element={<EpisodeManager />} />
            <Route path="/admin/media" element={<MediaLibrary />} />
            <Route path="/admin/taxonomy" element={<TaxonomyManager />} />
            <Route path="/admin/*" element={<NotFound />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
