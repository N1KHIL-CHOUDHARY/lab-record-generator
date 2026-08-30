const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BigInt(BASE62_ALPHABET.length);

/**
 * Encodes a numeric value (number or BigInt) into a Base62 alphanumeric string.
 */
export function encodeBase62(num: number | bigint): string {
  let n = typeof num === 'bigint' ? num : BigInt(num);
  if (n === 0n) return BASE62_ALPHABET[0];

  let encoded = '';
  while (n > 0n) {
    const remainder = Number(n % BASE);
    encoded = BASE62_ALPHABET[remainder] + encoded;
    n = n / BASE;
  }

  return encoded;
}

/**
 * Decodes a Base62 alphanumeric string back into a BigInt.
 */
export function decodeBase62(str: string): bigint {
  let decoded = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = BASE62_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character encountered: '${char}'`);
    }
    decoded = decoded * BASE + BigInt(index);
  }
  return decoded;
}
