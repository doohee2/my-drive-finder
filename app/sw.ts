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

      // 만약 온라인으로 전혀 접속된 적이 없거나 업데이트 후 초기화되어 캐시가 완전 0개일 경우 친절하고 명확한 안내 화면 반환
      return new Response(
        `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>오프라인 캐시 없음 - My Drive Finder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1329; color: #e2e8f0; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 2rem; border-radius: 1rem; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    h2 { color: #38bdf8; margin-bottom: 1rem; font-size: 1.3rem; }
    p { font-size: 0.95rem; line-height: 1.5; color: #94a3b8; margin-bottom: 0; }
    .highlight { color: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h2>☁️✕ 오프라인 준비 안 됨</h2>
    <p>아직 오프라인 모드를 사용할 수 없는 상태입니다.<br><br>최근 앱이 업데이트되었거나 최초로 접속하셨을 수 있습니다.<br><span class="highlight">인터넷에 연결된 온라인 상태에서 앱을 1회 실행</span>하여 최신 자산과 첫 화면 데이터를 기기에 동기화해 주시기 바랍니다.</p>
  </div>
</body>
</html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
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
    // 4. JS 스크립트 실패 시 브라우저 JS 문법 에러(Syntax Error) 방지를 위해 빈 자바스크립트 반환
    if (request.destination === "script" || request.url.endsWith(".js") || request.headers.get("Accept")?.includes("javascript")) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "application/javascript" },
      });
    }
    // 5. CSS 스타일 실패 시 빈 스타일 반환
    if (request.destination === "style" || request.url.endsWith(".css") || request.headers.get("Accept")?.includes("text/css")) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "text/css" },
      });
    }
    // 6. 기타 알 수 없는 에셋 실패 시 에러 문자열 표출 대신 빈 503 응답
    return new Response(null, {
      status: 503,
      statusText: "Service Unavailable Offline",
    });
  },
};

const matchOptions = { ignoreSearch: true, ignoreVary: true };

// Chrome/Edge PC 환경 "문서를 렌더링할 수 없습니다." PDF 오류 및 Range 요청 차단 방지를 위한 바이패스 검사
const shouldBypass = (request: Request, url: URL): boolean => {
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  // 1) HTTP Range 요청 바이패스 (PC Chrome/Edge PDF Viewer는 206 Partial Range 요청을 필수로 사용하므로 SW 캐시 사용 시 렌더링 실패)
  if (request.headers.has("range") || Boolean(request.headers.get("range"))) return true;
  // 2) PDF 파일 경로 또는 쿼리 파라미터에 .pdf가 포함된 경우 바이패스
  if (url.pathname.toLowerCase().endsWith(".pdf") || url.search.toLowerCase().includes(".pdf")) return true;
  // 3) Accept 헤더에 application/pdf가 포함되거나 <object>, <embed> 등으로 렌더링되는 문서 요청 바이패스
  if (request.headers.get("accept")?.toLowerCase().includes("application/pdf") || request.destination === "object" || request.destination === "embed") return true;
  return false;
};

const runtimeCaching: RuntimeCaching[] = [
  // 1. 구글 폰트 및 외부 교차 도메인 리소스 (폰트 파일, 프로필 아바타 CDN 등) -> StaleWhileRevalidate (30일 이하)
  {
    matcher: ({ request, url }) => {
      if (request.method !== "GET" || !url.protocol.startsWith("http")) return false;
      return (
        /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|[^\/]+\.googleusercontent\.com|[^\/]+\.ggpht\.com)/i.test(url.href) ||
        (url.origin !== self.location.origin && request.destination === "image")
      );
    },
    handler: new StaleWhileRevalidate({
      cacheName: "external-fonts-and-images",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일 이하 유효기간
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200], // Opaque(0) 응답 방어 및 정상 처리
        }),
        offlineFallbackPlugin,
      ],
    }),
  },
  // 2. 프로젝트 내부 static 고정 자산 (/_next/static/ 등) -> 1년 CacheFirst 유지
  {
    matcher: ({ request, url }) => {
      if (shouldBypass(request, url)) return false;
      if (url.origin !== self.location.origin) return false;
      return (
        url.pathname.startsWith("/_next/static/") ||
        /\.(?:js|css|ico|png|jpg|jpeg|svg|webp|woff|woff2)(?:\?.*)?$/i.test(url.pathname)
      );
    },
    handler: new CacheFirst({
      cacheName: "internal-static-assets",
      matchOptions,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1년 유효기간
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
      if (shouldBypass(request, url)) return false;
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
      if (shouldBypass(request, url)) return false;
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
