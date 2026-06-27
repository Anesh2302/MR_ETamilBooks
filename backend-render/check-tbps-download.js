const cheerio = require('cheerio');

async function checkBook(url, label) {
  console.log(`\n=== ${label}: ${url} ===`);
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const h = await r.text();
  const $ = cheerio.load(h);
  
  const title = $('h1').first().text().trim();
  console.log('Title:', title);
  
  const ogImage = $('meta[property="og:image"]').attr('content');
  console.log('OG Image:', ogImage);
  
  // Find dl.tamilbookspdf.com PDF URLs
  const dlPdfs = [];
  const matches = h.match(/https?:\/\/dl\.tamilbookspdf\.com\/[^"'\s]+\.pdf/g);
  if (matches) {
    matches.forEach(u => { if (!dlPdfs.includes(u)) dlPdfs.push(u); });
  }
  console.log('dl.tamilbookspdf.com PDFs:', dlPdfs);
  
  // Get categories
  const cats = [];
  $('.cat-links a, .category a, [class*="cat"] a').each((i, el) => {
    const t = $(el).text().trim();
    if (t) cats.push(t);
  });
  console.log('Categories:', cats);
  
  // Get description
  const desc = $('meta[name="description"]').attr('content');
  console.log('Desc:', desc ? desc.slice(0, 100) : 'none');
  
  // Try to find author
  let author = '';
  // From meta
  const metaAuthor = $('meta[name="author"]').attr('content');
  if (metaAuthor) author = metaAuthor;
  console.log('Meta author:', metaAuthor);
  
  // Check if there are any other PDF URL patterns
  const allPdfs = h.match(/https?:\/\/[^"'\s]+\.pdf/g) || [];
  console.log('All PDF URLs:', allPdfs.filter(u => !u.includes('sample')));
}

async function main() {
  await checkBook('https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/', 'Manu Nithi');
  await checkBook('https://tamilbookspdf.com/books/perumalmurugan-sirukathaigal/', 'Perumalmurugan');
  await checkBook('https://tamilbookspdf.com/books/vaimaiye-sila-samayam-vellum-by-sujatha/', 'Sujatha book');
  await checkBook('https://tamilbookspdf.com/books/nenjin-alaigal-by-mythili-sampath/', 'Last page book');
  await checkBook('https://tamilbookspdf.com/books/sudanthira-tamilnadu-by-periyar/', 'Periyar book');
}

main().catch(console.error);
