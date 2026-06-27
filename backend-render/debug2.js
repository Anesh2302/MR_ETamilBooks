const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('page_sample.html', 'utf8');

// Search for stories_on_feminism in different encodings
const searches = ['stories_on_feminism', 'ponniyin_selvan', '/ebooks/', 'wp-block-post-template'];
for (const s of searches) {
  const idx = html.indexOf(s);
  console.log('Search for "' + s + '": index = ' + idx);
  if (idx >= 0) {
    console.log('Context:', html.slice(Math.max(0, idx - 300), idx + 200));
    console.log('---');
    break;
  }
}

// Look at all links cheerio found
const $ = cheerio.load(html);
console.log('\nCheerio found links:');
$('a[href*="/ebooks/"]').each((i, el) => {
  const href = $(el).attr('href');
  const text = $(el).text().trim().slice(0, 50);
  const img = $(el).find('img').first();
  const imgSrc = img.attr('src') || '';
  console.log('  href=' + href + ' text="' + text + '" img=' + imgSrc.slice(0, 60));
});
