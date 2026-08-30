import { body, param } from 'express-validator';
import ipaddr from 'ipaddr.js';
import { AppError } from '../utils/AppError.js';

/**
 * Validates whether a URL is a safe public HTTP or HTTPS endpoint.
 * Prevents Server-Side Request Forgery (SSRF) and access to internal network services.
 * 
 * - Rejects non-HTTP/HTTPS protocols
 * - Rejects local hostnames (e.g. localhost, *.local, *.internal, *.lan, *.corp, *.home.arpa)
 * - Rejects private, loopback, link-local, carrierGradeNat, multicast, and broadcast IPs
 */
export function isSafePublicUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;

  let url: URL;
  try {
    url = new URL(urlStr.trim());
  } catch {
    return false;
  }

  // 1. Only allow HTTP and HTTPS protocols
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  const hostname = url.hostname.trim().toLowerCase();
  if (!hostname) return false;

  // 2. Reject internal/local/special domain names
  const forbiddenHostnames = [
    'localhost',
    'localhost.localdomain',
    'ip6-localhost',
    'ip6-loopback',
    '0.0.0.0',
    'metadata.google.internal',
  ];
  if (forbiddenHostnames.includes(hostname)) {
    return false;
  }

  const forbiddenSuffixes = [
    '.local',
    '.internal',
    '.lan',
    '.corp',
    '.home.arpa',
    '.intranet',
    '.test',
    '.example',
    '.invalid',
    '.localhost',
  ];
  if (forbiddenSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    return false;
  }

  // Strip IPv6 brackets if present
  const cleanHost = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  // 3. IP address inspection using ipaddr.js
  if (ipaddr.isValid(cleanHost)) {
    try {
      const addr = ipaddr.parse(cleanHost);
      let resolvedAddr: ipaddr.IPv4 | ipaddr.IPv6 = addr;

      if (addr.kind() === 'ipv6') {
        const ipv6Addr = addr as ipaddr.IPv6;
        if (ipv6Addr.isIPv4MappedAddress()) {
          resolvedAddr = ipv6Addr.toIPv4Address();
        }
      }

      const range = resolvedAddr.range();
      const blockedRanges = [
        'unspecified',
        'broadcast',
        'multicast',
        'linkLocal',
        'loopback',
        'carrierGradeNat',
        'private',
        'reserved',
        'uniqueLocal',
      ];

      if (blockedRanges.includes(range)) {
        return false;
      }
    } catch {
      return false;
    }
  } else {
    // If it is not a valid IP and contains no dot, it is an unroutable single-label hostname
    if (!hostname.includes('.')) {
      return false;
    }
  }

  return true;
}

/**
 * Backward compatibility alias for isSafePublicUrl
 */
export function isValidDestinationUrl(val: string): boolean {
  return isSafePublicUrl(val);
}

/**
 * Asserts that a URL is a safe public URL or throws an AppError
 */
export function assertSafeDestinationUrl(urlStr: string): void {
  if (!isSafePublicUrl(urlStr)) {
    throw new AppError('Invalid or restricted destination URL', 400);
  }
}

export const createQrValidation = [
  body('targetUrl')
    .optional()
    .trim()
    .custom((value, { req }) => {
      const url = value || req.body.originalUrl || req.body.destinationUrl;
      if (!url) {
        throw new Error('targetUrl (or destinationUrl) is required');
      }
      if (!isSafePublicUrl(url)) {
        throw new Error('Invalid or restricted destination URL');
      }
      return true;
    }),
  body('destinationUrl').optional().trim(),
  body('originalUrl').optional().trim(),
];

export const updateQrValidation = [
  param('shortId').trim().notEmpty().withMessage('Short code is required'),
  body('targetUrl')
    .optional()
    .trim()
    .custom((value, { req }) => {
      const url = value || req.body.originalUrl || req.body.destinationUrl;
      if (!url) {
        throw new Error('targetUrl (or destinationUrl) is required');
      }
      if (!isSafePublicUrl(url)) {
        throw new Error('Invalid or restricted destination URL');
      }
      return true;
    }),
  body('destinationUrl').optional().trim(),
  body('originalUrl').optional().trim(),
];
