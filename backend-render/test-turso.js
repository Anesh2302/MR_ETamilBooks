// Test Turso HTTP API directly
async function main() {
  const url = process.env.TURSO_DB_URL; // libsql://etamil-books-anesh2302.aws-ap-south-1.turso.io
  const token = process.env.TURSO_DB_TOKEN;
  
  console.log('URL:', url);
  console.log('Token length:', token ? token.length : 0);
  
  // Convert libsql:// to https:// for direct REST API
  const restUrl = url.replace('libsql://', 'https://');
  console.log('REST URL:', restUrl);
  
  try {
    const res = await fetch(restUrl + '/v2/pipeline', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT COUNT(*) as c FROM books' } }
        ]
      })
    });
    const body = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', body.slice(0, 500));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
main();
