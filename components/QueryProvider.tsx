"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount) => {
              // 오프라인 상태 감지 시 즉시 재시도를 0(false)으로 차단해 초기 구동 대기 없이 0.1초 만에 캐시 개방
              if (typeof navigator !== "undefined" && !navigator.onLine) {
                return false;
              }
              // 온라인 상태에서는 2회 미만( failureCount < 2 ) 재시도 허용
              return failureCount < 2;
            },
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
