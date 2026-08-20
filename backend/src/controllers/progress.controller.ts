import { Request, Response } from 'express';
import { z } from 'zod';
import { progressService } from '../services/progress.service.js';

const updateProgressSchema = z.object({
  mediaId: z.string().min(1),
  position: z.number().nonnegative().finite(),
  duration: z.number().positive().finite(),
}).refine(data => data.position <= data.duration + 5, { // allow slight overflow
  message: "Position cannot be significantly greater than duration",
  path: ["position"]
});

export class ProgressController {
  async updateProgress(req: Request, res: Response) {
    try {
      const sessionId = req.signedCookies?.sessionId;
      if (!sessionId) {
        return res.status(401).json({ error: { message: 'No session ID found' } });
      }

      const parsed = updateProgressSchema.parse(req.body);

      await progressService.updateProgress({ sessionId }, parsed.mediaId, parsed.position, parsed.duration);
      return res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { message: 'Validation failed', details: error.issues } });
      }
      console.error('[ProgressController.updateProgress] Error:', error);
      return res.status(500).json({ error: { message: 'Failed to update progress' } });
    }
  }

  async getContinueWatching(req: Request, res: Response) {
    try {
      const sessionId = req.signedCookies?.sessionId;
      
      if (!sessionId) {
      return res.json({ success: true, data: [] }); // Empty if no session
      }

      const items = await progressService.getContinueWatching({ sessionId });
      return res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('[ProgressController.getContinueWatching] Error:', error);
      return res.status(500).json({ error: { message: 'Failed to fetch continue watching' } });
    }
  }
}

export const progressController = new ProgressController();
