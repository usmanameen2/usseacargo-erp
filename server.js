/**
 * USSeaCargo ERP - Self-Contained Server
 * Everything inline - no external local module dependencies
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'ussaeacargo-erp-secret-key-2024';
const JWT_EXPIRES_IN = '7d';
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'erp.db');

// ═══════════════════════════════════════════════════════════════
// JWT UTILITIES (inline)
// ═══════════════════════════════════════════════════════════════
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ═══════════════════════════════════════════════════════════════
// SOCKET UTILITIES (inline)
// ═══════════════════════════════════════════════════════════════
let ioInstance = null;
const socketUtils = {
  init: (socketIo) => { ioInstance = socketIo; },
  getIO: () => ioInstance,
  broadcastToUser: (userId, event, data) => {
    if (ioInstance) ioInstance.to(`user_${userId}`).emit(event, data);
  },
  broadcastAll: (event, data) => {
    if (ioInstance) ioInstance.emit(event, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// DATABASE via sqlite3 CLI (works on shared hosting without native modules)
// ═══════════════════════════════════════════════════════════════
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Escape single quotes for SQL
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// Execute SQL using sqlite3 CLI
async function dbRun(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}; SELECT last_insert_rowid() as id, changes() as changes;" -json`;
  const { stdout } = await execAsync(cmd);
  const result = JSON.parse(stdout || '[{}]')[0];
  return { id: result?.id, changes: result?.changes };
}

async function dbGet(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd);
    const rows = JSON.parse(stdout || '[]');
    return Array.isArray(rows) ? rows[0] : rows;
  } catch { return null; }
}

async function dbAll(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\"')}" -json`;
  try {
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout || '[]');
  } catch { return []; }
}

async function dbExec(sql) {
  const cmd = `sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\"')}"`;
  await execAsync(cmd);
}

// // ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE (inline)
// ═══════════════════════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
 