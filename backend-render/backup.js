// Run via cron/scheduled workflow to back up the Turso database
// Usage: node backup.js
// Requires TURSO_DB_URL and TURSO_DB_TOKEN env vars
// Also requires the `turso` CLI to be installed for the shell approach

const { createClient } = require('@libsql/client/http');
require('dotenv').config();

const RAW_URL = process.env.TURSO_DB_URL || '';
const RAW_TOKEN = process.env.TURSO_DB_TOKEN || '';
const TURSO_DB_URL = RAW_URL.charCodeAt(0) === 0xFEFF ? RAW_URL.slice(1) : RAW_URL;
const TURSO_DB_TOKEN = RAW_TOKEN.charCodeAt(0) === 0xFEFF ? RAW_TOKEN.slice(1) : RAW_TOKEN;

async function backup() {
  if (!TURSO_DB_URL || !TURSO_DB_TOKEN) {
    console.error('Missing TURSO_DB_URL or TURSO_DB_TOKEN');
    process.exit(1);
  }

  const client = createClient({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN });
  const date = new Date().toISOString().split('T')[0];
  const filename = `backup-${date}.sql`;

  try {
    // Dump all tables
    const tables = ['users', 'categories', 'books', 'reading_progress', 'bookmarks',
      'search_history', 'translate_history', 'tts_history', 'summarize_history',
      'flashcard_sets', 'flashcards', 'ocr_history', 'audio_history', 'roles',
      'user_roles', 'admin_audit_log'];

    let sql = `-- Backup ${date}\n\n`;

    for (const table of tables) {
      const rs = await client.execute({ sql: `SELECT * FROM ${table}`, args: [] });
      sql += `-- Table: ${table} (${rs.rows.length} rows)\n`;
      for (const row of rs.rows) {
        const cols = Object.keys(row);
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        sql += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
      }
      sql += '\n';
    }

    const fs = require('fs');
    fs.writeFileSync(filename, sql);
    console.log(`Backup written to ${filename} (${(fs.statSync(filename).size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('Backup failed:', err.message);
    process.exit(1);
  }
}

backup();
