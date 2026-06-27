const cheerio = require('cheerio');

async function main() {
  // Check the download-book redirector
  console.log('=== Checking download-book redirect ===');
  const r1 = await fetch('https://tamilbookspdf.com/download-book/', {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  console.log('Status:', r1.status);
  console.log('Location header:', r1.headers.get('location'));
  console.log('Content-Type:', r1.headers.get('content-type'));
  
  // Check a book page more thoroughly for download links
  console.log('\n=== Deep check: Manu Nithi ===');
  const r2 = await fetch('https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/', { signal: AbortSignal.timeout(15000) });
  const h2 = await r2.text();
  const $2 = cheerio.load(h2);
  
  // Look for download links, pdf links
  const allLinks = [];
  $2('a[href]').each((i, el) => {
    const href = $2(el).attr('href');
    const text = $2(el).text().trim().slice(0, 50);
    allLinks.push({ text, href });
  });
  console.log('All links on page:');
  allLinks.forEach(l => {
    if (l.href.includes('download') || l.href.includes('.pdf') || l.href.includes('dlm') || l.href.includes('wp-content')) {
      console.log(`  [${l.text}] ${l.href}`);
    }
  });
  
  // Check for download manager shortcodes in content
  const body = h2;
  const dlmMatch = body.match(/dlm_[\w_]+/g);
  console.log('\nDLM matches:', dlmMatch);
  
  const pdfMatches = body.match(/https?:\/\/[^"'\s]+\.pdf/g);
  console.log('Direct PDF URLs:', pdfMatches);
  
  const shortcodes = body.match(/\[download\b[^\]]*\]/g);
  if (shortcodes) console.log('Download shortcodes:', shortcodes);
  
  const shortcodes2 = body.match(/\[wpdm_[^\]]*\]/g);
  if (shortcodes2) console.log('WPDM shortcodes:', shortcodes2);

  // Check categories in URL
  const catMatch = body.match(/category[^"'\s]+/g);
  console.log('Category references:', [...new Set(catMatch || [])].slice(0, 10));

  // Check for POST data to download
  console.log('\n=== Checking: download-book with referer ===');
  const r3 = await fetch('https://tamilbookspdf.com/download-book/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/' },
    body: new URLSearchParams({ download_id: '2264', _wpnonce: '' }),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  console.log('POST status:', r3.status);
  const loc = r3.headers.get('location');
  console.log('POST location:', loc);
  
  // Check script for download handler
  const scripts = [];
  $2('script[src]').each((i, el) => {
    const src = $2(el).attr('src');
    if (src && !src.includes('jquery') && !src.includes('bootstrap')) scripts.push(src);
  });
  console.log('\nKey scripts:', scripts.slice(0, 10));
  
  // Check for data-id attribute on download button
  console.log('\nElements with data-id:');
  $2('[data-id]').each((i, el) => {
    const tag = el.tagName;
    const dataId = $2(el).attr('data-id');
    const text = $2(el).text().trim().slice(0, 40);
    console.log(`  <${tag}> data-id="${dataId}" text="${text}"`);
  });
  
  // Check if there's a "Download" button text
  console.log('\nDownload button text/links:');
  $2('a, button, .download, .download-link').each((i, el) => {
    const elHtml = cheerio.load($2(el).html() || '');
    const text = $2(el).text().trim();
    const cls = $2(el).attr('class') || '';
    if (text.toLowerCase().includes('download') || cls.includes('download')) {
      console.log(`  [${cls}] ${text}`);
    }
  });
}

main().catch(console.error);
