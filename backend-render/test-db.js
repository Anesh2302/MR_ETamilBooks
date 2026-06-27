const { createClient } = require('@libsql/client/http');

async function main() {
  console.log('TURSO_DB_URL: ' + (process.env.TURSO_DB_URL || 'NOT SET'));
  console.log('TURSO_DB_TOKEN: ' + (process.env.TURSO_DB_TOKEN ? (process.env.TURSO_DB_TOKEN.slice(0, 20) + '...') : 'NOT SET'));
  
  const client = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });
  
  try {
    const r = await client.execute({ sql: "SELECT COUNT(*) as c FROM books", args: [] });
    console.log('Books count: ' + r.rows[0].c);
  } catch (e) {
    console.error('Error: ' + e.message);
    console.error('Code: ' + e.code);
  }
}
main();
