const cheerio = require('cheerio');

async function main() {
  // Check page 2 more carefully - maybe different HTML structure
  console.log('=== Page 2 detailed ===');
  const r1 = await fetch('https://tamilbookspdf.com/books/page/2/', { signal: AbortSignal.timeout(15000) });
  const h1 = await r1.text();
  const $1 = cheerio.load(h1);
  
  // Check all links
  let bookCount = 0;
  $1('a').each((i, el) => {
    const href = $1(el).attr('href');
    const text = $1(el).text().trim();
    if (href && href.includes('/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      bookCount++;
      if (bookCount <= 3) console.log(`  ${text.slice(0,60)} -> ${href}`);
    }
  });
  console.log(`Total book links: ${bookCount}`);
  
  // Check title/h1
  console.log('Title:', $1('title').text());
  
  // Check if there's content
  console.log('Content length:', h1.length);
  console.log('Has books class:', $1('.books, .book-list, .posts, .entry').length > 0);
  
  // Check what articles exist
  console.log('Articles:', $1('article').length);
  console.log('Posts:', $1('.post').length);
  
  // Check pagination links
  console.log('\nPagination links:');
  $1('.pagination a, .page-numbers a, a.page-numbers, .next, .prev').each((i, el) => {
    console.log(`  ${$1(el).text().trim()} -> ${$1(el).attr('href')}`);
  });
  
  // Check if page 1 has pagination to understand URL structure
  console.log('\n=== Page 1 pagination ===');
  const r2 = await fetch('https://tamilbookspdf.com/books/', { signal: AbortSignal.timeout(15000) });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  
  $2('.pagination a, .page-numbers a, a.page-numbers, .next, .prev').each((i, el) => {
    console.log(`  ${$2(el).text().trim()} -> ${$2(el).attr('href')}`);
  });
  
  // Check page number links differently
  $2('a[href*="page"]').each((i, el) => {
    const href = $2(el).attr('href');
    const text = $2(el).text().trim();
    if (href && text && /\d+/.test(text) && (href.includes('/page/') || href.includes('paged='))) {
      console.log(`  Pagination: ${text} -> ${href}`);
    }
  });
  
  // Check page 80 - what's there
  console.log('\n=== Page 80 ===');
  const r3 = await fetch('https://tamilbookspdf.com/books/page/80/', { signal: AbortSignal.timeout(15000) });
  const h3 = await r3.text();
  const $3 = cheerio.load(h3);
  console.log('Title:', $3('title').text());
  let bc80 = 0;
  $3('a').each((i, el) => {
    const href = $3(el).attr('href');
    const text = $3(el).text().trim();
    if (href && href.includes('/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      bc80++;
    }
  });
  console.log(`Book links on page 80: ${bc80}`);
  
  // Check page 40
  console.log('\n=== Page 40 ===');
  const r4 = await fetch('https://tamilbookspdf.com/books/page/40/', { signal: AbortSignal.timeout(15000) });
  const h4 = await r4.text();
  const $4 = cheerio.load(h4);
  console.log('Title:', $4('title').text());
  let bc40 = 0;
  $4('a').each((i, el) => {
    const href = $4(el).attr('href');
    const text = $4(el).text().trim();
    if (href && href.includes('/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      bc40++;
    }
  });
  console.log(`Book links on page 40: ${bc40}`);
}

main().catch(console.error);
