import { IShortCodeGenerator } from './shortCodeGenerator.interface.js';
import { PostgreSQLShortCodeGenerator } from './postgresShortCodeGenerator.js';

// Default generator instance (PostgreSQL). Can be swapped with RedisShortCodeGenerator in the future.
export const defaultShortCodeGenerator: IShortCodeGenerator = new PostgreSQLShortCodeGenerator();

export * from './shortCodeGenerator.interface.js';
export * from './postgresShortCodeGenerator.js';
