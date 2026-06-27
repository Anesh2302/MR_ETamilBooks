const { createClient } = require('@libsql/client/http');

async function main() {
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_TOKEN;
  
  console.log('URL:', url);
  console.log('Token length:', token ? token.length : 0);
  console.log('Token starts with:', token ? token.slice(0, 20) + '...' : 'NONE');
  
  const turso = createClient({ url, authToken: token });
  
  try {
    const r = await turso.execute('SELECT COUNT(*) as cnt FROM books');
    console.log('Books count:', r.rows[0].cnt);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Full error:', JSON.stringify(err, null, 2));
  }
}

main();
