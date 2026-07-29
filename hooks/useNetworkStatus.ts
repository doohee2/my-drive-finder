"use client";

import { useEffect, useState, useCallback } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );

  const checkRealNetwork = useCallback(async () => {
    if (typeof window === "undefined") return false;

    // 1차: navigator.onLine으로 0초 심검(Zero-Latency)하여 오프라인 감지 시 즉시 차단
    if (!navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    try {
      // 2차: 서비스 워커 200 위조 캐시를 회피하기 위해 극소 정적 파일로 HEAD + no-store 능동 핑
      const res = await fetch(`/manifest.webmanifest?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(1200),
      });

      const online = res.ok || res.status === 304;
      setIsOnline(online);
      return online;
    } catch {
      // 타임아웃(1.2초 초과) 또는 실제 통신 장애 발생 시 즉시 오프라인 전환
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 마운트 시 동기적 0초 심검 및 능동 회선 실증
    setIsOnline(navigator.onLine);
    checkRealNetwork();

    const handleOnline = () => checkRealNetwork();
    const handleOffline = () => setIsOnline(false);
    const handleFocus = () => checkRealNetwork();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);

    // 화면 활성화 시 15초 주기 실시간 능동 판독
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkRealNetwork();
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [checkRealNetwork]);

  return { isOnline, checkRealNetwork };
}
