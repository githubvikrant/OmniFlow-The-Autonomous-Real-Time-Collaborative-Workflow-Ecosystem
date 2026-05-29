import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';   // ← Added Day 3 (reads HttpOnly refresh token cookie)
import config from './config/index.js';
import router from './routes/index.js';
import globalErrorHandler from './middlewares/error.middleware.js';
import { initializePassport } from './middlewares/passport.middleware.js'; // ← Added Day 5

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
// Helmet sets ~15 security-related HTTP headers automatically
app.use(helmet());

// CORS — Allow requests from our Next.js frontend (port 3000 in dev)
app.use(cors({
  origin: config.isProduction
    ? 'https://omniflow.yourdomain.com'
    : 'http://localhost:3000',
  credentials: true,   // Allow cookies (needed for HttpOnly refresh token)
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
// Parse incoming JSON bodies
app.use(express.json({ limit: '10kb' }));  // 10kb limit prevents JSON bomb attacks
app.use(express.urlencoded({ extended: true }));

// Parse cookies — needed to read the HttpOnly refreshToken cookie on Day 3
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (!config.isProduction) {
  app.use(morgan('dev'));  // GET /api/v1/auth/login 200 8ms
}

// ─── Passport (Day 5) ────────────────────────────────────────────────────────
// Initializes passport in stateless mode (no sessions).
// Must come AFTER body parsers but BEFORE routes, so that
// passport.authenticate() middleware on the Google routes works correctly.
app.use(initializePassport());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Express 5 requires named wildcard: /{*splat}
app.all('/{*splat}', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// Receives errors from: catchAsync, throw new AppError(), next(err)
app.use(globalErrorHandler);

export default app;