require('dotenv').config();
const { createClient } = require('@libsql/client/http');
const cheerio = require('cheerio');

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN;

if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
  console.error('Missing TURSO_DB_URL or TURSO_DB_TOKEN');
  process.exit(1);
}

const turso = createClient({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN });

// Genre mapping from tamilbookspdf.com genres -> DB categories
const GENRE_MAP = {
  'Novels': 'Novel',
  'Short Stories': 'Short Story',
  'Historical': 'History',
  'Fiction': 'Tamil Literature',
  'Romantic': 'Novel',
  'Adventure': 'Children',
  'Biography': 'History',
  "Children's Books": 'Children',
  "Children’s Books": 'Children',
  'Classics': 'Tamil Literature',
  'Education': 'Education',
  'Fantasy': 'Children',
  'Health Books': 'Science',
  'Horror Books': 'Novel',
  'Mystery': 'Novel',
  'Philosophy': 'Philosophy',
  'Poetry': 'Poetry',
  'Poem': 'Poetry',
  'Politics': 'History',
  'Religious': 'Religion',
  'Science Books': 'Science',
  'Science Fiction': 'Science',
  'Story Books': 'Short Story',
  'Spiritual Books': 'Religion',
  'Tamil Kids Books': 'Children',
  'Thriller': 'Novel',
};

// Known authors (genres that are actually authors)
const KNOWN_AUTHORS = new Set([
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

async function getOrCreateGenre(genreName) {
  const mapped = GENRE_MAP[genreName] || 'Tamil Literature';
  // Check if category exists
  const existing = await turso.execute({
    sql: 'SELECT id FROM categories WHERE name_en = ?',
    args: [mapped]
  });
  if (existing.rows.length > 0) return existing.rows[0].id;
  // Create it
  const ins = await turso.execute({
    sql: 'INSERT INTO categories (name, name_en, description, book_count) VALUES (?, ?, ?, 0)',
    args: [mapped, mapped, '']
  });
  return Number(ins.lastInsertRowid);
}

function extractAuthorFromTitle(title) {
  // Pattern: "... By AuthorName" at the end
  const match = title.match(/\s+By\s+(.+)$/i);
  if (match) return match[1].trim();
  return '';
}

function extractPdfUrl(html) {
  // Find all dl.tamilbookspdf.com PDF URLs
  const regex = /https?:\/\/dl\.tamilbookspdf\.com\/[^"'\s]+\.pdf/g;
  const matches = html.match(regex);
  if (!matches || matches.length === 0) return '';
  // Return the first unique one
  return matches[0];
}

function extractDescription($) {
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc && metaDesc.length > 30) return metaDesc.trim();
  // Fallback: first long paragraph in content
  const firstP = $('.wp-content p').first().text().trim();
  if (firstP && firstP.length > 30) return firstP;
  return '';
}

async function scrapeBookPage(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const $ = cheerio.load(html);
  
  const title = $('h1').first().text().trim();
  if (!title) return null;
  
  const pdfUrl = extractPdfUrl(html);
  // Skip if no PDF
  if (!pdfUrl) {
    console.log(`  SKIP (no PDF): ${title}`);
    return null;
  }
  
  const description = extractDescription($);
  const author = extractAuthorFromTitle(title);
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  
  // Extract genre from nav menu
  let genre = 'Tamil Literature';
  $('li.menu-item-type-taxonomy.menu-item-object-genres').each((i, el) => {
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim();
    if ((cls.includes('current-menu-parent') || cls.includes('current-books-parent')) && text) {
      // Skip if it's an author name
      if (!KNOWN_AUTHORS.has(text)) {
        genre = text;
        return false; // break
      }
    }
  });
  
  const categoryId = await getOrCreateGenre(genre);
  
  return { title, description, author, pdfUrl, ogImage, categoryId, sourceUrl: url, genre };
}

async function scrapePage(pageNum) {
  const url = pageNum === 1 
    ? 'https://tamilbookspdf.com/books/' 
    : `https://tamilbookspdf.com/books/page/${pageNum}/`;
  
  console.log(`\n--- Page ${pageNum}: ${url} ---`);
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const $ = cheerio.load(html);
  
  // Extract book links
  const bookLinks = [];
  $('a[href*="/books/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && href.startsWith('https://tamilbookspdf.com/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      // Deduplicate by URL
      if (!bookLinks.find(b => b.href === href)) {
        bookLinks.push({ text, href });
      }
    }
  });
  
  console.log(`Found ${bookLinks.length} book links`);
  return bookLinks;
}

async function isDuplicate(sourceUrl) {
  const r = await turso.execute({
    sql: 'SELECT id FROM books WHERE file_url = ? LIMIT 1',
    args: [sourceUrl]
  });
  return r.rows.length > 0;
}

async function insertBook(book) {
  const r = await turso.execute({
    sql: `INSERT INTO books 
      (title, description, author, file_url, cover_url, category_id, language, price) 
      VALUES (?, ?, ?, ?, ?, ?, 'tamil', 'free')`,
    args: [book.title, book.description || '', book.author || '', book.pdfUrl, book.ogImage || '', book.categoryId]
  });
  return Number(r.lastInsertRowid);
}

async function main() {
  const START_PAGE = parseInt(process.env.START_PAGE) || 1;
  const END_PAGE = parseInt(process.env.END_PAGE) || 153;
  const DELAY_MS = parseInt(process.env.DELAY_MS) || 500;
  
  console.log(`Starting scrape from page ${START_PAGE} to ${END_PAGE}`);
  console.log(`Delay: ${DELAY_MS}ms between books, 1000ms between pages`);
  
  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let page = START_PAGE; page <= END_PAGE; page++) {
    try {
      const bookLinks = await scrapePage(page);
      
      for (const link of bookLinks) {
        // Check duplicate
        const dup = await isDuplicate(link.href);
        if (dup) {
          console.log(`  DUP: ${link.text.slice(0, 50)}`);
          totalSkipped++;
          continue;
        }
        
        try {
          const book = await scrapeBookPage(link.href);
          if (!book) {
            totalSkipped++;
            continue;
          }
          
          const id = await insertBook(book);
          totalImported++;
          console.log(`  OK: ${book.title.slice(0, 50)} (id=${id}, genre=${book.genre})`);
          
          // Delay between books
          await new Promise(r => setTimeout(r, DELAY_MS));
        } catch (err) {
          totalErrors++;
          console.log(`  ERR: ${link.text.slice(0, 50)} - ${err.message}`);
        }
      }
      
      console.log(`Page ${page} done. Total: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
      
      // Delay between pages
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Page ${page} failed: ${err.message}`);
      totalErrors++;
    }
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Imported: ${totalImported}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
}

main().catch(console.error);
