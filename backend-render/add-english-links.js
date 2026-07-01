const { initDB } = require('./db');

async function main() {
  await initDB();
  const { queryOne, insert } = require('./db');

  const eduCat = await queryOne("SELECT id FROM categories WHERE name_en = 'Education'");
  const eduCatId = eduCat ? Number(eduCat.id) : null;
  console.log('Education category id:', eduCatId);

  const links = [
    {
      title: 'Free English eBooks - FluentU',
      author: 'FluentU',
      language: 'en',
      file_url: 'https://www.fluentu.com/blog/english/free-english-ebooks/',
      description: 'Collection of free English eBooks for learners - from classic literature to modern resources. FluentU curates the best free English reading materials for language learners.',
      file_type: 'link',
      category_id: eduCatId,
    },
    {
      title: 'NCERT English Textbook - Flamingo',
      author: 'NCERT',
      language: 'en',
      file_url: 'https://ncert.nic.in/textbook.php?lefl1=1-13',
      description: 'NCERT Class 12 English Textbook - Flamingo. Prose and poetry selections from the National Council of Educational Research and Training, India.',
      file_type: 'link',
      category_id: eduCatId,
    },
  ];

  for (const book of links) {
    const dup = await queryOne('SELECT id FROM books WHERE file_url = ?', [book.file_url]);
    if (dup) {
      console.log('Skipping (duplicate):', book.title);
      continue;
    }
    const result = await insert(
      `INSERT INTO books (title, author, language, description, file_type, file_url, category_id, uploaded_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [book.title, book.author, book.language, book.description, book.file_type, book.file_url, book.category_id, 1, 'approved']
    );
    console.log('Added:', book.title, '(id:', result, ')');
  }

  console.log('Done!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
