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
const cheerio = require('cheerio');
const { initDB, query, queryOne, run, insert } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'production';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
const isVercel = !!process.env.VERCEL;

// --- Body parser ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Security headers ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// --- Compression ---
app.use(compression());

// --- Trust proxy (for Render / reverse proxy) ---
app.set('trust proxy', 1);

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
  if (!book.content_text) {
    book.content_text = book.language === 'ta'
      ? `${book.description_ta || book.description}\n\nஇது ஒரு மாதிரி உள்ளடக்கம். முழு புத்தகத்தையும் படிக்க விரைவில் கிடைக்கும்.`
      : `${book.description || book.description_ta}\n\nThis is sample content. Full book will be available soon.`;
  }
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

// Simple local translation fallback for common words/phrases
const LOCAL_TRANSLATIONS = {
    'ta': {
        'hello': 'வணக்கம்', 'welcome': 'வரவேற்கிறோம்', 'thank you': 'நன்றி',
        'good': 'நல்ல', 'book': 'புத்தகம்', 'books': 'புத்தகங்கள்',
        'read': 'படி', 'reading': 'படித்தல்', 'library': 'நூலகம்',
        'pdf': 'PDF', 'download': 'பதிவிறக்கம்', 'file': 'கோப்பு',
        'free': 'இலவசம்', 'education': 'கல்வி', 'story': 'கதை',
        'stories': 'கதைகள்', 'novel': 'நாவல்', 'poetry': 'கவிதை',
        'poem': 'கவிதை', 'history': 'வரலாறு', 'science': 'அறிவியல்',
        'children': 'குழந்தைகள்', 'religion': 'சமயம்', 'philosophy': 'தத்துவம்',
        'short': 'சிறிய', 'tamil': 'தமிழ்', 'english': 'ஆங்கிலம்',
        'author': 'ஆசிரியர்', 'category': 'வகை', 'search': 'தேடல்',
        'view': 'பார்வை', 'all': 'அனைத்தும்', 'more': 'மேலும்',
        'learn': 'கற்றல்', 'study': 'படிப்பு', 'knowledge': 'அறிவு',
    }
};

function localTranslate(text, targetLang) {
    if (targetLang !== 'ta') return null;
    const lower = text.toLowerCase().trim();
    if (LOCAL_TRANSLATIONS.ta[lower]) return LOCAL_TRANSLATIONS.ta[lower];
    // Try prefix matching
    for (const [en, ta] of Object.entries(LOCAL_TRANSLATIONS.ta)) {
        if (lower.startsWith(en) || lower.includes(en)) {
            return text.replace(new RegExp(en, 'gi'), ta);
        }
    }
    return null;
}

