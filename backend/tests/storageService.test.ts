import { LocalStorageService } from '../src/services/storage/localStorageService.js';
import path from 'path';
import fs from 'fs/promises';

async function runStorageTests() {
  console.log('--- Testing Storage Service ---');

  const testDir = path.join(process.cwd(), 'uploads', 'test_scratch');
  const service = new LocalStorageService(testDir);

  const testKey = 'test-file.txt';
  const testContent = Buffer.from('Smart Lab Record Storage Test');

  // Test upload
  const url = await service.upload(testKey, testContent, 'text/plain');
  console.log(`✓ Uploaded file: ${url}`);

  // Test exists
  const exists = await service.exists(testKey);
  if (!exists) {
    throw new Error('File should exist after upload');
  }
  console.log('✓ Verified file exists');

  // Test delete
  await service.delete(testKey);
  const stillExists = await service.exists(testKey);
  if (stillExists) {
    throw new Error('File should not exist after deletion');
  }
  console.log('✓ Verified file deleted');

  // Cleanup test scratch directory
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  console.log('Storage Service tests PASSED!\n');
}

runStorageTests().catch((err) => {
  console.error('Storage test failed:', err);
  process.exit(1);
});
