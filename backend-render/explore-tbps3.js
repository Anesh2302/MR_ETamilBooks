const cheerio = require('cheerio');

async function main() {
  // Check pagination - page 2 of books
  console.log('=== Page 2 of /books/ ===');
  const r1 = await fetch('https://tamilbookspdf.com/books/page/2/', { signal: AbortSignal.timeout(15000) });
  const h1 = await r1.text();
  const $1 = cheerio.load(h1);
  const links = [];
  $1('a[href]').each((i, el) => {
    const href = $1(el).attr('href');
    const text = $1(el).text().trim();
    if (href && href.includes('/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 5) {
      links.push({ text: text.slice(0, 50), href });
    }
  });
  console.log(`Books on page 2: ${links.length}`);
  links.slice(0, 5).forEach(l => console.log(`  ${l.text} -> ${l.href}`));
  
  // Check last page
  console.log('\n=== Checking last page ===');
  for (const n of [100, 80, 60, 50, 40]) {
    const r = await fetch(`https://tamilbookspdf.com/books/page/${n}/`, { 
      method: 'HEAD', 
      signal: AbortSignal.timeout(10000) 
    });
    console.log(`  Page ${n}: ${r.status}`);
  }
  
  // Check categories
  console.log('\n=== Categories ===');
  const r2 = await fetch('https://tamilbookspdf.com/', { signal: AbortSignal.timeout(15000) });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  
  // Look for category links in menu or sidebar
  $2('a[href*="category"], a[href*="/cat"]').each((i, el) => {
    const href = $2(el).attr('href');
    const text = $2(el).text().trim();
    if (text.length > 2) console.log(`  ${text} -> ${href}`);
  });
  
  // Check a specific book for better PDF URL extraction
  console.log('\n=== Another book for PDF check: Perumalmurugan Sirukathaigal ===');
  const r3 = await fetch('https://tamilbookspdf.com/books/perumalmurugan-sirukathaigal/', { signal: AbortSignal.timeout(15000) });
  const h3 = await r3.text();
  const pdfMatches = h3.match(/https?:\/\/[^"'\s]+\.pdf/g);
  console.log('Direct PDF URLs:', pdfMatches);
  
  // Check for download-book with data-id as query param
  const r4 = await fetch('https://tamilbookspdf.com/download-book/?download_id=2264', {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  console.log('\ndownload-book with query param status:', r4.status, 'Location:', r4.headers.get('location'));
  
  // Check book page for taxonomy/category
  const $3 = cheerio.load(h3);
  console.log('\nBook page categories:');
  $3('.cat-links a, .category a, [class*="cat"] a').each((i, el) => {
    console.log(`  ${$3(el).text().trim()} -> ${$3(el).attr('href')}`);
  });
}

main().catch(console.error);
