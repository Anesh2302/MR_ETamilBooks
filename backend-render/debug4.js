const fs = require('fs');
const html = fs.readFileSync('page_full.html', 'utf8');

// Show context around stories_on_feminism
const idx = html.indexOf('stories_on_feminism');
console.log('=== Context at stories_on_feminism ===');
console.log(html.slice(Math.max(0, idx - 800), idx + 500));