app.post('/api/translate/text', auth, [
  body('text').trim().isLength({ min: 1, max: 5000 }),
  body('source_language').optional().isLength({ min: 2, max: 10 }),
  body('target_language').optional().isLength({ min: 2, max: 10 }),
], validate, async (req, res) => {
  const { text, source_language, target_language } = req.body;
  const tl = target_language || 'en';
  try {
    let translated = null;
    let method = 'none';
    // Try local translation first (no network dependency)
    const local = localTranslate(text, tl);
    if (local) { translated = local; method = 'local'; }
    // Try MyMemory API with timeout
    if (!translated) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const r = await fetch(
          'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 500)) +
          '&langpair=' + (source_language || 'auto') + '|' + tl +
          '&de=simonpetercys@gmail.com',
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const j = await r.json();
        if (j.responseData && j.responseData.translatedText && j.responseData.translatedText !== text) {
          translated = j.responseData.translatedText;
          method = 'mymemory';
        }
      } catch {}
    }
    // Final fallback
    if (!translated) {
      translated = '[' + tl.toUpperCase() + '] ' + text;
      method = 'fallback';
    }
    await insert('INSERT INTO translate_history (user_id, source_text, translated_text, source_language, target_language) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, text, translated, source_language, tl]);
    res.json({ translated_text: translated, source_language, target_language: tl, method });
  } catch (e) {
    res.status(500).json({ detail: 'Translation failed: ' + e.message });
  }
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
  // Simple extractive summary: pick first few meaningful sentences
  let summary = '';
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length <= 3) {
    summary = text.slice(0, 300) + (text.length > 300 ? '...' : '');
  } else {
    const take = Math.min(3, Math.max(1, Math.ceil(sentences.length / 3)));
    // Pick first, middle, and last meaningful sentences for coverage
    const indices = [0, Math.floor(sentences.length / 2), sentences.length - 1].slice(0, take);
    summary = indices.map(i => sentences[i]).join('. ') + '.';
  }
  const compressionRatio = text.length > 0 ? Math.round((1 - summary.length / text.length) * 100) : 0;
  let translatedSummary = null;
  if (translate_to) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const r = await fetch(
        'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(summary.slice(0, 500)) +
        '&langpair=en|' + translate_to + '&de=simonpetercys@gmail.com',
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const j = await r.json();
      if (j.responseData && j.responseData.translatedText) translatedSummary = j.responseData.translatedText;
    } catch {}
    if (!translatedSummary) translatedSummary = '[' + translate_to.toUpperCase() + '] ' + summary;
  }
  await insert('INSERT INTO summarize_history (user_id, source_text, summary, compression_ratio) VALUES (?, ?, ?, ?)',
    [req.user.id, text, summary, compressionRatio]);
  res.json({
    original_summary: summary,
    translated_summary: translatedSummary,
    translated_language: translate_to || null,
    compression_ratio: compressionRatio,
    sentence_count: sentences.length,
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
    const fs = require('fs');
    const imagePath = req.file.path;
    if (!fs.existsSync(imagePath)) return res.status(400).json({ detail: 'Image file not found' });
    let extracted = '';
    let confidence = 0;
    try {
      const { data } = await getTesseract().recognize(imagePath, 'tam+eng', { logger: () => {} });
      extracted = (data.text || '').trim();
      confidence = data.confidence || 0;
    } catch (ocrErr) {
      extracted = '';
    }
    try { fs.unlinkSync(imagePath); } catch {}
    if (!extracted) {
      return res.json({ extracted_text: '', translated_text: '', confidence: 0, note: 'No text detected' });
    }
    const translated = await (async () => {
      try {
        const r = await fetch(
          'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(extracted.slice(0, 500)) +
          '&langpair=ta|en&de=simonpetercys@gmail.com',
          { signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 5000); return c.signal; })() }
        );
        const j = await r.json();
        if (j.responseData && j.responseData.translatedText) return j.responseData.translatedText;
      } catch {}
      return '[EN] ' + extracted;
    })();
    await insert('INSERT INTO ocr_history (user_id, extracted_text, translated_text) VALUES (?, ?, ?)',
      [req.user.id, extracted, translated]);
    res.json({ extracted_text: extracted, translated_text: translated, confidence });
  } catch (err) {
    res.status(500).json({ detail: 'OCR processing failed: ' + err.message });
  }
});

