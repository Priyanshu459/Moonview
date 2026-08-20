import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://moonview_user:priyanshu123@localhost:5432/moonview_dev?schema=public' });

async function main() {
  await pool.query('TRUNCATE TABLE "watch_progress" CASCADE;');
  console.log('Truncated watch_progress to avoid migration warnings.');
}

main().finally(() => pool.end());
