/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as readline from 'readline';
import { Writable } from 'stream';
import * as mariadb from 'mariadb';
import * as bcrypt from 'bcryptjs';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question: string): Promise<string> {
  let muted = false;

  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function askValid(
  question: string,
  validate: (value: string) => string | null,
  hidden = false,
): Promise<string> {
  while (true) {
    const value = hidden ? await askHidden(question) : await ask(question);
    const error = validate(value);
    if (!error) return value;
    console.log(`   ❌ ${error}`);
  }
}

async function askPassword(): Promise<string> {
  while (true) {
    const password = await askValid(
      '   Senha (mínimo 6 caracteres): ',
      (value) =>
        value.length >= 6 ? null : 'A senha deve ter no mínimo 6 caracteres.',
      true,
    );
    const confirmation = await askHidden('   Confirme a senha: ');

    if (password === confirmation) return password;
    console.log('   ❌ As senhas não conferem.');
  }
}

export async function runSeeds(
  config: mariadb.ConnectionConfig,
): Promise<void> {
  console.log('\n🌱 Rodando seeds...\n');

  const cnpj = (
    await askValid('   CNPJ (somente números): ', (value) =>
      value.replace(/\D/g, '').length === 14
        ? null
        : 'O CNPJ deve ter 14 dígitos.',
    )
  ).replace(/\D/g, '');

  const companyName = await askValid('   Nome da empresa: ', (value) =>
    value ? null : 'Nome obrigatório.',
  );

  const licenseKey = await askValid('   Chave de licença: ', (value) =>
    value ? null : 'Chave de licença obrigatória.',
  );

  console.log('\n   Segundo usuário (admin):');
  const username = await askValid('   Usuário: ', (value) => {
    if (!value) return 'Usuário obrigatório.';
    if (value.toLowerCase() === 'root') return 'O usuário "root" já existe.';
    return null;
  });
  const password = await askPassword();

  console.log('');

  const conn = await mariadb.createConnection(config);

  try {
    console.log('   ⏳ Executando: company-seed');
    await conn.query(
      `INSERT INTO companies (
        id, cnpj, name, license_key, license_token, created_at, updated_at
      ) VALUES (
        1, ?, ?, ?, NULL, NOW(), NOW()
      ) ON DUPLICATE KEY UPDATE
        cnpj = VALUES(cnpj),
        name = VALUES(name),
        license_key = VALUES(license_key),
        license_token = NULL,
        updated_at = NOW()`,
      [cnpj, companyName, licenseKey],
    );
    console.log('   ✅ Concluído: company-seed');

    console.log('   ⏳ Executando: user-seed');
    const upsertUser = (name: string, passwordHash: string) =>
      conn.query(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
        VALUES (?, ?, ?, 'ADMIN', true, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = 'ADMIN',
          active = true,
          updated_at = NOW()`,
        [name, name, passwordHash],
      );

    await upsertUser('root', await bcrypt.hash('impostoeroubo', 10));
    await upsertUser(username, await bcrypt.hash(password, 10));
    console.log('   ✅ Concluído: user-seed');
  } finally {
    await conn.end();
  }

  console.log('');
}
