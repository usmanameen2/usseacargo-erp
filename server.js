#!/usr/bin/env node
/**
 * FreshERP - Complete Self-Contained Node.js Backend
 * For Hostinger Shared Hosting (no native modules)
 *
 * Database: SQLite via sqlite3 CLI
 * All code in ONE file - no local requires
 */

// =============================================================================
// 1. IMPORTS (built-in Node.js modules only)
// =============================================================================
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// =============================================================================
// 2. CONSTANTS AND CONFIG
// =============================================================================
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './erp.db';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const DEFAULT_ADMIN_EMAIL = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

// In-memory rate limiting store
const rateLimitStore = new Map();

// =============================================================================
// 3. DATABASE HELPER FUNCTIONS (sqlite3 CLI)
// =============================================================================

/** Escape a value for SQLite SQL */
function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

/** Run an INSERT/UPDATE/DELETE and return { id, changes } */
async function dbRun(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')}; SELECT last_insert_rowid() as id, changes() as changes;" -json`;
  const { stdout } = await execAsync(cmd);
  const result = JSON.parse(stdout || '[{}]')[0];
  return { id: result?.id, changes: result?.changes };
}

/** Run a SELECT and return array of rows */
async function dbAll(sql, params = []) {
  let i = 0;
  const sqlWithParams = sql.replace(/\?/g, () => esc(params[i++]));
  const cmd = `sqlite3 "${DB_PATH}" "${sqlWithParams.replace(/"/g, '\\"')};" -json`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout || '[]');
}

/** Run raw SQL (for schema creation) */
async function dbExec(sql) {
  const cmd = `sqlite3 "${DB_PATH}" "${sql.replace(/"/g, '\\"')};"`;
  await execAsync(cmd);
}

// =============================================================================
// 4. JWT HELPER FUNCTIONS (manual implementation, no jsonwebtoken package)
// =============================================================================

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str += new Array(5 - (str.length % 4)).join('=');
  return Buffer.from(str.replace(/\-/g, '+').replace(/\_/g, '/'), 'base64');
}

