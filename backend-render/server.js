if (!process.env.VERCEL) require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param, query: queryValidator } = require('express-validator');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
let _Tesseract = null;
function getTesseract() { if (!_Tesseract) _Tesseract = require('tesseract.js'); return _Tesseract; }
const { initDB, query, queryOne, run, insert } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'production';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
const isVercel = !!process.env.VERCEL;

// --- Security headers ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// --- Compression ---
app.use(compression());

// --- Trust proxy (for Render / reverse proxy) ---
app.set('trust proxy', 1);

// --- Body size limit ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Secure CORS ---
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || NODE_ENV === 'development') return callback(null, true);
    if (CORS_ORIGINS.some(o => origin.startsWith(o))) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// --- Static files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Rate limiters ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many login attempts, try again later' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: 'Too many uploads, try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// --- File upload config ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) { /* read-only fs on Vercel */ }

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/epub+zip'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOC_EXT = ['.pdf', '.epub'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'cover') {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && ALLOWED_IMAGE_EXT.includes(ext)) return cb(null, true);
  } else if (file.fieldname === 'file') {
    if ((ALLOWED_DOC_TYPES.includes(file.mimetype) || ALLOWED_IMAGE_TYPES.includes(file.mimetype)) &&
        (ALLOWED_DOC_EXT.includes(ext) || ALLOWED_IMAGE_EXT.includes(ext))) return cb(null, true);
  } else if (file.fieldname === 'image') {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && ALLOWED_IMAGE_EXT.includes(ext)) return cb(null, true);
  } else if (file.fieldname === 'audio') {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) return cb(null, true);
  }
  cb(new Error(`File type ${file.mimetype} is not allowed`));
}

const upload = isVercel
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE }, fileFilter })
  : multer({ dest: UPLOAD_DIR, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// --- Input validation helpers ---
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ detail: 'Validation failed', errors: errors.array() });
  }
  next();
};

const sanitizeStr = (v) => typeof v === 'string' ? v.trim().slice(0, 2000) : v;

// --- Auth middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

async function adminOnly(req, res, next) {
  const user = await queryOne('SELECT is_superuser FROM users WHERE id = ?', [req.user.id]);
  if (!user || !user.is_superuser) return res.status(403).json({ detail: 'Admin only' });
  next();
}

// --- Auth routes ---
app.post('/api/auth/login', authLimiter, [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res) => {
  const { username, password } = req.body;
  const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  if (!user.is_active) {
    return res.status(403).json({ detail: 'Account is disabled' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      preferred_language: user.preferred_language,
      is_superuser: !!user.is_superuser,
    },
  });
});

app.post('/api/auth/register', authLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-30 alphanumeric characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').optional().trim().isLength({ max: 100 }).withMessage('Full name too long'),
], validate, async (req, res) => {
  const { username, email, password, full_name } = req.body;
  const exists = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (exists) return res.status(400).json({ detail: 'Username or email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const userId = await insert('INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)', [username, email, hash, full_name || '']);
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      preferred_language: user.preferred_language,
      is_superuser: false,
    },
  });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await queryOne('SELECT id, username, email, full_name, preferred_language, is_superuser FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ detail: 'User not found' });
  res.json({ data: user });
});

