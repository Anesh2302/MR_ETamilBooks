const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('page_full.html', 'utf8');
const $ = cheerio.load(html);

// Check structure of wp-block-post items
console.log('Post template items:');
$('.wp-block-post').each((i, el) => {
  if (i >= 3) return;
  const link = $(el).find('a[href*="/ebooks/"]').first();
  const href = link.attr('href') || '';
  const img = link.find('img');
  const alt = img.attr('alt') || '';
  const src = img.attr('src') || '';
  console.log('  ' + (i+1) + ': href=' + href);
  console.log('      alt="' + alt + '"');
  console.log('      img=' + src.slice(0, 80));
  // Check for any text after the figure
  const figure = $(el).find('figure');
  console.log('      Figure siblings:', figure.next().length);
  if (figure.next().length > 0) {
    console.log('      Next elem:', figure.next().prop('tagName'), figure.next().text().trim().slice(0, 80));
  }
});
