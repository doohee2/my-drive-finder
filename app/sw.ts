import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 오프라인 상태에서 캐시 미스 시 Uncaught FetchEvent Promise Rejection 에러를 방지하는 에러 핸들러 플러그인
const offlineFallbackPlugin = {
  handlerDidError: async ({ request }: { request: Request }): Promise<Response | undefined> => {
    // 1. 네비게이션(페이지 이동) 실패 시 로컬에 저장된 '/' 혹은 fallback 응답 제공
    if (request.mode === "navigate") {
      const cachedRoot = (await caches.match("/")) || (await caches.match("/index.html"));
      if (cachedRoot) return cachedRoot;
      return new Response("<!DOCTYPE html><html><head><meta charset='utf-8'><title>오프라인 모드</title></head><body style='font-family:sans-serif;padding:2rem;text-align:center;'><h2>현재 오프라인 상태입니다</h2><p>인터넷 연결을 확인하고 다시 시도해 주세요.</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    // 2. JSON / API 형태의 요청 실패 시 에러 에어백(빈 JSON) 반환으로 fetchevent 에러 방지
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

const runtimeCaching: RuntimeCaching[] = [
  // 1. Google Fonts Stylesheets and Font Files
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http")) return false;
      return /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/i.test(url.href);
    },
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
