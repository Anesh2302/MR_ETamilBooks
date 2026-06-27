const https = require('https');

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
  throw new Error('FATAL: TURSO_DB_URL and TURSO_DB_TOKEN must be set');
}

const apiHost = TURSO_DB_URL.replace('libsql://', '');
let initialized = false;
let initPromise = null;

function toTypedArgs(args) {
  return (args || []).map(a => {
    if (a === null || a === undefined) return { type: 'null', value: null };
    if (typeof a === 'number') return { type: Number.isInteger(a) ? 'integer' : 'real', value: a };
    return { type: 'text', value: String(a) };
  });
}

function tursoReq(sql, params) {
  const body = JSON.stringify({ stmt: sql, args: (params || []).map(a => a) });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: apiHost,
      path: '/v1/execute',
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

function parseRows(resp) {
  if (!resp || resp.success === false || !resp.results || !resp.results.columns) return [];
  const cols = resp.results.columns;
  const rows = resp.results.rows || [];
  return rows.map(row => {
    const obj = {};
    cols.forEach((colName, i) => {
      obj[colName] = row[i] === null || row[i] === undefined ? null : row[i];
    });
    return obj;
  });
}

function parseRow(resp) {
  const rows = parseRows(resp);
  return rows[0] || null;
}

function getInsertId(resp) {
  if (resp && resp.meta && resp.meta.last_row_id !== null && resp.meta.last_row_id !== undefined) {
    return Number(resp.meta.last_row_id);
  }
  return 0;
}

const initDB = async () => {
  if (initialized) return;
  const t0 = Date.now();
  try {
    await tursoReq('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, full_name TEXT DEFAULT \'\', preferred_language TEXT DEFAULT \'ta\', is_superuser INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')))');
    await tursoReq('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT \'\', book_count INTEGER DEFAULT 0)');
    await tursoReq('CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_ta TEXT, author TEXT DEFAULT \'\', author_ta TEXT, description TEXT DEFAULT \'\', description_ta TEXT, language TEXT DEFAULT \'ta\', file_type TEXT DEFAULT \'\', file_size INTEGER DEFAULT 0, file_url TEXT DEFAULT \'\', cover_url TEXT DEFAULT \'\', source TEXT DEFAULT \'user_upload\', category_id INTEGER, status TEXT DEFAULT \'pending\', views_count INTEGER DEFAULT 0, downloads_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime(\'now\')), updated_at TEXT DEFAULT (datetime(\'now\')), FOREIGN KEY (category_id) REFERENCES categories(id))');
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['தமிழ் இலக்கியம்', 'Tamil Literature']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['கதைகள்', 'Stories']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['கவிதை', 'Poetry']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['வரலாறு', 'History']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['அறிவியல்', 'Science']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['கல்வி', 'Education']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['English Books', 'English Books']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['குழந்தை இலக்கியம்', 'Children Literature']);

    initialized = true;
    if (process.env.VERCEL) console.log('initDB done, t=' + (Date.now()-t0));
  } catch (e) {
    console.error('initDB error:', e.message);
  }
};

const ensureInit = async () => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = initDB().then(() => { initialized = true; }).catch(() => {});
  }
  await Promise.race([initPromise, new Promise(r => setTimeout(r, 10000))]);
};

const query = async (sql, params = []) => {
  await ensureInit();
  try {
    return parseRows(await tursoReq(sql, params));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return [];
    throw e;
  }
};

const queryOne = async (sql, params = []) => {
  await ensureInit();
  try {
    return parseRow(await tursoReq(sql, params));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const run = async (sql, params = []) => {
  await ensureInit();
  try {
    return tursoReq(sql, params);
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const insert = async (sql, params = []) => {
  await ensureInit();
  try {
    return getInsertId(await tursoReq(sql, params));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return 0;
    throw e;
  }
};

console.log('db.js v6 v1-api');
module.exports = { initDB, query, queryOne, run, insert };
