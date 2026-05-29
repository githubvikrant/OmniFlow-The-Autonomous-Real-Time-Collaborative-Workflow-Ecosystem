import { Router } from 'express';
import authRouter from './auth.routes.js';
import boardRouter from './board.routes.js';   // Day 4
import taskRouter from './task.routes.js';      // Day 4

const router = Router();

// ─── Mount Sub-Routers ────────────────────────────────────────────────────────
router.use('/auth', authRouter);          // Day 3 ✅
router.use('/boards', boardRouter);       // Day 4
router.use('/tasks', taskRouter);         // Day 4

// Base API health check — Phase 1 (Backend Foundation) complete ✅
router.get('/', (req, res) => {
  res.json({
    message: '🚀 OmniFlow API v1 is running',
    version: '1.0.0',
    phase: 'Phase 1 — Backend Foundation ✅ Complete',
    endpoints: {
      auth: '/api/v1/auth',
      boards: '/api/v1/boards',
      tasks: '/api/v1/tasks',
    },
  });
});

export default router;