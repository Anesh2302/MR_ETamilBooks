const fs = require('fs');
const cheerio = require('cheerio');

async function run() {
  const res = await fetch('https://freetamilebooks.com/ebooks/manifesto-of-the-communist-party/');
  const html = await res.text();
  fs.writeFileSync('book_page.html', html);
  console.log('Saved HTML, length: ' + html.length);
  
  const $ = cheerio.load(html);
  // Find all links that could be downloads
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().slice(0, 60);
    // Look for download-related links
    if (href.includes('download') || href.includes('dlm') || text.toLowerCase().includes('download') || href.endsWith('.pdf') || href.endsWith('.epub')) {
      console.log('Link: href=' + href + ' text="' + text + '"');
    }
  });
  
  // Also check for download buttons
  console.log('\n--- Any element with download-related classes ---');
  $('[class*="download"], [class*="dlm"], [id*="download"]').each((i, el) => {
    const tag = el.tagName;
    const cls = $(el).attr('class') || '';
    console.log('Elem: <' + tag + ' class="' + cls + '">' + $(el).text().trim().slice(0, 80) + '</' + tag + '>');
  });
}
run().catch(console.error);
