const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'REMOVED',
  database: 'etamil',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
};

let pool;

async function initDB() {
  pool = mysql.createPool(DB_CONFIG);

  const [roles] = await pool.query('SELECT COUNT(*) as c FROM roles');
  if (roles[0]?.c === 0) {
    await pool.query("INSERT INTO roles (name, permissions) VALUES ('admin', '[\"all\"]')");
    await pool.query("INSERT INTO roles (name, permissions) VALUES ('editor', '[\"books.create\",\"books.edit\",\"books.delete\"]')");
    await pool.query("INSERT INTO roles (name, permissions) VALUES ('user', '[\"books.read\",\"translate\",\"ocr\",\"tts\",\"summarize\",\"flashcards\"]')");
  }

  const [admin] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin']);
  if (admin.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO users (username, email, password, full_name, is_superuser) VALUES (?, ?, ?, ?, ?)', ['admin', 'admin@etamil.app', hash, 'Admin User', 1]);
    await pool.query('INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)', ['demo', 'demo@etamil.app', bcrypt.hashSync('demo123', 10), 'Demo User']);
  }

  const [cats] = await pool.query('SELECT COUNT(*) as c FROM categories');
  if (cats[0]?.c === 0) {
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
      await pool.query('INSERT INTO categories (name, name_en) VALUES (?, ?)', [n, ne]);
    }
  }
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}

async function insert(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result.insertId;
}

module.exports = { initDB, query, queryOne, run, insert, pool };