function jwtSign(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const signingInput = `${parts[0]}.${parts[1]}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  if (parts[2] !== expectedSignature) throw new Error('Invalid signature');
  const payload = JSON.parse(base64UrlDecode(parts[1]).toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

// =============================================================================
// 5. MIDDLEWARE
// =============================================================================

/** CORS middleware - allow all origins */
function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

/** Rate limiting: 100 requests per minute per IP */
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - 60000;
  const entry = rateLimitStore.get(ip) || [];
  const recentRequests = entry.filter(t => t > windowStart);
  if (recentRequests.length >= 100) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  next();
}

/** Authentication middleware - verify JWT Bearer token */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwtVerify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/** Admin-only middleware */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/** Global error handler */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
}

/** Async wrapper for route handlers */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// 6. EXPRESS APP SETUP
// =============================================================================
const app = express();

app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files from dist/
app.use(express.static(path.join(process.cwd(), 'dist')));

// =============================================================================
// 7. AUTH ROUTES
// =============================================================================

/** POST /api/auth/register */
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const body = convertBodyKeys(req.body);
  const { email, password, full_name, phone, company } = body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const existing = await dbAll('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const now = new Date().toISOString();
  const result = await dbRun(
    `INSERT INTO users (email, password, full_name, phone, company, role, status, subscription_plan, created_at)
     VALUES (?, ?, ?, ?, ?, 'user', 'active', 'trial', ?)`,
    [email, hashedPassword, full_name || null, phone || null, company || null, now]
  );
  const token = jwtSign({ id: result.id, email, role: 'user', subscription_plan: 'trial' }, JWT_SECRET);
  res.status(201).json({ success: true, message: 'User registered successfully', token, user: { id: result.id, email, full_name: full_name || email, role: 'user', subscription_plan: 'trial' } });
}));

/** POST /api/auth/login */
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const loginId = email || username;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const rows = await dbAll('SELECT * FROM users WHERE email = ? AND password = ?', [loginId, hashedPassword]);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = rows[0];
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account is blocked' });
  }
  const token = jwtSign({ id: user.id, email: user.email, role: user.role, subscription_plan: user.subscription_plan }, JWT_SECRET);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      subscription_plan: user.subscription_plan,
      subscription_expires: user.subscription_expires
    }
  });
}));

/** POST /api/auth/forgot-password */
app.post('/api/auth/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const rows = await dbAll('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Email not found' });
  }
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date().toISOString();
  await dbRun(
    'UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?',
    [resetCode, new Date(Date.now() + 3600000).toISOString(), email]
  );
  res.json({ success: true, message: 'Reset code sent', data: { resetCode } });
}));

/** POST /api/auth/reset-password */
app.post('/api/auth/reset-password', asyncHandler(async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
  }
  const rows = await dbAll('SELECT id, reset_code, reset_code_expires FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Email not found' });
  }
  const user = rows[0];
  if (user.reset_code !== code) {
    return res.status(400).json({ success: false, message: 'Invalid reset code' });
  }
  if (user.reset_code_expires && new Date(user.reset_code_expires) < new Date()) {
    return res.status(400).json({ success: false, message: 'Reset code has expired' });
  }
  const hashedPassword = crypto.createHash('sha256').update(new_password).digest('hex');
  await dbRun(
    "UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?",
    [hashedPassword, email]
  );
  res.json({ success: true, message: 'Password reset successfully' });
}));

/** GET /api/auth/me */
app.get('/api/auth/me', authMiddleware, asyncHandler(async (req, res) => {
  const rows = await dbAll('SELECT id, email, full_name, phone, company, role, status, subscription_plan, subscription_expires, created_at FROM users WHERE id = ?', [req.user.id]);
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, data: rows[0] });
}));

// =============================================================================
// 8. UTILITY: Convert camelCase keys to snake_case
// =============================================================================

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/** Convert request body keys from camelCase to snake_case */
function convertBodyKeys(body) {
  const converted = {};
  for (const [key, value] of Object.entries(body)) {
    const snakeKey = toSnakeCase(key);
    converted[snakeKey] = value;
  }
  return converted;
}

// =============================================================================
// 9. GENERIC CRUD ROUTE GENERATOR
// =============================================================================

function generateCrudRoutes(routePath, tableName, columns, searchableCols = []) {
  const pk = columns[0]; // first column is always id

  // List with optional search
  app.get(`/api/${routePath}`, authMiddleware, asyncHandler(async (req, res) => {
    const { search, limit = '50', offset = '0', sort = pk, order = 'DESC' } = req.query;
    let sql = `SELECT * FROM ${tableName}`;
    const params = [];
    if (search && searchableCols.length > 0) {
      const conditions = searchableCols.map(col => `${col} LIKE ?`).join(' OR ');
      sql += ` WHERE ${conditions}`;
      const pattern = `%${search}%`;
      searchableCols.forEach(() => params.push(pattern));
    }
    sql += ` ORDER BY ${sort} ${order === 'ASC' ? 'ASC' : 'DESC'}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);
    const rows = await dbAll(sql, params);
    res.json({ success: true, data: rows });
  }));

  // Get single by id
  app.get(`/api/${routePath}/:id`, authMiddleware, asyncHandler(async (req, res) => {
    const rows = await dbAll(`SELECT * FROM ${tableName} WHERE ${pk} = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  }));

  // Create
  app.post(`/api/${routePath}`, authMiddleware, asyncHandler(async (req, res) => {
    const body = convertBodyKeys(req.body);
    const insertableCols = columns.filter(c => c !== pk);
    const values = insertableCols.map(col => body[col] !== undefined ? body[col] : null);
    const colNames = insertableCols.join(', ');
    const placeholders = insertableCols.map(() => '?').join(', ');
    const result = await dbRun(
      `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
      values
    );
    const newRow = await dbAll(`SELECT * FROM ${tableName} WHERE ${pk} = ?`, [result.id]);
    res.status(201).json({ success: true, message: 'Created successfully', data: newRow[0] || { id: result.id } });
  }));

  // Update
  app.put(`/api/${routePath}/:id`, authMiddleware, asyncHandler(async (req, res) => {
    const body = convertBodyKeys(req.body);
    const updatableCols = columns.filter(c => c !== pk && body[c] !== undefined);
    if (updatableCols.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    const setClause = updatableCols.map(c => `${c} = ?`).join(', ');
    const values = updatableCols.map(col => body[col]);
    values.push(req.params.id);
    await dbRun(`UPDATE ${tableName} SET ${setClause} WHERE ${pk} = ?`, values);
    const updatedRow = await dbAll(`SELECT * FROM ${tableName} WHERE ${pk} = ?`, [req.params.id]);
    res.json({ success: true, message: 'Updated successfully', data: updatedRow[0] || {} });
  }));

  // Delete
  app.delete(`/api/${routePath}/:id`, authMiddleware, asyncHandler(async (req, res) => {
    await dbRun(`DELETE FROM ${tableName} WHERE ${pk} = ?`, [req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  }));
}

// =============================================================================
// 9. GENERATE CRUD ROUTES FOR ALL TABLES
// =============================================================================

generateCrudRoutes('customers', 'customers', [
  'id', 'code', 'name', 'email', 'phone', 'address', 'city', 'country',
  'trn', 'credit_limit', 'payment_terms', 'status', 'notes', 'created_at'
], ['name', 'email', 'phone', 'code', 'city']);

generateCrudRoutes('suppliers', 'suppliers', [
  'id', 'code', 'name', 'email', 'phone', 'address', 'city', 'country',
  'trn', 'category', 'status', 'created_at'
], ['name', 'email', 'phone', 'code', 'category']);

generateCrudRoutes('invoices', 'invoices', [
  'id', 'invoice_no', 'customer_id', 'customer_name', 'date', 'due_date',
  'subtotal', 'tax_rate', 'tax_amount', 'total', 'amount_paid', 'status', 'notes', 'created_at'
], ['invoice_no', 'customer_name', 'status']);

generateCrudRoutes('employees', 'employees', [
  'id', 'employee_no', 'full_name', 'email', 'phone', 'department',
  'designation', 'joining_date', 'basic_salary', 'status', 'created_at'
], ['full_name', 'email', 'employee_no', 'department']);

generateCrudRoutes('projects', 'projects', [
  'id', 'project_no', 'name', 'customer_id', 'customer_name', 'start_date',
  'end_date', 'status', 'budget', 'description', 'progress', 'created_at'
], ['name', 'customer_name', 'project_no', 'status']);

generateCrudRoutes('chart-of-accounts', 'chart_of_accounts', [
  'id', 'code', 'name', 'type', 'parent_id', 'level', 'is_active'
], ['name', 'code']);

generateCrudRoutes('journal-entries', 'journal_entries', [
  'id', 'entry_no', 'date', 'reference', 'description',
  'total_debit', 'total_credit', 'status', 'created_at'
], ['entry_no', 'description', 'reference']);

generateCrudRoutes('quotations', 'quotations', [
  'id', 'quote_no', 'customer_id', 'customer_name', 'date', 'expiry_date',
  'subtotal', 'tax_rate', 'tax_amount', 'total', 'status', 'notes', 'created_at'
], ['quote_no', 'customer_name', 'status']);

generateCrudRoutes('purchase-orders', 'purchase_orders', [
  'id', 'po_no', 'supplier_id', 'supplier_name', 'date', 'delivery_date',
  'subtotal', 'tax_rate', 'tax_amount', 'total', 'status', 'notes', 'created_at'
], ['po_no', 'supplier_name', 'status']);

generateCrudRoutes('grn', 'grn', [
  'id', 'grn_no', 'po_id', 'supplier_name', 'date', 'received_by', 'notes', 'created_at'
], ['grn_no', 'supplier_name', 'received_by']);

generateCrudRoutes('attendance', 'attendance', [
  'id', 'employee_id', 'date', 'status', 'check_in', 'check_out', 'overtime', 'notes'
], ['status', 'notes']);

generateCrudRoutes('payroll', 'payroll', [
  'id', 'employee_id', 'month', 'basic_salary', 'allowances', 'deductions',
  'overtime', 'net_salary', 'status', 'created_at'
], ['month', 'status']);

generateCrudRoutes('sea-import-jobs', 'sea_import_jobs', [
  'id', 'job_no', 'date', 'mbl_no', 'hbl_no', 'vessel', 'voyage', 'pol', 'pod',
  'shipper', 'consignee', 'notify_party', 'container_no', 'container_type',
  'goods_description', 'weight', 'cbm', 'freight_term', 'agent', 'status', 'remarks', 'created_by', 'created_at'
], ['job_no', 'mbl_no', 'hbl_no', 'vessel', 'shipper', 'consignee', 'container_no']);

generateCrudRoutes('sea-export-jobs', 'sea_export_jobs', [
  'id', 'job_no', 'date', 'mbl_no', 'hbl_no', 'vessel', 'voyage', 'pol', 'pod',
  'shipper', 'consignee', 'notify_party', 'container_no', 'container_type',
  'goods_description', 'weight', 'cbm', 'freight_term', 'agent', 'status', 'remarks', 'created_by', 'created_at'
], ['job_no', 'mbl_no', 'hbl_no', 'vessel', 'shipper', 'consignee', 'container_no']);

generateCrudRoutes('air-import-jobs', 'air_import_jobs', [
  'id', 'job_no', 'date', 'awb_no', 'hawb_no', 'flight_no', 'pol', 'pod',
  'shipper', 'consignee', 'notify_party', 'weight', 'cbm', 'chargeable_weight',
  'freight_term', 'agent', 'status', 'remarks', 'created_by', 'created_at'
], ['job_no', 'awb_no', 'hawb_no', 'flight_no', 'shipper', 'consignee']);

generateCrudRoutes('air-export-jobs', 'air_export_jobs', [
  'id', 'job_no', 'date', 'awb_no', 'hawb_no', 'flight_no', 'pol', 'pod',
  'shipper', 'consignee', 'notify_party', 'weight', 'cbm', 'chargeable_weight',
  'freight_term', 'agent', 'status', 'remarks', 'created_by', 'created_at'
], ['job_no', 'awb_no', 'hawb_no', 'flight_no', 'shipper', 'consignee']);

generateCrudRoutes('transshipment-jobs', 'transshipment_jobs', [
  'id', 'job_no', 'date', 'mbl_no', 'vessel', 'voyage', 'pol', 'pod',
  'tshipment_port', 'shipper', 'consignee', 'container_no',
  'goods_description', 'weight', 'cbm', 'status', 'remarks', 'created_at'
], ['job_no', 'mbl_no', 'vessel', 'shipper', 'consignee', 'container_no']);

generateCrudRoutes('liner-schedules', 'liner_schedules', [
  'id', 'vessel', 'voyage', 'pol', 'pod', 'eta', 'etd', 'cutoff_date',
  'carrier', 'service_type', 'frequency', 'status', 'created_at'
], ['vessel', 'voyage', 'pol', 'pod', 'carrier']);

generateCrudRoutes('cf-jobs', 'cf_jobs', [
  'id', 'job_no', 'date', 'be_no', 'be_date', 'shipping_line', 'container_no',
  'goods_description', 'weight', 'cbm', 'duty_amount', 'status', 'remarks', 'created_at'
], ['job_no', 'be_no', 'shipping_line', 'container_no']);

generateCrudRoutes('other-jobs', 'other_jobs', [
  'id', 'job_no', 'job_type', 'date', 'description', 'client_name',
  'amount', 'status', 'remarks', 'created_at'
], ['job_no', 'job_type', 'client_name', 'description']);

generateCrudRoutes('shipping-docs', 'shipping_docs', [
  'id', 'job_id', 'job_type', 'doc_type', 'file_name', 'file_path',
  'uploaded_by', 'uploaded_at'
], ['doc_type', 'file_name', 'job_type']);

generateCrudRoutes('shipping-expenses', 'shipping_expenses', [
  'id', 'job_id', 'job_type', 'expense_type', 'amount', 'currency',
  'exchange_rate', 'amount_aed', 'vendor', 'status', 'created_at'
], ['expense_type', 'vendor', 'job_type', 'status']);

// =============================================================================
// 10. INVOICE ITEMS SUB-ROUTES (child of invoices)
// =============================================================================

app.get('/api/invoices/:id/items', authMiddleware, asyncHandler(async (req, res) => {
  const rows = await dbAll('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
  res.json({ success: true, data: rows });
}));

app.post('/api/invoices/:id/items', authMiddleware, asyncHandler(async (req, res) => {
  const body = convertBodyKeys(req.body);
  const { description, quantity, unit, rate, amount } = body;
  const result = await dbRun(
    'INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES (?, ?, ?, ?, ?, ?)',
    [req.params.id, description, quantity, unit, rate, amount]
  );
  const newRow = await dbAll('SELECT * FROM invoice_items WHERE id = ?', [result.id]);
  res.status(201).json({ success: true, message: 'Item added', data: newRow[0] || { id: result.id } });
}));

app.put('/api/invoice-items/:id', authMiddleware, asyncHandler(async (req, res) => {
  const body = convertBodyKeys(req.body);
  const { description, quantity, unit, rate, amount } = body;
  await dbRun(
    'UPDATE invoice_items SET description = ?, quantity = ?, unit = ?, rate = ?, amount = ? WHERE id = ?',
    [description, quantity, unit, rate, amount, req.params.id]
  );
  const updatedRow = await dbAll('SELECT * FROM invoice_items WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Item updated', data: updatedRow[0] || {} });
}));

app.delete('/api/invoice-items/:id', authMiddleware, asyncHandler(async (req, res) => {
  await dbRun('DELETE FROM invoice_items WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Item deleted' });
}));

// =============================================================================
// 11. JOURNAL ENTRY LINES SUB-ROUTES
// =============================================================================

app.get('/api/journal-entries/:id/lines', authMiddleware, asyncHandler(async (req, res) => {
  const rows = await dbAll('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?', [req.params.id]);
  res.json({ success: true, data: rows });
}));

app.post('/api/journal-entries/:id/lines', authMiddleware, asyncHandler(async (req, res) => {
  const body = convertBodyKeys(req.body);
  const { account_id, account_name, debit, credit, description } = body;
  const result = await dbRun(
    'INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_name, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?)',
    [req.params.id, account_id, account_name, debit || 0, credit || 0, description]
  );
  const newRow = await dbAll('SELECT * FROM journal_entry_lines WHERE id = ?', [result.id]);
  res.status(201).json({ success: true, message: 'Line added', data: newRow[0] || { id: result.id } });
}));

app.put('/api/journal-entry-lines/:id', authMiddleware, asyncHandler(async (req, res) => {
  const body = convertBodyKeys(req.body);
  const { account_id, account_name, debit, credit, description } = body;
  await dbRun(
    'UPDATE journal_entry_lines SET account_id = ?, account_name = ?, debit = ?, credit = ?, description = ? WHERE id = ?',
    [account_id, account_name, debit, credit, description, req.params.id]
  );
  const updatedRow = await dbAll('SELECT * FROM journal_entry_lines WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Line updated', data: updatedRow[0] || {} });
}));

