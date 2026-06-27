const cheerio = require('cheerio');

async function main() {
  const res = await fetch('https://freetamilebooks.com/ebooks/page/2/');
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log('Page 2 HTML length:', html.length);
  
  // Check for wp-block-post elements
  console.log('wp-block-post count:', $('.wp-block-post').length);
  console.log('li elements:', $('li[class*="wp-block-post"]').length);
  
  // Check for featured image links
  const links = [];
  $('figure.wp-block-post-featured-image a[href*="/ebooks/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href);
  });
  console.log('Featured image links:', links.length);
  
  // Try broader selectors
  const links2 = [];
  $('a[href*="/ebooks/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.match(/\/ebooks\/[^\/]+\/$/)) links2.push(href);
  });
  console.log('All matching links:', links2.length);
  console.log('First 3:', links2.slice(0, 3));
}
main().catch(console.error);
