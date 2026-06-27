const cheerio = require('cheerio');

async function main() {
  // Check page 1 of books listing
  console.log('=== Books listing page 1 ===');
  const r1 = await fetch('https://tamilbookspdf.com/books/', { signal: AbortSignal.timeout(15000) });
  const h1 = await r1.text();
  const $1 = cheerio.load(h1);
  
  // Try to find book links
  $1('a').each((i, el) => {
    const href = $1(el).attr('href');
    const text = $1(el).text().trim();
    if (href && href.includes('/books/') && href !== 'https://tamilbookspdf.com/books/' && text.length > 5) {
      console.log(`  ${text.slice(0,60)} -> ${href}`);
    }
  });
  console.log('Total links checked');

  // Check a specific book page for download link
  console.log('\n=== Book page: Manu Nithi ===');
  const r2 = await fetch('https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/', { signal: AbortSignal.timeout(15000) });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  
  console.log('Title:', $2('h1').first().text().trim());
  console.log('OG Image:', $2('meta[property="og:image"]').attr('content'));
  
  // Look for any iframe or download link
  const links = [];
  $2('a[href]').each((i, el) => {
    const href = $2(el).attr('href');
    if (href && (href.includes('.pdf') || href.includes('download') || href.includes('?download'))) {
      links.push(href);
    }
  });
  console.log('Download links:', links);
  
  // Find any iframe
  const iframes = [];
  $2('iframe').each((i, el) => iframes.push($2(el).attr('src')));
  console.log('Iframes:', iframes);

  // Get category from breadcrumb
  const breadcrumbs = [];
  $2('[class*="breadcrumb"] a, nav a').each((i, el) => {
    const t = $2(el).text().trim();
    if (t && t !== 'Home' && t !== 'Books') breadcrumbs.push(t);
  });
  console.log('Categories:', breadcrumbs);
  
  // Check description
  const desc = $2('meta[name="description"]').attr('content');
  console.log('Description:', desc ? desc.slice(0,100) : 'none');
  
  // Check for PDF download button in wp-content
  const contentText = $2('.wp-content').text().trim().slice(0, 200);
  console.log('Content text:', contentText);
  
  // Check for any download PDF class
  console.log('Download buttons:', $2('.dt_social_single').length);
  console.log('Download button html:', $2('.dt_social_single').html() ? $2('.dt_social_single').html().slice(0,200) : 'none');
}

main().catch(console.error);
