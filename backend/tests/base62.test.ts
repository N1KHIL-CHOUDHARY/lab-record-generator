import { encodeBase62, decodeBase62 } from '../src/utils/base62.js';

function runBase62Tests() {
  console.log('--- Testing Base62 Encoding & Decoding ---');

  // Test 1: Zero
  const zeroEncoded = encodeBase62(0n);
  if (zeroEncoded !== '0') {
    throw new Error(`Expected '0', got '${zeroEncoded}'`);
  }

  // Test 2: Known values
  const cases = [
    { num: 100000n, encoded: encodeBase62(100000n) },
    { num: 100001n, encoded: encodeBase62(100001n) },
    { num: 100002n, encoded: encodeBase62(100002n) },
    { num: 999999999n, encoded: encodeBase62(999999999n) },
  ];

  for (const c of cases) {
    const decoded = decodeBase62(c.encoded);
    if (decoded !== c.num) {
      throw new Error(`Decoded value ${decoded} does not match original ${c.num} for string '${c.encoded}'`);
    }
    console.log(`✓ ${c.num} -> "${c.encoded}" -> ${decoded}`);
  }

  // Test 3: Large random range round-trip
  for (let i = 100000n; i < 100100n; i++) {
    const enc = encodeBase62(i);
    const dec = decodeBase62(enc);
    if (dec !== i) {
      throw new Error(`Round-trip failure for ${i}`);
    }
  }

  console.log('✓ 100 sequential Base62 round-trips verified.');
  console.log('Base62 tests PASSED!\n');
}

runBase62Tests();
