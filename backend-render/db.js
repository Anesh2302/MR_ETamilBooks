const bcrypt = require('bcryptjs');
const https = require('https');

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
  throw new Error('FATAL: TURSO_DB_URL and TURSO_DB_TOKEN must be set');
}

const apiHost = TURSO_DB_URL.replace('libsql://', '');
const apiPath = '/v2/pipeline';
let initialized = false;
let initPromise = null;
function toTypedArgs(args) {
  return (args || []).map(a => {
    if (a === null || a === undefined) return { type: 'null', value: null };
    if (typeof a === 'number') return { type: Number.isInteger(a) ? 'integer' : 'real', value: a };
    return { type: 'text', value: String(a) };
  });
}

function tursoReq(statements) {
  const requests = (typeof statements === 'string' ? [{ sql: statements }] : statements).map(s => ({
    type: 'execute',
    stmt: {
      sql: typeof s === 'string' ? s : s.sql,
      args: toTypedArgs(typeof s === 'string' ? [] : s.args),
    },
  }));
  requests.push({ type: 'close' });

  const body = JSON.stringify({ requests });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: apiHost,
      path: apiPath,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_DB_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          else resolve(parsed);
        } catch (e) {
          reject(new Error('Turso parse error: ' + data.substring(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getResult(resp) {
  if (!resp || !resp.results || !resp.results[0]) return null;
  const r = resp.results[0];
  if (r.type === 'error') throw new Error(r.error ? r.error.message : 'Turso error');
  if (r.response && r.response.result) return r.response.result;
  return null;
}

function parseRows(resp) {
  const result = getResult(resp);
  if (!result || !result.cols) return [];
  const cols = result.cols;
  const rows = result.rows || [];
  return rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (cell === null || cell === undefined) obj[col.name] = null;
      else if (col.type === 'integer') obj[col.name] = Number(cell);
      else if (col.type === 'real') obj[col.name] = Number(cell);
      else obj[col.name] = String(cell);
    });
    return obj;
  });
}

function parseRow(resp) {
  const rows = parseRows(resp);
  return rows[0] || null;
}

function getInsertId(resp) {
  const result = getResult(resp);
  if (result && result.last_insert_rowid !== null && result.last_insert_rowid !== undefined) {
    return Number(result.last_insert_rowid);
  }
  return 0;
}

const initDB = async () => {
  if (initialized) return;

  await tursoReq([{ sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, full_name TEXT DEFAULT \'\', preferred_language TEXT DEFAULT \'ta\', is_superuser INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')))' }]);
  await tursoReq([{ sql: 'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT \'\', book_count INTEGER DEFAULT 0)' }]);
  await tursoReq([{ sql: 'CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_ta TEXT, author TEXT DEFAULT \'\', author_ta TEXT, description TEXT DEFAULT \'\', description_ta TEXT, language TEXT DEFAULT \'ta\', file_type TEXT DEFAULT \'\', file_size INTEGER DEFAULT 0, file_url TEXT DEFAULT \'\', cover_url TEXT DEFAULT \'\', source TEXT DEFAULT \'user_upload\', category_id INTEGER, status TEXT DEFAULT \'pending\', views_count INTEGER DEFAULT 0, downloads_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')), FOREIGN KEY (category_id) REFERENCES categories(id))' }]);

  initialized = true;
};

const ensureInit = async () => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = initDB().then(() => { initialized = true; }).catch(() => {});
  }
  await Promise.race([initPromise, new Promise(r => setTimeout(r, 6000))]);
};

const query = async (sql, params = []) => {
  await ensureInit();
  try {
    return parseRows(await tursoReq([{ sql, args: params }]));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return [];
    throw e;
  }
};

const queryOne = async (sql, params = []) => {
  await ensureInit();
  try {
    return parseRow(await tursoReq([{ sql, args: params }]));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const run = async (sql, params = []) => {
  await ensureInit();
  try {
    return tursoReq([{ sql, args: params }]);
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const insert = async (sql, params = []) => {
  await ensureInit();
  try {
    return getInsertId(await tursoReq([{ sql, args: params }]));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return 0;
    throw e;
  }
};

module.exports = { initDB, query, queryOne, run, insert };
