/**
 * scripts/seed-users.js
 * ------------------------------------------------------------------
 * Seeds demo accounts with REAL bcrypt hashes (salt rounds 12).
 * Passwords are never stored in .sql files — hashing happens here.
 */
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

const DEMO_USERS = [
  { name: 'Ava Stone', email: 'manager@stocksense.dev', password: 'Manager@123', role: 'manager' },
  { name: 'Liam Carter', email: 'staff@stocksense.dev', password: 'Staff@123', role: 'staff' },
];

/**
 * Idempotently upsert demo users (existing accounts are left untouched).
 *
 * Accounts that already exist are skipped BEFORE hashing: bcrypt at 12
 * rounds costs ~0.4s per password, and an INSERT ... ON CONFLICT DO NOTHING
 * would also burn SERIAL values on every boot even though nothing is inserted.
 */
async function seedUsers(client) {
  const { rows: existing } = await client.query(
    `SELECT email FROM users WHERE email = ANY($1::text[])`,
    [DEMO_USERS.map((user) => user.email)]
  );
  const present = new Set(existing.map((row) => row.email));
  const missing = DEMO_USERS.filter((user) => !present.has(user.email));

  const created = [];
  for (const user of missing) {
    const hash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role`,
      [user.name, user.email, hash, user.role]
    );
    if (rows[0]) created.push(rows[0]);
  }
  return created;
}

module.exports = { seedUsers, DEMO_USERS, BCRYPT_ROUNDS };