app.delete('/api/journal-entry-lines/:id', authMiddleware, asyncHandler(async (req, res) => {
  await dbRun('DELETE FROM journal_entry_lines WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Line deleted' });
}));

// =============================================================================
// 12. ADMIN ROUTES
// =============================================================================

app.get('/api/admin/users', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const { search, limit = '50', offset = '0' } = req.query;
  let sql = 'SELECT id, email, full_name, phone, company, role, status, subscription_plan, subscription_expires, created_at FROM users';
  const params = [];
  if (search) {
    sql += ' WHERE email LIKE ? OR full_name LIKE ?';
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit) || 50, parseInt(offset) || 0);
  const rows = await dbAll(sql, params);
  res.json({ success: true, data: rows });
}));

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const { status, subscription_plan, subscription_expires, role } = req.body;
  const updates = [];
  const values = [];
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (subscription_plan !== undefined) { updates.push('subscription_plan = ?'); values.push(subscription_plan); }
  if (subscription_expires !== undefined) { updates.push('subscription_expires = ?'); values.push(subscription_expires); }
  if (role !== undefined) { updates.push('role = ?'); values.push(role); }
  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  values.push(req.params.id);
  await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  res.json({ success: true, message: 'User updated successfully' });
}));

app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const userCount = await dbAll('SELECT COUNT(*) as count FROM users');
  const activeUsers = await dbAll("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
  const trialUsers = await dbAll("SELECT COUNT(*) as count FROM users WHERE subscription_plan = 'trial'");
  const paidUsers = await dbAll("SELECT COUNT(*) as count FROM users WHERE subscription_plan IN ('basic', 'premium', 'enterprise')");
  res.json({
    success: true,
    data: {
      total_users: userCount[0]?.count || 0,
      active_users: activeUsers[0]?.count || 0,
      trial_users: trialUsers[0]?.count || 0,
      paid_users: paidUsers[0]?.count || 0
    }
  });
}));

