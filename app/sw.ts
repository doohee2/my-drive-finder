import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  // 1. Google Fonts Stylesheets and Font Files
  {
    matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
  // 2. Static Assets (JS, CSS, Icons, Images, Fonts)
  {
    matcher: /\.(?:js|css|ico|png|jpg|jpeg|svg|webp|woff|woff2)(?:\?.*)?$/i,
    handler: new CacheFirst({
      cacheName: "static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
  // 3. HTML Navigation requests and Next.js React Server Components (_rsc)
  {
    matcher: ({ request, url }) => request.mode === "navigate" || url.searchParams.has("_rsc"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-and-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
  // 4. Custom Catch-all rule (avoid Serwist defaultCache NetworkOnly rule for /.*/i)
  {
    matcher: /.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "catch-all",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 150,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: runtimeCaching,
});

serwist.addEventListeners();
