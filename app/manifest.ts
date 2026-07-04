import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Drive Finder',
    short_name: 'DriveFinder',
    description: 'Fast local cache and search for Google Drive spreadsheets',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f9ff',
    theme_color: '#0058bd',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
