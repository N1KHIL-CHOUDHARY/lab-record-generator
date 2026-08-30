import path from 'path';
import fs from 'fs/promises';
import { env } from '../../config/env.js';
import { IStorageService } from './storage.interface.js';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), 'uploads');
  }

  async upload(key: string, body: Buffer, _contentType: string): Promise<string> {
    const normalizedKey = key.replace(/^\/+/, '');
    const filePath = path.join(this.baseDir, normalizedKey);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, body);

    return this.getUrl(normalizedKey);
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = key.replace(/^\/+/, '');
    const filePath = path.join(this.baseDir, normalizedKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  getUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');
    return `${env.appUrl}/uploads/${normalizedKey}`;
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = key.replace(/^\/+/, '');
    const filePath = path.join(this.baseDir, normalizedKey);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