// =============================================================================
// 13. DASHBOARD ROUTES
// =============================================================================

app.get('/api/dashboard/stats', authMiddleware, asyncHandler(async (req, res) => {
  const tables = [
    'customers', 'suppliers', 'invoices', 'employees', 'projects',
    'quotations', 'purchase_orders', 'grn', 'attendance', 'payroll',
    'sea_import_jobs', 'sea_export_jobs', 'air_import_jobs', 'air_export_jobs',
    'transshipment_jobs', 'liner_schedules', 'cf_jobs', 'other_jobs',
    'shipping_docs', 'shipping_expenses', 'journal_entries'
  ];
  const stats = {};
  for (const t of tables) {
    try {
      const result = await dbAll(`SELECT COUNT(*) as count FROM ${t}`);
      stats[t] = result[0]?.count || 0;
    } catch (e) {
      stats[t] = 0;
    }
  }

  // Financial summaries
  const invoiceTotal = await dbAll("SELECT COALESCE(SUM(total), 0) as total FROM invoices");
  const invoicePaid = await dbAll("SELECT COALESCE(SUM(amount_paid), 0) as total FROM invoices");
  const invoicePending = await dbAll("SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices WHERE status IN ('sent', 'overdue')");
  const poTotal = await dbAll("SELECT COALESCE(SUM(total), 0) as total FROM purchase_orders");

  stats.total_revenue = invoiceTotal[0]?.total || 0;
  stats.total_collected = invoicePaid[0]?.total || 0;
  stats.total_pending = invoicePending[0]?.total || 0;
  stats.total_po_value = poTotal[0]?.total || 0;

  res.json({ success: true, data: stats });
}));

