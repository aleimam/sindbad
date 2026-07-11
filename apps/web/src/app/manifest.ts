import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sindbad — Powered by Travelers',
    short_name: 'Sindbad',
    description: 'Powered by Travelers — peer-to-peer cross-border shopping & delivery.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F172A',
    theme_color: '#2563EB',
    categories: ['shopping', 'travel', 'lifestyle'],
    dir: 'auto',
    icons: [
      // PNGs first — iOS/older-Android installers don't rasterize SVG manifest icons.
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Post a trip', short_name: 'Trip', url: '/trips/new' },
      { name: 'Post a shipment', short_name: 'Shipment', url: '/shipments/new' },
      { name: 'My deals', short_name: 'Deals', url: '/deals' },
    ],
  };
}
