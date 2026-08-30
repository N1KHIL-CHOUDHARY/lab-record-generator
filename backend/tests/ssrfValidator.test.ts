import { isSafePublicUrl } from '../src/validators/qrValidators.js';

function runSsrfTests() {
  console.log('--- Testing SSRF & Private IP Sanitization ---');

  const unsafeSsrfUrls = [
    // AWS / Cloud Metadata Services
    'http://169.254.169.254/latest/meta-data/',
    'http://169.254.169.254/latest/user-data',
    'http://[::ffff:169.254.169.254]/latest/meta-data/',

    // Loopback Addresses (IPv4 & IPv6)
    'http://127.0.0.1',
    'http://127.0.0.1:8080/admin',
    'http://127.0.1.1',
    'http://[::1]',
    'http://[::1]:3000',
    'http://localhost',
    'http://localhost:5000',
    'http://localhost.localdomain',

    // RFC 1918 Private Ranges
    'http://10.0.0.1',
    'http://10.254.0.1:9000',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.0.1',
    'http://192.168.1.254/router',

    // Carrier Grade NAT (RFC 6598)
    'http://100.64.0.1',

    // Unspecified / Broadcast / Multicast
    'http://0.0.0.0',
    'http://255.255.255.255',
    'http://224.0.0.1',

    // Internal / Local Domain Names
    'http://redis.local',
    'http://db.internal',
    'http://gateway.lan',
    'http://mycorp.corp',
    'http://singlelabelhostname',

    // Non-HTTP Protocols
    'file:///etc/passwd',
    'gopher://127.0.0.1:6379/_flushall',
    'dict://127.0.0.1:11211/stat',
    'javascript:alert(1)',
  ];

  for (const url of unsafeSsrfUrls) {
    if (isSafePublicUrl(url)) {
      throw new Error(`SSRF vulnerability: Unsafe/Restricted URL was accepted: ${url}`);
    }
  }
  console.log(`✓ Successfully rejected all ${unsafeSsrfUrls.length} SSRF attack vectors & private IP ranges.`);

  const safePublicUrls = [
    'https://github.com/facebook/react',
    'https://raw.githubusercontent.com/user/repo/main/code.py',
    'https://supabase.com',
    'https://my-portfolio.vercel.app',
    'http://8.8.8.8/dns-query',
    'https://cloudflare.com/cdn',
  ];

  for (const url of safePublicUrls) {
    if (!isSafePublicUrl(url)) {
      throw new Error(`False positive: Safe public URL was rejected: ${url}`);
    }
  }
  console.log(`✓ Successfully accepted all ${safePublicUrls.length} safe public endpoints.`);
  console.log('SSRF Sanitization tests PASSED!\n');
}

runSsrfTests();
