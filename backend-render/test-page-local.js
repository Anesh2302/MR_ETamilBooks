const cheerio = require('cheerio');
async function test() {
  const r1 = await fetch('https://freetamilebooks.com/ebooks/', { signal: AbortSignal.timeout(10000) });
  const h1 = await r1.text();
  const x1 = cheerio.load(h1);
  console.log('Page 1: ' + h1.length + ' bytes, links: ' + x1('figure.wp-block-post-featured-image a[href*="/ebooks/"]').length);

  const r2 = await fetch('https://freetamilebooks.com/ebooks/page/2/', { signal: AbortSignal.timeout(10000) });
  const h2 = await r2.text();
  const x2 = cheerio.load(h2);
  console.log('Page 2: ' + h2.length + ' bytes, links: ' + x2('figure.wp-block-post-featured-image a[href*="/ebooks/"]').length);
}
test().catch(console.error);
