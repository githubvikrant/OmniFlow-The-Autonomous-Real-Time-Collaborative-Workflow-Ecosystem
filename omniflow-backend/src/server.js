import app from './app.js';
import config from './config/index.js';
import connectDB from './config/database.js';   // ← ADD THIS LINE

// ─── Connect to Database FIRST, then start the server ────────────────────────
connectDB().then(() => {
    const server = app.listen(config.port, () => {
        console.log(`
  ╔═══════════════════════════════════════════╗
  ║   OmniFlow API Server Started             ║
  ║   Port:        ${config.port}                       ║
  ║   Environment: ${config.nodeEnv}                ║
  ╚═══════════════════════════════════════════╝
    `);
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────────────────
    const gracefulShutdown = (signal) => {
        console.log(`\n📴 ${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            await mongoose.connection.close();          // ← Close DB connection cleanly
            console.log('✅ HTTP server and MongoDB closed.');
            process.exit(0);
        });

        setTimeout(() => {
            console.error('⚠️  Forced shutdown after timeout.');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        console.error('🔥 UNHANDLED REJECTION:', reason);
        gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error) => {
        console.error('💥 UNCAUGHT EXCEPTION:', error);
        process.exit(1);
    });
});