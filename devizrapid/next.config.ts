import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
]

const nextConfig: NextConfig = {
  // pdfjs-dist + @napi-rs/canvas (randare PDF -> imagine, pentru PDF-uri scanate
  // fara text) au binare native — le lasam externe bundler-ului Next, altfel
  // risca sa fie ambalate gresit la build si sa pice doar in productie pe Vercel.
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
