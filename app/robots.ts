import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://labora.nikhil-dev.in';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/dashboard', '/history', '/login'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
