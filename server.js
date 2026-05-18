const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { authMiddleware } = require('./middleware/auth');
const socketUtils = require('./utils/socket');
const { verifyToken } = require('./utils/jwt');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Create HTTP server & Socket.IO ───────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store io instance globally for routes to use
app.set('io', io);
socketUtils.init(io);

// ── Socket Authentication Middleware ──────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ── Socket Connection Handler ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] ${socket.username} connected (${socket.id})`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  // Broadcast user joined to all other clients
  socket.broadcast.emit('user:joined', {
    username: socket.username,
    timestamp: new Date().toISOString(),
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] ${socket.username} disconnected`);
    socket.broadcast.emit('user:left', { username: socket.username });
  });
});

// ── Health Check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    websocket: true,
    currency: 'AED',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sales-crm', authMiddleware, require('./routes/sales-crm'));
app.use('/api/purchasing', authMiddleware, require('./routes/purchasing'));
app.use('/api/hr', authMiddleware, require('./routes/hr'));
app.use('/api/projects', authMiddleware, require('./routes/projects'));
app.use('/api/financials', authMiddleware, require('./routes/financials'));
app.use('/api/logistics', authMiddleware, require('./routes/logistics'));
app.use('/api/settings', authMiddleware, require('./routes/settings'));

// ── Serve static files ────────────────────────────────────────────
// Always serve static files (fixed for Hostinger - no NODE_ENV check)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Global Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     USSeaCargo - Logistics ERP Server    ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  Port:      ${PORT.toString().padEnd(33)}║`);
  console.log('  ║  WebSocket: Enabled                      ║');
  console.log('  ║  Currency:  AED (UAE Dirham)             ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, httpServer, io };
