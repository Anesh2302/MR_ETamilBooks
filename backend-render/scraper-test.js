// Quick test: scrape just page 1 and insert a few books
const { createClient } = require('@libsql/client/http');
const cheerio = require('cheerio');
require('dotenv').config();

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

const BLOCKED = ['நாவல்', 'நகைச்சுவை', 'ஆன்மிகம்', 'குறும்பதிவு'];

async function getCatId(nameEn) {
  const r = await client.execute({ sql: "SELECT id FROM categories WHERE name_en = ?", args: [nameEn] });
  return r.rows && r.rows[0] ? Number(r.rows[0].id) : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Test Scraper (page 1 only) ===\n');
  
  const res = await fetch('https://freetamilebooks.com/ebooks/');
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const links = [];
  $('figure.wp-block-post-featured-image a[href*="/ebooks/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href);
  });
  
  console.log('Found ' + links.length + ' book links on page 1\n');
  
  let added = 0;
  for (let i = 0; i < Math.min(3, links.length); i++) {
    const link = links[i];
    console.log('--- Book ' + (i+1) + ' ---');
    console.log('URL: ' + link);
    
    await sleep(1000);
    try {
      const r2 = await fetch(link, { signal: AbortSignal.timeout(15000) });
      const h2 = await r2.text();
      const $2 = cheerio.load(h2);
      
      const titleTa = $2('h1').first().text().trim();
      console.log('Title: ' + titleTa);
      
      let descTa = '';
      $2('p').each((i, el) => {
        const t = $2(el).text().trim();
        if (t.length > 60 && t.length < 800 && !descTa && !t.startsWith('Download') && !t.startsWith('The post')) descTa = t;
      });
      console.log('Desc: ' + (descTa ? descTa.slice(0, 80) + '...' : 'NONE'));
      
      let authorTa = 'Free Tamil Ebooks';
      const bt = $2('body').text();
      const am = bt.match(/ஆசிரியர்[^:]*:\s*([^\n<]+)/i);
      if (am) authorTa = am[1].trim();
      console.log('Author: ' + authorTa);
      
      const cats = [];
      $2('.taxonomy-category a, .wp-block-post-terms a').each((i, el) => cats.push($2(el).text().trim()));
      console.log('Cats: ' + cats.join(', '));
      
      let fileUrl = '';
      $2('a[href]').each((i, el) => {
        const href = $2(el).attr('href');
        if (href && href.endsWith('.pdf') && !fileUrl) {
          fileUrl = href.startsWith('http') ? href : 'https://freetamilebooks.com' + (href.startsWith('/') ? '' : '/') + href;
        }
      });
      console.log('PDF URL: ' + (fileUrl || 'None'));
      
    } catch (e) {
      console.log('Error: ' + e.message.slice(0, 80));
    }
    console.log('');
  }
}

run().catch(console.error);
