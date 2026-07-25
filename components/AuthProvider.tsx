"use client";

import { SessionProvider } from "next-auth/react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();

  // 오프라인 상태일 때는 세션 초기값으로 null을 넘겨 NextAuth가 첫 화면 부팅 시 /api/auth/session API를 무익하게 호출하는 것을 차단합니다.
  return (
    <SessionProvider 
      session={!isOnline ? null : undefined} 
      refetchInterval={0} 
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
