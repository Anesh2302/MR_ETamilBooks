const { createClient } = require('@libsql/client/http');
const RAW_URL = process.env.TURSO_DB_URL || '';
const RAW_TOKEN = process.env.TURSO_DB_TOKEN || '';
const TURSO_DB_URL = RAW_URL.charCodeAt(0) === 0xFEFF ? RAW_URL.slice(1) : RAW_URL;
let client;
let initialized = false;
let initPromise = null;

async function getClient() {
  if (client) return client;
  client = createClient({
    url: TURSO_DB_URL,
    authToken: TURSO_DB_TOKEN,
  });
  return client;
}

const query = async (sql, params = []) => {
  try {
    const c = await getClient();
    ensureInit();
    const rs = await c.execute({ sql, args: params });
    return rs.rows || [];
  } catch (e) {

    return [];
  }
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const run = async (sql, params = []) => {
  try {
    const c = await getClient();
    ensureInit();
    return await c.execute({ sql, args: params });
  } catch (e) {
    return null;
  }
};

const insert = async (sql, params = []) => {
  try {
    const c = await getClient();
    ensureInit();
    const rs = await c.execute({ sql, args: params });
    return rs.lastInsertRowid || 0;
  } catch (e) {
    return 0;
  }
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, full_name TEXT DEFAULT '', preferred_language TEXT DEFAULT 'ta', is_superuser INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_en TEXT DEFAULT '', book_count INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_ta TEXT DEFAULT '', author TEXT DEFAULT '', author_ta TEXT DEFAULT '', language TEXT DEFAULT 'ta', description TEXT DEFAULT '', description_ta TEXT DEFAULT '', file_type TEXT DEFAULT 'pdf', file_url TEXT DEFAULT '', cover_url TEXT DEFAULT '', content_text TEXT DEFAULT '', category_id INTEGER, uploaded_by INTEGER, status TEXT DEFAULT 'approved', views_count INTEGER DEFAULT 0, downloads_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (category_id) REFERENCES categories(id), FOREIGN KEY (uploaded_by) REFERENCES users(id))`,
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
    try { await c.execute({ sql: "ALTER TABLE books ADD COLUMN content_text TEXT DEFAULT ''", args: [] }); } catch {}
    const dupes = await c.execute({ sql: "SELECT name, COUNT(*) as cnt, MIN(id) as keep_id FROM categories GROUP BY name HAVING cnt > 1", args: [] });
    if (dupes.rows && dupes.rows.length > 0) {
      for (const row of dupes.rows) {
        await c.execute({ sql: "UPDATE books SET category_id = ? WHERE category_id IN (SELECT id FROM categories WHERE name = ? AND id != ?)", args: [Number(row.keep_id), row.name, Number(row.keep_id)] });
        await c.execute({ sql: "DELETE FROM categories WHERE name = ? AND id != ?", args: [row.name, Number(row.keep_id)] });
      }
    }
    try { await c.execute({ sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name)", args: [] }); } catch {}
    for (const [name, name_en] of SEED_CATEGORIES) {
      await c.execute({ sql: "INSERT OR IGNORE INTO categories (name, name_en) VALUES (?, ?)", args: [name, name_en] });
    }
    const existing = await c.execute({ sql: "SELECT id FROM users WHERE username = ?", args: ['simon'] });
    if (!existing.rows || existing.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const adminPw = bcrypt.hashSync('REMOVED', 10);
      await c.execute({ sql: "INSERT INTO users (username, email, password, full_name, preferred_language, is_superuser, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ['simon', 'simonpetercys@gmail.com', adminPw, 'Simon', 'ta', 1, 1] });
    }
    await c.execute({ sql: "INSERT OR IGNORE INTO roles (name, permissions) VALUES (?, ?)", args: ['admin', '["all"]'] });
    const getCatId = async (nameEn) => {
      const r = await c.execute({ sql: "SELECT id FROM categories WHERE name_en = ?", args: [nameEn] });
      return r.rows && r.rows[0] ? Number(r.rows[0].id) : null;
    };
    const cLiterature = await getCatId('Tamil Literature');

    await c.execute({ sql: "UPDATE books SET content_text = ? WHERE title = ? AND (content_text IS NULL OR content_text = '')", args: ['திருக்குறள் மூலமும் உரையும்\n\nஅறத்துப்பால் - கடவுள் வாழ்த்து\n\nஅகர முதல எழுத்தெல்லாம் ஆதிபகவன் முதற்றே உலகு.\n\nதிருவள்ளுவர் இயற்றிய திருக்குறள் தமிழ் இலக்கியத்தின் மிகச் சிறந்த நூல்களில் ஒன்றாகும்.', 'Thirukkural'] });
    await c.execute({ sql: "UPDATE books SET content_text = ? WHERE title = ? AND (content_text IS NULL OR content_text = '')", args: ['பாரதியார் கவிதைகள்\n\nசிந்தனை செய் மனமே!\nசிந்தனை செய் மனமே!\nசிந்தனை செய்யிலே சித்தம் தெளியுமடா!\n\nமகாகவி சுப்பிரமணிய பாரதி (1882-1921) தமிழின் மிகச் சிறந்த கவிஞர்களில் ஒருவர்.', 'Bharathiyar Poems'] });
    await c.execute({ sql: "UPDATE books SET content_text = ? WHERE title = ? AND (content_text IS NULL OR content_text = '')", args: ['The Alchemist\n\nBy Paulo Coelho\n\n"The boy\'s name was Santiago..."\n\n"When you want something, all the universe conspires in helping you to achieve it."', 'The Alchemist'] });

    const existingTitles = (await c.execute({ sql: "SELECT title FROM books", args: [] })).rows.map(r => r.title);
    const newBooks = [
      ['நன்னூல் - தமிழ் இலக்கணம்', 'Nannool - Tamil Grammar', 'பவணந்தி முனிவர்', 'Pavanandi Munivar', 'ta', 'தொல்காப்பியத்தை அடிப்படையாகக் கொண்ட நன்னூல் தமிழ் இலக்கணத்தை எளிதாக விளக்குகிறது.', 'A comprehensive Tamil grammar text based on Tholkappiyam.', cLiterature, 'ta', 'நன்னூல்\n\nதமிழ் இலக்கணம்\n\nஎழுத்ததிகாரம்\n\nஉயிரெழுத்து: அ, ஆ, இ, ஈ, உ, ஊ, எ, ஏ, ஐ, ஒ, ஓ, ஔ\nமெய்யெழுத்து: க், ங், ச், ஞ், ட், ண், த், ந், ப், ம, ய், ர், ல், வ், ழ், ள்\n\nதமிழ் மொழி உலகின் மிகப் பழமையான மொழிகளில் ஒன்றாகும். இது சுமார் 5000 ஆண்டுகள் பழமையானது.'],
      ['சிறுகதை தொகுப்பு', 'Short Story Collection', 'பல்வேறு ஆசிரியர்கள்', 'Various Authors', 'ta', 'தமிழ் இலக்கியத்தின் சிறந்த சிறுகதைகளின் தொகுப்பு.', 'Collection of the best short stories from Tamil literature.', cLiterature, 'ta', 'சிறுகதைகள்\n\n1. கடவுளும் கந்தசாமியும் - புதுமைப்பித்தன்\n\nகந்தசாமி சந்தோஷமாக இருந்தான்.\n\n2. பொன்னகரம் - ஜெயகாந்தன்\n\nபொன்னகரம் என்று ஒரு ஊர் இருந்தது.\n\n3. அக்கினி பிரவேசம் - மெளனி\n\nதீயில் விழுந்தான். சுற்றி நின்றவர்கள் பார்த்துக் கொண்டிருந்தனர்.'],
    ];
    for (const [titleTa, titleEn, authorTa, authorEn, lang, descTa, descEn, cid, clang, ctext] of newBooks) {
      if (!existingTitles.includes(titleEn)) {
        await c.execute({ sql: "INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, category_id, uploaded_by, status, content_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [titleEn, titleTa, authorEn, authorTa, lang, descEn, descTa, 'pdf', cid, 1, 'approved', ctext] });
      }
    }
    initialized = true;
    if (process.env.VERCEL) console.log('initDB done, t=' + (Date.now()-t0));
  } catch (e) {

  }
};

const ensureInit = async () => {
  if (initialized) return;
  if (!initPromise) {
    initPromise = initDB().then(() => { initialized = true; }).catch(() => {});
  }
  await Promise.race([initPromise, new Promise(r => setTimeout(r, 3000))]);
};

console.log('db.js v17.2');
module.exports = { initDB, query, queryOne, run, insert };