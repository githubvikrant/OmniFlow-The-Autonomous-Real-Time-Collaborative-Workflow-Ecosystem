import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import router from './routes/index.js';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
// Helmet sets ~15 security-related HTTP headers automatically
app.use(helmet());

// CORS — Allow requests from our Next.js frontend (port 3000 in dev)
app.use(cors({
    origin: config.isProduction
        ? 'https://omniflow.yourdomain.com'
        : 'http://localhost:3000',
    credentials: true,           // Allow cookies (needed for refresh tokens on Day 3)
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
// Parse incoming JSON bodies (e.g., POST /auth/register sends JSON)
app.use(express.json({ limit: '10kb' }));  // Limit prevents massive payload attacks
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
// Morgan logs every HTTP request to the terminal in development
if (!config.isProduction) {
    app.use(morgan('dev'));  // Format: GET /api/boards 200 12ms
}

// ─── Routes ──────────────────────────────────────────────────────────────────
// All routes are mounted under /api/v1
app.use('/api/v1', router);

// ─── Health Check ────────────────────────────────────────────────────────────
// Used by Docker, Render, and load balancers to verify the server is alive
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Catches any route that doesn't match
app.all('/{*splat}', (req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// This will be expanded significantly on Day 4
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        status: err.status || 'error',
        message: err.message || 'Something went wrong',
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    });
});

export default app;