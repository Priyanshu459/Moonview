import { Router } from 'express';
import { searchController, searchRateLimiter } from '../controllers/search.controller.js';

const router = Router();

router.get('/', searchRateLimiter, searchController.search.bind(searchController));

export default router;
