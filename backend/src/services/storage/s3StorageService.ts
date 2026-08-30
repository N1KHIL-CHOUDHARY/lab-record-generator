import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageService } from './storage.interface.js';

export interface S3Config {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
}

export class S3StorageService implements IStorageService {
  private client: S3Client;
  private bucket: string;
  private publicUrl?: string;
  private endpoint?: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl?.replace(/\/$/, '');
    this.endpoint = config.endpoint;

    this.client = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    const normalizedKey = key.replace(/^\/+/, '');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: normalizedKey,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    return this.getUrl(normalizedKey);
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = key.replace(/^\/+/, '');
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: normalizedKey,
    });

    await this.client.send(command);
  }

  getUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');
    if (this.publicUrl) {
      return `${this.publicUrl}/${normalizedKey}`;
    }

    if (this.endpoint) {
      const cleanEndpoint = this.endpoint.replace(/\/$/, '');
      return `${cleanEndpoint}/${this.bucket}/${normalizedKey}`;
    }

    return `https://${this.bucket}.s3.amazonaws.com/${normalizedKey}`;
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = key.replace(/^\/+/, '');
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