// --- Audio transcription ---
app.post('/api/audio/transcribe', auth, uploadLimiter, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No audio uploaded' });
  const fs = require('fs');
  const audioPath = req.file.path;
  try {
    // Audio transcription requires external API (Google/Azure/Whisper).
    // For now, return a placeholder with the filename info.
    const fileName = req.file.originalname || 'audio';
    const transcribed = '[Audio file: ' + fileName + '] Transcription requires a speech-to-text API key.';
    const translated = transcribed;
    await insert('INSERT INTO audio_history (user_id, transcribed_text, translated_text) VALUES (?, ?, ?)',
      [req.user.id, transcribed, translated]);
    res.json({ transcribed_text: transcribed, translated_text: translated, note: 'placeholder' });
  } catch (err) {
    res.status(500).json({ detail: 'Audio processing failed: ' + err.message });
  } finally {
    try { fs.unlinkSync(audioPath); } catch {}
  }
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

app.post('/api/admin/scrape-links', auth, adminOnly, async (req, res) => {
  try {
    const pageNum = req.body.page || 1;
    const url = pageNum === 1 ? 'https://freetamilebooks.com/ebooks/' : `https://freetamilebooks.com/ebooks/page/${pageNum}/`;
    const start = Date.now();
    const listRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const html = await listRes.text();
    const fetchMs = Date.now() - start;
    const $ = cheerio.load(html);
    const links = [];
    $('figure.wp-block-post-featured-image a[href*="/ebooks/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });
    res.json({ page: pageNum, links: [...new Set(links)], htmlLen: html.length, fetchMs });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

app.post('/api/admin/scrape-book', auth, adminOnly, async (req, res) => {
  try {
    const bookUrl = req.body.url;
    if (!bookUrl) return res.status(400).json({ detail: 'url required' });

    const r = await fetch(bookUrl, { signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    const $ = cheerio.load(html);

    const titleTa = $('h1').first().text().trim();
    if (!titleTa || titleTa === 'eBooks') return res.json({ added: false, reason: 'no title' });

    const existing = await queryOne('SELECT id FROM books WHERE title_ta = ?', [titleTa]);
    if (existing) return res.json({ added: false, reason: 'duplicate' });

    let descTa = '';
    $('p').each((i, el) => {
      const t = $(el).text().trim();
      if (t.length > 60 && t.length < 800 && !descTa && !t.startsWith('Download') && !t.startsWith('The post')) descTa = t;
    });

    let authorTa = 'Free Tamil Ebooks';
    const bt = $('body').text();
    const am = bt.match(/ஆசிரியர்[^:]*:\s*([^\n<]+)/i);
    if (am) authorTa = am[1].trim();

    const cats = [];
    $('.taxonomy-category a, .wp-block-post-terms a').each((i, el) => cats.push($(el).text().trim()));

    const BLOCKED = ['நாவல்', 'நகைச்சுவை', 'ஆன்மிகம்', 'குறும்பதிவு'];
    let blocked = false;
    for (const c of cats) for (const b of BLOCKED) if (c.includes(b)) blocked = true;
    if (blocked) return res.json({ added: false, reason: 'blocked category' });

    const CAT_MAP = {
      'அறிவியல்': 'Science', 'கல்வி': 'Education', 'இலக்கியம்': 'Tamil Literature',
      'கவிதைகள்': 'Poetry', 'வரலாறு': 'History', 'மெய்யியல்': 'Philosophy',
      'சிறுவர் நூல்கள்': 'Children', 'சிறுகதைகள்': 'Short Story',
      'தமிழ் சிறுகதைகள்': 'Short Story', 'கட்டுரைகள்': 'Tamil Literature',
      'தமிழ்': 'Tamil Literature', 'சமூகம்': 'Tamil Literature',
      'அரசியல்': 'Tamil Literature', 'வாழ்க்கை வரலாறு': 'History',
      'ஆளுமைகள்': 'Tamil Literature', 'கணினி': 'Science',
      'மொழிபெயர்ப்பு நூல்கள்': 'Tamil Literature', 'இணையம்': 'Science',
      'சட்டம்': 'Education', 'நுட்பம்': 'Science', 'நலம்': 'Education',
      'விளையாட்டு': 'Education', 'பயணம்': 'Tamil Literature',
      'நாடகங்கள்': 'Tamil Literature', 'தேர்ந்தெடுத்த நூல்கள்': 'Tamil Literature',
      'விருது வென்ற நூல்கள்': 'Tamil Literature', 'வரலாற்று நாவல்': 'History',
    };
    let mapped = null;
    for (const c of cats) for (const [ta, en] of Object.entries(CAT_MAP)) if (c.includes(ta)) { mapped = en; break; }
    if (!mapped) return res.json({ added: false, reason: 'no category match' });
    const catRow = await queryOne('SELECT id FROM categories WHERE name_en = ?', [mapped]);
    if (!catRow) return res.json({ added: false, reason: 'no category id' });

    let fileUrl = '';
    $('a.dlm-download-link').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      if (href && !fileUrl && (text.includes('A4 PDF') || text.includes('.pdf'))) fileUrl = href;
    });
    if (!fileUrl) {
      $('a.dlm-download-link').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !fileUrl) fileUrl = href;
      });
    }

    let coverUrl = '';
    $('img.wp-post-image, .wp-block-post-featured-image img').each((i, el) => {
      if (!coverUrl) coverUrl = $(el).attr('src') || '';
    });

    const slug = bookUrl.replace(/https:\/\/freetamilebooks\.com\/ebooks\//, '').replace(/\/$/, '');
    const titleEn = slug.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim() || titleTa;

    await insert(
      "INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, file_url, cover_url, category_id, uploaded_by, status, content_text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [titleEn, titleTa, authorTa, authorTa, 'ta', 'Educational Tamil book: ' + titleTa, descTa, 'pdf', fileUrl, coverUrl, Number(catRow.id), 1, 'approved', descTa || (titleTa + ' - ' + authorTa)]
    );
    res.json({ added: true, title: titleTa });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

// --- Category Tamil name mapping ---
const CATEGORY_TAMIL = {
    'Tamil Literature': 'தமிழ் இலக்கியம்',
    'Children': 'குழந்தைகள்',
    'Education': 'கல்வி',
    'History': 'வரலாறு',
    'Science': 'அறிவியல்',
    'Philosophy': 'தத்துவம்',
    'Religion': 'சமயம்',
    'Poetry': 'கவிதை',
    'Novel': 'நாவல்',
    'Short Story': 'சிறுகதை',
};

// --- tamilbookspdf.com scraper ---
const TBPS_GENRE_MAP = {
    'Novels': 'Novel', 'Short Stories': 'Short Story', 'Historical': 'History',
    'Fiction': 'Tamil Literature', 'Romantic': 'Novel', 'Adventure': 'Children',
    'Biography': 'History', "Children's Books": 'Children', "Children\u2019s Books": 'Children',
    'Classics': 'Tamil Literature', 'Education': 'Education', 'Fantasy': 'Children',
    'Health Books': 'Science', 'Horror Books': 'Novel', 'Mystery': 'Novel',
    'Philosophy': 'Philosophy', 'Poetry': 'Poetry', 'Poem': 'Poetry',
    'Politics': 'History', 'Religious': 'Religion', 'Science Books': 'Science',
    'Science Fiction': 'Science', 'Story Books': 'Short Story', 'Spiritual Books': 'Religion',
    'Tamil Kids Books': 'Children', 'Thriller': 'Novel',
};

const TBPS_KNOWN_AUTHORS = new Set([
    'Akila Govind', 'Amuthavalli Kalyanasundaram', 'Aruna Hari', 'Balakumaran',
    'B. Jeyamohan', 'Jayakanthan', 'Kalki Krishnamurthy', 'Kannadasan',
    'Madhan', 'Mythili Sampath', 'Na. Parthasarathy', 'Pattukkottai Prabakar',
    'Payon', 'Premalatha Balasubramaniam', 'Ponniyin Selvan', 'R Maheshwari',
    'Rajam Krishnan', 'Rajesh Kumar', 'Ramanichandran Novel', 'Sandilyan',
    'Subha', 'Subashree Krishnaveni', 'Sujatha Rangarajan', 'Uma Balakumar',
    'Uma Maheswari Krishnaswamy', 'Vaduvoor K.Duraiswamy Iyengar',
    'Viji Vignesh', 'Yaddanapudi Sulochana Rani', 'Muthulakshmi Raghavan Novels',
    'Periyar', 'Sujatha',
]);

async function getTbpsCategoryId(mapped) {
    const catRow = await queryOne('SELECT id FROM categories WHERE name_en = ?', [mapped]);
    if (catRow) return Number(catRow.id);
    const tamilName = CATEGORY_TAMIL[mapped] || mapped;
    const ins = await insert(
        "INSERT INTO categories (name, name_en, description, book_count) VALUES (?,?,?,0)",
        [tamilName, mapped, '']
    );
    return Number(ins);
}

app.post('/api/admin/tbps/scrape-page', auth, adminOnly, async (req, res) => {
    try {
        const page = req.body.page || 1;
        const listUrl = page === 1 ? 'https://tamilbookspdf.com/books/' : 'https://tamilbookspdf.com/books/page/' + page + '/';
        const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(15000) });
        const listHtml = await listRes.text();
        const $ = cheerio.load(listHtml);
        const bookLinks = [];
        $('a[href*="/books/"]').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && href.startsWith('https://tamilbookspdf.com/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
                if (!bookLinks.find(b => b.href === href)) bookLinks.push({ text, href });
            }
        });
        const results = { page, total: bookLinks.length, imported: 0, skipped: 0, errors: [] };
        for (const link of bookLinks) {
            try {
                const dup = await queryOne('SELECT id FROM books WHERE file_url = ?', [link.href]);
                if (dup) { results.skipped++; continue; }
                const bookRes = await fetch(link.href, { signal: AbortSignal.timeout(15000) });
                const bookHtml = await bookRes.text();
                const $b = cheerio.load(bookHtml);
                const title = $b('h1').first().text().trim();
                if (!title) { results.skipped++; continue; }
                const pdfMatch = bookHtml.match(/https?:\/\/dl\.tamilbookspdf\.com\/[^"'\s]+\.pdf/);
                const pdfUrl = pdfMatch ? pdfMatch[0] : '';
                if (!pdfUrl) { results.skipped++; continue; }
                const metaDesc = $b('meta[name="description"]').attr('content') || '';
                const authorMatch = title.match(/\s+By\s+(.+)$/i);
                const author = authorMatch ? authorMatch[1].trim() : '';
                const ogImage = $b('meta[property="og:image"]').attr('content') || '';
                let genre = 'Tamil Literature';
                $b('li.menu-item-type-taxonomy.menu-item-object-genres').each((i, el) => {
                    const cls = $b(el).attr('class') || '';
                    const text = $b(el).text().trim();
                    if ((cls.includes('current-menu-parent') || cls.includes('current-books-parent')) && text && !TBPS_KNOWN_AUTHORS.has(text)) {
                        genre = text; return false;
                    }
                });
                const mapped = TBPS_GENRE_MAP[genre] || 'Tamil Literature';
                const catId = await getTbpsCategoryId(mapped);
                const slug = link.href.replace('https://tamilbookspdf.com/books/', '').replace(/\/$/, '');
                const titleEn = slug.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() || title;
                await insert(
                    "INSERT INTO books (title, title_ta, author, language, description, file_type, file_url, cover_url, category_id, uploaded_by, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [titleEn, title, author, 'ta', metaDesc, 'pdf', pdfUrl, ogImage, catId, 1, 'approved']
                );
                await run('UPDATE categories SET book_count = (SELECT COUNT(*) FROM books WHERE category_id = ?) WHERE id = ?', [catId, catId]);
                results.imported++;
            } catch (e) {
                results.errors.push(link.href + ': ' + e.message);
            }
        }
        res.json(results);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

// --- DB cleanup & fix endpoint ---
app.post('/api/admin/db/cleanup', auth, adminOnly, async (req, res) => {
    try {
        const report = [];
        // 1. Fix categories that have English name instead of Tamil
        for (const [en, ta] of Object.entries(CATEGORY_TAMIL)) {
            const bad = await query('SELECT id, name FROM categories WHERE name_en = ? AND name != ?', [en, ta]);
            for (const row of bad) {
                await run('UPDATE categories SET name = ?, book_count = 0 WHERE id = ?', [ta, Number(row.id)]);
                report.push('Fixed category name: ' + row.name + ' -> ' + ta);
            }
        }
        // 2. Recalculate book_count for all categories
        const cats = await query('SELECT id FROM categories');
        for (const cat of cats) {
            const c = await queryOne('SELECT COUNT(*) as cnt FROM books WHERE category_id = ?', [Number(cat.id)]);
            await run('UPDATE categories SET book_count = ? WHERE id = ?', [c ? c.cnt : 0, Number(cat.id)]);
        }
        report.push('Updated book_count for ' + cats.length + ' categories');
        // 3. Fix books with null category_id - assign them
        const nullBooks = await query('SELECT id, title, file_url FROM books WHERE category_id IS NULL');
        if (nullBooks.length > 0) {
            const tlCat = await queryOne('SELECT id FROM categories WHERE name_en = ?', ['Tamil Literature']);
            if (tlCat) {
                await run('UPDATE books SET category_id = ? WHERE category_id IS NULL', [Number(tlCat.id)]);
                await run('UPDATE categories SET book_count = (SELECT COUNT(*) FROM books WHERE category_id = ?) WHERE id = ?', [Number(tlCat.id), Number(tlCat.id)]);
            }
            report.push('Fixed ' + nullBooks.length + ' books with null category_id');
        }
        // 4. Remove duplicate categories (same name_en)
        const dupes = await query("SELECT name_en, COUNT(*) as cnt, MIN(id) as keep_id FROM categories GROUP BY name_en HAVING cnt > 1");
        for (const d of dupes) {
            const rows = await query('SELECT id FROM categories WHERE name_en = ? AND id != ?', [d.name_en, Number(d.keep_id)]);
            for (const row of rows) {
                await run('UPDATE books SET category_id = ? WHERE category_id = ?', [Number(d.keep_id), Number(row.id)]);
                await run('DELETE FROM categories WHERE id = ?', [Number(row.id)]);
            }
            await run('UPDATE categories SET book_count = (SELECT COUNT(*) FROM books WHERE category_id = ?) WHERE id = ?', [Number(d.keep_id), Number(d.keep_id)]);
            report.push('Merged ' + (rows.length) + ' duplicate categories for ' + d.name_en);
        }
        res.json({ done: true, report });
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
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
