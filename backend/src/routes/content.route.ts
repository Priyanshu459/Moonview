import { Router } from 'express';
import { getBrowseContent, getHomeContent } from '../controllers/content.controller.js';

const router = Router();

router.get('/home', getHomeContent);
router.get('/browse', getBrowseContent);

export default router;
