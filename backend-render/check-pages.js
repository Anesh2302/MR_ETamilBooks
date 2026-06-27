const cheerio = require('cheerio');
async function check() {
  // Check pages around 59 and beyond
  for (let p of [58, 59, 60, 70, 80, 90, 100]) {
    const url = p === 1 ? 'https://freetamilebooks.com/ebooks/' : 'https://freetamilebooks.com/ebooks/page/' + p + '/';
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const html = await res.text();
      const $ = cheerio.load(html);
      const links = $('figure.wp-block-post-featured-image a[href*="/ebooks/"]');
      const title = $('title').text();
      console.log(`Page ${p}: ${html.length} bytes, ${links.length} links, title="${title.slice(0,60)}"`);
    } catch(e) {
      console.log(`Page ${p}: ERROR ${e.message.slice(0,60)}`);
    }
  }
}
check();
