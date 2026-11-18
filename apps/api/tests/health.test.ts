import { createApp } from '../src/app';
import { storageService } from '../src/storage/localStorage.service';
import http from 'http';

async function runTests() {
  console.log('--- Starting EduSync Phase 1 Backend Verification Tests ---');

  // 1. Verify Local Storage Service
  console.log('[Test 1] Testing LocalFileStorageService...');
  const testBuffer = Buffer.from('EduSync Phase 1 Test File Content - Verification', 'utf-8');
  const saved = await storageService.saveFile(
    testBuffer,
    'verification_doc.txt',
    'text/plain',
    'resources'
  );

  if (!saved.storedFileName || !saved.relativeFilePath) {
    throw new Error('Local file storage save failed.');
  }
  console.log(`  ✓ Saved file locally: ${saved.relativeFilePath}`);

  const exists = await storageService.fileExists('resources', saved.storedFileName);
  if (!exists) {
    throw new Error('File not found after save.');
  }
  console.log('  ✓ File existence verified');

  const filePath = await storageService.getFilePath('resources', saved.storedFileName);
  if (!filePath) {
    throw new Error('Could not resolve file path.');
  }
  console.log(`  ✓ Resolved secure local path: ${filePath}`);

  await storageService.deleteFile('resources', saved.storedFileName);
  console.log('  ✓ File clean up successful');

  // 2. Verify Health Check Endpoint
  console.log('\n[Test 2] Testing HTTP Health Check Endpoint...');
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(5099, async () => {
      try {
        const response = await fetch('http://localhost:5099/api/v1/health');
        const data = await response.json();

        if (response.status !== 200 || data.status !== 'healthy') {
          throw new Error(`Health check returned unexpected status: ${JSON.stringify(data)}`);
        }

        console.log('  ✓ GET /api/v1/health returned 200 OK');
        console.log(`  ✓ Health Response: Service="${data.service}", Status="${data.status}", Storage="${data.storage.driver}"`);
        server.close();
        resolve();
      } catch (err) {
        server.close();
        throw err;
      }
    });
  });

  console.log('\n✅ ALL BACKEND PHASE 1 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
