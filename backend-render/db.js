const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
  throw new Error('FATAL: TURSO_DB_URL and TURSO_DB_TOKEN must be set');
}

const apiUrl = 'https://' + TURSO_DB_URL.replace('libsql://', '') + '/v2/pipeline';
let initialized = false;
let initPromise = null;

async function tursoReq(sql, params) {
  const isWrite = !/^\s*(SELECT|PRAGMA)\b/i.test(sql);
  const requests = isWrite
    ? [
        { type: 'execute', stmt: { sql: 'BEGIN', args: [] } },
        { type: 'execute', stmt: { sql, args: (params || []).map(a => ({ type: 'text', value: String(a) })) } },
        { type: 'execute', stmt: { sql: 'COMMIT', args: [] } },
        { type: 'close' },
      ]
    : [
        { type: 'execute', stmt: { sql, args: (params || []).map(a => ({ type: 'text', value: String(a) })) } },
        { type: 'close' },
      ];
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_DB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const parsed = await resp.json();
  if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  if (isWrite && parsed.results && parsed.results.length >= 4) {
    return { results: [parsed.results[1], parsed.results[parsed.results.length - 1]] };
  }
  return parsed;
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

function parseRow(resp) { const rows = parseRows(resp); return rows[0] || null; }

function getInsertId(resp) {
  const result = getResult(resp);
  if (result && result.last_insert_rowid !== null && result.last_insert_rowid !== undefined) {
    return Number(result.last_insert_rowid);
  }
  return 0;
}

const initDB = async () => {
  if (initialized) return;
  const t0 = Date.now();
  try {
    await tursoReq('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT \'\', book_count INTEGER DEFAULT 0)');
    await tursoReq("INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", ['TestCat', 'Test EN']);
    const check = await tursoReq("SELECT * FROM categories WHERE name = ?", ['TestCat']);
    console.log('initDB verify: ' + JSON.stringify(parseRows(check)));
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
  try { return parseRows(await tursoReq(sql, params)); }
  catch (e) {
    if (e.message && e.message.includes('no such table')) return [];
    throw e;
  }
};

const queryOne = async (sql, params = []) => {
  await ensureInit();
  try { return parseRow(await tursoReq(sql, params)); }
  catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const run = async (sql, params = []) => {
  await ensureInit();
  try { return tursoReq(sql, params); }
  catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const insert = async (sql, params = []) => {
  await ensureInit();
  try { return getInsertId(await tursoReq(sql, params)); }
  catch (e) {
    if (e.message && e.message.includes('no such table')) return 0;
    throw e;
  }
};

console.log('db.js v11 noclose');
module.exports = { initDB, query, queryOne, run, insert };
