const bcrypt = require('bcryptjs');

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

let db;

let createClient;
try {
  createClient = require('@libsql/client').createClient;
} catch (e) {
  console.error('@libsql/client failed to load. Run: npm install @libsql/client');
  process.exit(1);
}

const initDB = async () => {
  if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
    console.error('FATAL: TURSO_DB_URL and TURSO_DB_TOKEN environment variables must be set');
    process.exit(1);
  }

  db = createClient({
    url: TURSO_DB_URL,
    authToken: TURSO_DB_TOKEN,
  });

  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      preferred_language TEXT DEFAULT 'ta',
      is_superuser INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_ta TEXT,
      author TEXT DEFAULT '',
      author_ta TEXT,
      description TEXT DEFAULT '',
      description_ta TEXT,
      language TEXT DEFAULT 'ta',
      file_type TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      file_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      source TEXT DEFAULT 'user_upload',
      category_id INTEGER,
      status TEXT DEFAULT 'pending',
      views_count INTEGER DEFAULT 0,
      downloads_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      book_count INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      book_id INTEGER,
      page INTEGER DEFAULT 1,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    )`,
    `CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      book_id INTEGER,
      page INTEGER DEFAULT 1,
      progress REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    )`,
    `CREATE TABLE IF NOT EXISTS translate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      source_text TEXT,
      translated_text TEXT,
      source_language TEXT,
      target_language TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS flashcard_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      description TEXT DEFAULT '',
      source_language TEXT DEFAULT 'ta',
      target_language TEXT DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER,
      source_text TEXT,
      translated_text TEXT,
      is_learned INTEGER DEFAULT 0,
      FOREIGN KEY (set_id) REFERENCES flashcard_sets(id)
    )`,
    `CREATE TABLE IF NOT EXISTS ocr_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      image_url TEXT,
      extracted_text TEXT,
      translated_text TEXT,
      language TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS audio_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      file_url TEXT,
      transcribed_text TEXT,
      translated_text TEXT,
      language TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS tts_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      text TEXT,
      language TEXT,
      audio_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS summarize_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      source_text TEXT,
      summary TEXT,
      compression_ratio INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      query TEXT,
      filters TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role_id INTEGER,
      UNIQUE(user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )`,
  ], 'write');

  const roleCount = await db.execute('SELECT COUNT(*) as c FROM roles');
  if (roleCount.rows[0].c === 0) {
    await db.batch([
      { sql: "INSERT INTO roles (name, permissions) VALUES ('admin', '[\"all\"]')", args: [] },
      { sql: "INSERT INTO roles (name, permissions) VALUES ('editor', '[\"books.create\",\"books.edit\",\"books.delete\"]')", args: [] },
      { sql: "INSERT INTO roles (name, permissions) VALUES ('user', '[\"books.read\",\"translate\",\"ocr\",\"tts\",\"summarize\",\"flashcards\"]')", args: [] },
    ], 'write');
  }

  const adminCheck = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['admin'] });
  if (adminCheck.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute({ sql: 'INSERT INTO users (username, email, password, full_name, is_superuser) VALUES (?, ?, ?, ?, ?)', args: ['admin', 'admin@etamil.app', hash, 'Admin User', 1] });
    await db.execute({ sql: 'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)', args: ['demo', 'demo@etamil.app', bcrypt.hashSync('demo123', 10), 'Demo User'] });
  }

  const catCount = await db.execute('SELECT COUNT(*) as c FROM categories');
  if (catCount.rows[0].c === 0) {
    const catData = [
      ['தமிழ் இலக்கியம்', 'Tamil Literature'],
      ['கதைகள்', 'Stories'],
      ['கவிதை', 'Poetry'],
      ['வரலாறு', 'History'],
      ['அறிவியல்', 'Science'],
      ['கல்வி', 'Education'],
      ['English Books', 'English Books'],
      ['குழந்தை இலக்கியம்', 'Children Literature'],
    ];
    for (const [n, ne] of catData) {
      await db.execute({ sql: 'INSERT INTO categories (name, name_en) VALUES (?, ?)', args: [n, ne] });
    }
  }

  const bookCount = await db.execute('SELECT COUNT(*) as c FROM books');
  if (bookCount.rows[0].c === 0) {
    const books = [
      ['தமிழ் இலக்கிய வரலாறு', 'தமிழ் இலக்கிய வரலாறு', 'Dr. M. Varadharajan', 'ம. வரதராஜன்', 'A comprehensive history of Tamil literature.', 1, 'ta', 'approved'],
      ['Silappadikaram', 'சிலப்பதிகாரம்', 'Ilango Adigal', 'இளங்கோ அடிகள்', 'One of the five great epics of Tamil literature.', 1, 'ta', 'approved'],
      ['Thirukkural', 'திருக்குறள்', 'Thiruvalluvar', 'திருவள்ளுவர்', 'Ancient Tamil classic on ethics and life.', 1, 'ta', 'approved'],
      ['Ponniyin Selvan', 'பொன்னியின் செல்வன்', 'Kalki Krishnamurthy', 'கல்கி கிருஷ்ணமூர்த்தி', 'Epic historical novel set in the Chola dynasty.', 2, 'ta', 'approved'],
      ['Tamil Short Stories', 'தமிழ் சிறுகதை தொகுப்பு', 'Various Authors', null, 'Collection of best Tamil short stories.', 2, 'ta', 'approved'],
      ['Bharathi Poems', 'பாரதியார் கவிதைகள்', 'Mahakavi Subramania Bharathi', 'மகாகவி சுப்பிரமணிய பாரதியார்', 'Patriotic and spiritual poems.', 3, 'ta', 'approved'],
      ['History of Tamil Nadu', 'தமிழக வரலாறு', 'Prof. K. A. Nilakanta Sastri', null, 'Comprehensive history of Tamil Nadu.', 4, 'ta', 'approved'],
      ['Tamil Science Dictionary', 'தமிழ் அறிவியல் அகராதி', 'Tamil Nadu Textbook Corp.', null, 'Complete science dictionary in Tamil.', 5, 'ta', 'approved'],
      ['English Grammar for Tamil Speakers', null, 'R. K. Venkatesan', null, 'Learn English grammar with Tamil explanations.', 7, 'en', 'approved'],
      ['Children Tamil Stories', 'குழந்தை கதைகள்', 'A. C. S. M. Academy', null, 'Moral stories for children in Tamil.', 8, 'ta', 'approved'],
    ];
    for (const b of books) {
      await db.execute({ sql: 'INSERT INTO books (title, title_ta, author, author_ta, description, category_id, language, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: b });
    }
  }
};

const query = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result.rows || [];
};

const queryOne = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] || null;
};

const run = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result;
};

const insert = async (sql, params = []) => {
  const result = await db.execute({ sql, args: params });
  return result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : 0;
};

module.exports = { initDB, query, queryOne, run, insert };
