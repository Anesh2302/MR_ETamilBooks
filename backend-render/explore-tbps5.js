const cheerio = require('cheerio');

async function main() {
  // Find last page from pagination on page 1
  console.log('=== Checking last page ===');
  
  // Binary search for last page
  let lo = 1, hi = 300;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    try {
      const r = await fetch(`https://tamilbookspdf.com/books/page/${mid}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      if (r.status === 200) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    } catch {
      hi = mid - 1;
    }
  }
  console.log(`Last page: ${lo}`);
  
  // Also check page 1 for last page link in pagination
  const r = await fetch('https://tamilbookspdf.com/books/', { signal: AbortSignal.timeout(15000) });
  const h = await r.text();
  const $ = cheerio.load(h);
  
  let lastPageNum = 0;
  $('a.page-numbers').each((i, el) => {
    const text = $(el).text().trim();
    const num = parseInt(text);
    if (!isNaN(num) && num > lastPageNum) lastPageNum = num;
  });
  console.log(`Last page from DOM: ${lastPageNum}`);
  
  // Check page 153 content
  console.log(`\n=== Page ${lo} ===`);
  const rLast = await fetch(`https://tamilbookspdf.com/books/page/${lo}/`, { signal: AbortSignal.timeout(15000) });
  const hLast = await rLast.text();
  const $last = cheerio.load(hLast);
  let count = 0;
  $last('article').each(() => count++);
  console.log(`Articles on last page: ${count}`);
  
  // Sample: extract links from last page
  let bookCount = 0;
  $last('a[href*="/books/"]').each((i, el) => {
    const href = $last(el).attr('href');
    const text = $last(el).text().trim();
    if (href && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      bookCount++;
      if (bookCount <= 3) console.log(`  ${text.slice(0,50)} -> ${href}`);
    }
  });
  console.log(`Book links on last page: ${bookCount}`);
  
  // Total estimate
  console.log(`\nTotal estimate: ${(lo - 1) * 30 + count} books`);
}

main().catch(console.error);
