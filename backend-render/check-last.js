const cheerio = require('cheerio');
async function check() {
  // Binary search for last valid page (between 50 and 60)
  for (let p of [57, 56, 55, 54, 53, 52, 51, 50]) {
    const url = 'https://freetamilebooks.com/ebooks/page/' + p + '/';
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const html = await res.text();
      const $ = cheerio.load(html);
      const links = $('figure.wp-block-post-featured-image a[href*="/ebooks/"]');
      console.log(`Page ${p}: ${links.length} links`);
    } catch(e) {
      console.log(`Page ${p}: ERROR ${e.message.slice(0,60)}`);
    }
  }
}
check();
