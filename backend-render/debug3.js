const fs = require('fs');
const cheerio = require('cheerio');

async function main() {
  const res = await fetch('https://freetamilebooks.com/ebooks/');
  const html = await res.text();
  fs.writeFileSync('page_full.html', html);
  console.log('Saved full HTML, length:', html.length);
  
  const searches = ['eBooks Archive', 'wp-block-post-template', 'stories_on_feminism', 'ponniyin_selvan', 'feminism'];
  for (const s of searches) {
    const idx = html.indexOf(s);
    console.log('Search for "' + s + '": index = ' + idx);
  }
}
main().catch(console.error);
