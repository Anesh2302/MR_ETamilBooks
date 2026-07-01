require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { initDB, query, queryOne, run, insert } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })();

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

async function adminOnly(req, res, next) {
  const user = await queryOne('SELECT is_superuser FROM users WHERE id = ?', [req.user.id]);
  if (!user || !user.is_superuser) return res.status(403).json({ detail: 'Admin only' });
  next();
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ access_token: token, token_type: 'bearer', user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, preferred_language: user.preferred_language, is_superuser: !!user.is_superuser } });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, full_name } = req.body;
  const exists = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (exists) return res.status(400).json({ detail: 'Username or email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const userId = await insert('INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)', [username, email, hash, full_name || '']);
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ access_token: token, token_type: 'bearer', user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, preferred_language: user.preferred_language, is_superuser: false } });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await queryOne('SELECT id, username, email, full_name, preferred_language, is_superuser FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ detail: 'User not found' });
  res.json({ data: user });
});

app.put('/api/auth/me', auth, async (req, res) => {
  const { full_name, preferred_language } = req.body;
  await run('UPDATE users SET full_name = COALESCE(?, full_name), preferred_language = COALESCE(?, preferred_language) WHERE id = ?', [full_name || null, preferred_language || null, req.user.id]);
  const user = await queryOne('SELECT id, username, email, full_name, preferred_language, is_superuser FROM users WHERE id = ?', [req.user.id]);
  res.json({ data: user });
});

app.get('/api/books/categories', async (req, res) => {
  res.json(await query('SELECT * FROM categories'));
});

