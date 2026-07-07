import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sindbad',
    short_name: 'Sindbad',
    description: 'Powered by Travelers — peer-to-peer cross-border shopping & delivery.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#2563EB',
  };
}
