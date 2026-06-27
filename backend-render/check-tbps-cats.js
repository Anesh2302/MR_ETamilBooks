const cheerio = require('cheerio');

async function main() {
  // Check a genre page to see how categories work
  console.log('=== Genre: Fantasy ===');
  const r = await fetch('https://tamilbookspdf.com/genre/fantasy/', { signal: AbortSignal.timeout(15000) });
  const h = await r.text();
  const $ = cheerio.load(h);
  
  console.log('Title:', $('title').text());
  let count = 0;
  $('a[href*="/books/"]').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && href !== 'https://tamilbookspdf.com/books/' && text.length > 3) {
      count++;
    }
  });
  console.log('Books on this genre page:', count);

  // Check book page for genre tagging in a different way
  console.log('\n=== Book: Manu Nithi - check categories again ===');
  const r2 = await fetch('https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/', { signal: AbortSignal.timeout(15000) });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  
  // Check the full cat-links structure
  const catLinksHtml = $2('.cat-links').html();
  console.log('cat-links HTML:', catLinksHtml ? catLinksHtml.slice(0, 500) : 'none');
  
  // Check if there's a "Categories:" label
  const labels = [];
  $2('.cat-links *').each((i, el) => {
    const text = $2(el).text().trim();
    const tag = el.tagName;
    if (text && tag !== 'a') labels.push({tag, text});
  });
  console.log('cat-links children:', labels);
  
  // Check span or strong before links
  $2('.cat-links').contents().each((i, node) => {
    if (node.type === 'text') {
      const t = $(node).text().trim();
      if (t) console.log('Text node:', t);
    }
  });

  // Check what the book's actual specific categories might be
  // Look for category in URL, body class, etc.
  const bodyClass = $2('body').attr('class') || '';
  console.log('Body class:', bodyClass);
  
  // Check if there's a different taxonomy element
  $2('[class*="taxonomy"], [class*="genre"], [class*="category"]').each((i, el) => {
    console.log(`  ${el.tagName}.${$2(el).attr('class')}: ${$2(el).text().trim().slice(0, 100)}`);
  });
  
  // Check another specific book to compare
  console.log('\n=== Book: Sudanthira Tamilnadu ===');
  const r3 = await fetch('https://tamilbookspdf.com/books/sudanthira-tamilnadu-by-periyar/', { signal: AbortSignal.timeout(15000) });
  const h3 = await r3.text();
  const $3 = cheerio.load(h3);
  const catLinksHtml3 = $3('.cat-links').html();
  console.log('cat-links HTML:', catLinksHtml3 ? catLinksHtml3.slice(0, 500) : 'none');
  
  // Maybe the real category is in the URL structure? Let me check what URL the book page has
  // Check if there's breadcrumb JSON-LD
  const scripts = [];
  $3('script[type="application/ld+json"]').each((i, el) => {
    scripts.push($3(el).html());
  });
  console.log('JSON-LD:', scripts[0] ? scripts[0].slice(0, 500) : 'none');

  // Check specific category on page
  const catItems = [];
  $3('.entry-categories a, .post-categories a, .genre-links a').each((i, el) => {
    catItems.push($3(el).text().trim());
  });
  console.log('Entry categories:', catItems);
}

main().catch(console.error);
