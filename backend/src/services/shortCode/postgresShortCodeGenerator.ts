import { prisma } from '../../config/prisma.js';
import { encodeBase62 } from '../../utils/base62.js';
import { IShortCodeGenerator } from './shortCodeGenerator.interface.js';

export class PostgreSQLShortCodeGenerator implements IShortCodeGenerator {
  /**
   * Generates a collision-free short code using PostgreSQL atomic row locking (FOR UPDATE)
   * within a database transaction, encoded into Base62.
   */
  async generate(): Promise<string> {
    return await prisma.$transaction(
      async (tx: any) => {
        // 1. Ensure the singleton counter row exists
        await tx.$executeRaw`
          INSERT INTO "short_code_counters" (id, "currentValue", "updatedAt")
          VALUES ('singleton', 100000, NOW())
          ON CONFLICT (id) DO NOTHING;
        `;

        // 2. Lock the counter row exclusively for this transaction
        const rows = await tx.$queryRaw<{ currentValue: bigint | number | string }[]>`
          SELECT "currentValue" FROM "short_code_counters" WHERE id = 'singleton' FOR UPDATE;
        `;

        if (!rows || rows.length === 0) {
          throw new Error('Failed to acquire short code counter lock');
        }

        const currentVal = BigInt(rows[0].currentValue);
        const nextVal = currentVal + 1n;

        // 3. Atomically increment the counter for the next consumer
        await tx.$executeRaw`
          UPDATE "short_code_counters"
          SET "currentValue" = ${nextVal}, "updatedAt" = NOW()
          WHERE id = 'singleton';
        `;

        // 4. Return the Base62 encoded representation
        return encodeBase62(currentVal);
      },
      {
        isolationLevel: 'ReadCommitted',
        maxWait: 10000,
        timeout: 15000,
      }
    );
  }
}
