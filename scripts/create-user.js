/**
 * scripts/create-user.js
 * ------------------------------------------------------------------
 * BACKEND-ONLY signup / user provisioning. No frontend, no REST route.
 *
 *   npm run user:create -- --name "Nina Roy" --email nina@stocksense.dev \
 *                          --password "Nina@1234" --role manager
 *
 *   npm run user:create -- --list
 *
 * Security:
 *  - input is validated with the SAME Zod schemas the browser actions use
 *  - passwords are hashed with bcrypt (salt rounds 12); plaintext is never stored
 *  - unlike public signup this trusted path may grant the manager role
 *  - connection settings come from db/config.js; the process exits when done
 */
const { bootstrapDatabase, describeError } = require('./bootstrap-db.js');

function parseArgs(argv) {
  const args = { list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--list') {
      args.list = true;
      continue;
    }
    const match = token.match(/^--([a-zA-Z]+)(?:=(.*))?$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : argv[i + 1];
    if (match[2] === undefined) i += 1;
    args[key] = value;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await bootstrapDatabase({ verbose: false }); // reuse the running instance when available

  const authService = require('../modules/auth/service.js');
  const { schemas, parseOrThrow } = require('../modules/security/sanitize.js');

  if (args.list) {
    const users = await authService.listUsers();
    console.log('\nAccounts:');
    for (const user of users) {
      console.log(`  #${user.id}  ${user.role.padEnd(8)} ${user.email}  (${user.name})`);
    }
    console.log('');
    await closeAndExit(0);
  }

  if (!args.email || !args.password || !args.name) {
    console.error(
      [
        '',
        'Usage:',
        '  npm run user:create -- --name "Full Name" --email user@example.com \\',
        '                          --password "Secret@123" [--role manager|staff]',
        '  npm run user:create -- --list',
        '',
      ].join('\n')
    );
    await closeAndExit(1);
  }

  // Same validation contract as the browser signup action.
  const input = parseOrThrow(schemas.signupSchema, {
    name: args.name,
    email: args.email,
    password: args.password,
    role: args.role || 'staff',
  });

  const user = await authService.createUserAsAdmin(input);
  console.log(
    `\n✔ Account created: #${user.id} ${user.email} (${user.role}) — password hashed with bcrypt rounds ${authService.BCRYPT_ROUNDS}\n`
  );
  await closeAndExit(0);
}

async function closeAndExit(code) {
  try {
    await require('../db/custom-client.js').pool.end();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

main().catch(async (err) => {
  const name = err && err.name;
  if (name === 'ValidationError') {
    console.error('\n✖ Validation failed:', JSON.stringify(err.fieldErrors));
  } else if (err && err.status) {
    console.error(`\n✖ ${err.message}`);
  } else {
    console.error('\n✖ FAILED:', describeError(err));
  }
  await closeAndExit(1);
});
