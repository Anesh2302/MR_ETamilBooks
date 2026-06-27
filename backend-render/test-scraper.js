const cheerio = require('cheerio');

async function test() {
  const res = await fetch('https://freetamilebooks.com/ebooks/');
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  $('h2.wp-block-post-title a').each((i, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href);
  });
  console.log('Found links count:', links.length);
  console.log('First 3:', links.slice(0, 3));

  if (links[0]) {
    console.log('\nScraping:', links[0]);
    const r2 = await fetch(links[0], { signal: AbortSignal.timeout(15000) });
    const h2 = await r2.text();
    const $2 = cheerio.load(h2);
    console.log('Title:', $2('h1.wp-block-post-title').text().trim());
    const cats = [];
    $2('.taxonomy-category a, .wp-block-post-terms a').each((i, el) => cats.push($2(el).text().trim()));
    console.log('Categories:', cats);
    const downloads = [];
    $2('a[href]').each((i, el) => {
      const href = $2(el).attr('href');
      if (href && (href.endsWith('.pdf') || href.endsWith('.epub'))) downloads.push(href);
    });
    console.log('Download links:', downloads.slice(0, 3));
  }
}
test().catch(console.error);
