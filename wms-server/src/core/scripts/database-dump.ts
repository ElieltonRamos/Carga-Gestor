// src/common/utils/database-dump.ts
import * as fs from 'fs';
import * as mariadb from 'mariadb';

export interface DumpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const BATCH_SIZE = 500;

/**
 * Gera um dump SQL (estrutura + dados) usando apenas o driver mariadb.
 * Não depende de mysqldump nem de MYSQLDUMP_PATH.
 * Em caso de erro, remove o arquivo parcial e relança a exceção.
 */
export async function dumpDatabase(
  config: DumpConfig,
  outputFile: string,
): Promise<void> {
  const conn = await mariadb.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    dateStrings: true,
    bigIntAsNumber: true,
    autoJsonMap: false,
  });

  const file = await fs.promises.open(outputFile, 'w');

  const serialize = (value: unknown): string => {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Buffer.isBuffer(value) &&
      !(value instanceof Date)
    ) {
      return conn.escape(JSON.stringify(value));
    }
    return conn.escape(value);
  };

  try {
    // Snapshot consistente entre as tabelas (InnoDB)
    await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');

    await file.write(
      [
        'SET NAMES utf8mb4;',
        'SET FOREIGN_KEY_CHECKS=0;',
        'SET UNIQUE_CHECKS=0;',
        "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
        '',
        '',
      ].join('\n'),
    );

    const tables = await conn.query<{ name: string }[]>(
      `SELECT TABLE_NAME AS name
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
      [config.database],
    );

    for (const { name } of tables) {
      const tableId = conn.escapeId(name);

      const [create] = await conn.query<Record<string, string>[]>(
        `SHOW CREATE TABLE ${tableId}`,
      );

      await file.write(
        `-- Tabela ${name}\nDROP TABLE IF EXISTS ${tableId};\n${create['Create Table']};\n\n`,
      );

      let columns: string | null = null;
      let batch: string[] = [];

      const flush = async (): Promise<void> => {
        if (batch.length === 0 || !columns) return;
        await file.write(
          `INSERT INTO ${tableId} (${columns}) VALUES\n${batch.join(',\n')};\n`,
        );
        batch = [];
      };

      const stream = conn.queryStream(`SELECT * FROM ${tableId}`);

      // Correção da sintaxe do Type Assertion
      for await (const row of stream as AsyncIterable<
        Record<string, unknown>
      >) {
        if (!columns) {
          const keys = Object.keys(row);
          columns = keys.map((column) => conn.escapeId(column)).join(', ');
        }

        // Garante que os valores sigam estritamente a ordem das colunas extraídas
        const keys = Object.keys(row);
        const values = keys.map((key) => serialize(row[key])).join(', ');
        batch.push(`(${values})`);

        if (batch.length >= BATCH_SIZE) {
          await flush();
        }
      }

      // Garante o envio do restante dos registros que não atingiram o BATCH_SIZE
      if (batch.length > 0) {
        await flush();
      }
      await flush();
      await file.write('\n');
    }

    await file.write('SET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n');
    await conn.query('COMMIT');
  } catch (error) {
    await file.close().catch(() => undefined);
    await fs.promises.rm(outputFile, { force: true });
    throw error;
  } finally {
    await file.close().catch(() => undefined);
    await conn.end().catch(() => undefined);
  }
}