app.get('/api/dashboard/recent', authMiddleware, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const recent = {
    invoices: await dbAll(`SELECT * FROM invoices ORDER BY id DESC LIMIT ${limit}`),
    customers: await dbAll(`SELECT * FROM customers ORDER BY id DESC LIMIT ${limit}`),
    projects: await dbAll(`SELECT * FROM projects ORDER BY id DESC LIMIT ${limit}`),
    sea_import_jobs: await dbAll(`SELECT * FROM sea_import_jobs ORDER BY id DESC LIMIT ${limit}`),
    sea_export_jobs: await dbAll(`SELECT * FROM sea_export_jobs ORDER BY id DESC LIMIT ${limit}`),
    quotations: await dbAll(`SELECT * FROM quotations ORDER BY id DESC LIMIT ${limit}`),
  };
  res.json({ success: true, data: recent });
}));

// =============================================================================
// 14. DATABASE INITIALIZATION
// =============================================================================

const CREATE_TABLES_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  subscription_plan TEXT DEFAULT 'trial',
  subscription_expires TEXT,
  reset_code TEXT,
  reset_code_expires TEXT,
  created_at TEXT
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  trn TEXT,
  credit_limit REAL DEFAULT 0,
  payment_terms TEXT DEFAULT '30 days',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  trn TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  date TEXT,
  due_date TEXT,
  subtotal REAL,
  tax_rate REAL DEFAULT 5,
  tax_amount REAL,
  total REAL,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TEXT
);

