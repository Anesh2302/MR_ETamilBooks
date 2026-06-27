const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
  throw new Error('FATAL: TURSO_DB_URL and TURSO_DB_TOKEN must be set');
}

const apiUrl = 'https://' + TURSO_DB_URL.replace('libsql://', '') + '/v1/execute';
let initialized = false;
let initPromise = null;

async function tursoReq(sql, params) {
  const body = { statements: [{ q: sql, params: params || [] }] };
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_DB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await resp.json();
  if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  return parsed;
}

function getRows(resp) {
  if (!resp || resp.success === false || !resp.results || !resp.results[0]) return [];
  const r = resp.results[0];
  if (r.error) throw new Error(r.error.message || JSON.stringify(r.error));
  if (!r.columns || !r.rows) return [];
  return r.rows.map(row => {
    const obj = {};
    r.columns.forEach((colName, i) => { obj[colName] = row[i]; });
    return obj;
  });
}

function getRow(resp) {
  const rows = getRows(resp);
  return rows[0] || null;
}

function getInsertId(resp) {
  if (resp && resp.results && resp.results[0] && resp.results[0].last_insert_rowid !== null) {
    return Number(resp.results[0].last_insert_rowid);
  }
  return 0;
}

const initDB = async () => {
  if (initialized) return;
  const t0 = Date.now();
  try {
    await tursoReq('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT \'\', book_count INTEGER DEFAULT 0)');
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['TestCat', 'Test EN']);
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['SecondCat', 'Second EN']);
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
    return getRows(await tursoReq(sql, params));
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return [];
    throw e;
  }
};

const queryOne = async (sql, params = []) => {
  await ensureInit();
  try {
    return getRow(await tursoReq(sql, params));
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

console.log('db.js v10 v1-exec');
module.exports = { initDB, query, queryOne, run, insert };
