/**
 * server.js — Application Entry Point
 *
 * DAY 8 CHANGE: Socket.IO integration
 *
 * Before Day 8:
 *   app.listen(port) — Express manages the HTTP server internally.
 *   We had no reference to the raw http.Server object.
 *
 * After Day 8:
 *   We create the http.Server manually (http.createServer(app)) so we
 *   can pass the SAME server instance to BOTH:
 *     1. Socket.IO — for WebSocket connections
 *     2. Express — for HTTP REST requests
 *
 * Why the same server?
 *   WebSocket connections start as HTTP requests (the WebSocket "upgrade"
 *   handshake uses HTTP/1.1). The browser connects to ws://localhost:5000.
 *   Socket.IO attaches to the HTTP server and intercepts these upgrade requests.
 *   If we used two separate servers (one for HTTP, one for WebSocket),
 *   CORS and port management would be a nightmare.
 *
 * Socket.IO path: /socket.io
 *   By default, Socket.IO listens on /socket.io on the SAME port as Express.
 *   Our REST API is at /api/v1 — no conflicts.
 *
 * The io instance (returned by initSocketServer) is NOT exported from here.
 * Instead, socket.service.js holds a reference to it (via setIO()).
 * This means controllers can call socketService.emitTaskMoved() without
 * knowing anything about the io instance — clean decoupling.
 */

import http from 'http';
import app from './app.js';
import config from './config/index.js';
import connectDB from './config/database.js';
import { initSocketServer } from './sockets/socket.server.js'; // ← Day 8

// ─── Connect to Database FIRST, then start the server ────────────────────────
connectDB().then(() => {
  // ── Create raw Node.js HTTP server ─────────────────────────────────────────
  // We wrap the Express `app` in a raw HTTP server so we can hand it to
  // Socket.IO. Express is unchanged — it still handles all HTTP routes.
  const httpServer = http.createServer(app);

  // ── Initialize Socket.IO ────────────────────────────────────────────────────
  // Attaches to httpServer so WebSocket upgrades are handled on the same port.
  // Internally calls setIO(io) to make the io instance available to socket.service.js.
  initSocketServer(httpServer); // ← Day 8

  // ── Start listening ─────────────────────────────────────────────────────────
  // IMPORTANT: Call httpServer.listen() — NOT app.listen()
  // app.listen() creates its OWN internal http.Server, which Socket.IO doesn't know about.
  httpServer.listen(config.port, () => {
    console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   OmniFlow API Server Started                    ║
  ║   REST API:  http://localhost:${config.port}/api/v1      ║
  ║   Socket.IO: ws://localhost:${config.port}/socket.io     ║
  ║   Environment: ${config.nodeEnv}                     ║
  ╚══════════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  // Note: We close httpServer (not app) — this closes both HTTP AND WebSocket connections.
  const gracefulShutdown = (signal) => {
    console.log(`\n📴 ${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log('✅ HTTP server (and all WebSocket connections) closed.');
      process.exit(0);
    });

    // Force-kill after 10 seconds if something hangs
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