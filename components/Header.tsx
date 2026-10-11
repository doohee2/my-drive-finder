"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import localforage from "localforage";
import { APP_CONFIG } from "@/lib/config";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [selectedFolder] = useSelectedFolder();
  const { isSyncing, syncProgress, lastSyncTime, sync } = useDriveSync(selectedFolder?.id);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleForceUpdate = async () => {
    if (window.confirm("서비스 워커 캐시를 초기화하고 최신 버전으로 새로고침 하시겠습니까?")) {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
        window.location.reload();
      } catch (e) {
        console.error("Cache clear error:", e);
        window.location.reload();
      }
    }
  };

  const handleSecureSignOut = async () => {
    if (window.confirm("로그아웃 하시겠습니까? (로컬에 캐싱된 검색 데이터 및 오프라인 즐겨찾기 목록이 모두 보안성 향상을 위해 초기화됩니다)")) {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        await localforage.clear();
        localStorage.clear();
      } catch (e) {
        console.error("Secure sign-out cache clear error:", e);
      } finally {
        signOut();
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-surface-container-lowest border-b border-outline-variant/10 shadow-sm transition-colors duration-300">
        <div className="flex h-12 md:h-16 items-center px-2 md:px-6 w-full max-w-[1440px] mx-auto gap-1.5 md:gap-2">
          <button
            onClick={() => setIsInfoOpen(true)}
            className="flex items-center gap-2 md:gap-3 cursor-pointer group text-left focus:outline-none rounded-lg p-1 -ml-1 hover:bg-surface-variant/40 transition-colors"
            aria-label="앱 안내"
            title="앱 안내 열기"
          >
            <img
              src={mounted && theme === "dark" ? "/icon-192x192-dark.png" : "/icon-192x192.png"}
              alt="Drive Finder Logo"
              className="w-8 h-8 rounded-lg"
            />
            <div className="flex items-center">
              <svg viewBox="0 0 250 60" className="h-[26px] sm:h-[32px] w-auto ml-1" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#0058bd'} className="transition-colors duration-300">Drive</text>
                <text x="110" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#191b22'} className="transition-colors duration-300">Finder</text>
              </svg>
            </div>
          </button>
          <div className="flex items-center gap-1.5 ml-auto">
            {!isOnline && (
              <div className="flex items-center justify-center p-1.5 text-error" title="오프라인 모드 (로컬 즐겨찾기 캐시만 검색 가능)">
                <span className="material-symbols-outlined text-[24px]">cloud_off</span>
              </div>
            )}

            {selectedFolder && (
              <div className="hidden md:flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full">
                {isSyncing ? (
                  <>
                    <span className="material-symbols-outlined text-primary animate-spin text-sm">refresh</span>
                    <span className="truncate max-w-[200px]">{syncProgress || "동기화 중..."}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-secondary-fixed"></span>
                    {lastSyncTime ? `동기화됨 (${new Date(lastSyncTime).toLocaleTimeString()})` : "동기화 대기 중"}
                  </>
                )}
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center"
              aria-label="Toggle Dark Mode"
            >
              {mounted ? (
                <span className="material-symbols-outlined">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
              ) : (
                <span className="material-symbols-outlined">dark_mode</span>
              )}
            </button>

            <button
              onClick={() => isOnline && sync()}
              disabled={!selectedFolder || isSyncing || !isOnline}
              title={!isOnline ? "오프라인 상태에서는 동기화할 수 없습니다" : "데이터 동기화"}
              className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined ${isSyncing ? "animate-spin" : ""}`} data-icon="sync">
                sync
              </span>
            </button>

            {session ? (
              <button
                onClick={() => isOnline && handleSecureSignOut()}
                disabled={!isOnline}
                className="text-on-surface-variant hover:bg-surface-variant/50 p-1.5 rounded-full transition-colors flex items-center justify-center overflow-hidden ml-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title={!isOnline ? "오프라인 상태에서는 로그아웃할 수 없습니다" : "로그아웃"}
              >
                <img
                  alt="User profile"
                  className="w-7 h-7 rounded-full object-cover"
                  src={session.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDqKLuYp2yN9FVaUYYxOoMvjYUCPygVIfzv0nINbGRqEt6HpS27nlmd1HyL3PWm_n47Jh-xxURjXrg_woQenFkJEGc11NP6zLsTL9pfWL3qXkVNaRp6Q2-3xWMGANqa0udiGtEWaRoVFJzrlc9zjrYKVzDTaQ-OFLxVIm8_Wc0fCBjU7F8NlJbXDuYjYPOtVJTEqQ37SY2dfXnJMASWoVq-7U7VXeksJtM75FvPKbb9lBSODrSEqS2G"}
                />
              </button>
            ) : (
              <button
                onClick={() => isOnline && signIn("google")}
                disabled={!isOnline}
                className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center ml-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title={!isOnline ? "오프라인 상태에서는 로그인할 수 없습니다" : "로그인"}
              >
                <span className="material-symbols-outlined text-[24px]">account_circle</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Info Modal */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsInfoOpen(false)}>
          <div className="bg-surface dark:bg-surface-dim w-full max-w-sm rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <img
                  src={mounted && theme === "dark" ? "/icon-192x192-dark.png" : "/icon-192x192.png"}
                  alt="Drive Finder Logo"
                  className="w-7 h-7 rounded-lg"
                />
                <svg viewBox="0 0 250 60" className="h-[24px] sm:h-[26px] w-auto ml-0.5" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                  <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#0058bd'} className="transition-colors duration-300">Drive</text>
                  <text x="110" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#191b22'} className="transition-colors duration-300">Finder</text>
                </svg>
              </div>
              <button onClick={() => setIsInfoOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              My Drive Finder 페이지는 구글 드라이브의 특정 폴더를 지정해서 해당 폴더의 csv, xlsx 파일의 내용을 검색하는 반응형 웹 기반 앱입니다. 현재 테스트 계정으로 등록된 사용자만 이용할 수 있습니다.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleForceUpdate}
                className="w-full bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/50 px-4 py-2.5 rounded-lg text-label-md font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">update</span>
                캐시 비우고 최신 버전으로 업데이트
              </button>
              <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-on-surface-variant/70 pt-2 border-t border-outline-variant/10 mt-1">
                <a
                  href="https://landing-doohee2.vercel.app/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors hover:underline cursor-pointer"
                >
                  개인정보처리방침
                </a>
                <span>{APP_CONFIG.lastModifiedText}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
