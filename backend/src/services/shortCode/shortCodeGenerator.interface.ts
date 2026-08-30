/**
 * Interface defining short code generation contract.
 * Allows seamless interchange between PostgreSQL atomic row locking,
 * Redis atomic INCR, or distributed sequence generators.
 */
export interface IShortCodeGenerator {
  /**
   * Generates a unique, collision-resistant short code.
   * @returns Base62-encoded short code string.
   */
  generate(): Promise<string>;
}
