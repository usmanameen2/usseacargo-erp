/**
 * Database module - sql.js with synchronous API wrapper
 * Call db.init() before use, then use db.prepare().run()/get()/all()
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'erp.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let SQL = null;
let database = null;
let initialized = false;

async function init() {
  if (initialized) return;
  SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileData = fs.readFileSync(DB_PATH);
    database = new SQL.Database(fileData);
  } else {
    database = new SQL.Database();
  }
  const stmt = database.prepare(
    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  const count = row.count || 0;
  if (count === 0) {
    console.log('[DB] Initializing database schema...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    database.run(schema);
    persist();
    console.log('[DB] Schema created successfully.');
  } else {
    console.log(`[DB] Database ready (${count} tables found).`);
  }
  initialized = true;
}

function persist() {
  if (!database) return;
  const data = database.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function ensureLoaded() {
  if (!initialized) throw new Error('Database not initialized. Call db.init() first.');
}

// Statement that creates fresh sql.js statement for each operation
class Statement {
  constructor(sql) {
    ensureLoaded();
    this.sql = sql;
  }

  _newStmt() {
    return database.prepare(this.sql);
  }

  run(...params) {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this._newStmt();
    stmt.bind(args);
    stmt.step();
    stmt.free();
    persist();
    const idStmt = database.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const result = idStmt.getAsObject();
    idStmt.free();
    return { lastInsertRowid: result.id || 0, changes: 1 };
  }

  get(...params) {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this._newStmt();
    stmt.bind(args);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  }

  all(...params) {
    const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this._newStmt();
    stmt.bind(args);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  free() {}
}

module.exports = {
  init,

  prepare(sql) {
    return new Statement(sql);
  },

  exec(sql, callback) {
    ensureLoaded();
    try { database.run(sql); persist(); if (callback) callback(null); }
    catch (err) { if (callback) callback(err); else throw err; }
  },

  run(sql, params, callback) {
    ensureLoaded();
    try { database.run(sql, params || []); persist(); if (callback) callback(null); }
    catch (err) { if (callback) callback(err); else throw err; }
  },

  get(sql, params, callback) {
    ensureLoaded();
    try {
      const stmt = database.prepare(sql);
      stmt.bind(params || []);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      if (callback) callback(null, row);
      else return row;
    } catch (err) { if (callback) callback(err); else throw err; }
  },

  all(sql, params, callback) {
    ensureLoaded();
    try {
      const stmt = database.prepare(sql);
      stmt.bind(params || []);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      if (callback) callback(null, rows);
      else return rows;
    } catch (err) { if (callback) callback(err); else throw err; }
  },

  pragma(pragmaSql) {
    ensureLoaded();
    const stmt = database.prepare(pragmaSql);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  },

  close(callback) {
    persist();
    if (database) { database.close(); database = null; }
    if (callback) callback();
  },

  persist() { persist(); }
};