-- Invoice Items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER,
  description TEXT,
  quantity REAL,
  unit TEXT,
  rate REAL,
  amount REAL
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_no TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  designation TEXT,
  joining_date TEXT,
  basic_salary REAL,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_no TEXT,
  name TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  budget REAL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  created_at TEXT
);

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT,
  type TEXT,
  parent_id INTEGER,
  level INTEGER,
  is_active INTEGER DEFAULT 1
);

-- Journal Entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_no TEXT,
  date TEXT,
  reference TEXT,
  description TEXT,
  total_debit REAL,
  total_credit REAL,
  status TEXT DEFAULT 'posted',
  created_at TEXT
);

-- Journal Entry Lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER,
  account_id INTEGER,
  account_name TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_no TEXT,
  customer_id INTEGER,
  customer_name TEXT,
  date TEXT,
  expiry_date TEXT,
  subtotal REAL,
  tax_rate REAL DEFAULT 5,
  tax_amount REAL,
  total REAL,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TEXT
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_no TEXT,
  supplier_id INTEGER,
  supplier_name TEXT,
  date TEXT,
  delivery_date TEXT,
  subtotal REAL,
  tax_rate REAL DEFAULT 5,
  tax_amount REAL,
  total REAL,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TEXT
);

-- GRN table
CREATE TABLE IF NOT EXISTS grn (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_no TEXT,
  po_id INTEGER,
  supplier_name TEXT,
  date TEXT,
  received_by TEXT,
  notes TEXT,
  created_at TEXT
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,
  date TEXT,
  status TEXT,
  check_in TEXT,
  check_out TEXT,
  overtime REAL DEFAULT 0,
  notes TEXT
);

-- Payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,
  month TEXT,
  basic_salary REAL,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  overtime REAL DEFAULT 0,
  net_salary REAL,
  status TEXT DEFAULT 'draft',
  created_at TEXT
);

-- Sea Import Jobs table
CREATE TABLE IF NOT EXISTS sea_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  mbl_no TEXT,
  hbl_no TEXT,
  vessel TEXT,
  voyage TEXT,
  pol TEXT,
  pod TEXT,
  shipper TEXT,
  consignee TEXT,
  notify_party TEXT,
  container_no TEXT,
  container_type TEXT,
  goods_description TEXT,
  weight REAL,
  cbm REAL,
  freight_term TEXT,
  agent TEXT,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT
);

-- Sea Export Jobs table
CREATE TABLE IF NOT EXISTS sea_export_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  mbl_no TEXT,
  hbl_no TEXT,
  vessel TEXT,
  voyage TEXT,
  pol TEXT,
  pod TEXT,
  shipper TEXT,
  consignee TEXT,
  notify_party TEXT,
  container_no TEXT,
  container_type TEXT,
  goods_description TEXT,
  weight REAL,
  cbm REAL,
  freight_term TEXT,
  agent TEXT,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT
);

-- Air Import Jobs table
CREATE TABLE IF NOT EXISTS air_import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  awb_no TEXT,
  hawb_no TEXT,
  flight_no TEXT,
  pol TEXT,
  pod TEXT,
  shipper TEXT,
  consignee TEXT,
  notify_party TEXT,
  weight REAL,
  cbm REAL,
  chargeable_weight REAL,
  freight_term TEXT,
  agent TEXT,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT
);

-- Air Export Jobs table
CREATE TABLE IF NOT EXISTS air_export_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  awb_no TEXT,
  hawb_no TEXT,
  flight_no TEXT,
  pol TEXT,
  pod TEXT,
  shipper TEXT,
  consignee TEXT,
  notify_party TEXT,
  weight REAL,
  cbm REAL,
  chargeable_weight REAL,
  freight_term TEXT,
  agent TEXT,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT
);

-- Transshipment Jobs table
CREATE TABLE IF NOT EXISTS transshipment_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  mbl_no TEXT,
  vessel TEXT,
  voyage TEXT,
  pol TEXT,
  pod TEXT,
  tshipment_port TEXT,
  shipper TEXT,
  consignee TEXT,
  container_no TEXT,
  goods_description TEXT,
  weight REAL,
  cbm REAL,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TEXT
);

-- Liner Schedules table
CREATE TABLE IF NOT EXISTS liner_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vessel TEXT,
  voyage TEXT,
  pol TEXT,
  pod TEXT,
  eta TEXT,
  etd TEXT,
  cutoff_date TEXT,
  carrier TEXT,
  service_type TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- CF Jobs table
CREATE TABLE IF NOT EXISTS cf_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  date TEXT,
  be_no TEXT,
  be_date TEXT,
  shipping_line TEXT,
  container_no TEXT,
  goods_description TEXT,
  weight REAL,
  cbm REAL,
  duty_amount REAL,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TEXT
);

-- Other Jobs table
CREATE TABLE IF NOT EXISTS other_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_no TEXT,
  job_type TEXT,
  date TEXT,
  description TEXT,
  client_name TEXT,
  amount REAL,
  status TEXT DEFAULT 'active',
  remarks TEXT,
  created_at TEXT
);

