import { Router } from 'express';

// Import all sub-routers (files are empty today, we'll fill them in Days 3-4)
// import authRouter from './auth.routes.js';
// import boardRouter from './board.routes.js';
// import taskRouter from './task.routes.js';

const router = Router();

// ─── Mount Sub-Routers ────────────────────────────────────────────────────────
// Uncomment each line as we build the feature on its designated day:
// router.use('/auth', authRouter);      // Day 3
// router.use('/boards', boardRouter);   // Day 4
// router.use('/tasks', taskRouter);     // Day 4

// Placeholder to confirm routing works
router.get('/', (req, res) => {
    res.json({
        message: '🚀 OmniFlow API v1 is running',
        version: '1.0.0',
        docs: '/api/v1/docs',  // We'll add Swagger later if time permits
    });
});

export default router;