import { env } from '../../config/env.js';
import { IStorageService } from './storage.interface.js';
import { S3StorageService } from './s3StorageService.js';
import { LocalStorageService } from './localStorageService.js';

let storageServiceInstance: IStorageService;

export function getStorageService(): IStorageService {
  if (storageServiceInstance) {
    return storageServiceInstance;
  }

  const s3Config = env.storage;
  if (s3Config.bucket && s3Config.accessKeyId && s3Config.secretAccessKey) {
    console.log(`Using S3/R2 Storage Service (Bucket: ${s3Config.bucket})`);
    storageServiceInstance = new S3StorageService({
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      bucket: s3Config.bucket,
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      publicUrl: s3Config.publicUrl,
    });
  } else {
    console.log('Using Local File Storage Service (Fallback)');
    storageServiceInstance = new LocalStorageService();
  }

  return storageServiceInstance;
}

export * from './storage.interface.js';
export * from './s3StorageService.js';
export * from './localStorageService.js';
