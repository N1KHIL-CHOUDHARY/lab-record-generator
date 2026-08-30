import { isValidDestinationUrl } from '../src/validators/qrValidators.js';
import { isValidGitHubUrl, normalizeGitHubUrl } from '../src/utils/githubValidator.js';

function runUrlValidatorTests() {
  console.log('--- Testing URL Validation & Security ---');

  // Valid Public URLs
  const validUrls = [
    'https://github.com/facebook/react',
    'https://mydomain.com/path?query=1#hash',
    'http://93.184.216.34/example',
  ];

  for (const url of validUrls) {
    if (!isValidDestinationUrl(url)) {
      throw new Error(`Valid URL rejected: ${url}`);
    }
  }
  console.log('✓ Valid HTTP/HTTPS URLs accepted');

  // Malicious / Dangerous URLs & Localhost
  const dangerousUrls = [
    'javascript:alert(1)',
    'javascript:document.cookie',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://ftp.example.com',
    'http://localhost:3000/demo',
    '',
    'not a url',
  ];

  for (const badUrl of dangerousUrls) {
    if (isValidDestinationUrl(badUrl)) {
      throw new Error(`Security vulnerability: Dangerous URL accepted: ${badUrl}`);
    }
  }
  console.log('✓ Dangerous URL schemes & loopback hosts successfully rejected');

  // GitHub validation
  if (!isValidGitHubUrl('https://github.com/facebook/react')) {
    throw new Error('Valid GitHub URL rejected');
  }
  if (isValidGitHubUrl('https://evil.com/fake/react')) {
    throw new Error('Non-GitHub URL accepted by GitHub validator');
  }
  console.log('✓ GitHub repository URL format verified');

  const normalized = normalizeGitHubUrl('github.com/user/repo');
  if (normalized !== 'https://github.com/user/repo') {
    throw new Error(`Normalization error: ${normalized}`);
  }
  console.log('✓ GitHub URL normalizer verified');

  console.log('URL validator tests PASSED!\n');
}

runUrlValidatorTests();
