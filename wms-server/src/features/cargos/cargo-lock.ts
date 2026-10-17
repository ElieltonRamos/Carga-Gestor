import { Prisma } from '../../../generated/prisma/client.js';

// Trava a linha da carga até o fim da transação, serializando expedição, reabertura,
// edição e bipagem da mesma carga. Precisa ser a primeira leitura da transação,
// para as leituras seguintes já enxergarem os commits anteriores.
export const lockCargoRow = async (
  tx: Prisma.TransactionClient,
  cargoId: number,
): Promise<boolean> => {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM cargos WHERE id = ${cargoId} FOR UPDATE
  `;
  return rows.length > 0;
};
