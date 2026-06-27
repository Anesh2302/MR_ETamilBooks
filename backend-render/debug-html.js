const cheerio = require('cheerio');
const fs = require('fs');

async function main() {
  const res = await fetch('https://freetamilebooks.com/ebooks/');
  const html = await res.text();
  fs.writeFileSync('page_sample.html', html.slice(0, 30000));
  
  const $ = cheerio.load(html);
  console.log('Total HTML length:', html.length);
  console.log('h2 count:', $('h2').length);
  
  $('h2').each((i, el) => {
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim().slice(0, 60);
    console.log(`  h2 #${i}: class="${cls}" text="${text}"`);
  });
  
  console.log('\nAll links to /ebooks/:');
  $('a[href*="/ebooks/"]').slice(0, 20).each((i, el) => {
    console.log(`  ${$(el).attr('href')} text="${$(el).text().trim().slice(0, 50)}"`);
  });
}
main().catch(console.error);