-- Shipping Docs table
CREATE TABLE IF NOT EXISTS shipping_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  job_type TEXT,
  doc_type TEXT,
  file_name TEXT,
  file_path TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT
);

-- Shipping Expenses table
CREATE TABLE IF NOT EXISTS shipping_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  job_type TEXT,
  expense_type TEXT,
  amount REAL,
  currency TEXT DEFAULT 'USD',
  exchange_rate REAL DEFAULT 3.6725,
  amount_aed REAL,
  vendor TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT
);
`;

// =============================================================================
// 15. INITIALIZE DATABASE AND START SERVER
// =============================================================================

async function initializeDatabase() {
  try {
    // Check if sqlite3 CLI is available
    try {
      await execAsync('sqlite3 --version');
    } catch {
      console.error('ERROR: sqlite3 CLI not found. Please install sqlite3.');
      console.error('On Ubuntu/Debian: sudo apt-get install sqlite3');
      process.exit(1);
    }

    // Create tables
    console.log('Creating tables...');
    await dbExec(CREATE_TABLES_SQL);
    console.log('All tables created successfully.');

    // Create default admin user if not exists
    const adminCheck = await dbAll('SELECT id FROM users WHERE email = ?', [DEFAULT_ADMIN_EMAIL]);
    if (adminCheck.length === 0) {
      const hashedPassword = crypto.createHash('sha256').update(DEFAULT_ADMIN_PASSWORD).digest('hex');
      const now = new Date().toISOString();
      await dbRun(
        `INSERT INTO users (email, password, full_name, role, status, subscription_plan, created_at)
         VALUES (?, ?, 'System Administrator', 'admin', 'active', 'enterprise', ?)`,
        [DEFAULT_ADMIN_EMAIL, hashedPassword, now]
      );
      console.log('Default admin created: admin / admin123');
    }

    // Seed chart of accounts if empty
    const coaCheck = await dbAll('SELECT COUNT(*) as count FROM chart_of_accounts');
    if ((coaCheck[0]?.count || 0) === 0) {
      const accounts = [
        ['1000', 'Assets', 'asset', null, 1],
        ['1100', 'Current Assets', 'asset', 1, 2],
        ['1110', 'Cash and Bank', 'asset', 2, 3],
        ['1120', 'Accounts Receivable', 'asset', 2, 3],
        ['1130', 'Inventory', 'asset', 2, 3],
        ['1200', 'Fixed Assets', 'asset', 1, 2],
        ['2000', 'Liabilities', 'liability', null, 1],
        ['2100', 'Current Liabilities', 'liability', 7, 2],
        ['2110', 'Accounts Payable', 'liability', 8, 3],
        ['2120', 'Short-term Loans', 'liability', 8, 3],
        ['3000', 'Equity', 'equity', null, 1],
        ['3100', 'Owner Capital', 'equity', 11, 2],
        ['3200', 'Retained Earnings', 'equity', 11, 2],
        ['4000', 'Revenue', 'revenue', null, 1],
        ['4100', 'Sales Revenue', 'revenue', 14, 2],
        ['4200', 'Service Revenue', 'revenue', 14, 2],
        ['5000', 'Expenses', 'expense', null, 1],
        ['5100', 'Cost of Goods Sold', 'expense', 17, 2],
        ['5200', 'Operating Expenses', 'expense', 17, 2],
        ['5210', 'Rent Expense', 'expense', 19, 3],
        ['5220', 'Salaries Expense', 'expense', 19, 3],
        ['5230', 'Utilities Expense', 'expense', 19, 3]
      ];
      for (const acct of accounts) {
        await dbRun(
          'INSERT INTO chart_of_accounts (code, name, type, parent_id, level) VALUES (?, ?, ?, ?, ?)',
          acct
        );
      }
      console.log('Chart of accounts seeded.');
    }

    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
}

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found. Build the frontend and place it in the dist/ folder.' });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
let server;
initializeDatabase().then(() => {
  server = app.listen(PORT, () => {
    console.log('========================================');
    console.log('  FreshERP Server Running');
    console.log('  Port:', PORT);
    console.log('  Database:', DB_PATH);
    console.log('========================================');
    console.log('  Auth: POST /api/auth/login');
    console.log('  Admin: admin / admin123');
    console.log('========================================');
  });
}).catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
