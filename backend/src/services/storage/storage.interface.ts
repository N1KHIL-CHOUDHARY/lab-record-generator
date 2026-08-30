/**
 * Storage Service abstraction interface.
 * Decouples the application from specific cloud storage SDKs (Cloudflare R2, AWS S3, local storage).
 */
export interface IStorageService {
  /**
   * Upload a file buffer to storage.
   * @param key Unique storage key / relative path (e.g. 'exports/record-123.pdf', 'qr/q0V.png')
   * @param body File buffer
   * @param contentType MIME type (e.g. 'application/pdf', 'image/png')
   * @returns Public accessible URL or endpoint path
   */
  upload(key: string, body: Buffer, contentType: string): Promise<string>;

  /**
   * Delete an object from storage by key.
   * @param key Unique storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Get the public URL for an object key.
   * @param key Unique storage key
   */
  getUrl(key: string): string;

  /**
   * Checks if an object exists in storage.
   * @param key Unique storage key
   */
  exists(key: string): Promise<boolean>;
}
