let client;
let initialized = false;
let initPromise = null;

async function getClient() {
  if (client) return client;
  const { createClient } = await import('@libsql/client/http');
  client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });
  return client;
}

const query = async (sql, params = []) => {
  const c = await getClient();
  await ensureInit();
  try {
    const rs = await c.execute({ sql, args: params });
    return rs.rows || [];
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return [];
    throw e;
  }
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const run = async (sql, params = []) => {
  const c = await getClient();
  await ensureInit();
  try {
    return await c.execute({ sql, args: params });
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return null;
    throw e;
  }
};

const insert = async (sql, params = []) => {
  const c = await getClient();
  await ensureInit();
  try {
    const rs = await c.execute({ sql, args: params });
    return rs.lastInsertRowid || 0;
  } catch (e) {
    if (e.message && e.message.includes('no such table')) return 0;
    throw e;
  }
};

const initDB = async () => {
  if (initialized) return;
  const t0 = Date.now();
  try {
    const c = await getClient();
    await c.execute({ sql: 'CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT \'\', book_count INTEGER DEFAULT 0)', args: [] });
    await c.execute({ sql: "INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", args: ['TestCat', 'Test EN'] });
    const rs = await c.execute({ sql: "SELECT * FROM categories WHERE name = ?", args: ['TestCat'] });
    console.log('initDB verify: ' + JSON.stringify(rs.rows));
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

console.log('db.js v13 @libsql/http');
module.exports = { initDB, query, queryOne, run, insert };
