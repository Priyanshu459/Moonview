import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { csrfMiddleware } from '../middleware/csrf.js';
import { adminController } from '../controllers/admin.controller.js';
import { adminContentController } from '../controllers/admin-content.controller.js';
import { adminSeriesController } from '../controllers/admin-series.controller.js';
import { adminMediaController } from '../controllers/admin-media.controller.js';
import { adminTaxonomyController } from '../controllers/admin-taxonomy.controller.js';

const router = Router();

router.use(authenticateToken, requireAdmin, csrfMiddleware);

// Stats
router.get('/stats', adminController.getStats.bind(adminController));

// Taxonomy
router.get('/genres', adminTaxonomyController.listGenres.bind(adminTaxonomyController));
router.post('/genres', adminTaxonomyController.createGenre.bind(adminTaxonomyController));
router.put('/genres/:id', adminTaxonomyController.updateGenre.bind(adminTaxonomyController));
router.delete('/genres/:id', adminTaxonomyController.deleteGenre.bind(adminTaxonomyController));

router.get('/categories', adminTaxonomyController.listCategories.bind(adminTaxonomyController));
router.post('/categories', adminTaxonomyController.createCategory.bind(adminTaxonomyController));
router.put('/categories/:id', adminTaxonomyController.updateCategory.bind(adminTaxonomyController));
router.delete('/categories/:id', adminTaxonomyController.deleteCategory.bind(adminTaxonomyController));

// Media
router.get('/media', adminMediaController.listMedia.bind(adminMediaController));
router.get('/media/:id', adminMediaController.getMedia.bind(adminMediaController));
router.delete('/media/:id', adminMediaController.deleteMedia.bind(adminMediaController));

// Content (Movies / Series)
router.get('/content', adminContentController.listContent.bind(adminContentController));
router.get('/content/:id', adminContentController.getContent.bind(adminContentController));
router.post('/content', adminContentController.createContent.bind(adminContentController));
router.put('/content/:id', adminContentController.updateContent.bind(adminContentController));
router.delete('/content/:id', adminContentController.deleteContent.bind(adminContentController));
router.post('/content/:id/publish', adminContentController.publishContent.bind(adminContentController));
router.post('/content/:id/unpublish', adminContentController.unpublishContent.bind(adminContentController));

// Series Hierarchy
router.get('/series/:seriesId/seasons', adminSeriesController.listSeasons.bind(adminSeriesController));
router.post('/series/:seriesId/seasons', adminSeriesController.createSeason.bind(adminSeriesController));
router.put('/series/:seriesId/seasons/:seasonId', adminSeriesController.updateSeason.bind(adminSeriesController));
router.delete('/series/:seriesId/seasons/:seasonId', adminSeriesController.deleteSeason.bind(adminSeriesController));

router.get('/seasons/:seasonId/episodes', adminSeriesController.listEpisodes.bind(adminSeriesController));
router.post('/seasons/:seasonId/episodes', adminSeriesController.createEpisode.bind(adminSeriesController));
router.put('/seasons/:seasonId/episodes/:episodeId', adminSeriesController.updateEpisode.bind(adminSeriesController));
router.delete('/seasons/:seasonId/episodes/:episodeId', adminSeriesController.deleteEpisode.bind(adminSeriesController));
router.post('/episodes/:episodeId/publish', adminSeriesController.publishEpisode.bind(adminSeriesController));
router.post('/episodes/:episodeId/unpublish', adminSeriesController.unpublishEpisode.bind(adminSeriesController));

export default router;
