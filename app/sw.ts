import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 오프라인 상태에서 캐시 미스 시 Uncaught FetchEvent Promise Rejection 에러 및 첫화면 블로킹을 방지하는 플러그인
const offlineFallbackPlugin = {
  handlerDidError: async ({ request }: { request: Request }): Promise<Response | undefined> => {
    // 1. 네비게이션(페이지 이동) 실패 시 로컬에 저장된 Root 및 HTML 문서 반환 (Vary 헤더 및 쿼리스트링 무시)
    if (request.mode === "navigate") {
      const matchOptions = { ignoreSearch: true, ignoreVary: true };
      let cachedRoot =
        (await caches.match(request, matchOptions)) ||
        (await caches.match("/", matchOptions)) ||
        (await caches.match("/index.html", matchOptions));

      // 그래도 못 찾은 경우, 저장된 전체 캐시 저장소를 순회하여 첫 화면(네비게이션 HTML) 캐시 복구 반환
      if (!cachedRoot) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          for (const key of await cache.keys()) {
            if (key.url.endsWith("/") || key.url.includes("index") || key.mode === "navigate") {
              const res = await cache.match(key, matchOptions);
              if (res) {
                cachedRoot = res;
                break;
              }
            }
          }
          if (cachedRoot) break;
        }
      }
      if (cachedRoot) return cachedRoot;
    }
    // 2. JSON / API 형태의 요청 실패 시 에러 에어백(빈 JSON) 반환
    if (request.headers.get("Accept")?.includes("application/json")) {
      return new Response(JSON.stringify({ error: "offline", message: "오프라인 모드입니다." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    // 3. 이미지 에셋 실패 시 빈 SVG 반환
    if (request.destination === "image") {
      return new Response("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>", {
        status: 200,
        headers: { "Content-Type": "image/svg+xml" },
      });
    }
    // 4. 기타 에셋(JS, CSS 등) 실패 시 Promise rejection 대신 안전하게 503 Response 반환
    return new Response("Offline Resource", {
      status: 503,
      statusText: "Offline",
    });
  },
};

const matchOptions = { ignoreSearch: true, ignoreVary: true };

const runtimeCaching: RuntimeCaching[] = [
  // 1. Google Fonts Stylesheets and Font Files
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http")) return false;
      return /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/i.test(url.href);
    },
    handler: new CacheFirst({
      cacheName: "google-fonts",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        offlineFallbackPlugin,
      ],
    }),
  },
  // 2. Static Assets (JS, CSS, Icons, Images, Fonts)
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http") || url.pathname.startsWith("/api/")) {
        return false;
      }
      return /\.(?:js|css|ico|png|jpg|jpeg|svg|webp|woff|woff2)(?:\?.*)?$/i.test(url.pathname);
    },
    handler: new CacheFirst({
      cacheName: "static-assets",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        offlineFallbackPlugin,
      ],
    }),
  },
  // 3. HTML Navigation requests and Next.js React Server Components (_rsc)
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http") || url.pathname.startsWith("/api/")) {
        return false;
      }
      return request.mode === "navigate" || url.searchParams.has("_rsc");
    },
    handler: new StaleWhileRevalidate({
      cacheName: "pages-and-rsc",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        offlineFallbackPlugin,
      ],
    }),
  },
  // 4. Custom Catch-all rule (excluding /api/, non-GET requests, and non-http protocols)
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http") || url.pathname.startsWith("/api/")) {
        return false;
      }
      return true;
    },
    handler: new StaleWhileRevalidate({
      cacheName: "catch-all",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 150,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        offlineFallbackPlugin,
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