app.put('/api/auth/me', auth, [
  body('full_name').optional().trim().isLength({ max: 100 }),
  body('preferred_language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { full_name, preferred_language } = req.body;
  await run('UPDATE users SET full_name = COALESCE(?, full_name), preferred_language = COALESCE(?, preferred_language) WHERE id = ?', [full_name || null, preferred_language || null, req.user.id]);
  const user = await queryOne('SELECT id, username, email, full_name, preferred_language, is_superuser FROM users WHERE id = ?', [req.user.id]);
  res.json({ data: user });
});

// --- Books ---
app.get('/api/books/categories', async (req, res) => {
  res.json(await query('SELECT * FROM categories'));
});

app.get('/api/books', [
  queryValidator('category_id').optional().isInt(),
  queryValidator('language').optional().isLength({ min: 2, max: 10 }),
  queryValidator('search').optional().isLength({ max: 200 }),
], validate, async (req, res) => {
  let sql = 'SELECT * FROM books WHERE status = ?';
  const params = ['approved'];
  if (req.query.category_id) { sql += ' AND category_id = ?'; params.push(Number(req.query.category_id)); }
  if (req.query.language) { sql += ' AND language = ?'; params.push(req.query.language); }
  if (req.query.search) {
    const q = `%${req.query.search.slice(0, 200)}%`;
    sql += ' AND (title LIKE ? OR title_ta LIKE ? OR author LIKE ? OR author_ta LIKE ?)';
    params.push(q, q, q, q);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(await query(sql, params));
});

app.get('/api/books/:id', [
  param('id').isInt(),
], validate, async (req, res) => {
  const book = await queryOne('SELECT * FROM books WHERE id = ?', [Number(req.params.id)]);
  if (!book) return res.status(404).json({ detail: 'Book not found' });
  await run('UPDATE books SET views_count = views_count + 1 WHERE id = ?', [Number(req.params.id)]);
  book.views_count = (book.views_count || 0) + 1;
  book.content_text = 'Full book content would be displayed here.';
  res.json(book);
});

app.post('/api/books', auth, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), [
  body('title').trim().isLength({ min: 1, max: 500 }),
  body('language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { title, title_ta, author, author_ta, language, description, description_ta, category_id, file_type } = req.body;
  const fileUrl = req.files?.file?.[0] ? `/uploads/${req.files.file[0].filename}` : '';
  const coverUrl = req.files?.cover?.[0] ? `/uploads/${req.files.cover[0].filename}` : '';
  await insert('INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, file_url, cover_url, category_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sanitizeStr(title), sanitizeStr(title_ta), sanitizeStr(author), sanitizeStr(author_ta), language || 'ta', sanitizeStr(description), sanitizeStr(description_ta), file_type || 'pdf', fileUrl, coverUrl, category_id || null, req.user.id]);
  res.json({ id: 0, success: true, message: 'Book uploaded' });
});

app.get('/api/books/progress/list', auth, async (req, res) => {
  const progress = await query('SELECT rp.*, b.title, b.title_ta, b.file_type FROM reading_progress rp JOIN books b ON rp.book_id = b.id WHERE rp.user_id = ? ORDER BY rp.updated_at DESC', [req.user.id]);
  res.json(progress);
});

app.put('/api/books/progress', auth, [
  body('book_id').isInt(),
  body('page').optional().isInt({ min: 0 }),
  body('progress').optional().isFloat({ min: 0, max: 100 }),
], validate, async (req, res) => {
  const { book_id, page, progress } = req.body;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    await insert('INSERT INTO reading_progress (user_id, book_id, page, progress, updated_at) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, book_id, page || 0, progress || 0, now]);
  } catch {
    await run('UPDATE reading_progress SET page = ?, progress = ?, updated_at = ? WHERE user_id = ? AND book_id = ?',
      [page || 0, progress || 0, now, req.user.id, book_id]);
  }
  res.json({ success: true });
});

// --- Book upload (separate endpoint for admin) ---
app.post('/api/books/upload', auth, uploadLimiter, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), [
  body('title').optional().trim().isLength({ max: 500 }),
], validate, async (req, res) => {
  const { title, title_ta, author, author_ta, language, description, description_ta, category_id } = req.body;
  const fileUrl = req.files?.file?.[0] ? `/uploads/${req.files.file[0].filename}` : '';
  const coverUrl = req.files?.cover?.[0] ? `/uploads/${req.files.cover[0].filename}` : '';
  await insert('INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_url, cover_url, category_id, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sanitizeStr(title) || 'Untitled', sanitizeStr(title_ta), sanitizeStr(author), sanitizeStr(author_ta), language || 'ta', sanitizeStr(description), sanitizeStr(description_ta), fileUrl, coverUrl, category_id || null, req.user.id, 'pending_approval']);
  res.json({ id: 0, status: 'pending_approval', message: 'Book uploaded for review' });
});

app.get('/api/books/:id/download', [
  param('id').isInt(),
], validate, async (req, res) => {
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

// --- Translate ---
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

app.post('/api/translate/text', auth, [
  body('text').trim().isLength({ min: 1, max: 5000 }),
  body('source_language').optional().isLength({ min: 2, max: 10 }),
  body('target_language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { text, source_language, target_language } = req.body;
  let translated;
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source_language || 'auto'}|${target_language || 'en'}`);
    const j = await r.json();
    translated = j.responseData?.translatedText || `[${target_language?.toUpperCase()}] ${text}`;
  } catch {
    translated = `[${target_language?.toUpperCase()}] ${text}`;
  }
  await insert('INSERT INTO translate_history (user_id, source_text, translated_text, source_language, target_language) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, text, translated, source_language, target_language]);
  res.json({ translated_text: translated, source_language, target_language });
});

app.post('/api/translate/detect', (req, res) => {
  res.json({ detected_language: 'ta', confidence: 0.95 });
});

app.get('/api/translate/history', auth, async (req, res) => {
  res.json(await query('SELECT * FROM translate_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]));
});

// --- TTS ---
app.post('/api/tts/synthesize', auth, [
  body('text').trim().isLength({ min: 1, max: 5000 }),
  body('language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { text, language } = req.body;
  const fileUrl = '/static/tts/sample.mp3';
  await insert('INSERT INTO tts_history (user_id, text, language, audio_url) VALUES (?, ?, ?, ?)',
    [req.user.id, text, language, fileUrl]);
  res.json({ file_url: fileUrl, duration_seconds: 5.2 });
});

// --- Summarize ---
app.post('/api/summarize', auth, [
  body('text').trim().isLength({ min: 1, max: 10000 }),
  body('translate_to').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { text, translate_to } = req.body;
  const summary = 'This is a concise AI-generated summary of the provided text.';
  const translatedSummary = translate_to ? 'இது வழங்கப்பட்ட உரையின் சுருக்கமான சுருக்கம்.' : null;
  await insert('INSERT INTO summarize_history (user_id, source_text, summary, compression_ratio) VALUES (?, ?, ?, ?)',
    [req.user.id, text, summary, 35]);
  res.json({
    original_summary: summary,
    translated_summary: translatedSummary,
    translated_language: translate_to || null,
    compression_ratio: 35,
    sentence_count: text ? text.split(/[.!?]+/).length : 0,
  });
});

// --- Flashcards ---
app.get('/api/flashcards/sets', auth, async (req, res) => {
  const sets = await query('SELECT fs.*, (SELECT COUNT(*) FROM flashcards WHERE set_id = fs.id) as flashcard_count FROM flashcard_sets fs WHERE fs.user_id = ? ORDER BY fs.created_at DESC', [req.user.id]);
  res.json(sets);
});

app.get('/api/flashcards/sets/:id', auth, [
  param('id').isInt(),
], validate, async (req, res) => {
  const set = await queryOne('SELECT * FROM flashcard_sets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!set) return res.status(404).json({ detail: 'Set not found' });
  set.flashcards = await query('SELECT * FROM flashcards WHERE set_id = ?', [set.id]);
  set.flashcard_count = set.flashcards.length;
  res.json(set);
});

app.post('/api/flashcards/sets', auth, [
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('source_language').optional().isLength({ min: 2, max: 10 }),
  body('target_language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { name, source_language, target_language, description, flashcards } = req.body;
  const setId = await insert('INSERT INTO flashcard_sets (user_id, name, source_language, target_language, description) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, sanitizeStr(name), source_language || 'ta', target_language || 'en', sanitizeStr(description) || '']);
  if (flashcards && Array.isArray(flashcards) && flashcards.length <= 500) {
    for (const card of flashcards) {
      await insert('INSERT INTO flashcards (set_id, source_text, translated_text) VALUES (?, ?, ?)',
        [setId, sanitizeStr(card.source_text) || '', sanitizeStr(card.translated_text) || '']);
    }
  }
  const set = await queryOne('SELECT * FROM flashcard_sets WHERE id = ?', [setId]);
  set.flashcards = await query('SELECT * FROM flashcards WHERE set_id = ?', [setId]);
  set.flashcard_count = set.flashcards.length;
  res.json(set);
});

app.delete('/api/flashcards/sets/:id', auth, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('DELETE FROM flashcard_sets WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  res.json({ success: true });
});

app.post('/api/flashcards/sets/:id/cards', auth, [
  param('id').isInt(),
  body('source_text').trim().isLength({ min: 1, max: 1000 }),
  body('translated_text').trim().isLength({ min: 1, max: 1000 }),
], validate, async (req, res) => {
  const { source_text, translated_text } = req.body;
  const cardId = await insert('INSERT INTO flashcards (set_id, source_text, translated_text) VALUES (?, ?, ?)',
    [Number(req.params.id), sanitizeStr(source_text), sanitizeStr(translated_text)]);
  res.json({ id: cardId, source_text, translated_text, is_learned: false });
});

app.put('/api/flashcards/cards/:id/progress', auth, [
  param('id').isInt(),
  body('is_learned').isBoolean(),
], validate, async (req, res) => {
  await run('UPDATE flashcards SET is_learned = ? WHERE id = ?', [req.body.is_learned ? 1 : 0, Number(req.params.id)]);
  res.json({ success: true });
});

// --- OCR ---
app.post('/api/ocr/translate', auth, uploadLimiter, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No image uploaded' });
  try {
    const { data } = await getTesseract().recognize(req.file.path, 'tam+eng', { logger: () => {} });
    const extracted = (data.text || '').trim();
    const translated = extracted ? `[EN] ${extracted}` : 'No text detected in the image.';
    await insert('INSERT INTO ocr_history (user_id, extracted_text, translated_text) VALUES (?, ?, ?)',
      [req.user.id, extracted, translated]);
    res.json({ extracted_text: extracted, translated_text: translated, confidence: data.confidence || 0 });
  } catch (err) {
    res.status(500).json({ detail: 'OCR processing failed' });
  }
});

// --- Audio transcription ---
app.post('/api/audio/transcribe', auth, uploadLimiter, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No audio uploaded' });
  const transcribed = 'Sample transcribed text from audio. இது ஒரு மாதிரி ஒலி பெயர்ப்பு.';
  const translated = 'This is the translated version of the audio content.';
  await insert('INSERT INTO audio_history (user_id, transcribed_text, translated_text) VALUES (?, ?, ?)',
    [req.user.id, transcribed, translated]);
  res.json({ transcribed_text: transcribed, translated_text: translated });
});

// --- Bookmarks ---
app.post('/api/books/bookmarks', auth, [
  body('book_id').isInt(),
  body('page').optional().isInt({ min: 0 }),
  body('note').optional().trim().isLength({ max: 500 }),
], validate, async (req, res) => {
  const { book_id, page, note } = req.body;
  try {
    const id = await insert('INSERT INTO bookmarks (user_id, book_id, page, note) VALUES (?, ?, ?, ?)',
      [req.user.id, book_id, page || 0, sanitizeStr(note) || '']);
    res.json({ id, success: true });
  } catch {
    res.status(400).json({ detail: 'Bookmark already exists' });
  }
});

app.delete('/api/books/bookmarks/:id', auth, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('DELETE FROM bookmarks WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  res.json({ success: true });
});

app.get('/api/books/bookmarks/list', auth, async (req, res) => {
  res.json(await query('SELECT bk.*, b.title, b.title_ta FROM bookmarks bk JOIN books b ON bk.book_id = b.id WHERE bk.user_id = ? ORDER BY bk.created_at DESC', [req.user.id]));
});

// --- Search history ---
app.post('/api/search-history', auth, [
  body('query').trim().isLength({ max: 500 }),
], validate, async (req, res) => {
  const { query: searchQuery, filters } = req.body;
  await insert('INSERT INTO search_history (user_id, query, filters) VALUES (?, ?, ?)',
    [req.user.id, sanitizeStr(searchQuery) || '', JSON.stringify(filters || {})]);
  res.json({ success: true });
});

app.get('/api/search-history', auth, async (req, res) => {
  res.json(await query('SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]));
});

app.delete('/api/search-history', auth, async (req, res) => {
  await run('DELETE FROM search_history WHERE user_id = ?', [req.user.id]);
  res.json({ success: true });
});

// --- Admin routes ---
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

app.post('/api/admin/users/:id/toggle-admin', auth, adminOnly, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('UPDATE users SET is_superuser = CASE WHEN is_superuser THEN 0 ELSE 1 END WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/admin/users/:id/toggle-active', auth, adminOnly, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('UPDATE users SET is_active = CASE WHEN is_active THEN 0 ELSE 1 END WHERE id = ?', [Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', auth, adminOnly, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('DELETE FROM users WHERE id = ? AND is_superuser = 0', [Number(req.params.id)]);
  res.json({ success: true });
});

app.post('/api/admin/scrape-freetamilebooks', auth, adminOnly, async (req, res) => {
  res.json({ message: 'Scraping started' });
});

// --- Admin roles ---
app.get('/api/admin/roles', auth, adminOnly, async (req, res) => {
  const roles = await query('SELECT * FROM roles');
  for (const role of roles) {
    role.permissions = JSON.parse(role.permissions || '[]');
    const countResult = await queryOne('SELECT COUNT(*) as c FROM user_roles WHERE role_id = ?', [role.id]);
    role.user_count = countResult ? countResult.c : 0;
  }
  res.json(roles);
});

app.post('/api/admin/roles', auth, adminOnly, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('permissions').optional().isArray(),
], validate, async (req, res) => {
  const { name, permissions } = req.body;
  try {
    const id = await insert('INSERT INTO roles (name, permissions) VALUES (?, ?)', [name, JSON.stringify(permissions || [])]);
    res.json({ id, name, permissions: permissions || [] });
  } catch {
    res.status(400).json({ detail: 'Role name already exists' });
  }
});

app.put('/api/admin/roles/:id', auth, adminOnly, [
  param('id').isInt(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('permissions').optional().isArray(),
], validate, async (req, res) => {
  const { name, permissions } = req.body;
  await run('UPDATE roles SET name = COALESCE(?, name), permissions = COALESCE(?, permissions) WHERE id = ?',
    [name || null, permissions ? JSON.stringify(permissions) : null, Number(req.params.id)]);
  res.json({ success: true });
});

app.delete('/api/admin/roles/:id', auth, adminOnly, [
  param('id').isInt(),
], validate, async (req, res) => {
  await run('DELETE FROM roles WHERE id = ? AND name != ?', [Number(req.params.id), 'admin']);
  res.json({ success: true });
});

app.get('/api/admin/users/:id/roles', auth, adminOnly, [
  param('id').isInt(),
], validate, async (req, res) => {
  const roles = await query('SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [Number(req.params.id)]);
  res.json(roles);
});

app.post('/api/admin/users/:id/roles', auth, adminOnly, [
  param('id').isInt(),
  body('role_id').isInt(),
], validate, async (req, res) => {
  const { role_id } = req.body;
  try { await insert('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [Number(req.params.id), role_id]); } catch {}
  res.json({ success: true });
});

app.delete('/api/admin/users/:id/roles/:roleId', auth, adminOnly, [
  param('id').isInt(),
  param('roleId').isInt(),
], validate, async (req, res) => {
  await run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [Number(req.params.id), Number(req.params.roleId)]);
  res.json({ success: true });
});

// --- Error handler ---
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ detail: 'Request body too large' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ detail: 'File too large (max 10MB)' });
  }
  if (err.message && err.message.includes('File type')) {
    return res.status(415).json({ detail: err.message });
  }
  console.error('Server error:', NODE_ENV === 'development' ? err : err.message);
  res.status(err.status || 500).json({
    detail: 'Internal server error',
    ...(NODE_ENV === 'development' ? { error: err.message } : {}),
  });
});

// --- 404 handler ---
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ detail: 'Not found' });
  res.status(404).json({ detail: 'Not found' });
});

// --- Start (only in non-Vercel environments) ---
if (!isVercel) {
  (async () => {
    try {
      await initDB();
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`ETamil API server running on port ${PORT}`);
        console.log(`Environment: ${NODE_ENV}`);
        console.log(`CORS origins: ${CORS_ORIGINS.join(', ')}`);
      });
    } catch (err) {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    }
  })();
}

// --- Vercel export ---
module.exports = app;
