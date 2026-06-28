import type { MetadataRoute } from 'next'

const base = 'https://devizele-mele.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/termeni`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/confidentialitate`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/retragere`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
