// Scraper for freetamilebooks.com - run: node scraper.js
const { createClient } = require('@libsql/client/http');
const cheerio = require('cheerio');

const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

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

const BLOCKED_CATS = ['நாவல்', 'நகைச்சுவை', 'ஆன்மிகம்', 'குறும்பதிவு'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getCatId(nameEn) {
  const r = await client.execute({ sql: "SELECT id FROM categories WHERE name_en = ?", args: [nameEn] });
  return r.rows && r.rows[0] ? Number(r.rows[0].id) : null;
}

async function scrapeBook(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const $ = cheerio.load(html);

    const titleTa = $('h1').first().text().trim();
    if (!titleTa || titleTa === 'eBooks') return null;

    // Description
    let descTa = '';
    $('p').each((i, el) => {
      const t = $(el).text().trim();
      if (t.length > 60 && t.length < 800 && !descTa && !t.startsWith('Download') && !t.startsWith('The post')) descTa = t;
    });

    // Author
    let authorTa = 'Free Tamil Ebooks';
    const bodyText = $('body').text();
    const am = bodyText.match(/ஆசிரியர்[^:]*:\s*([^\n<]+)/i);
    if (am) authorTa = am[1].trim();

    // Categories from the post meta
    const cats = [];
    $('.taxonomy-category a, .wp-block-post-terms a').each((i, el) => cats.push($(el).text().trim()));

    // Filter blocked categories
    for (const c of cats) for (const b of BLOCKED_CATS) if (c.includes(b)) return null;

    // Map to our categories
    let mapped = null;
    for (const c of cats) {
      for (const [ta, en] of Object.entries(CAT_MAP)) {
        if (c.includes(ta)) { mapped = en; break; }
      }
      if (mapped) break;
    }
    if (!mapped) return null;
    const catId = await getCatId(mapped);
    if (!catId) return null;

    // Download URL from Download Manager buttons
    let fileUrl = '';
    $('a.dlm-download-link').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      if (href && !fileUrl) {
        if (text.includes('A4 PDF') || text.includes('a4 pdf')) {
          fileUrl = href;
        }
      }
    });
    // Fallback: any PDF link
    if (!fileUrl) {
      $('a.dlm-download-link').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text();
        if (href && !fileUrl && text.includes('.pdf')) fileUrl = href;
      });
    }
    // Last fallback: any download link
    if (!fileUrl) {
      $('a.dlm-download-link').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !fileUrl) fileUrl = href;
      });
    }

    // Cover image
    let coverUrl = '';
    $('img.wp-post-image, .wp-block-post-featured-image img').each((i, el) => {
      if (!coverUrl) coverUrl = $(el).attr('src') || '';
    });

    const slug = url.replace(/https:\/\/freetamilebooks\.com\/ebooks\//, '').replace(/\/$/, '');
    const titleEn = slug.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim() || titleTa;

    return {
      title: titleEn,
      titleTa,
      author: authorTa,
      authorTa,
      descTa,
      descEn: 'Educational Tamil book: ' + titleTa,
      catId,
      fileUrl,
      coverUrl,
      contentText: descTa || (titleTa + ' - ' + authorTa),
    };
  } catch (e) {
    console.error('  SCRAPE ERR: ' + e.message.slice(0, 80));
    return null;
  }
}

async function getPageLinks(pageNum) {
  const url = pageNum === 1 ? 'https://freetamilebooks.com/ebooks/' : 'https://freetamilebooks.com/ebooks/page/' + pageNum + '/';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = [];
    $('figure.wp-block-post-featured-image a[href*="/ebooks/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });
    return [...new Set(links)];
  } catch (e) {
    console.error('  PAGE ERR: ' + e.message.slice(0, 60));
    return [];
  }
}

async function main() {
  console.log('=== freetamilebooks.com Scraper ===\n');
  const r = await client.execute({ sql: "SELECT title FROM books", args: [] });
  const existing = new Set(r.rows.map(r => r.title));
  console.log('Existing books in DB: ' + existing.size);

  const MAX_PAGES = 57;
  let added = 0;
  for (let p = 1; p <= MAX_PAGES; p++) {
    console.log('\n--- Page ' + p + '/' + MAX_PAGES + ' ---');
    const links = await getPageLinks(p);
    console.log('  Books: ' + links.length);

    for (const link of links) {
      await sleep(800);
      const book = await scrapeBook(link);
      if (!book) continue;
      if (existing.has(book.title)) continue;

      try {
        await client.execute({
          sql: "INSERT INTO books (title, title_ta, author, author_ta, language, description, description_ta, file_type, file_url, cover_url, category_id, uploaded_by, status, content_text) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          args: [book.title, book.titleTa, book.author, book.authorTa, 'ta', book.descEn, book.descTa, 'pdf', book.fileUrl, book.coverUrl, book.catId, 1, 'approved', book.contentText]
        });
        added++;
        existing.add(book.title);
        console.log('  + [' + added + '] ' + book.titleTa);
      } catch (e) {
        console.error('  DB ERR: ' + e.message.slice(0, 60));
      }
    }
    await sleep(1000);
  }
  console.log('\n=== Done! Added ' + added + ' books ===');
}

main().catch(console.error);