app.get('/api/books', async (req, res) => {
  let sql = 'SELECT * FROM books WHERE status = ?';
  const params = ['approved'];
  if (req.query.category_id) { sql += ' AND category_id = ?'; params.push(Number(req.query.category_id)); }
  if (req.query.language) { sql += ' AND language = ?'; params.push(req.query.language); }
  if (req.query.search) {
    const q = `%${req.query.search}%`;
    sql += ' AND (title LIKE ? OR title_ta LIKE ? OR author LIKE ? OR author_ta LIKE ?)';
    params.push(q, q, q, q);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(await query(sql, params));
});

app.get('/api/books/:id', async (req, res) => {
  const book = await queryOne('SELECT * FROM books WHERE id = ?', [Number(req.params.id)]);
  if (!book) return res.status(404).json({ detail: 'Book not found' });
  await run('UPDATE books SET views_count = views_count + 1 WHERE id = ?', [Number(req.params.id)]);
  book.views_count = (book.views_count || 0) + 1;
  book.content_text = 'Full book content would be displayed here.';
  res.json(book);
});

app.post('/api/books', auth, upload.fields([{ name: 'file' }, { name: 'cover' }]), async (req, res) => {
  const { title, title_ta, author, author_ta, language, description, description_ta, category_id, file_type } = req.body;
  const fileUrl = req.files?.file?.[0] ? `/uploads/${req.files.file[0].filename}` : '';
  const coverUrl = req.files?.cover?.[0] ? `/uploads/${req.files.cover[0].filename}` : '';
  await insert('INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, file_url, cover_url, category_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, title_ta, author, author_ta, language, description, description_ta, file_type || 'pdf', fileUrl, coverUrl, category_id || null, req.user.id]);
  res.json({ id: 0, success: true, message: 'Book uploaded' });
});

app.get('/api/books/progress/list', auth, async (req, res) => {
  const progress = await query('SELECT rp.*, b.title, b.title_ta, b.file_type FROM reading_progress rp JOIN books b ON rp.book_id = b.id WHERE rp.user_id = ? ORDER BY rp.updated_at DESC', [req.user.id]);
  res.json(progress);
});

app.put('/api/books/progress', auth, async (req, res) => {
  const { book_id, page, progress } = req.body;
  try {
    await insert('INSERT INTO reading_progress (user_id, book_id, page, progress, updated_at) VALUES (?, ?, ?, ?, NOW())', [req.user.id, book_id, page || 0, progress || 0]);
  } catch {
    await run('UPDATE reading_progress SET page = ?, progress = ?, updated_at = NOW() WHERE user_id = ? AND book_id = ?', [page || 0, progress || 0, req.user.id, book_id]);
  }
  res.json({ success: true });
});

app.get('/api/translate/languages', (req, res) => {
  res.json([
    { code: 'ta', name: 'தமிழ் (Tamil)', native: 'தமிழ்' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'हिन्दी (Hindi)', native: 'हिन्दी' },
    { code: 'ml', name: 'മലയാളം (Malayalam)', native: 'മലയാളം' },
    { code: 'te', name: 'తెలుగు (Telugu)', native: 'తెలుగు' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', native: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'বাংলা (Bengali)', native: 'বাংলা' },
    { code: 'fr', name: 'Français (French)', native: 'Français' },
    { code: 'de', name: 'Deutsch (German)', native: 'Deutsch' },
    { code: 'es', name: 'Español (Spanish)', native: 'Español' },
    { code: 'zh', name: '中文 (Chinese)', native: '中文' },
    { code: 'ja', name: '日本語 (Japanese)', native: '日本語' },
  ]);
});

app.post('/api/translate/text', auth, async (req, res) => {
  const { text, source_language, target_language } = req.body;
  const translated = `[${target_language?.toUpperCase()}] ${text}`;
  await insert('INSERT INTO translate_history (user_id, source_text, translated_text, source_language, target_language) VALUES (?, ?, ?, ?, ?)', [req.user.id, text, translated, source_language, target_language]);
  res.json({ translated_text: translated, source_language, target_language });
});

app.post('/api/translate/detect', (req, res) => {
  res.json({ detected_language: 'ta', confidence: 0.95 });
});

app.get('/api/translate/history', auth, async (req, res) => {
  res.json(await query('SELECT * FROM translate_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]));
});



app.post('/api/tts/synthesize', auth, async (req, res) => {
  const { text, language } = req.body;
  const fileUrl = '/static/tts/sample.mp3';
  await insert('INSERT INTO tts_history (user_id, text, language, file_url) VALUES (?, ?, ?, ?)', [req.user.id, text, language, fileUrl]);
  res.json({ file_url: fileUrl, duration_seconds: 5.2 });
});

app.post('/api/summarize', auth, async (req, res) => {
  const { text, translate_to } = req.body;
  const summary = 'This is a concise AI-generated summary of the provided text.';
  const translatedSummary = translate_to ? 'இது வழங்கப்பட்ட உரையின் சுருக்கமான சுருக்கம்.' : null;
  await insert('INSERT INTO summarize_history (user_id, original_text, summary, compression_ratio) VALUES (?, ?, ?, ?)', [req.user.id, text, summary, 35]);
  res.json({ original_summary: summary, translated_summary: translatedSummary, translated_language: translate_to || null, compression_ratio: 35, sentence_count: text ? text.split(/[.!?]+/).length : 0 });
});

app.get('/api/flashcards/sets', auth, async (req, res) => {
  const sets = await query('SELECT fs.*, (SELECT COUNT(*) FROM flashcards WHERE set_id = fs.id) as flashcard_count FROM flashcard_sets fs WHERE fs.user_id = ? ORDER BY fs.created_at DESC', [req.user.id]);
  res.json(sets);
});

app.get('/api/flashcards/sets/:id', auth, async (req, res) => {
  const set = await queryOne('SELECT * FROM flashcard_sets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!set) return res.status(404).json({ detail: 'Set not found' });
  set.flashcards = await query('SELECT * FROM flashcards WHERE set_id = ?', [set.id]);
  set.flashcard_count = set.flashcards.length;
  res.json(set);
});

app.post('/api/flashcards/sets', auth, async (req, res) => {
  const { name, source_language, target_language, description, flashcards } = req.body;
  const setId = await insert('INSERT INTO flashcard_sets (user_id, name, source_language, target_language, description) VALUES (?, ?, ?, ?, ?)', [req.user.id, name, source_language, target_language, description || '']);
  if (flashcards && flashcards.length) {
    for (const card of flashcards) {
      await insert('INSERT INTO flashcards (set_id, source_text, translated_text) VALUES (?, ?, ?)', [setId, card.source_text, card.translated_text]);
    }
  }
  const set = await queryOne('SELECT * FROM flashcard_sets WHERE id = ?', [setId]);
  set.flashcards = await query('SELECT * FROM flashcards WHERE set_id = ?', [setId]);
  set.flashcard_count = set.flashcards.length;
  res.json(set);
});

app.delete('/api/flashcards/sets/:id', auth, async (req, res) => {
  await run('DELETE FROM flashcard_sets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  res.json({ success: true });
});

app.post('/api/flashcards/sets/:id/cards', auth, async (req, res) => {
  const { source_text, translated_text } = req.body;
  const cardId = await insert('INSERT INTO flashcards (set_id, source_text, translated_text) VALUES (?, ?, ?)', [Number(req.params.id), source_text, translated_text]);
  res.json({ id: cardId, source_text, translated_text, is_learned: false });
});

app.put('/api/flashcards/cards/:id/progress', auth, async (req, res) => {
  await run('UPDATE flashcards SET is_learned = ? WHERE id = ?', [req.body.is_learned ? 1 : 0, Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/books/upload', auth, upload.fields([{ name: 'file' }, { name: 'cover' }]), async (req, res) => {
  const { title, title_ta, author, author_ta, language, description, description_ta, category_id } = req.body;
  const fileUrl = req.files?.file?.[0] ? `/uploads/${req.files.file[0].filename}` : '';
  const coverUrl = req.files?.cover?.[0] ? `/uploads/${req.files.cover[0].filename}` : '';
  await insert('INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_url, cover_url, category_id, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [title || 'Untitled', title_ta, author, author_ta, language || 'ta', description, description_ta, fileUrl, coverUrl, category_id || null, req.user.id, 'pending_approval']);
  res.json({ id: 0, status: 'pending_approval', message: 'Book uploaded for review' });
});

app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  const total_users_r = await queryOne('SELECT COUNT(*) as c FROM users');
  const total_books_r = await queryOne('SELECT COUNT(*) as c FROM books');
  const active_users_r = await queryOne('SELECT COUNT(*) as c FROM users WHERE is_active = 1');
  const total_users = total_users_r ? total_users_r.c : 0;
  const total_books = total_books_r ? total_books_r.c : 0;
  const active_users = active_users_r ? active_users_r.c : 0;
  res.json({ total_users, total_books, active_users });
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  res.json(await query('SELECT id, username, email, full_name, is_superuser, is_active, created_at FROM users ORDER BY created_at DESC'));
});

app.post('/api/admin/users/:id/toggle-admin', auth, adminOnly, async (req, res) => {
  await run('UPDATE users SET is_superuser = CASE WHEN is_superuser THEN 0 ELSE 1 END WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/admin/users/:id/toggle-active', auth, adminOnly, async (req, res) => {
  await run('UPDATE users SET is_active = CASE WHEN is_active THEN 0 ELSE 1 END WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  await run('DELETE FROM users WHERE id = ? AND is_superuser = 0', [Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/admin/scrape-freetamilebooks', auth, adminOnly, async (req, res) => {
  res.json({ message: 'Scraping started' });
});

// ---- File Download ----
app.get('/api/books/:id/download', async (req, res) => {
  const book = await queryOne('SELECT * FROM books WHERE id = ?', [Number(req.params.id)]);
  if (!book) return res.status(404).json({ detail: 'Book not found' });
  await run('UPDATE books SET downloads_count = downloads_count + 1 WHERE id = ?', [Number(req.params.id)]);
  if (book.file_url && fs.existsSync(path.join(__dirname, book.file_url))) {
    res.download(path.join(__dirname, book.file_url));
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(book.content_text || book.description || 'Content not available');
  }
});

// ---- Search History ----
app.post('/api/search-history', auth, async (req, res) => {
  const { query: searchQuery, filters } = req.body;
  await insert('INSERT INTO search_history (user_id, query, filters) VALUES (?, ?, ?)', [req.user.id, searchQuery || '', JSON.stringify(filters || {})]);
  res.json({ success: true });
});

app.get('/api/search-history', auth, async (req, res) => {
  res.json(await query('SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]));
});

app.delete('/api/search-history', auth, async (req, res) => {
  await run('DELETE FROM search_history WHERE user_id = ?', [req.user.id]);
  res.json({ success: true });
});

// ---- Roles & Permissions ----
app.get('/api/admin/roles', auth, adminOnly, async (req, res) => {
  const roles = await query('SELECT * FROM roles');
  for (const role of roles) {
    role.permissions = JSON.parse(role.permissions || '[]');
    const countResult = await queryOne('SELECT COUNT(*) as c FROM user_roles WHERE role_id = ?', [role.id]);
    role.user_count = countResult ? countResult.c : 0;
  }
  res.json(roles);
});

app.post('/api/admin/roles', auth, adminOnly, async (req, res) => {
  const { name, permissions } = req.body;
  try {
    const id = await insert('INSERT INTO roles (name, permissions) VALUES (?, ?)', [name, JSON.stringify(permissions || [])]);
    res.json({ id, name, permissions: permissions || [] });
  } catch {
    res.status(400).json({ detail: 'Role name already exists' });
  }
});

app.put('/api/admin/roles/:id', auth, adminOnly, async (req, res) => {
  const { name, permissions } = req.body;
  await run('UPDATE roles SET name = COALESCE(?, name), permissions = COALESCE(?, permissions) WHERE id = ?', [name || null, permissions ? JSON.stringify(permissions) : null, Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/admin/roles/:id', auth, adminOnly, async (req, res) => {
  await run('DELETE FROM roles WHERE id = ? AND name != ?', [Number(req.params.id), 'admin']);
  res.json({ success: true });
});

app.get('/api/admin/users/:id/roles', auth, adminOnly, async (req, res) => {
  const roles = await query('SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [Number(req.params.id)]);
  res.json(roles);
});

app.post('/api/admin/users/:id/roles', auth, adminOnly, async (req, res) => {
  const { role_id } = req.body;
  try { await insert('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [Number(req.params.id), role_id]); } catch {}
  res.json({ success: true });
});

app.delete('/api/admin/users/:id/roles/:roleId', auth, adminOnly, async (req, res) => {
  await run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [Number(req.params.id), Number(req.params.roleId)]);
  res.json({ success: true });
});

// ---- Real OCR with Tesseract.js ----
app.post('/api/ocr/translate', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image uploaded' });
  try {
    const { data } = await Tesseract.recognize(req.file.path, 'tam+eng', { logger: () => {} });
    const extracted = data.text.trim() || 'No text detected in the image.';
    const translated = `[EN] ${extracted}`;
    await insert('INSERT INTO ocr_history (user_id, extracted_text, translated_text) VALUES (?, ?, ?)', [req.user.id, extracted, translated]);
    res.json({ extracted_text: extracted, translated_text: translated, confidence: data.confidence });
  } catch (err) {
    res.status(500).json({ detail: 'OCR processing failed', error: err.message });
  }
});

// ---- Real Audio Transcription (placeholder - uses mock) ----
app.post('/api/audio/transcribe', auth, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No audio uploaded' });
  const transcribed = 'Sample transcribed text from audio. இது ஒரு மாதிரி ஒலி பெயர்ப்பு.';
  const translated = 'This is the translated version of the audio content.';
  await insert('INSERT INTO audio_history (user_id, transcribed_text, translated_text) VALUES (?, ?, ?)', [req.user.id, transcribed, translated]);
  res.json({ transcribed_text: transcribed, translated_text: translated });
});

// ---- Bookmark with page/note support ----
app.post('/api/books/bookmarks', auth, async (req, res) => {
  const { book_id, page, note } = req.body;
  try {
    const id = await insert('INSERT INTO bookmarks (user_id, book_id, page, note) VALUES (?, ?, ?, ?)', [req.user.id, book_id, page || 0, note || '']);
    res.json({ id, success: true });
  } catch {
    res.status(400).json({ detail: 'Bookmark already exists' });
  }
});

app.delete('/api/books/bookmarks/:id', auth, async (req, res) => {
  await run('DELETE FROM bookmarks WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  res.json({ success: true });
});

app.get('/api/books/bookmarks/list', auth, async (req, res) => {
  res.json(await query('SELECT bk.*, b.title, b.title_ta FROM bookmarks bk JOIN books b ON bk.book_id = b.id WHERE bk.user_id = ? ORDER BY bk.created_at DESC', [req.user.id]));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ detail: 'Internal server error', error: err.message });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ detail: 'Not found' });
  res.status(404).json({ detail: 'Not found' });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`ETamil API server running on http://localhost:${PORT}`);
    console.log(`Admin login: admin / admin123`);
    console.log(`Demo login: demo / demo123`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
