import { Router } from 'express';
import { getHomeContent } from '../controllers/content.controller.js';

const router = Router();

router.get('/home', getHomeContent);

export default router;
