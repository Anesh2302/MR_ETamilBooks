const cheerio = require('cheerio');

async function getGenre(url, label) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const h = await r.text();
  const $ = cheerio.load(h);
  
  // Method 1: Find current genre from nav menu items with current-books-parent
  const genres = [];
  $('li.menu-item-type-taxonomy.menu-item-object-genres').each((i, el) => {
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim();
    if (cls.includes('current-menu-parent') || cls.includes('current-books-parent')) {
      genres.push(text);
    }
  });
  
  // Method 2: Check tbp-book-genre section
  const genreSection = $('.tbp-book-genre').text().trim().slice(0, 50);
  
  // Method 3: Check body class for term-*
  const bodyClass = $('body').attr('class') || '';
  const termMatch = bodyClass.match(/term-[\w-]+/g);
  
  // Method 4: Check the page URL for genre (slug)
  // Check canonical URL in link rel
  const canonical = $('link[rel="canonical"]').attr('href') || url;
  
  console.log(`${label}: genres=${JSON.stringify(genres)} | tbp-book-genre="${genreSection}" | terms=${termMatch} | canonical=${canonical}`);
}

async function main() {
  // Check books that likely have different genres
  await getGenre('https://tamilbookspdf.com/books/manu-nithi-tamil-pdf-book/', 'Manu Nithi');
  await getGenre('https://tamilbookspdf.com/books/perumalmurugan-sirukathaigal/', 'Perumalmurugan');
  await getGenre('https://tamilbookspdf.com/books/sudanthira-tamilnadu-by-periyar/', 'Periyar');
  await getGenre('https://tamilbookspdf.com/books/vaimaiye-sila-samayam-vellum-by-sujatha/', 'Sujatha');
  await getGenre('https://tamilbookspdf.com/books/nenjin-alaigal-by-mythili-sampath/', 'Mythili');
  await getGenre('https://tamilbookspdf.com/books/layam-thappiya-ithayam-by-yandamuri-veerendranath/', 'Yandamuri');
}

main().catch(console.error);
