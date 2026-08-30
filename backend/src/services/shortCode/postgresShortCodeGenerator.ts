import { prisma } from '../../config/prisma.js';
import { encodeBase62 } from '../../utils/base62.js';
import { AppError } from '../../utils/AppError.js';
import { IShortCodeGenerator } from './shortCodeGenerator.interface.js';

export class PostgreSQLShortCodeGenerator implements IShortCodeGenerator {
  private sequenceChecked = false;

  /**
   * Generates a collision-free short code using a native cached PostgreSQL sequence
   * (short_code_seq with CACHE 50), encoded into Base62.
   * 
   * Fetches `nextval('short_code_seq')::text` atomically via Prisma without row-level locks,
   * making it fully non-blocking and thread-safe across multi-process Node.js instances.
   */
  async generate(): Promise<string> {
    try {
      const rows = await prisma.$queryRaw<Array<{ nextval: string }>>`
        SELECT nextval('short_code_seq')::text AS nextval;
      `;

      if (!rows || rows.length === 0 || !rows[0].nextval) {
        throw new AppError('Failed to retrieve next sequence value from database', 500);
      }

      const rawVal = rows[0].nextval;
      const parsedVal = BigInt(rawVal);

      if (parsedVal < 0n) {
        throw new AppError('Sequence returned invalid negative counter value', 500);
      }

      return encodeBase62(parsedVal);
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }

      const errStr = String(err?.message || err);
      const isSequenceMissing =
        errStr.includes('42P01') ||
        (errStr.includes('short_code_seq') && errStr.includes('does not exist'));

      // Self-healing fallback: If sequence does not exist yet (e.g. fresh DB before migration),
      // provision it and retry once.
      if (!this.sequenceChecked && isSequenceMissing) {
        this.sequenceChecked = true;
        try {
          await this.ensureSequenceExists();

          const retryRows = await prisma.$queryRaw<Array<{ nextval: string }>>`
            SELECT nextval('short_code_seq')::text AS nextval;
          `;

          if (retryRows && retryRows.length > 0 && retryRows[0].nextval) {
            const retryVal = BigInt(retryRows[0].nextval);
            return encodeBase62(retryVal);
          }
        } catch (initErr: any) {
          throw new AppError(
            `Failed to initialize short code sequence: ${initErr?.message || 'Database error'}`,
            500
          );
        }
      }

      throw new AppError(
        `Short code generation failed: ${err?.message || 'Internal database error'}`,
        500
      );
    }
  }

  /**
   * Ensures the PostgreSQL sequence exists with CACHE 50.
   */
  private async ensureSequenceExists(): Promise<void> {
    await prisma.$executeRaw`
      CREATE SEQUENCE IF NOT EXISTS short_code_seq
        START WITH 100000
        INCREMENT BY 1
        CACHE 50;
    `;
  }
}
