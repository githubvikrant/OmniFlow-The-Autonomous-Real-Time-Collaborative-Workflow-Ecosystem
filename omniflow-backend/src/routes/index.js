import { Router } from 'express';
import authRouter from './auth.routes.js';
// import boardRouter from './board.routes.js';   // Day 4
// import taskRouter from './task.routes.js';      // Day 4

const router = Router();

// ─── Mount Sub-Routers ────────────────────────────────────────────────────────
router.use('/auth', authRouter);          // Day 3 ✅
// router.use('/boards', boardRouter);    // Day 4
// router.use('/tasks', taskRouter);      // Day 4

// Base API health check
router.get('/', (req, res) => {
  res.json({
    message: '🚀 OmniFlow API v1 is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      boards: '/api/v1/boards (Day 4)',
      tasks: '/api/v1/tasks (Day 4)',
    },
  });
});

export default router;