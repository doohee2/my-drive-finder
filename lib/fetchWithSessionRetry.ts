import { getSession, signOut } from "next-auth/react";

/**
 * 401 Unauthorized 에러 발생 시, 세션을 백그라운드에서 다시 불러온(Refresh) 후
 * 투명하게 1회 자동 재시도하는 fetch 래퍼 함수입니다.
 */
export async function fetchWithSessionRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);

  // 401(Unauthorized) 에러 시 1회에 한해 세션을 갱신하고 다시 요청
  if (response.status === 401) {
    console.warn("401 Unauthorized received. Attempting to refresh session and retry...");
    
    // 강제로 NextAuth 세션을 갱신하여 백엔드(또는 Auth.js)에서 쿠키/토큰을 업데이트하도록 유도
    const newSession = await getSession();
    
    // 만약 세션 갱신이 성공했다면 1회 재시도(Retry)
    if (newSession && !newSession.error) {
      // 기존 요청(init)에 Authorization 헤더가 있었다면 새 토큰으로 교체하여 직결 통신도 커버
      if (init?.headers) {
        const headers = new Headers(init.headers);
        if (headers.has("Authorization") && (newSession as any).accessToken) {
          headers.set("Authorization", `Bearer ${(newSession as any).accessToken}`);
          init.headers = headers;
        }
      }
      response = await fetch(input, init);
    }
    
    // 재시도 후에도 401이거나 세션에 RefreshAccessTokenError 가 있다면 로그아웃 처리
    if (response.status === 401 || newSession?.error === "RefreshAccessTokenError") {
      console.error("Session refresh failed or token is still invalid. Logging out.");
      signOut();
    }
  }

  return response;
}
