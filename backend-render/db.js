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

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, full_name TEXT DEFAULT '', preferred_language TEXT DEFAULT 'ta', is_superuser INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT '', book_count INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_ta TEXT DEFAULT '', author TEXT DEFAULT '', author_ta TEXT DEFAULT '', language TEXT DEFAULT 'ta', description TEXT DEFAULT '', description_ta TEXT DEFAULT '', file_type TEXT DEFAULT 'pdf', file_url TEXT DEFAULT '', cover_url TEXT DEFAULT '', category_id INTEGER, uploaded_by INTEGER, status TEXT DEFAULT 'approved', views_count INTEGER DEFAULT 0, downloads_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (category_id) REFERENCES categories(id), FOREIGN KEY (uploaded_by) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS reading_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, book_id INTEGER NOT NULL, page INTEGER DEFAULT 0, progress REAL DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (book_id) REFERENCES books(id))`,
  `CREATE TABLE IF NOT EXISTS bookmarks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, book_id INTEGER NOT NULL, page INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, book_id, page), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (book_id) REFERENCES books(id))`,
  `CREATE TABLE IF NOT EXISTS search_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, query TEXT NOT NULL, filters TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS translate_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, source_text TEXT NOT NULL, translated_text TEXT NOT NULL, source_language TEXT DEFAULT '', target_language TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS tts_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, text TEXT NOT NULL, language TEXT DEFAULT 'ta', audio_url TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS summarize_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, source_text TEXT NOT NULL, summary TEXT NOT NULL, compression_ratio REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS flashcard_sets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, source_language TEXT DEFAULT 'ta', target_language TEXT DEFAULT 'en', description TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS flashcards (id INTEGER PRIMARY KEY AUTOINCREMENT, set_id INTEGER NOT NULL, source_text TEXT NOT NULL, translated_text TEXT NOT NULL, is_learned INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (set_id) REFERENCES flashcard_sets(id))`,
  `CREATE TABLE IF NOT EXISTS ocr_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, extracted_text TEXT DEFAULT '', translated_text TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS audio_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, transcribed_text TEXT DEFAULT '', translated_text TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
  `CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, permissions TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS user_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, role_id INTEGER NOT NULL, UNIQUE(user_id, role_id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (role_id) REFERENCES roles(id))`,
];

const SEED_CATEGORIES = [
  ['தமிழ் இலக்கியம்', 'Tamil Literature'],
  ['குழந்தைகள்', 'Children'],
  ['கல்வி', 'Education'],
  ['வரலாறு', 'History'],
  ['அறிவியல்', 'Science'],
  ['தத்துவம்', 'Philosophy'],
  ['சமயம்', 'Religion'],
  ['கவிதை', 'Poetry'],
  ['நாவல்', 'Novel'],
  ['சிறுகதை', 'Short Story'],
];

const initDB = async () => {
  if (initialized) return;
  const t0 = Date.now();
  try {
    const c = await getClient();
    for (const sql of SCHEMA) {
      await c.execute({ sql, args: [] });
    }
    try { await c.execute({ sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name)", args: [] }); } catch {}
    for (const [name, name_en] of SEED_CATEGORIES) {
      await c.execute({ sql: "INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", args: [name, name_en] });
    }
    const bcrypt = require('bcryptjs');
    const adminPw = bcrypt.hashSync('REMOVED', 10);
    const existing = await c.execute({ sql: "SELECT id FROM users WHERE username = ?", args: ['simon'] });
    if (!existing.rows || existing.rows.length === 0) {
      await c.execute({ sql: "INSERT INTO users (username, email, password, full_name, preferred_language, is_superuser, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ['simon', 'simonpetercys@gmail.com', adminPw, 'Simon', 'ta', 1, 1] });
    }
    await c.execute({ sql: "INSERT OR IGNORE INTO roles (name, permissions) VALUES (?, ?)", args: ['admin', '["all"]'] });
    const bookCount = await c.execute({ sql: "SELECT COUNT(*) as cnt FROM books", args: [] });
    if (!bookCount.rows || bookCount.rows[0].cnt === 0) {
      const sampleBooks = [
        ['திருக்குறள்', 'Thirukkural', 'திருவள்ளுவர்', 'Thiruvalluvar', 'ta', 'திருக்குறள் அல்லது திருவள்ளுவர் அறநூல்', 'Ancient Tamil ethical text with 1330 couplets', 'pdf', 1],
        ['பாரதியார் கவிதைகள்', 'Bharathiyar Poems', 'மகாகவி பாரதியார்', 'Mahakavi Bharathiyar', 'ta', 'மகாகவி சுப்பிரமணிய பாரதியின் தேர்ந்தெடுக்கப்பட்ட கவிதைகள்', 'Selected poems of the great Tamil poet', 'pdf', 9],
        ['The Alchemist', 'The Alchemist', 'Paulo Coelho', 'Paulo Coelho', 'en', 'A mystical story about following your dreams', 'A mystical story about following your dreams', 'pdf', 5],
      ];
      for (const [title, title_en, author, author_en, lang, desc, desc_en, file_type, cat_id] of sampleBooks) {
        await c.execute({ sql: "INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, category_id, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [title_en, title, author_en, author, lang, desc_en, desc, file_type, cat_id, 1, 'approved'] });
      }
    }
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

console.log('db.js v16 books');
module.exports = { initDB, query, queryOne, run, insert };
