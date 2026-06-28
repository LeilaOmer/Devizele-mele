import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/termeni', '/confidentialitate', '/retragere'],
        disallow: ['/dashboard', '/quotes', '/quick', '/pricing', '/services', '/clients', '/settings', '/upgrade', '/api/'],
      },
    ],
    sitemap: 'https://devizele-mele.vercel.app/sitemap.xml',
  }
}
